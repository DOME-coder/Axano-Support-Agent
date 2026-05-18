import {
  Room,
  RoomEvent,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
  type Participant,
} from 'livekit-client';

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'requesting-permission'
  | 'connected'
  | 'error';

// Once we are connected, the agent state cycles. This is derived
// purely from who has audio activity in the room, which keeps the
// state machine simple and reliable without depending on LiveKit
// data-channel messages that the agent may or may not emit.
export type AgentState = 'idle' | 'listening' | 'speaking';

export interface ConnectOptions {
  url: string;
  token: string;
  videoElement: HTMLVideoElement;
  onState: (state: ConnectionState) => void;
  onAgentState?: (state: AgentState) => void;
  onMicLevel?: (level: number) => void;
  // Fires when the local screen-share state changes — either because
  // the widget toggled it or because the user clicked the browser's
  // native "Stop sharing" indicator (which we listen for via the
  // track's ended event below). UI uses this to keep the share button
  // and the live indicator in sync.
  onScreenShareState?: (enabled: boolean) => void;
}

export interface RoomHandle {
  disconnect: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  isMicrophoneEnabled: () => boolean;
  setScreenShareEnabled: (enabled: boolean) => Promise<void>;
  isScreenShareEnabled: () => boolean;
}

const MIC_LEVEL_INTERVAL_MS = 100;

export async function connect(options: ConnectOptions): Promise<RoomHandle> {
  const {
    url,
    token,
    videoElement,
    onState,
    onAgentState,
    onMicLevel,
    onScreenShareState,
  } = options;
  const room = new Room({ adaptiveStream: true, dynacast: true });

  onState('connecting');

  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
        // The avatar publishes both video and audio on the same
        // participant. Attaching audio to a <video> element makes the
        // browser play it without an autoplay click.
        track.attach(videoElement);
      }
    },
  );

  room.on(RoomEvent.Disconnected, (reason) => {
    // eslint-disable-next-line no-console
    console.log('AvatarDesk livekit: RoomEvent.Disconnected reason=' + reason);
    onState('idle');
  });
  room.on(RoomEvent.Reconnecting, () => onState('connecting'));
  room.on(RoomEvent.Reconnected, () => onState('connected'));

  // ActiveSpeakersChanged fires whenever the set of speakers in the
  // room changes. We derive the agent state from it: if the local
  // participant is active -> listening, if a remote is active ->
  // speaking, else idle.
  room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
    if (!onAgentState) {
      return;
    }
    const localSid = room.localParticipant.sid;
    const localActive = speakers.some((s) => s.sid === localSid);
    const remoteActive = speakers.some((s) => s.sid !== localSid);
    if (localActive) {
      onAgentState('listening');
    } else if (remoteActive) {
      onAgentState('speaking');
    } else {
      onAgentState('idle');
    }
  });

  try {
    await room.connect(url, token);
    onState('connected');
  } catch (err) {
    onState('error');
    throw err;
  }

  // Microphone level polling — only when a callback is registered.
  // We read audioLevel off the local participant; LiveKit updates it
  // server-side based on the published track. This is cheaper than
  // running our own AudioContext analyzer.
  let levelTimer: ReturnType<typeof setInterval> | null = null;
  if (onMicLevel) {
    levelTimer = setInterval(() => {
      const level = room.localParticipant.audioLevel ?? 0;
      onMicLevel(level);
    }, MIC_LEVEL_INTERVAL_MS);
  }

  // Sync the screen-share state callback when the user stops sharing
  // via the browser's native "Stop sharing" banner — LiveKit fires
  // LocalTrackUnpublished for the screen track in that case, and we
  // need the widget UI to follow along.
  room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
    if (publication.source === Track.Source.ScreenShare && onScreenShareState) {
      onScreenShareState(false);
    }
  });

  return {
    disconnect: async () => {
      // eslint-disable-next-line no-console
      console.log('AvatarDesk livekit: room.disconnect() called by widget');
      if (levelTimer) {
        clearInterval(levelTimer);
      }
      await room.disconnect();
    },
    setMicrophoneEnabled: async (enabled: boolean) => {
      // Throws if the user denies the getUserMedia permission prompt.
      // Caller is responsible for mapping that to a UI hint.
      await room.localParticipant.setMicrophoneEnabled(enabled);
    },
    isMicrophoneEnabled: () => room.localParticipant.isMicrophoneEnabled,
    setScreenShareEnabled: async (enabled: boolean) => {
      // getDisplayMedia() throws a DOMException with name "NotAllowedError"
      // when the user cancels the browser picker. That's a user-driven
      // outcome, not a real error — but LiveKit re-throws it as-is, so
      // the caller still needs to handle both that and other failures
      // (no devices, OS-level screen-record permission off on macOS).
      await room.localParticipant.setScreenShareEnabled(enabled);
      if (onScreenShareState) {
        onScreenShareState(enabled);
      }
    },
    isScreenShareEnabled: () => room.localParticipant.isScreenShareEnabled,
  };
}
