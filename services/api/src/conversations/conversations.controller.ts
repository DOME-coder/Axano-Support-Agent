import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  conversationsListQuerySchema,
  type ConversationDetail,
  type ConversationsListResponse,
} from '@avatardesk/shared';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { SessionGuard } from '../auth/session.guard';
import type { Tenant } from '../db/schema';
import { ConversationsService } from './conversations.service';

@Controller('api/conversations')
@UseGuards(SessionGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  async list(
    @CurrentTenant() tenant: Tenant,
    @Query() query: unknown,
  ): Promise<ConversationsListResponse> {
    const parsed = conversationsListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new HttpException(
        { error: 'validation_failed', issues: parsed.error.issues },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.service.list(tenant.id, parsed.data.page, parsed.data.pageSize);
  }

  @Get(':id')
  async detail(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
  ): Promise<ConversationDetail> {
    const detail = await this.service.findOne(tenant.id, id);
    if (!detail) {
      // 404 — never 403 — so we don't reveal whether the id exists
      // in another tenant. See ADR 007.
      throw new HttpException('conversation not found', HttpStatus.NOT_FOUND);
    }
    return detail;
  }
}
