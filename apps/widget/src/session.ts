// Phase 1: widget fetches its LiveKit token from the AvatarDesk API
// instead of reading it from a <script>-data-attribute (the
// phase-0 workaround, see ADR 003). The token never enters the DOM.

export interface WidgetSession {
  url: string;
  token: string;
  room: string;
  conversationId: string;
  avatar: {
    greeting: string;
    language: string;
  };
}

export async function fetchWidgetSession(input: {
  apiUrl: string;
  tenantApiKey: string;
  endUserId?: string;
}): Promise<WidgetSession> {
  const response = await fetch(`${input.apiUrl}/api/widget-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-API-Key': input.tenantApiKey,
    },
    body: JSON.stringify(input.endUserId ? { endUserId: input.endUserId } : {}),
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
    throw new Error(`widget-session ${response.status}${detail ? `: ${detail}` : ''}`);
  }

  return (await response.json()) as WidgetSession;
}
