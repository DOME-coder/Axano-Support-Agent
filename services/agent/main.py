"""AvatarDesk realtime agent — Phase 1 Sprint 2: full conversational loop.

This worker connects to a LiveKit room, attaches a Beyond Presence
avatar, listens to the user via Deepgram STT, reasons with Claude,
speaks back via ElevenLabs TTS, and renders lip-synced video
through Beyond Presence.

Persona (instructions + greeting) is currently read from env. The
DB-driven per-tenant lookup arrives with task 1.2.3
(Conversation-Persistence + Tenant-Avatar-Lookup).

All credentials are read from the repo-root .env file via
python-dotenv; nothing is hardcoded. Plugins eagerly authenticate
at construction time, so any missing key crashes the worker on
the first job dispatch — fail-fast in _validate_env covers that.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import structlog
from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import anthropic, bey, deepgram, elevenlabs, silero

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

DEFAULT_GREETING_INSTRUCTIONS = (
    "Begrüße den Endkunden kurz auf Deutsch, stelle dich als Sofia "
    "vor und frage, wobei du helfen kannst. Halte es unter 15 Wörtern."
)

DEFAULT_PERSONA_PROMPT = (
    "Du bist Sofia, eine freundliche, kompetente "
    "Customer-Service-Mitarbeiterin von Axano. Du sprichst Deutsch, "
    "antwortest knapp und praktisch, und gibst zu, wenn du etwas "
    "nicht weißt."
)


def _configure_logging() -> None:
    """Configure structlog for human-readable dev logs.

    Production deployments will switch to JSON renderer; for Phase 1
    we want readable console output.
    """
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
    """Fail fast if any required credential is missing.

    Logs which variables are missing by name only — never the value.
    CLAUDE §6 + §11.
    """
    log = structlog.get_logger()
    missing = [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]
    if missing:
        log.error("missing required environment variables", missing=missing)
        sys.exit(1)
    log.info("env validation ok", required_count=len(REQUIRED_ENV_VARS))


class ConversationalAgent(Agent):
    """Phase-1 conversational agent.

    Persona comes from AGENT_PERSONA_PROMPT (env) for now. Task 1.2.3
    will swap this for a DB lookup driven by avatar_configs.persona_prompt.
    """

    def __init__(self) -> None:
        super().__init__(
            instructions=os.getenv("AGENT_PERSONA_PROMPT", DEFAULT_PERSONA_PROMPT),
        )


async def entrypoint(ctx: JobContext) -> None:
    """LiveKit worker entrypoint.

    Called for every room the worker is dispatched to.
    """
    log = structlog.get_logger().bind(room=ctx.room.name)
    log.info("agent dispatched to room")

    await ctx.connect()
    log.info("connected to livekit room")

    # Full STT->LLM->TTS->avatar pipeline. Each plugin authenticates
    # at construction; if any key is missing the worker crashes here,
    # which is why _validate_env runs at startup.
    session = AgentSession(
        stt=deepgram.STT(
            model=os.getenv("DEEPGRAM_MODEL", "nova-2"),
            language="de",
        ),
        llm=anthropic.LLM(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
        ),
        tts=elevenlabs.TTS(
            voice_id=os.environ["ELEVENLABS_DEFAULT_VOICE_ID"],
            api_key=os.environ["ELEVENLABS_API_KEY"],
        ),
        vad=silero.VAD.load(),
    )

    avatar = bey.AvatarSession(avatar_id=os.environ["BEY_DEFAULT_AVATAR_ID"])
    await avatar.start(session, room=ctx.room)
    log.info("beyond-presence avatar attached")

    await session.start(agent=ConversationalAgent(), room=ctx.room)
    log.info("agent session started")

    greeting_instructions = os.getenv(
        "AGENT_GREETING_INSTRUCTIONS",
        DEFAULT_GREETING_INSTRUCTIONS,
    )
    await session.generate_reply(instructions=greeting_instructions)
    log.info("initial greeting generated")


if __name__ == "__main__":
    _configure_logging()
    _validate_env()
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
