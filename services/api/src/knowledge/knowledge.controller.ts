import {
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Queue } from 'bullmq';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantApiKeyGuard } from '../auth/tenant-api-key.guard';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { knowledgeSources, type Tenant } from '../db/schema';
import { KNOWLEDGE_INDEXING_QUEUE } from '../queue/queue.module';
import { StorageService } from '../storage/storage.service';
import type { IndexingJobData } from './indexer.service';

interface UploadedFileShape {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface UploadResponse {
  sourceId: string;
  status: string;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ACCEPTED_MIME = new Set(['application/pdf']);

@Controller('api/knowledge')
@UseGuards(TenantApiKeyGuard)
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    @Inject(KNOWLEDGE_INDEXING_QUEUE) private readonly queue: Queue<IndexingJobData>,
    private readonly storage: StorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @CurrentTenant() tenant: Tenant,
    @UploadedFile() file: UploadedFileShape | undefined,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new HttpException('file field is required (multipart)', HttpStatus.BAD_REQUEST);
    }
    if (!ACCEPTED_MIME.has(file.mimetype)) {
      throw new HttpException(
        `unsupported mime type ${file.mimetype}; only application/pdf in phase 1`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    const [source] = await this.db
      .insert(knowledgeSources)
      .values({
        tenantId: tenant.id,
        type: 'pdf',
        sourceUri: '',
        displayName: file.originalname || 'untitled.pdf',
        status: 'pending',
        chunkCount: 0,
      })
      .returning();
    if (!source) {
      throw new HttpException(
        'failed to create knowledge_source row',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const filename = `${source.id}.pdf`;
    const fullPath = await this.storage.putTenantFile(tenant.id, filename, file.buffer);

    await this.db
      .update(knowledgeSources)
      .set({ sourceUri: fullPath })
      .where(eqId(source.id));

    await this.queue.add('index', {
      sourceId: source.id,
      tenantId: tenant.id,
      filePath: fullPath,
    });

    this.logger.log(
      `enqueued indexing job: source=${source.id} tenant=${tenant.id} size=${file.size}`,
    );

    return { sourceId: source.id, status: 'pending' };
  }
}

// Tiny local alias to keep the controller body readable.
import { eq } from 'drizzle-orm';
function eqId(id: string) {
  return eq(knowledgeSources.id, id);
}
