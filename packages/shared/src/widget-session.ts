// Shared shape for POST /api/widget-session.
//
// resumeConversationId lets the widget continue an existing
// conversation across modal close/reopen within a short TTL,
// instead of producing a fresh row every time. The api validates
// tenant ownership and freshness before honoring it; an unknown
// or expired id silently falls back to a new conversation.

export interface CreateWidgetSessionBody {
  endUserId?: string;
  resumeConversationId?: string;
}

export interface WidgetSessionResponse {
  url: string;
  token: string;
  room: string;
  conversationId: string;
  avatar: {
    greeting: string;
    language: string;
  };
}

// Re-use TTL must match the api's resume window. Kept in shared so
// widget and api can't drift apart.
export const CONVERSATION_RESUME_TTL_MS = 30 * 60 * 1000;
