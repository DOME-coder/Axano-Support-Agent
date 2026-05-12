import { useEffect, useRef, useState } from 'preact/hooks';
import {
  connect,
  type AgentState,
  type ConnectionState,
  type RoomHandle,
} from './livekit-client';
import {
  readActiveConversationId,
  writeActiveConversationId,
} from './conversation-storage';
import { fetchWidgetSession } from './session';
import { t, type StringKey } from './strings';

interface WidgetProps {
  apiUrl: string;
  tenantApiKey: string;
}

const STATUS_LABEL: Record<ConnectionState, StringKey> = {
  idle: 'status.idle',
  connecting: 'status.connecting',
  'requesting-permission': 'status.requestingPermission',
  connected: 'status.connected',
  error: 'status.error',
};

const AGENT_STATE_LABEL: Record<Exclude<AgentState, 'idle'>, StringKey> = {
  listening: 'agent.listening',
  speaking: 'agent.speaking',
};

export function Widget(props: WidgetProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConnectionState>('idle');
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [micEnabled, setMicEnabled] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<RoomHandle | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) {
      return;
    }
    let cancelled = false;
    const videoEl = videoRef.current;

    setState('connecting');
    setMicError(null);

    (async () => {
      try {
        const session = await fetchWidgetSession({
          apiUrl: props.apiUrl,
          tenantApiKey: props.tenantApiKey,
          resumeConversationId: readActiveConversationId(),
        });
        if (cancelled) {
          return;
        }
        // Persist (or refresh) the conversationId so the next modal
        // open within the resume window continues this row instead
        // of starting fresh. Server-side validation guarantees this
        // can't bind to another tenant's conversation.
        writeActiveConversationId(session.conversationId);
        const handle = await connect({
          url: session.url,
          token: session.token,
          videoElement: videoEl,
          onState: (s) => {
            if (!cancelled) {
              setState(s);
            }
          },
          onAgentState: (s) => {
            if (!cancelled) {
              setAgentState(s);
            }
          },
          onMicLevel: (level) => {
            if (!cancelled) {
              setMicLevel(level);
            }
          },
        });
        if (cancelled) {
          await handle.disconnect();
          return;
        }
        handleRef.current = handle;

        // Auto-enable microphone after the room is up so the user can
        // start speaking without a second click. If the browser denies
        // the permission we surface a localized hint and keep the mic
        // off — the avatar still plays, the user just can't reply.
        try {
          setState('requesting-permission');
          await handle.setMicrophoneEnabled(true);
          if (!cancelled) {
            setMicEnabled(true);
            setState('connected');
          }
        } catch (err) {
          if (!cancelled) {
            console.error('AvatarDesk: microphone permission denied', err);
            setMicError(t('mic.permissionDenied'));
            setMicEnabled(false);
            setState('connected');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('AvatarDesk: failed to start session', err);
          setState('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (handleRef.current) {
        handleRef.current.disconnect();
        handleRef.current = null;
      }
      setState('idle');
      setAgentState('idle');
      setMicEnabled(false);
      setMicLevel(0);
      setMicError(null);
    };
  }, [open, props.apiUrl, props.tenantApiKey]);

  const toggleMic = async () => {
    if (!handleRef.current) {
      return;
    }
    try {
      const next = !micEnabled;
      await handleRef.current.setMicrophoneEnabled(next);
      setMicEnabled(next);
      setMicError(null);
    } catch (err) {
      console.error('AvatarDesk: microphone toggle failed', err);
      setMicError(t('mic.permissionDenied'));
    }
  };

  const fillPct = Math.min(100, Math.round(micLevel * 200));
  const agentStateLabel =
    agentState === 'idle' ? null : t(AGENT_STATE_LABEL[agentState]);

  return (
    <div class="avatardesk-root">
      {!open && (
        <button
          class="avatardesk-trigger"
          aria-label={t('trigger.aria')}
          onClick={() => setOpen(true)}
        >
          {t('trigger.label')}
        </button>
      )}
      {open && (
        <div class="avatardesk-modal" role="dialog" aria-label={t('modal.aria')}>
          <div class="avatardesk-modal__header">
            <span class="avatardesk-modal__status">{t(STATUS_LABEL[state])}</span>
            <button
              class="avatardesk-modal__close"
              aria-label={t('modal.close')}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div class="avatardesk-modal__video">
            <video ref={videoRef} autoPlay playsInline />
            {state !== 'connected' && state !== 'requesting-permission' && (
              <span class="avatardesk-modal__placeholder">
                {t('placeholder.waitingForAvatar')}
              </span>
            )}
          </div>
          {state === 'connected' && (
            <div class="avatardesk-modal__controls">
              <button
                class="avatardesk-modal__mic-btn"
                aria-label={micEnabled ? t('mic.disable') : t('mic.enable')}
                aria-pressed={micEnabled}
                onClick={toggleMic}
              >
                {micEnabled ? '🎤' : '🔇'}
              </button>
              <div class="avatardesk-modal__mic-level" aria-hidden="true">
                <div
                  class="avatardesk-modal__mic-level-fill"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <span class="avatardesk-modal__agent-state">
                {agentStateLabel ?? ''}
              </span>
            </div>
          )}
          {micError && <div class="avatardesk-modal__mic-error">{micError}</div>}
          <div class="avatardesk-modal__footer">{t('footer.poweredBy')}</div>
        </div>
      )}
    </div>
  );
}
