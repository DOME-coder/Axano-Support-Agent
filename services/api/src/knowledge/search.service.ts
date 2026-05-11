import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import OpenAI from 'openai';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';

export interface KnowledgeHit {
  chunkId: string;
  sourceId: string;
  content: string;
  similarity: number;
}

const DEFAULT_TOP_K = 5;

function toHalfvecLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);
  private openai?: OpenAI;

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : undefined;
  }

  /**
   * Embed the query, run a cosine-distance kNN against the tenant's
   * chunks via the hnsw index, return top-K with content + similarity.
   *
   * pgvector uses the `<=>` operator for cosine *distance* (0 = perfect
   * match, 2 = opposite). We expose 1 - distance as `similarity` so
   * downstream code can reason in the natural "closer to 1 is better"
   * direction.
   */
  async search(tenantId: string, query: string, topK = DEFAULT_TOP_K): Promise<KnowledgeHit[]> {
    if (!this.openai) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!query.trim()) {
      return [];
    }

    const model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large';
    const embeddingResponse = await this.openai.embeddings.create({
      model,
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) {
      throw new Error('embedding API returned no vector');
    }
    const literal = toHalfvecLiteral(queryEmbedding);

    // Cast the literal to halfvec(3072) so the planner uses the HNSW
    // index on knowledge_chunks.embedding. tenant_id is filtered first
    // via the btree index to keep the kNN bounded.
    const rows = await this.db.execute<{
      id: string;
      source_id: string;
      content: string;
      distance: number;
    }>(sql`
      SELECT id, source_id, content, embedding <=> ${literal}::halfvec(3072) AS distance
      FROM knowledge_chunks
      WHERE tenant_id = ${tenantId}
      ORDER BY distance ASC
      LIMIT ${topK}
    `);

    const result = (rows as unknown as { rows?: Array<Record<string, unknown>> }).rows ?? rows;
    const records = Array.isArray(result) ? result : [];

    return records.map((r) => ({
      chunkId: String(r.id),
      sourceId: String(r.source_id),
      content: String(r.content),
      similarity: 1 - Number(r.distance ?? 0),
    }));
  }
}
