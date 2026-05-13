import { Injectable, Logger } from '@nestjs/common';
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk';

// Two workers run in parallel per room (see plan "Sprint 2.1.5"):
// the conversational agent drives stt+llm+tts+bey, the vision worker
// samples shared-screen frames and writes redis snapshots for the
// analyze_screen tool. Both register with these exact agent_name
// strings in their WorkerOptions, so livekit dispatches both when
// the token's roomConfig lists them here.
const ROOM_AGENTS = ['conversational-agent', 'vision-worker'] as const;

export interface WidgetTokenInput {
  room: string;
  identity: string;
  ttlSeconds?: number;
}

export interface WidgetToken {
  url: string;
  token: string;
  expiresAt: Date;
}

const DEFAULT_TTL_SECONDS = 60 * 60;

@Injectable()
export class TokenIssuerService {
  private readonly logger = new Logger(TokenIssuerService.name);

  async issueWidgetToken(input: WidgetTokenInput): Promise<WidgetToken> {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required');
    }

    const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: input.identity,
      ttl: ttlSeconds,
    });

    accessToken.addGrant({
      roomJoin: true,
      room: input.room,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    accessToken.roomConfig = new RoomConfiguration({
      agents: ROOM_AGENTS.map((agentName) => new RoomAgentDispatch({ agentName })),
    });

    const token = await accessToken.toJwt();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    this.logger.log(
      `issued widget token: room=${input.room} ttl=${ttlSeconds}s agents=[${ROOM_AGENTS.join(',')}]`,
    );

    return { url, token, expiresAt };
  }
}
