import type { RegenerateApiKeyResponse, TenantApiKeyHint } from '@avatardesk/shared';
import { apiFetch } from './api';

export async function fetchApiKeyHint(): Promise<TenantApiKeyHint> {
  const response = await apiFetch('/api/tenant/api-key-hint');
  if (!response.ok) {
    throw new Error(`tenant/api-key-hint ${response.status}`);
  }
  return (await response.json()) as TenantApiKeyHint;
}

export async function regenerateApiKey(): Promise<RegenerateApiKeyResponse> {
  const response = await apiFetch('/api/tenant/regenerate-api-key', { method: 'POST' });
  if (!response.ok) {
    throw new Error(`tenant/regenerate-api-key ${response.status}`);
  }
  return (await response.json()) as RegenerateApiKeyResponse;
}
