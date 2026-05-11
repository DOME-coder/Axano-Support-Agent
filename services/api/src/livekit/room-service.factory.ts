import { Injectable } from '@nestjs/common';
import { RoomServiceClient as SdkRoomServiceClient } from 'livekit-server-sdk';

// Thin DI wrapper around livekit-server-sdk's RoomServiceClient so
// the controller and tests can depend on a Nest provider rather
// than constructing the SDK client inline.
//
// Host is derived from LIVEKIT_URL. The SDK expects http(s):// but
// LIVEKIT_URL is the wss:// form used by clients — we rewrite the
// protocol on the way in.

function toHttpHost(wssUrl: string): string {
  if (wssUrl.startsWith('wss://')) {
    return `https://${wssUrl.slice('wss://'.length)}`;
  }
  if (wssUrl.startsWith('ws://')) {
    return `http://${wssUrl.slice('ws://'.length)}`;
  }
  return wssUrl;
}

@Injectable()
export class RoomServiceClient {
  private readonly inner: SdkRoomServiceClient;

  constructor() {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) {
      throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required');
    }
    this.inner = new SdkRoomServiceClient(toHttpHost(url), apiKey, apiSecret);
  }

  async createRoom(opts: { name: string; metadata?: string; emptyTimeout?: number }) {
    return this.inner.createRoom(opts);
  }
}
