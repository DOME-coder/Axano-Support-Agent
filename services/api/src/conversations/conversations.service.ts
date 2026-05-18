import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationMessageItem,
  ConversationResolution,
  ConversationsListResponse,
  MessageRole,
} from '@avatardesk/shared';

interface ConversationRow extends Record<string, unknown> {
  id: string;
  started_at: Date;
  ended_at: Date | null;
  language: string;
  resolution: string;
  csat_score: number | null;
  bey_minutes_used: string;
  message_count: string; // pg count() returns text
  has_vision: boolean;
}

interface MessageRow extends Record<string, unknown> {
  id: string;
  role: string;
  content: string;
  timestamp: Date;
  audio_duration_ms: number | null;
}

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function rowToListItem(row: ConversationRow): ConversationListItem {
  const startedAt = row.started_at;
  const endedAt = row.ended_at;
  const durationSeconds =
    endedAt && startedAt
      ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
      : null;
  return {
    id: row.id,
    startedAt: startedAt.toISOString(),
    endedAt: toIso(endedAt),
    durationSeconds,
    language: row.language,
    resolution: row.resolution as ConversationResolution,
    messageCount: Number.parseInt(row.message_count, 10),
    csatScore: row.csat_score,
    beyMinutesUsed: row.bey_minutes_used,
    hasVision: row.has_vision,
  };
}

@Injectable()
export class ConversationsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(
    tenantId: string,
    page: number,
    pageSize: number,
  ): Promise<ConversationsListResponse> {
    const offset = (page - 1) * pageSize;

    // Single query with subqueries for message count + hasVision so
    // we get O(N) round-trips instead of N+1 per row. Total count is a
    // separate cheap query — much faster than a window function on
    // typical tenant volumes (< a few thousand conversations).
    const listResult = await this.db.execute<ConversationRow>(sql`
      SELECT
        c.id,
        c.started_at,
        c.ended_at,
        c.language,
        c.resolution,
        c.csat_score,
        c.bey_minutes_used,
        (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
        EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2.conversation_id = c.id
            AND m2.role = 'tool'
            AND m2.content LIKE '[analyze_screen]%'
        ) AS has_vision
      FROM conversations c
      WHERE c.tenant_id = ${tenantId}
      ORDER BY c.started_at DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    const totalResult = await this.db.execute<{ count: string }>(sql`
      SELECT count(*)::text AS count
      FROM conversations
      WHERE tenant_id = ${tenantId}
    `);

    const listRows = extractRows<ConversationRow>(listResult);
    const totalRows = extractRows<{ count: string }>(totalResult);

    return {
      items: listRows.map(rowToListItem),
      page,
      pageSize,
      total: Number.parseInt(totalRows[0]?.count ?? '0', 10),
    };
  }

  async findOne(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationDetail | null> {
    const headerResult = await this.db.execute<ConversationRow>(sql`
      SELECT
        c.id,
        c.started_at,
        c.ended_at,
        c.language,
        c.resolution,
        c.csat_score,
        c.bey_minutes_used,
        (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
        EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2.conversation_id = c.id
            AND m2.role = 'tool'
            AND m2.content LIKE '[analyze_screen]%'
        ) AS has_vision
      FROM conversations c
      WHERE c.id = ${conversationId}
        AND c.tenant_id = ${tenantId}
      LIMIT 1
    `);

    const headerRows = extractRows<ConversationRow>(headerResult);
    const header = headerRows[0];
    if (!header) {
      // Either the conversation doesn't exist or it belongs to another
      // tenant. We return null in both cases so the controller can map
      // to 404 — exposing 403 would leak existence (see ADR 007).
      return null;
    }

    const messageResult = await this.db.execute<MessageRow>(sql`
      SELECT id, role, content, timestamp, audio_duration_ms
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY timestamp ASC
    `);

    const messageRows = extractRows<MessageRow>(messageResult);
    const messages: ConversationMessageItem[] = messageRows.map((m) => ({
      id: m.id,
      role: m.role as MessageRole,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      audioDurationMs: m.audio_duration_ms,
    }));

    return {
      ...rowToListItem(header),
      messages,
    };
  }
}

function extractRows<T>(executeResult: unknown): T[] {
  const wrapped = (executeResult as { rows?: T[] }).rows;
  if (Array.isArray(wrapped)) {
    return wrapped;
  }
  return Array.isArray(executeResult) ? (executeResult as T[]) : [];
}
