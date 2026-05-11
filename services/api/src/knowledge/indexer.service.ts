import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { knowledgeChunks, knowledgeSources } from '../db/schema';

export interface IndexingJobData {
  sourceId: string;
  tenantId: string;
  filePath: string;
}

const CHUNK_SIZE_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;
const EMBEDDING_BATCH_SIZE = 5;

function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= CHUNK_SIZE_CHARS) {
    return normalized.length > 0 ? [normalized] : [];
  }
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) {
      break;
    }
    start = end - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}

function toHalfvecLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

@Injectable()
export class KnowledgeIndexerService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(KnowledgeIndexerService.name);
  private worker?: Worker<IndexingJobData>;
  private openai?: OpenAI;

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  onModuleInit(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set; knowledge indexer will fail at job time');
    }
    this.openai = apiKey ? new OpenAI({ apiKey }) : undefined;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.error('REDIS_URL not set; indexer worker disabled');
      return;
    }

    this.worker = new Worker<IndexingJobData>(
      'knowledge-indexing',
      async (job) => this.runJob(job),
      {
        connection: { url: redisUrl },
        concurrency: 1,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`indexing job ${job?.id ?? '?'} failed: ${err.message}`);
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`indexing job ${job.id} completed`);
    });

    this.logger.log('knowledge indexer worker started');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async runJob(job: Job<IndexingJobData>): Promise<void> {
    const { sourceId, tenantId, filePath } = job.data;
    const log = this.logger;

    log.log(`indexing source ${sourceId} from ${filePath}`);
    await this.db
      .update(knowledgeSources)
      .set({ status: 'indexing', error: null })
      .where(eq(knowledgeSources.id, sourceId));

    try {
      const buffer = await readFile(filePath);
      const parsed = await pdfParse(buffer);
      const chunks = chunkText(parsed.text ?? '');
      if (chunks.length === 0) {
        throw new Error('pdf produced zero text chunks');
      }

      if (!this.openai) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large';

      let inserted = 0;
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
        const response = await this.openai.embeddings.create({
          model: embeddingModel,
          input: batch,
        });
        // OpenAI returns embeddings in the same order as input.
        const rows = response.data.map((entry, idx) => ({
          sourceId,
          tenantId,
          chunkIndex: i + idx,
          content: batch[idx]!,
          embedding: toHalfvecLiteral(entry.embedding) as unknown as number[],
          metadata: null,
        }));
        await this.db.insert(knowledgeChunks).values(rows);
        inserted += rows.length;
      }

      await this.db
        .update(knowledgeSources)
        .set({
          status: 'ready',
          chunkCount: inserted,
          lastIndexedAt: new Date(),
          error: null,
        })
        .where(eq(knowledgeSources.id, sourceId));

      log.log(`indexed ${inserted} chunks for source ${sourceId}`);
    } catch (err) {
      const message = (err as Error).message;
      log.error(`indexing source ${sourceId} failed: ${message}`);
      await this.db
        .update(knowledgeSources)
        .set({ status: 'failed', error: message })
        .where(eq(knowledgeSources.id, sourceId));
      throw err;
    }
  }
}
