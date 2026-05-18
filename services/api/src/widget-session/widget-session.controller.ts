import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CONVERSATION_RESUME_TTL_MS,
  csatSubmissionSchema,
  type CreateWidgetSessionBody,
  type WidgetSessionResponse,
} from '@avatardesk/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { RoomAgentDispatch } from 'livekit-server-sdk';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantApiKeyGuard } from '../auth/tenant-api-key.guard';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { avatarConfigs, conversations, type Tenant } from '../db/schema';
import { ROOM_AGENT_NAMES } from '../livekit/room-agents';
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
    // its metadata AND has the agent dispatch list. Runs in BOTH paths
    // — without the agents list at room-creation time, livekit cloud
    // ignores the token's roomConfig on subsequent joins (once the
    // server-side room exists, server-side config wins), so neither
    // worker would receive a dispatch. The token still carries the
    // agents list as a fallback for the first-time auto-create case.
    try {
      await this.rooms.ensureRoomMetadata({
        name: conversation.livekitRoomId,
        metadata: JSON.stringify({ conversationId: conversation.id }),
        agents: ROOM_AGENT_NAMES.map((agentName) => new RoomAgentDispatch({ agentName })),
        emptyTimeout: 60,
      });
      this.logger.log(
        `ensured livekit room ${conversation.livekitRoomId} with agents=[${ROOM_AGENT_NAMES.join(',')}]`,
      );
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

  @Post(':conversationId/csat')
  async submitCsat(
    @CurrentTenant() tenant: Tenant,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ): Promise<{ ok: true }> {
    const parsed = csatSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        `invalid csat body: ${parsed.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const { score, comment } = parsed.data;

    // Cross-tenant probe lands here: a conversation that doesn't belong
    // to the calling tenant is indistinguishable from one that doesn't
    // exist. 404 in both cases keeps us from leaking existence.
    const rows = await this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.tenantId, tenant.id),
        ),
      )
      .limit(1);
    const conversation = rows[0];
    if (!conversation) {
      throw new HttpException('conversation not found', HttpStatus.NOT_FOUND);
    }

    const update: Record<string, unknown> = {
      csatScore: score,
      csatComment: comment ?? null,
    };
    // Only flip resolution if it's still pending — an escalation that
    // already fired must not be downgraded to 'abandoned' by a low
    // CSAT (and a tenant who manually resolved earlier shouldn't be
    // overwritten either, once that ui exists in phase 3).
    if (conversation.resolution === 'pending') {
      update.resolution = score >= 4 ? 'resolved' : 'abandoned';
      update.endedAt = new Date();
    }
    await this.db
      .update(conversations)
      .set(update)
      .where(eq(conversations.id, conversationId));

    this.logger.log(
      `csat submitted: conversation=${conversationId} score=${score} commentLen=${comment?.length ?? 0}`,
    );
    return { ok: true };
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
