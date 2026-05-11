// Thin fetch wrapper that always includes the session cookie and
// points at the AvatarDesk API. Used by client components via
// TanStack Query and by server components for the initial /me check.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export interface MeResponse {
  tenantId: string;
  name: string;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

export async function fetchMe(): Promise<MeResponse> {
  const response = await apiFetch('/api/dashboard-auth/me');
  if (!response.ok) {
    throw new Error(`me ${response.status}`);
  }
  return (await response.json()) as MeResponse;
}

export async function requestMagicLink(email: string): Promise<void> {
  const response = await apiFetch('/api/dashboard-auth/request-magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(`request-magic-link ${response.status}`);
  }
}

export async function logout(): Promise<void> {
  await apiFetch('/api/dashboard-auth/logout', { method: 'POST' });
}
