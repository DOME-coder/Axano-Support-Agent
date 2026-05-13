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

import redis.asyncio as redis_async
import structlog
from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.agents.llm import function_tool
from livekit.agents.voice.events import (
    AgentFalseInterruptionEvent,
    ConversationItemAddedEvent,
)
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

# Triggers the vision tool. Kept short and concrete so the LLM can
# match user phrasing without us having to enumerate every variation.
# The tool itself returns an honest "no share" message when redis is
# empty, so the LLM is allowed to call it even on ambiguous prompts.
SCREEN_VISION_HINT = (
    "\n\nWICHTIG: Wenn der Endkunde nach etwas Visuellem auf seinem "
    "Bildschirm fragt — z. B. 'wo finde ich…', 'wie klicke ich…', 'was "
    "siehst du auf meinem Bildschirm', 'welcher Button…', 'was steht "
    "da…' — rufst du IMMER zuerst das Tool `analyze_screen` auf, bevor "
    "du antwortest. Beziehe dich in der Antwort konkret auf die "
    "beschriebenen UI-Elemente und ihre Position. Wenn das Tool sagt, "
    "dass kein Bildschirm geteilt wird, bitte den Endkunden, den "
    "Bildschirm-Button im Modal zu drücken."
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
        conversation_id: str | None = None,
        redis_client: redis_async.Redis | None = None,
    ) -> None:
        self._tenant_id = tenant_id
        self._api_client = api_client
        self._conversation_id = conversation_id
        self._redis_client = redis_client
        # Each tool attaches only when its prerequisites are present.
        # RAG needs the tenant id + api client; analyze_screen needs
        # the conversation id + a redis connection that can read the
        # vision-worker's snapshot. In fallback mode (e.g. dev run
        # without metadata) we run as a plain chatty agent.
        tools = []
        full_instructions = instructions
        if tenant_id and api_client:
            tools.append(self._build_search_tool(tenant_id, api_client))
            full_instructions = full_instructions + RAG_GROUNDING_HINT
        if conversation_id and redis_client is not None:
            tools.append(self._build_analyze_screen_tool(conversation_id, redis_client))
            full_instructions = full_instructions + SCREEN_VISION_HINT
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

    @staticmethod
    def _build_analyze_screen_tool(conversation_id: str, redis_client: redis_async.Redis):
        log = structlog.get_logger(__name__)
        redis_key = f"vision:latest:{conversation_id}"

        @function_tool(
            name="analyze_screen",
            description=(
                "Liefert eine kurze Beschreibung dessen, was der Endkunde "
                "gerade auf seinem geteilten Bildschirm sieht — sichtbare "
                "UI-Elemente, deren Position und Zustand. Rufe dieses Tool "
                "auf, sobald der Endkunde nach etwas auf seinem Bildschirm "
                "fragt oder Hilfe beim Klick-Pfad braucht. Wenn der "
                "Endkunde aktuell nicht teilt, sagt das Tool das ehrlich — "
                "dann bitte ihn, im Modal auf 'Bildschirm teilen' zu klicken."
            ),
        )
        async def analyze_screen() -> str:
            try:
                snapshot = await redis_client.get(redis_key)
            except Exception as exc:  # noqa: BLE001
                # Redis hiccup should never silently drop the call — but it
                # also should never crash the conversation. Tell the LLM
                # the truth so it can apologize gracefully.
                log.error("analyze_screen redis read failed", error=str(exc))
                return (
                    "Die Bildschirm-Analyse ist gerade nicht erreichbar. "
                    "Bitte versuche es in wenigen Sekunden erneut."
                )
            if not snapshot:
                log.info("analyze_screen called but no snapshot present")
                return (
                    "Der Endkunde teilt aktuell keinen Bildschirm, oder die "
                    "Analyse ist noch nicht verfügbar. Bitte ihn, im Modal "
                    "auf den Bildschirm-Teilen-Button zu klicken und ein "
                    "paar Sekunden zu warten."
                )
            log.info("analyze_screen returned snapshot", chars=len(snapshot))
            return snapshot

        return analyze_screen


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

    # Redis is only used to read vision-worker snapshots through the
    # analyze_screen tool. We connect lazily so a missing REDIS_URL
    # (dev runs, self-tests) does not bring down the conversation —
    # the agent just runs without the screen-vision tool.
    redis_client: redis_async.Redis | None = None
    redis_url = os.getenv("REDIS_URL")
    if conversation_id and redis_url:
        try:
            redis_client = redis_async.from_url(redis_url, decode_responses=True)
            # ping eagerly so a misconfigured url fails here, not on
            # the first tool call mid-conversation.
            await redis_client.ping()
            log.info("redis connected for analyze_screen tool")
        except Exception as exc:  # noqa: BLE001
            log.error("redis connect failed; analyze_screen tool disabled", error=str(exc))
            if redis_client is not None:
                await redis_client.aclose()
            redis_client = None

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

    # VAD tuning for German barge-in (sprint-2.0 task 2.0.2):
    # - min_silence_duration up from 0.55s to 0.8s: german has more
    #   word-internal pauses than english, the default produces too
    #   many false interruptions.
    # - activation_threshold up from 0.5 to 0.6: cuts background noise
    #   (typing, breathing) from triggering an interruption.
    # These are kinder defaults; the underlying livekit-agents
    # scheduling-paused issue after a real interruption still exists
    # (private state, no public reset hook in 1.5.8), but it's
    # triggered much less often this way. AgentFalseInterruptionEvent
    # below logs when the lib's auto-resume path fires, so we have
    # observability if the bug returns.
    session = AgentSession(
        stt=deepgram.STT(model=os.getenv("DEEPGRAM_MODEL", "nova-2"), language=language),
        llm=anthropic.LLM(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")),
        tts=elevenlabs.TTS(
            voice_id=voice_id,
            api_key=os.environ["ELEVENLABS_API_KEY"],
        ),
        vad=silero.VAD.load(
            min_silence_duration=0.8,
            activation_threshold=0.6,
        ),
    )

    def _on_false_interruption(event: AgentFalseInterruptionEvent) -> None:
        log.info(
            "agent false interruption",
            resumed=event.resumed,
        )

    session.on("agent_false_interruption", _on_false_interruption)

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
            conversation_id=conversation_id,
            redis_client=redis_client,
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

    if redis_client is not None:

        async def _on_redis_shutdown() -> None:
            await redis_client.aclose()  # type: ignore[union-attr]

        ctx.add_shutdown_callback(_on_redis_shutdown)


if __name__ == "__main__":
    _configure_logging()
    _validate_env()
    # Explicit dispatch mode: the api embeds this agent_name in the
    # widget token's roomConfig alongside "vision-worker". Without
    # the explicit name both workers register with agent_name="" and
    # race for each job, which deterministically locks the vision
    # worker out of every dispatch. See plan section "Sprint 2.1.5".
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="conversational-agent"))
