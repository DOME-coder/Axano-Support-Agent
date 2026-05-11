import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalServiceGuard } from '../auth/internal-service.guard';
import { KnowledgeSearchService, type KnowledgeHit } from './search.service';

interface SearchResponse {
  results: KnowledgeHit[];
}

@Controller('api/internal/knowledge')
@UseGuards(InternalServiceGuard)
export class InternalKnowledgeSearchController {
  private readonly logger = new Logger(InternalKnowledgeSearchController.name);

  constructor(private readonly search: KnowledgeSearchService) {}

  @Get('search')
  async runSearch(
    @Query('tenant_id') tenantId: string,
    @Query('q') q: string,
    @Query('top_k') topKRaw?: string,
  ): Promise<SearchResponse> {
    if (!tenantId) {
      throw new HttpException('tenant_id is required', HttpStatus.BAD_REQUEST);
    }
    if (!q) {
      throw new HttpException('q is required', HttpStatus.BAD_REQUEST);
    }
    const topK = topKRaw ? Math.min(20, Math.max(1, Number.parseInt(topKRaw, 10))) : 5;

    const results = await this.search.search(tenantId, q, topK);
    this.logger.log(`knowledge search: tenant=${tenantId} hits=${results.length} q_chars=${q.length}`);
    return { results };
  }
}
