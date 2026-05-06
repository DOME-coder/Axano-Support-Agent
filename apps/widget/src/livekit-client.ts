import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
} from 'livekit-client';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export interface ConnectOptions {
  url: string;
  token: string;
  videoElement: HTMLVideoElement;
  onState: (state: ConnectionState) => void;
}

export interface RoomHandle {
  disconnect: () => Promise<void>;
}

export async function connect(options: ConnectOptions): Promise<RoomHandle> {
  const { url, token, videoElement, onState } = options;
  const room = new Room({ adaptiveStream: true, dynacast: true });

  onState('connecting');

  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        track.attach(videoElement);
      }
      if (track.kind === Track.Kind.Audio) {
        // Audio tracks need an attach target so the browser actually plays them.
        // Avatar audio comes through the same participant as video.
        track.attach(videoElement);
      }
    },
  );

  room.on(RoomEvent.Disconnected, () => onState('idle'));
  room.on(RoomEvent.Reconnecting, () => onState('connecting'));
  room.on(RoomEvent.Reconnected, () => onState('connected'));

  try {
    await room.connect(url, token);
    onState('connected');
  } catch (err) {
    onState('error');
    throw err;
  }

  return {
    disconnect: async () => {
      await room.disconnect();
    },
  };
}
