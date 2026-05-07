import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// AvatarConfig holds the per-tenant Beyond-Presence + ElevenLabs +
// persona configuration. One row per tenant in phase 1; multiple
// configs per tenant (different languages, A/B testing) come later.

export const avatarConfigs = pgTable('avatar_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  beyAvatarId: varchar('bey_avatar_id', { length: 200 }).notNull(),
  elevenlabsVoiceId: varchar('elevenlabs_voice_id', { length: 200 }).notNull(),
  language: varchar('language', { length: 8 }).notNull().default('de'),
  personaPrompt: text('persona_prompt').notNull(),
  greeting: text('greeting').notNull(),
  isCustomAvatar: boolean('is_custom_avatar').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AvatarConfig = typeof avatarConfigs.$inferSelect;
export type NewAvatarConfig = typeof avatarConfigs.$inferInsert;
