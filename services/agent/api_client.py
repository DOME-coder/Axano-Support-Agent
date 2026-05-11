"""HTTP client for the AvatarDesk internal API.

Reads the internal service token from .internal-service-token.local
at repo-root once at startup. All requests carry the
X-Internal-Token header; failures are logged but not retried —
phase-1 keeps the policy simple, phase-2 hardening can add retries
and circuit breakers.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import structlog

log = structlog.get_logger(__name__)


def _read_internal_token() -> str:
    """Read the plaintext internal service token from the gitignored
    file at repo-root. Falls back to the INTERNAL_SERVICE_TOKEN env
    var if present (useful for containerized deployments).
    """
    env_token = os.getenv("INTERNAL_SERVICE_TOKEN")
    if env_token:
        return env_token.strip()
    repo_root = Path(__file__).resolve().parent.parent.parent
    token_file = repo_root / ".internal-service-token.local"
    if not token_file.is_file():
        raise RuntimeError(
            "internal service token not found: run `pnpm --filter @avatardesk/api db:seed` "
            "to generate it, or set INTERNAL_SERVICE_TOKEN env var"
        )
    return token_file.read_text(encoding="utf-8").strip()


@dataclass(frozen=True)
class AgentConfig:
    conversation_id: str
    tenant_id: str
    language: str
    bey_avatar_id: str
    elevenlabs_voice_id: str
    persona_prompt: str
    greeting: str


class ApiClient:
    """Async HTTP client for the AvatarDesk internal API.

    All endpoints live under {api_base_url}/api/internal/. The
    internal token is loaded once and reused for all requests.
    """

    def __init__(self, api_base_url: str | None = None, token: str | None = None) -> None:
        self._base_url = (api_base_url or os.getenv("API_BASE_URL") or "http://localhost:3000").rstrip("/")
        self._token = token or _read_internal_token()
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=15.0, write=10.0, pool=5.0),
            headers={"X-Internal-Token": self._token},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def get_agent_config(self, conversation_id: str) -> AgentConfig:
        url = f"{self._base_url}/api/internal/conversations/{conversation_id}/agent-config"
        response = await self._client.get(url)
        response.raise_for_status()
        data = response.json()
        return AgentConfig(
            conversation_id=data["conversationId"],
            tenant_id=data["tenantId"],
            language=data["language"],
            bey_avatar_id=data["beyAvatarId"],
            elevenlabs_voice_id=data["elevenlabsVoiceId"],
            persona_prompt=data["personaPrompt"],
            greeting=data["greeting"],
        )

    async def append_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        audio_duration_ms: int | None = None,
    ) -> None:
        url = f"{self._base_url}/api/internal/conversations/{conversation_id}/messages"
        payload: dict[str, Any] = {"role": role, "content": content}
        if audio_duration_ms is not None:
            payload["audioDurationMs"] = audio_duration_ms
        try:
            response = await self._client.post(url, json=payload)
            response.raise_for_status()
        except Exception as exc:  # noqa: BLE001 — best-effort logging
            log.warning("failed to persist message", error=str(exc), role=role)

    async def patch_conversation(
        self,
        conversation_id: str,
        *,
        ended_at: str | None = None,
        resolution: str | None = None,
        bey_minutes_used: float | None = None,
    ) -> None:
        url = f"{self._base_url}/api/internal/conversations/{conversation_id}"
        payload: dict[str, Any] = {}
        if ended_at is not None:
            payload["endedAt"] = ended_at
        if resolution is not None:
            payload["resolution"] = resolution
        if bey_minutes_used is not None:
            payload["beyMinutesUsed"] = bey_minutes_used
        if not payload:
            return
        try:
            response = await self._client.patch(url, json=payload)
            response.raise_for_status()
        except Exception as exc:  # noqa: BLE001
            log.warning("failed to patch conversation", error=str(exc))
