import { z } from 'zod';
import type { EscalationItem } from './escalations';

// Shared schemas for the dashboard conversations / replay UI. The
// list endpoint is paginated; detail returns header + chronological
// messages. The api never leaks cross-tenant rows — a fetch for a
// foreign id returns 404 (not 403), so an attacker cannot probe for
// existence (see conversations.controller.ts).

export const RESOLUTION_VALUES = [
  'pending',
  'resolved',
  'escalated',
  'abandoned',
] as const;
export type ConversationResolution = (typeof RESOLUTION_VALUES)[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'system', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const conversationsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ConversationsListQuery = z.infer<typeof conversationsListQuerySchema>;

export interface ConversationListItem {
  id: string;
  startedAt: string; // ISO
  endedAt: string | null;
  durationSeconds: number | null;
  language: string;
  resolution: ConversationResolution;
  messageCount: number;
  csatScore: number | null;
  beyMinutesUsed: string; // pg numeric → string, render as-is
  hasVision: boolean;
}

export interface ConversationsListResponse {
  items: ConversationListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ConversationMessageItem {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string; // ISO
  audioDurationMs: number | null;
}

export interface ConversationDetail extends ConversationListItem {
  csatComment: string | null;
  escalation: EscalationItem | null;
  messages: ConversationMessageItem[];
}
