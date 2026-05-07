import { pgTable, uuid, varchar, timestamp, smallint, numeric } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// One row per end-user conversation. The end_user_id is anonymous
// (browser cookie or device hint) — we never store PII unless the
// tenant explicitly enables it.
//
// resolution: pending while the conversation is open, then one of
//   resolved | escalated | abandoned at end_at time.
//
// bey_minutes_used drives billing — written by the agent on disconnect.

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  endUserId: varchar('end_user_id', { length: 200 }),
  livekitRoomId: varchar('livekit_room_id', { length: 200 }).notNull().unique(),
  language: varchar('language', { length: 8 }).notNull().default('de'),
  resolution: varchar('resolution', { length: 20 }).notNull().default('pending'),
  csatScore: smallint('csat_score'),
  beyMinutesUsed: numeric('bey_minutes_used', { precision: 8, scale: 2 })
    .notNull()
    .default('0'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
