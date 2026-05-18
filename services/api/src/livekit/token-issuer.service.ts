import { Injectable, Logger } from '@nestjs/common';
import { AccessToken, RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk';
import { ROOM_AGENT_NAMES } from './room-agents';

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

    // Name must match the VideoGrant's room above. livekit cloud
    // rejects the token (websocket fails to open) when roomConfig is
    // present without a name — protobuf-es serializes the missing
    // field as `name: ""` which the server treats as a malformed
    // auto-create request.
    accessToken.roomConfig = new RoomConfiguration({
      name: input.room,
      agents: ROOM_AGENT_NAMES.map((agentName) => new RoomAgentDispatch({ agentName })),
    });

    const token = await accessToken.toJwt();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    this.logger.log(
      `issued widget token: room=${input.room} ttl=${ttlSeconds}s agents=[${ROOM_AGENT_NAMES.join(',')}]`,
    );

    return { url, token, expiresAt };
  }
}
