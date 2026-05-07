import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';

// Tenants are the B2B customers that embed AvatarDesk on their website.
// See PRD §6.4. The api_key is never stored in plaintext — only its
// sha256 hash. Generation and rotation live in src/auth/.

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  billingEmail: varchar('billing_email', { length: 320 }).notNull(),
  plan: varchar('plan', { length: 40 }).notNull().default('starter'),
  apiKeyHash: text('api_key_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
