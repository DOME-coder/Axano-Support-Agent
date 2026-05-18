import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CONVERSATION_RESUME_TTL_MS,
  type CreateWidgetSessionBody,
  type WidgetSessionResponse,
} from '@avatardesk/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantApiKeyGuard } from '../auth/tenant-api-key.guard';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { avatarConfigs, conversations, type Tenant } from '../db/schema';
import { RoomServiceClient } from '../livekit/room-service.factory';
import { TokenIssuerService } from '../livekit/token-issuer.service';

@Controller('api/widget-session')
@UseGuards(TenantApiKeyGuard)
export class WidgetSessionController {
  private readonly logger = new Logger(WidgetSessionController.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly tokenIssuer: TokenIssuerService,
    private readonly rooms: RoomServiceClient,
  ) {}

  @Post()
  async create(
    @CurrentTenant() tenant: Tenant,
    @Body() body: CreateWidgetSessionBody,
  ): Promise<WidgetSessionResponse> {
    const configs = await this.db
      .select()
      .from(avatarConfigs)
      .where(eq(avatarConfigs.tenantId, tenant.id))
      .limit(1);
    const config = configs[0];
    if (!config) {
      throw new HttpException(
        'tenant has no avatar_config; run pnpm db:seed or configure via dashboard',
        HttpStatus.CONFLICT,
      );
    }

    // Resume path: if the widget hands back a conversationId from
    // localStorage and it belongs to this tenant, isn't ended, and
    // started less than CONVERSATION_RESUME_TTL_MS ago, reuse it.
    // Otherwise silent fallback — never 4xx for a stale id, the
    // widget can't know the server-side state.
    let conversation = await this.tryResumeConversation(tenant.id, body.resumeConversationId);

    if (!conversation) {
      const [created] = await this.db
        .insert(conversations)
        .values({
          tenantId: tenant.id,
          endUserId: body.endUserId ?? null,
          language: config.language,
          // We need the id before we can derive the room name, so do an
          // ad-hoc two-step: insert with a placeholder, then update. To
          // keep the unique constraint happy and avoid a round trip we
          // build the room name from a fresh uuid and let drizzle's
          // returning() give us back both.
          livekitRoomId: `conv-${crypto.randomUUID()}`,
        })
        .returning();

      if (!created) {
        throw new HttpException(
          'failed to create conversation',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      conversation = created;
    } else {
      this.logger.log(
        `widget-session resumed conversation ${conversation.id} for tenant ${tenant.id}`,
      );
    }

    // Ensure the livekit room exists AND carries the conversationId in
    // its metadata. Runs in BOTH paths — without it, a resumed
    // conversation whose room got evicted (emptyTimeout: 60) would join
    // a freshly-lazy-created room without metadata, and the
    // vision-worker would exit silently at dispatch time.
    try {
      await this.rooms.ensureRoomMetadata({
        name: conversation.livekitRoomId,
        metadata: JSON.stringify({ conversationId: conversation.id }),
        emptyTimeout: 60,
      });
    } catch (err) {
      this.logger.warn(
        `livekit ensureRoomMetadata failed for ${conversation.livekitRoomId}: ${(err as Error).message}`,
      );
    }

    const { token, url } = await this.tokenIssuer.issueWidgetToken({
      room: conversation.livekitRoomId,
      identity: conversation.id,
    });

    return {
      url,
      token,
      room: conversation.livekitRoomId,
      conversationId: conversation.id,
      avatar: {
        greeting: config.greeting,
        language: config.language,
        allowScreenShare: config.allowScreenShare,
      },
    };
  }

  private async tryResumeConversation(
    tenantId: string,
    resumeId: string | undefined,
  ): Promise<typeof conversations.$inferSelect | null> {
    if (!resumeId) {
      return null;
    }
    const rows = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, resumeId),
          eq(conversations.tenantId, tenantId),
          isNull(conversations.endedAt),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    const ageMs = Date.now() - row.startedAt.getTime();
    if (ageMs > CONVERSATION_RESUME_TTL_MS) {
      return null;
    }
    return row;
  }
}
