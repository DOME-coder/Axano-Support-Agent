-- AvatarDesk — Postgres init script
--
-- Runs automatically the first time the postgres container starts
-- (mounted into /docker-entrypoint-initdb.d/). Subsequent container
-- starts will NOT re-run this — to apply schema changes after the
-- first run, use Drizzle migrations (services/api/src/db/migrations/).
--
-- Add new init scripts as 02-..., 03-... and they will run in order.

-- Required for vector embeddings (RAG knowledge base).
-- See PRD §6.4 (KnowledgeChunk.embedding) and CLAUDE §8.
CREATE EXTENSION IF NOT EXISTS vector;
