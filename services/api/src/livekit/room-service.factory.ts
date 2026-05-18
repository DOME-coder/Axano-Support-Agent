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

  /**
   * Idempotent: creates the room if it doesn't exist yet, otherwise
   * writes the metadata to the existing room. Either way the room
   * carries the given metadata once this resolves.
   *
   * Without this, two failure modes leave livekit rooms without the
   * `{conversationId}` metadata that the agents read at dispatch:
   *  (1) resume path — the widget reuses an existing conversation, we
   *      skip createRoom, and the cloud-side room may have been evicted
   *      via emptyTimeout in the meantime; the next join then lazy-
   *      creates it without metadata.
   *  (2) the rare race where createRoom 4xx's on an already-existing
   *      room from a previous test session.
   * In both cases the vision-worker entrypoint sees an empty metadata
   * field, logs `no conversation id in room metadata`, and exits — the
   * analyze_screen tool then has no redis snapshot to read.
   */
  async ensureRoomMetadata(opts: {
    name: string;
    metadata: string;
    emptyTimeout?: number;
  }): Promise<void> {
    try {
      await this.inner.createRoom(opts);
      return;
    } catch (err) {
      const message = (err as Error).message ?? '';
      // The cloud returns the protobuf-style "AlreadyExists" / "exists"
      // — we don't depend on an exact error code because the SDK
      // surfaces it differently across versions.
      if (!/already.?exists|exists/i.test(message)) {
        throw err;
      }
    }
    // Room already there → just stamp the metadata. updateRoomMetadata
    // is safe to call repeatedly with the same payload.
    await this.inner.updateRoomMetadata(opts.name, opts.metadata);
  }
}
