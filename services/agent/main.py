"""AvatarDesk realtime agent — Phase 1 Sprint 2 + 1.2.3.

This worker connects to a LiveKit room, reads the conversation id
from the room metadata (set by the api when issuing the widget
session token), pulls the per-tenant avatar config from the
internal api, attaches a Beyond Presence avatar, runs the full
STT → LLM → TTS pipeline, and persists each turn back to the api.

Persona, voice and avatar id are all driven by the tenant's
avatar_config row — no more env defaults at conversation time.
Env-level defaults exist only as a last-resort fallback if the
metadata is missing (development convenience).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path

import structlog
from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.llm import function_tool
from livekit.agents.voice.events import ConversationItemAddedEvent
from livekit.plugins import anthropic, bey, deepgram, elevenlabs, silero

from api_client import AgentConfig, ApiClient

# Repo-root .env, two directories up from services/agent/main.py.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(REPO_ROOT / ".env")


REQUIRED_ENV_VARS = (
    "BEY_API_KEY",
    "BEY_DEFAULT_AVATAR_ID",
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_DEFAULT_VOICE_ID",
    "ANTHROPIC_API_KEY",
    "DEEPGRAM_API_KEY",
)


def _configure_logging() -> None:
    logging.basicConfig(
        level=os.getenv("AGENT_LOG_LEVEL", "INFO"),
        format="%(message)s",
        stream=sys.stdout,
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ],
    )


def _validate_env() -> None:
    log = structlog.get_logger()
    missing = [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]
    if missing:
        log.error("missing required environment variables", missing=missing)
        sys.exit(1)
    log.info("env validation ok", required_count=len(REQUIRED_ENV_VARS))


RAG_GROUNDING_HINT = (
    "\n\nWICHTIG: Bei inhaltlichen Fragen rufst du IMMER zuerst das "
    "Tool `search_knowledge_base` mit einer kurzen Suchanfrage auf. "
    "Antworte ausschließlich basierend auf den zurückgegebenen Inhalten. "
    "Wenn das Tool nichts Passendes findet, sag ehrlich, dass du es nicht "
    "weißt — niemals erfinden."
)


class ConversationalAgent(Agent):
    """Phase-1 conversational agent with RAG tool.

    Per-conversation persona instructions are extended with a fixed
    grounding rule so the LLM uses search_knowledge_base before it
    answers content questions. Tool implementation is injected via
    the constructor — the tool itself is a thin closure over the
    tenant id + api client.
    """

    def __init__(
        self,
        instructions: str,
        *,
        tenant_id: str | None,
        api_client: ApiClient | None,
    ) -> None:
        self._tenant_id = tenant_id
        self._api_client = api_client
        # Only attach the rag tool when both pieces are present; in
        # fallback mode (no metadata, no api) we keep the agent
        # purely chatty and tell the llm explicitly that there's no
        # knowledge base available.
        tools = []
        full_instructions = instructions
        if tenant_id and api_client:
            tools.append(self._build_search_tool(tenant_id, api_client))
            full_instructions = instructions + RAG_GROUNDING_HINT
        super().__init__(instructions=full_instructions, tools=tools)

    @staticmethod
    def _build_search_tool(tenant_id: str, api_client: ApiClient):
        log = structlog.get_logger(__name__)

        @function_tool(
            name="search_knowledge_base",
            description=(
                "Durchsuche die Wissensdatenbank des Tenants und gib die "
                "relevantesten Textauszüge zur Anfrage zurück. Nutze knappe, "
                "präzise Suchanfragen — keine ganzen Sätze, sondern die "
                "wichtigsten Begriffe."
            ),
        )
        async def search_knowledge_base(query: str) -> str:
            log.info("rag tool called", query_chars=len(query))
            hits = await api_client.search_knowledge(tenant_id, query, top_k=5)
            if not hits:
                return "Keine relevanten Treffer in der Wissensdatenbank."
            # Format as a numbered list so the LLM can cite content
            # without confusing itself with delimiters.
            lines: list[str] = []
            for idx, hit in enumerate(hits, start=1):
                lines.append(f"[{idx}] (sim={hit.similarity:.2f})\n{hit.content}")
            return "\n\n".join(lines)

        return search_knowledge_base


def _extract_conversation_id(room_metadata: str | None) -> str | None:
    """Pull the conversationId from the LiveKit room metadata if present."""
    if not room_metadata:
        return None
    try:
        parsed = json.loads(room_metadata)
    except (json.JSONDecodeError, TypeError):
        return None
    cid = parsed.get("conversationId") if isinstance(parsed, dict) else None
    return cid if isinstance(cid, str) and cid else None


def _flatten_content(content: object) -> str:
    """ChatMessage.content is a list of ChatContent items (text, image, ...).
    For persistence we keep only the text parts."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
        return " ".join(parts).strip()
    return ""


async def entrypoint(ctx: JobContext) -> None:
    log = structlog.get_logger().bind(room=ctx.room.name)
    log.info("agent dispatched to room")

    await ctx.connect()
    log.info("connected to livekit room")

    conversation_id = _extract_conversation_id(ctx.room.metadata)
    if conversation_id:
        log.info("conversation id from room metadata", conversation_id=conversation_id)
    else:
        log.warning("no conversation id in room metadata; falling back to env defaults")

    # Pull per-conversation config from the internal api. If the
    # conversationId is missing we run with env defaults — useful
    # during development and for self-tests without an api round trip.
    api_client: ApiClient | None = None
    cfg: AgentConfig | None = None
    if conversation_id:
        try:
            api_client = ApiClient()
            cfg = await api_client.get_agent_config(conversation_id)
            log.info(
                "tenant config loaded",
                tenant_id=cfg.tenant_id,
                language=cfg.language,
            )
        except Exception as exc:  # noqa: BLE001
            log.error("failed to load agent config; falling back to env defaults", error=str(exc))
            if api_client:
                await api_client.close()
                api_client = None

    bey_avatar_id = cfg.bey_avatar_id if cfg else os.environ["BEY_DEFAULT_AVATAR_ID"]
    voice_id = cfg.elevenlabs_voice_id if cfg else os.environ["ELEVENLABS_DEFAULT_VOICE_ID"]
    persona_prompt = (
        cfg.persona_prompt
        if cfg
        else os.getenv(
            "AGENT_PERSONA_PROMPT",
            "Du bist Sofia, eine freundliche, kompetente "
            "Customer-Service-Mitarbeiterin von Axano. Du sprichst Deutsch.",
        )
    )
    greeting_text = (
        cfg.greeting
        if cfg
        else os.getenv(
            "AGENT_GREETING_TEXT",
            "Hallo, ich bin Sofia. Wobei kann ich dir helfen?",
        )
    )
    language = cfg.language if cfg else "de"

    session = AgentSession(
        stt=deepgram.STT(model=os.getenv("DEEPGRAM_MODEL", "nova-2"), language=language),
        llm=anthropic.LLM(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")),
        tts=elevenlabs.TTS(
            voice_id=voice_id,
            api_key=os.environ["ELEVENLABS_API_KEY"],
        ),
        vad=silero.VAD.load(),
    )

    # Persist every user/assistant turn. The event fires once per
    # committed conversation item; tool calls are excluded here (we
    # log them in phase-2 analytics).
    if api_client and conversation_id:

        def _persist_item(event: ConversationItemAddedEvent) -> None:
            item = event.item
            role = getattr(item, "role", None)
            if role not in ("user", "assistant"):
                return
            content = _flatten_content(getattr(item, "content", None))
            if not content:
                return
            asyncio.create_task(
                api_client.append_message(  # type: ignore[union-attr]
                    conversation_id=conversation_id,
                    role=role,
                    content=content,
                )
            )

        session.on("conversation_item_added", _persist_item)

    avatar = bey.AvatarSession(avatar_id=bey_avatar_id)
    await avatar.start(session, room=ctx.room)
    log.info("beyond-presence avatar attached")

    await session.start(
        agent=ConversationalAgent(
            instructions=persona_prompt,
            tenant_id=cfg.tenant_id if cfg else None,
            api_client=api_client,
        ),
        room=ctx.room,
    )
    log.info("agent session started")

    # The greeting from the tenant config is a final string, not an
    # instruction. We give the LLM that exact greeting via say() so
    # the persona stays consistent across reconnects.
    await session.say(greeting_text, allow_interruptions=False)
    log.info("greeting spoken", chars=len(greeting_text))

    # Shutdown hook: stamp ended_at and rough bey-minutes onto the
    # conversation row. Bey-minutes-used is an approximation based on
    # wall-clock duration; phase-3 billing will swap this for exact
    # streamed-minutes from the bey api.
    started_at = time.monotonic()
    if api_client and conversation_id:

        async def _on_shutdown() -> None:
            elapsed_min = round((time.monotonic() - started_at) / 60.0, 2)
            try:
                await api_client.patch_conversation(  # type: ignore[union-attr]
                    conversation_id,
                    ended_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    bey_minutes_used=elapsed_min,
                )
            finally:
                await api_client.close()  # type: ignore[union-attr]

        ctx.add_shutdown_callback(_on_shutdown)


if __name__ == "__main__":
    _configure_logging()
    _validate_env()
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
