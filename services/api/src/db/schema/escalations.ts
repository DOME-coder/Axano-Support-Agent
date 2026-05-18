import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { conversations } from './conversations';

// Escalation rows are written by the agent when it gives up after a
// few unsuccessful tries OR when the end user explicitly asks for a
// human. Phase-2 only persists the row — the actual notification
// dispatch (email, slack, webhook) is phase-3 material. Keeping the
// schema in place lets us replay every escalation as soon as that
// pipeline exists, without a backfill.
//
// target is the channel the escalation should reach when phase-3
// wires it up; status flips to 'resolved' once an agent has handled
// it (also phase-3).

export const escalations = pgTable(
  'escalations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    target: varchar('target', { length: 20 }).notNull().default('email'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('escalations_conversation_id_idx').on(table.conversationId),
  }),
);

export type Escalation = typeof escalations.$inferSelect;
export type NewEscalation = typeof escalations.$inferInsert;
