import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InternalServiceGuard } from '../auth/internal-service.guard';
import { DRIZZLE_DB, type DrizzleDB } from '../db/db.module';
import { avatarConfigs, conversations, messages } from '../db/schema';

interface AgentConfigResponse {
  conversationId: string;
  tenantId: string;
  language: string;
  beyAvatarId: string;
  elevenlabsVoiceId: string;
  personaPrompt: string;
  greeting: string;
}

interface AppendMessageBody {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  audioDurationMs?: number;
}

interface PatchConversationBody {
  endedAt?: string;
  resolution?: 'pending' | 'resolved' | 'escalated' | 'abandoned';
  beyMinutesUsed?: number;
}

@Controller('api/internal/conversations')
@UseGuards(InternalServiceGuard)
export class InternalConversationsController {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  @Get(':id/agent-config')
  async agentConfig(@Param('id') id: string): Promise<AgentConfigResponse> {
    const rows = await this.db
      .select({
        conversationId: conversations.id,
        tenantId: conversations.tenantId,
        language: conversations.language,
        beyAvatarId: avatarConfigs.beyAvatarId,
        elevenlabsVoiceId: avatarConfigs.elevenlabsVoiceId,
        personaPrompt: avatarConfigs.personaPrompt,
        greeting: avatarConfigs.greeting,
      })
      .from(conversations)
      .innerJoin(avatarConfigs, eq(avatarConfigs.tenantId, conversations.tenantId))
      .where(eq(conversations.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new HttpException('conversation not found', HttpStatus.NOT_FOUND);
    }
    return row;
  }

  @Post(':id/messages')
  async appendMessage(
    @Param('id') id: string,
    @Body() body: AppendMessageBody,
  ): Promise<{ ok: true }> {
    if (!body.role || !body.content) {
      throw new HttpException('role and content are required', HttpStatus.BAD_REQUEST);
    }
    await this.db.insert(messages).values({
      conversationId: id,
      role: body.role,
      content: body.content,
      audioDurationMs: body.audioDurationMs ?? null,
    });
    return { ok: true };
  }

  @Patch(':id')
  async patchConversation(
    @Param('id') id: string,
    @Body() body: PatchConversationBody,
  ): Promise<{ ok: true }> {
    const update: Record<string, unknown> = {};
    if (body.endedAt !== undefined) {
      update.endedAt = new Date(body.endedAt);
    }
    if (body.resolution !== undefined) {
      update.resolution = body.resolution;
    }
    if (body.beyMinutesUsed !== undefined) {
      update.beyMinutesUsed = String(body.beyMinutesUsed);
    }
    if (Object.keys(update).length === 0) {
      return { ok: true };
    }
    await this.db.update(conversations).set(update).where(eq(conversations.id, id));
    return { ok: true };
  }
}
