// Phase 1: widget fetches its LiveKit token from the AvatarDesk API
// instead of reading it from a <script>-data-attribute (the
// phase-0 workaround, see ADR 003). The token never enters the DOM.
//
// Phase 2 (sprint 2.0): widget also offers a resumeConversationId
// to keep one conversation row alive across modal close/reopen
// within the resume TTL. The id lives in localStorage; the api
// validates tenant ownership + freshness before honoring it.

import type {
  CreateWidgetSessionBody,
  WidgetSessionResponse,
} from '@avatardesk/shared';

export type { WidgetSessionResponse };

export async function fetchWidgetSession(input: {
  apiUrl: string;
  tenantApiKey: string;
  endUserId?: string;
  resumeConversationId?: string;
}): Promise<WidgetSessionResponse> {
  const body: CreateWidgetSessionBody = {};
  if (input.endUserId) {
    body.endUserId = input.endUserId;
  }
  if (input.resumeConversationId) {
    body.resumeConversationId = input.resumeConversationId;
  }

  const response = await fetch(`${input.apiUrl}/api/widget-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-API-Key': input.tenantApiKey,
    },
    body: JSON.stringify(body),
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

  return (await response.json()) as WidgetSessionResponse;
}
