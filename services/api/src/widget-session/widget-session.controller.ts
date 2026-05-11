import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { TenantApiKeyGuard } from '../auth/tenant-api-key.guard';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { avatarConfigs, conversations, type Tenant } from '../db/schema';
import { TokenIssuerService } from '../livekit/token-issuer.service';

interface CreateWidgetSessionBody {
  endUserId?: string;
}

interface WidgetSessionResponse {
  url: string;
  token: string;
  room: string;
  conversationId: string;
  avatar: {
    greeting: string;
    language: string;
  };
}

@Controller('api/widget-session')
@UseGuards(TenantApiKeyGuard)
export class WidgetSessionController {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
    private readonly tokenIssuer: TokenIssuerService,
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

    const [conversation] = await this.db
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

    if (!conversation) {
      throw new HttpException(
        'failed to create conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
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
      },
    };
  }
}
