"""AvatarDesk vision worker — Phase 2 Sprint 2.1 task 2.1.3.

Joins every room the dispatcher hands us, listens for screen-share
tracks from any participant, samples one frame every
VISION_SAMPLE_INTERVAL_S, ships it to Claude Sonnet 4.6 Vision, and
writes the textual scene description into Redis under
`vision:latest:<conversation_id>` with a 60-second TTL.

The conversational agent reads that key via the `analyze_screen` tool
(task 2.1.4 — separate commit). This worker writes; nobody reads here.

Privacy: see ADR 007. Frames live in process memory only; nothing
hits disk, S3, or Postgres.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import sys
import time
from pathlib import Path

import anthropic
import redis.asyncio as redis_async
import structlog
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import JobContext, WorkerOptions, cli
from PIL import Image

# Repo-root .env, three directories up from services/vision-worker/main.py.
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(REPO_ROOT / ".env")


REQUIRED_ENV_VARS = (
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "ANTHROPIC_API_KEY",
    "REDIS_URL",
)


def _configure_logging() -> None:
    logging.basicConfig(
        level=os.getenv("VISION_LOG_LEVEL", "INFO"),
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


VISION_SYSTEM_PROMPT = (
    "Du bist ein visueller Assistent. Beschreibe in 2-4 knappen Sätzen, "
    "was auf diesem Bildschirm zu sehen ist — handlungsorientiert. Nenne "
    "die wichtigsten sichtbaren UI-Elemente (Buttons, Eingabefelder, "
    "Links, Fehlermeldungen) und ihre ungefähre Position (oben, mitte, "
    "rechts unten, ...). Beschreibe keine Hintergründe oder Dekoration. "
    "Wenn der Bildschirm leer oder unleserlich ist, sag das ehrlich."
)


def _extract_conversation_id(room_metadata: str | None) -> str | None:
    if not room_metadata:
        return None
    try:
        parsed = json.loads(room_metadata)
    except (json.JSONDecodeError, TypeError):
        return None
    cid = parsed.get("conversationId") if isinstance(parsed, dict) else None
    return cid if isinstance(cid, str) and cid else None


def _frame_to_jpeg_bytes(frame: rtc.VideoFrame, max_dim: int) -> bytes:
    """Convert a LiveKit VideoFrame to a JPEG byte string sized for vision.

    LiveKit hands us raw I420/NV12/YUYV — convert via the SDK to RGB24
    first, then build a Pillow image from the flat buffer. Resizing to
    a sane max-dimension cuts both anthropic token cost and our
    pipeline latency without losing UI-legibility.
    """
    rgb = frame.convert(rtc.VideoBufferType.RGB24)
    img = Image.frombuffer("RGB", (rgb.width, rgb.height), bytes(rgb.data), "raw", "RGB", 0, 1)
    # thumbnail() preserves aspect ratio and only shrinks. Vision works
    # well on long-edge ~1024 — bigger costs more tokens without
    # measurable accuracy bump on typical UI screenshots.
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=82, optimize=True)
    return buf.getvalue()


async def _describe_frame(
    client: anthropic.AsyncAnthropic,
    model: str,
    jpeg_bytes: bytes,
) -> str:
    encoded = base64.b64encode(jpeg_bytes).decode("ascii")
    response = await client.messages.create(
        model=model,
        max_tokens=400,
        system=VISION_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": encoded,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Beschreibe diesen Bildschirm jetzt.",
                    },
                ],
            }
        ],
    )
    parts: list[str] = []
    for block in response.content:
        text = getattr(block, "text", None)
        if isinstance(text, str):
            parts.append(text)
    return " ".join(parts).strip()


async def _sample_track(
    *,
    track: rtc.RemoteVideoTrack,
    conversation_id: str,
    redis_client: redis_async.Redis,
    anthropic_client: anthropic.AsyncAnthropic,
    sample_interval_s: float,
    max_dim: int,
    model: str,
    log: structlog.stdlib.BoundLogger,
) -> None:
    """Pull frames from one screen-share track until the track ends.

    We open a VideoStream, grab the *latest* frame at our sampling
    cadence (LiveKit ring-buffers internally — old frames are
    discarded automatically), call vision, write redis. On any
    transient error we log and continue: the user is still sharing,
    they'd rather get a slightly delayed description than have us
    crash the worker for the whole room.
    """
    redis_key = f"vision:latest:{conversation_id}"
    stream = rtc.VideoStream(track)
    last_call = 0.0
    log.info("vision sampling started", redis_key=redis_key, interval_s=sample_interval_s)
    try:
        async for event in stream:
            now = time.monotonic()
            if now - last_call < sample_interval_s:
                continue
            last_call = now
            try:
                jpeg = _frame_to_jpeg_bytes(event.frame, max_dim=max_dim)
                description = await _describe_frame(
                    anthropic_client,
                    model=model,
                    jpeg_bytes=jpeg,
                )
                if description:
                    await redis_client.set(redis_key, description, ex=60)
                    log.info(
                        "vision snapshot stored",
                        chars=len(description),
                        jpeg_bytes=len(jpeg),
                    )
                else:
                    log.warning("vision returned empty description")
            except Exception as exc:  # noqa: BLE001
                log.error("vision sample failed", error=str(exc))
                # Slow down a bit on repeated failures so we don't spin.
                await asyncio.sleep(2.0)
    finally:
        await stream.aclose()
        log.info("vision sampling stopped")


async def entrypoint(ctx: JobContext) -> None:
    log = structlog.get_logger().bind(room=ctx.room.name)
    log.info("vision-worker dispatched to room")

    await ctx.connect()
    log.info("connected to livekit room")

    conversation_id = _extract_conversation_id(ctx.room.metadata)
    if not conversation_id:
        # No conversation id = no place to write the redis snapshot
        # under. Without that key the analyze_screen tool has nothing
        # to read, so we'd just be doing expensive no-op vision calls.
        # Disconnect quietly — the conversational agent still works.
        log.warning("no conversation id in room metadata; vision-worker exiting")
        return

    sample_interval_s = float(os.getenv("VISION_SAMPLE_INTERVAL_S", "1.5"))
    max_dim = int(os.getenv("VISION_MAX_DIM", "1024"))
    model = os.getenv("VISION_MODEL", "claude-sonnet-4-6")

    anthropic_client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    redis_client = redis_async.from_url(os.environ["REDIS_URL"], decode_responses=True)

    # One sampling task per active screen-share track. Keyed by track
    # sid so we can cancel cleanly when the track ends or the user
    # stops sharing and starts a new share.
    sampling_tasks: dict[str, asyncio.Task[None]] = {}

    def _on_track_subscribed(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        # Only screen-share video. The avatar publishes camera video +
        # microphone audio on the same room; both should be ignored
        # here so we don't accidentally vision-analyze sofia's face.
        if track.kind != rtc.TrackKind.KIND_VIDEO:
            return
        if publication.source != rtc.TrackSource.SOURCE_SCREENSHARE:
            return
        assert isinstance(track, rtc.RemoteVideoTrack)
        sid = publication.sid
        if sid in sampling_tasks:
            log.warning("duplicate screen-share subscription, ignoring", sid=sid)
            return
        log.info(
            "screen-share track subscribed",
            sid=sid,
            participant=participant.identity,
        )
        sampling_tasks[sid] = asyncio.create_task(
            _sample_track(
                track=track,
                conversation_id=conversation_id,
                redis_client=redis_client,
                anthropic_client=anthropic_client,
                sample_interval_s=sample_interval_s,
                max_dim=max_dim,
                model=model,
                log=log.bind(sid=sid),
            )
        )

    def _on_track_unsubscribed(
        track: rtc.Track,
        publication: rtc.RemoteTrackPublication,
        participant: rtc.RemoteParticipant,
    ) -> None:
        sid = publication.sid
        task = sampling_tasks.pop(sid, None)
        if task and not task.done():
            log.info(
                "screen-share track unsubscribed; cancelling sampler",
                sid=sid,
                participant=participant.identity,
            )
            task.cancel()

    ctx.room.on("track_subscribed", _on_track_subscribed)
    ctx.room.on("track_unsubscribed", _on_track_unsubscribed)

    async def _on_shutdown() -> None:
        for sid, task in list(sampling_tasks.items()):
            if not task.done():
                task.cancel()
            sampling_tasks.pop(sid, None)
        await redis_client.aclose()
        await anthropic_client.close()
        log.info("vision-worker shutdown complete")

    ctx.add_shutdown_callback(_on_shutdown)
    log.info(
        "vision-worker ready, waiting for screen-share tracks",
        sample_interval_s=sample_interval_s,
        max_dim=max_dim,
        model=model,
    )


if __name__ == "__main__":
    _configure_logging()
    _validate_env()
    # Explicit dispatch mode: the api embeds this agent_name in the
    # widget token's roomConfig so livekit wakes this worker AND the
    # conversational agent for the same room in parallel. Without
    # the name, both workers register with agent_name="" and race for
    # each job — the conversational agent always wins the race because
    # it has cheaper startup, so the vision worker would never see a
    # dispatch. See plan section "Sprint 2.1.5".
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, agent_name="vision-worker"))
