import type {
  AvatarConfigPatch,
  AvatarConfigResponse,
  AvatarOptionsResponse,
} from '@avatardesk/shared';
import { apiFetch } from './api';

export async function fetchAvatarConfig(): Promise<AvatarConfigResponse> {
  const response = await apiFetch('/api/avatar-config');
  if (!response.ok) {
    throw new Error(`avatar-config ${response.status}`);
  }
  return (await response.json()) as AvatarConfigResponse;
}

export async function fetchAvatarOptions(): Promise<AvatarOptionsResponse> {
  const response = await apiFetch('/api/avatar-config/options');
  if (!response.ok) {
    throw new Error(`avatar-config/options ${response.status}`);
  }
  return (await response.json()) as AvatarOptionsResponse;
}

export async function updateAvatarConfig(
  patch: AvatarConfigPatch,
): Promise<AvatarConfigResponse> {
  const response = await apiFetch('/api/avatar-config', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`avatar-config PATCH ${response.status}${text ? `: ${text}` : ''}`);
  }
  return (await response.json()) as AvatarConfigResponse;
}
