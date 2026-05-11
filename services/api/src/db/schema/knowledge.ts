import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  customType,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// pgvector's halfvec stores 16-bit floats (vs full float4) and is
// HNSW-indexable up to 4000 dimensions — the regular vector type
// caps HNSW at 2000 dims, which our 3072-dim text-embedding-3-large
// would exceed. Quality loss vs full precision is negligible for
// cosine retrieval (well within OpenAI's docs guidance).
const halfvec = (dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `halfvec(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      return JSON.parse(value);
    },
  });

// One row per uploaded source (pdf, url, manual entry). Phase 1
// supports only pdf; url crawling and manual faq pairs arrive in
// phase 2. status drives the indexing lifecycle and is what the
// dashboard polls on for "ready / failed" indicators.

export const knowledgeSources = pgTable('knowledge_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  sourceUri: text('source_uri').notNull(),
  displayName: varchar('display_name', { length: 300 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  error: text('error'),
  chunkCount: integer('chunk_count').notNull().default(0),
  lastIndexedAt: timestamp('last_indexed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type NewKnowledgeSource = typeof knowledgeSources.$inferInsert;

// Vector dimension matches OpenAI text-embedding-3-large default
// (3072). Phase 2 may shrink this via the dimensions parameter for
// cost reduction; that would require a fresh migration + re-index.
//
// tenant_id is denormalised onto chunks so the rag query in 1.3.2
// can filter without a join, and so app-level tenant isolation has
// a single source of truth per row.

const embeddingType = halfvec(3072);

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => knowledgeSources.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: embeddingType('embedding').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
