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
import { fetchWidgetSession, submitCsat } from './session';
import { setLocale, t, type StringKey } from './strings';

// Below this conversation length we don't bother the user with a
// rating prompt — they barely had time to form an opinion and the
// score would mostly be noise.
const CSAT_MIN_DURATION_MS = 30_000;

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
  // Tenant-level gate from the session response. The share UI is
  // hidden entirely when this is false — opt-in lives in the
  // dashboard avatar-config form (ADR 007 §A).
  const [allowScreenShare, setAllowScreenShare] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  // CSAT state. conversationId + connectedAtMs are captured at session
  // start so we can decide on close whether to show the overlay. The
  // submittedRef guards against re-prompting after a user already
  // rated within the same session (the modal can be closed twice if
  // the close button is hit during the "thanks" step).
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [connectedAtMs, setConnectedAtMs] = useState<number | null>(null);
  const [showCsat, setShowCsat] = useState(false);
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState('');
  const [csatSubmitting, setCsatSubmitting] = useState(false);
  const [csatThanks, setCsatThanks] = useState(false);
  const csatSubmittedRef = useRef(false);

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
        // Pick the widget locale from the tenant's avatar config.
        // Unknown codes fall back to 'de' so the widget never renders
        // a bare string key. The cast is safe because only the keys
        // that LANGUAGE_PERSONA_HINTS handles on the agent side will
        // ever be set in the dashboard's allowed dropdown.
        setLocale(session.avatar.language === 'en' ? 'en' : 'de');
        if (!cancelled) {
          setAllowScreenShare(session.avatar.allowScreenShare);
          setConversationId(session.conversationId);
          setConnectedAtMs(Date.now());
        }
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
          onScreenShareState: (enabled) => {
            if (!cancelled) {
              setScreenShareEnabled(enabled);
              if (!enabled) {
                setScreenShareError(null);
              }
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
      setAllowScreenShare(false);
      setScreenShareEnabled(false);
      setShowConsent(false);
      setScreenShareError(null);
      setConversationId(null);
      setConnectedAtMs(null);
      setShowCsat(false);
      setCsatScore(0);
      setCsatComment('');
      setCsatSubmitting(false);
      setCsatThanks(false);
      csatSubmittedRef.current = false;
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

  const onShareClick = () => {
    if (!handleRef.current) {
      return;
    }
    if (screenShareEnabled) {
      // No second consent on stop.
      void stopShare();
      return;
    }
    setScreenShareError(null);
    setShowConsent(true);
  };

  const acceptConsent = async () => {
    setShowConsent(false);
    if (!handleRef.current) {
      return;
    }
    try {
      await handleRef.current.setScreenShareEnabled(true);
      // The connect-time onScreenShareState callback also fires and
      // sets the same state; setting it here as well keeps the UI
      // responsive even if the LiveKit event arrives a tick later.
      setScreenShareEnabled(true);
      setScreenShareError(null);
    } catch (err) {
      // Browser picker cancel = DOMException NotAllowedError. Treat
      // all errors as a soft denial — re-tryable, no scary message.
      console.error('AvatarDesk: screen-share failed', err);
      setScreenShareEnabled(false);
      setScreenShareError(t('screen.errorDenied'));
    }
  };

  const cancelConsent = () => {
    setShowConsent(false);
  };

  const handleCloseClick = () => {
    // Show the CSAT overlay only once per session, only if the user
    // had enough time to form an opinion, and only if the API actually
    // gave us a conversationId to attach the score to.
    const eligible =
      !csatSubmittedRef.current &&
      conversationId !== null &&
      connectedAtMs !== null &&
      Date.now() - connectedAtMs >= CSAT_MIN_DURATION_MS;
    if (eligible && !showCsat) {
      setShowCsat(true);
      return;
    }
    setOpen(false);
  };

  const submitCsatNow = async () => {
    if (!conversationId || csatScore < 1 || csatScore > 5) {
      return;
    }
    setCsatSubmitting(true);
    try {
      await submitCsat({
        apiUrl: props.apiUrl,
        tenantApiKey: props.tenantApiKey,
        conversationId,
        score: csatScore,
        comment: csatComment,
      });
      csatSubmittedRef.current = true;
      setCsatThanks(true);
      // Short visual confirmation before the modal goes away so the
      // submit doesn't feel like a no-op. The cleanup useEffect resets
      // state when `open` flips to false.
      window.setTimeout(() => {
        setOpen(false);
      }, 1200);
    } catch (err) {
      console.error('AvatarDesk: csat submit failed', err);
      // Soft failure: close anyway, the score is best-effort. The
      // dashboard will just not see this rating.
      setOpen(false);
    } finally {
      setCsatSubmitting(false);
    }
  };

  const skipCsat = () => {
    csatSubmittedRef.current = true;
    setOpen(false);
  };

  const stopShare = async () => {
    if (!handleRef.current) {
      return;
    }
    try {
      await handleRef.current.setScreenShareEnabled(false);
      setScreenShareEnabled(false);
      setScreenShareError(null);
    } catch (err) {
      console.error('AvatarDesk: stop screen-share failed', err);
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
            <div>
              <span class="avatardesk-modal__status">{t(STATUS_LABEL[state])}</span>
              {screenShareEnabled && (
                <span class="avatardesk-modal__share-indicator" role="status">
                  {t('screen.active')}
                </span>
              )}
            </div>
            <button
              class="avatardesk-modal__close"
              aria-label={t('modal.close')}
              onClick={handleCloseClick}
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
            {showConsent && (
              <div class="avatardesk-consent" role="dialog" aria-modal="true">
                <div class="avatardesk-consent__card">
                  <h3 class="avatardesk-consent__title">{t('screen.consent.title')}</h3>
                  <p class="avatardesk-consent__body">{t('screen.consent.body')}</p>
                  <div class="avatardesk-consent__actions">
                    <button
                      type="button"
                      class="avatardesk-consent__btn"
                      onClick={cancelConsent}
                    >
                      {t('screen.consent.cancel')}
                    </button>
                    <button
                      type="button"
                      class="avatardesk-consent__btn avatardesk-consent__btn--primary"
                      onClick={acceptConsent}
                    >
                      {t('screen.consent.accept')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showCsat && (
              <div class="avatardesk-csat" role="dialog" aria-modal="true">
                <div class="avatardesk-csat__card">
                  {csatThanks ? (
                    <div class="avatardesk-csat__thanks" role="status">
                      {t('csat.thanks')}
                    </div>
                  ) : (
                    <>
                      <h3 class="avatardesk-csat__title">{t('csat.title')}</h3>
                      <p class="avatardesk-csat__subtitle">{t('csat.subtitle')}</p>
                      <div
                        class="avatardesk-csat__stars"
                        role="radiogroup"
                        aria-label={t('csat.starAria')}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={csatScore === n}
                            aria-label={`${n} / 5`}
                            class="avatardesk-csat__star"
                            onClick={() => setCsatScore(n)}
                          >
                            {n <= csatScore ? '★' : '☆'}
                          </button>
                        ))}
                      </div>
                      <textarea
                        class="avatardesk-csat__comment"
                        placeholder={t('csat.commentPlaceholder')}
                        maxLength={500}
                        value={csatComment}
                        onInput={(e) =>
                          setCsatComment((e.currentTarget as HTMLTextAreaElement).value)
                        }
                      />
                      <div class="avatardesk-csat__actions">
                        <button
                          type="button"
                          class="avatardesk-csat__btn"
                          onClick={skipCsat}
                          disabled={csatSubmitting}
                        >
                          {t('csat.skip')}
                        </button>
                        <button
                          type="button"
                          class="avatardesk-csat__btn avatardesk-csat__btn--primary"
                          onClick={submitCsatNow}
                          disabled={csatScore < 1 || csatSubmitting}
                        >
                          {t('csat.submit')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
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
              {allowScreenShare && (
                <button
                  type="button"
                  class="avatardesk-modal__share-btn"
                  aria-pressed={screenShareEnabled}
                  onClick={onShareClick}
                >
                  {screenShareEnabled ? t('screen.stop') : t('screen.start')}
                </button>
              )}
            </div>
          )}
          {micError && <div class="avatardesk-modal__mic-error">{micError}</div>}
          {screenShareError && (
            <div class="avatardesk-modal__share-error">{screenShareError}</div>
          )}
          <div class="avatardesk-modal__footer">{t('footer.poweredBy')}</div>
        </div>
      )}
    </div>
  );
}
