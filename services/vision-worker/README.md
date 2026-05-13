# avatardesk-vision-worker

Second LiveKit worker that joins the same room as the conversational
agent. It subscribes only to screen-share tracks (the avatar publishes
audio + video on the other source) and turns each sampled frame into a
short textual scene description via Claude Sonnet 4.6 Vision. The
result is cached in Redis under `vision:latest:<conversation_id>` with
a 60-second TTL; the conversational agent reads it through the
`analyze_screen` tool (task 2.1.4, separate commit).

Frame lifecycle: a Pillow image is built from the raw RGB24 buffer,
resized to fit `VISION_MAX_DIM` (default 1024px on the long edge),
JPEG-encoded for transport, sent to Anthropic, and discarded. Nothing
is written to disk, ever — see [ADR 007](../../docs/decisions/007-screen-share-privacy.md).

## Run locally

```bash
cd services/vision-worker
python -m venv .venv && source .venv/bin/activate
pip install -e .[dev]
python main.py dev
```

The worker reads the same `.env` at repo root as the conversational
agent. Required: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
`ANTHROPIC_API_KEY`, `REDIS_URL`. Optional:
`VISION_SAMPLE_INTERVAL_S` (default `1.5`), `VISION_MAX_DIM` (`1024`),
`VISION_MODEL` (`claude-sonnet-4-6`), `VISION_LOG_LEVEL` (`INFO`).
