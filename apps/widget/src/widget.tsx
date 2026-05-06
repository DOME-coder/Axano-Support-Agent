import { useEffect, useRef, useState } from 'preact/hooks';
import { connect, type ConnectionState, type RoomHandle } from './livekit-client';
import { t, type StringKey } from './strings';

interface WidgetProps {
  livekitUrl: string;
  livekitToken: string;
}

const STATUS_LABEL: Record<ConnectionState, StringKey> = {
  idle: 'status.idle',
  connecting: 'status.connecting',
  connected: 'status.connected',
  error: 'status.error',
};

export function Widget(props: WidgetProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConnectionState>('idle');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handleRef = useRef<RoomHandle | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) {
      return;
    }
    let cancelled = false;
    const videoEl = videoRef.current;

    connect({
      url: props.livekitUrl,
      token: props.livekitToken,
      videoElement: videoEl,
      onState: (s) => {
        if (!cancelled) {
          setState(s);
        }
      },
    })
      .then((handle) => {
        if (cancelled) {
          handle.disconnect();
          return;
        }
        handleRef.current = handle;
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('AvatarDesk: failed to connect', err);
          setState('error');
        }
      });

    return () => {
      cancelled = true;
      if (handleRef.current) {
        handleRef.current.disconnect();
        handleRef.current = null;
      }
      setState('idle');
    };
  }, [open, props.livekitUrl, props.livekitToken]);

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
            {state !== 'connected' && (
              <span class="avatardesk-modal__placeholder">
                {t('placeholder.waitingForAvatar')}
              </span>
            )}
          </div>
          <div class="avatardesk-modal__footer">{t('footer.poweredBy')}</div>
        </div>
      )}
    </div>
  );
}
