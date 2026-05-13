import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  LANGUAGE_CODES,
  avatarConfigPatchSchema,
  type AvatarConfigPatch,
  type AvatarConfigResponse,
  type AvatarOptionsResponse,
} from '@avatardesk/shared';
import { eq } from 'drizzle-orm';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { SessionGuard } from '../auth/session.guard';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { avatarConfigs, type Tenant } from '../db/schema';
import { getAvatarOptions, getVoiceOptions } from './options';

@Controller('api/avatar-config')
@UseGuards(SessionGuard)
export class AvatarConfigController {
  private readonly logger = new Logger(AvatarConfigController.name);

  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  @Get('options')
  options(): AvatarOptionsResponse {
    return {
      avatars: getAvatarOptions(),
      voices: getVoiceOptions(),
      languages: LANGUAGE_CODES,
    };
  }

  @Get()
  async current(@CurrentTenant() tenant: Tenant): Promise<AvatarConfigResponse> {
    const rows = await this.db
      .select()
      .from(avatarConfigs)
      .where(eq(avatarConfigs.tenantId, tenant.id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new HttpException(
        'no avatar_config for tenant; run pnpm db:seed',
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      id: row.id,
      tenantId: row.tenantId,
      beyAvatarId: row.beyAvatarId,
      elevenlabsVoiceId: row.elevenlabsVoiceId,
      language: row.language as AvatarConfigResponse['language'],
      personaPrompt: row.personaPrompt,
      greeting: row.greeting,
      isCustomAvatar: row.isCustomAvatar,
      allowScreenShare: row.allowScreenShare,
    };
  }

  @Patch()
  async update(
    @CurrentTenant() tenant: Tenant,
    @Body() body: unknown,
  ): Promise<AvatarConfigResponse> {
    const parsed = avatarConfigPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { error: 'validation_failed', issues: parsed.error.issues },
        HttpStatus.BAD_REQUEST,
      );
    }
    const patch: AvatarConfigPatch = parsed.data;

    const rows = await this.db
      .update(avatarConfigs)
      .set({
        beyAvatarId: patch.beyAvatarId,
        elevenlabsVoiceId: patch.elevenlabsVoiceId,
        language: patch.language,
        personaPrompt: patch.personaPrompt,
        greeting: patch.greeting,
        allowScreenShare: patch.allowScreenShare,
        updatedAt: new Date(),
      })
      .where(eq(avatarConfigs.tenantId, tenant.id))
      .returning();

    const row = rows[0];
    if (!row) {
      throw new HttpException(
        'no avatar_config for tenant',
        HttpStatus.NOT_FOUND,
      );
    }
    this.logger.log(`avatar_config updated for tenant ${tenant.id}`);
    return {
      id: row.id,
      tenantId: row.tenantId,
      beyAvatarId: row.beyAvatarId,
      elevenlabsVoiceId: row.elevenlabsVoiceId,
      language: row.language as AvatarConfigResponse['language'],
      personaPrompt: row.personaPrompt,
      greeting: row.greeting,
      isCustomAvatar: row.isCustomAvatar,
      allowScreenShare: row.allowScreenShare,
    };
  }
}
