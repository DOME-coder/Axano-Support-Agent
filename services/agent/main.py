"""AvatarDesk realtime agent — Phase 0 Hello-World.

This worker connects to a LiveKit room, attaches a Beyond Presence
avatar, and has the avatar speak a fixed greeting message via
ElevenLabs TTS. It does NOT yet listen for user speech or run the
LLM — that arrives with Phase 1 sprint 2 (PRD §10.2).

The canonical Beyond-Presence + livekit-agents pattern follows
CLAUDE.md §7. All credentials are read from the repo-root .env
file via python-dotenv; nothing is hardcoded.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

import structlog
from dotenv import load_dotenv
from livekit import agents
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
)

DEFAULT_GREETING = "Hallo, ich bin Sofia. Wobei kann ich dir helfen?"


def _configure_logging() -> None:
    """Configure structlog for human-readable dev logs.

    Production deployments will switch to JSON renderer; for Phase 0
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


class GreetingAgent(Agent):
    """Phase 0 stub: speaks once, then idles.

    Phase 1 will replace this with a full conversational agent that
    handles STT input and LLM tool-use (PRD §4.1.7).
    """

    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "Du bist Sofia, eine freundliche, kompetente "
                "Customer-Service-Mitarbeiterin. Du sprichst Deutsch."
            ),
        )


async def entrypoint(ctx: JobContext) -> None:
    """LiveKit worker entrypoint.

    Called for every room the worker is dispatched to.
    """
    log = structlog.get_logger().bind(room=ctx.room.name)
    log.info("agent dispatched to room")

    await ctx.connect()
    log.info("connected to livekit room")

    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="de"),
        llm=anthropic.LLM(model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")),
        tts=elevenlabs.TTS(voice_id=os.environ["ELEVENLABS_DEFAULT_VOICE_ID"]),
        vad=silero.VAD.load(),
    )

    avatar = bey.AvatarSession(avatar_id=os.environ["BEY_DEFAULT_AVATAR_ID"])
    await avatar.start(session, room=ctx.room)
    log.info("beyond-presence avatar attached")

    await session.start(agent=GreetingAgent(), room=ctx.room)
    log.info("agent session started")

    greeting = os.getenv("AGENT_GREETING_TEXT", DEFAULT_GREETING)
    await session.say(greeting, allow_interruptions=False)
    log.info("greeting spoken", chars=len(greeting))


if __name__ == "__main__":
    _configure_logging()
    _validate_env()
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
