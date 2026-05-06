import { render, h } from 'preact';
import { Widget } from './widget';
import { injectStyles } from './styles';

declare global {
  interface Window {
    AvatarDesk: {
      init: (options?: InitOptions) => void;
    };
  }
}

interface InitOptions {
  livekitUrl?: string;
  livekitToken?: string;
}

interface ResolvedConfig {
  livekitUrl: string;
  livekitToken: string;
}

const PHASE_0_TOKEN_WARNING = [
  'AvatarDesk: phase-0 token mode active, do not use in production.',
  'See docs/decisions/003-phase-0-token-workaround.md for the safe',
  'phase-1 pattern (POST /api/widget-session with tenant auth and',
  'short-lived per-conversation tokens).',
].join(' ');

function readScriptDataAttrs(): Partial<ResolvedConfig> {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    return {};
  }
  const url = script.dataset.livekitUrl;
  const token = script.dataset.livekitToken;
  return {
    ...(url ? { livekitUrl: url } : {}),
    ...(token ? { livekitToken: token } : {}),
  };
}

// Capture data attributes at module-load time, before any tenant code
// can swap document.currentScript out from under us.
const SCRIPT_DEFAULTS = readScriptDataAttrs();

function resolveConfig(options?: InitOptions): ResolvedConfig | null {
  const livekitUrl = options?.livekitUrl ?? SCRIPT_DEFAULTS.livekitUrl;
  const livekitToken = options?.livekitToken ?? SCRIPT_DEFAULTS.livekitToken;
  if (!livekitUrl || !livekitToken) {
    console.error(
      'AvatarDesk: missing livekitUrl or livekitToken. Pass them via init() or as data-livekit-url / data-livekit-token on the <script> tag.',
    );
    return null;
  }
  // Phase-0 only safety warning (see ADR 003). The console.warn fires
  // on every init(), so it is hard for this token-leak pattern to ship
  // unnoticed.
  console.warn(PHASE_0_TOKEN_WARNING);
  return { livekitUrl, livekitToken };
}

function init(options?: InitOptions): void {
  const config = resolveConfig(options);
  if (!config) {
    return;
  }
  injectStyles();
  const host = document.createElement('div');
  host.setAttribute('data-avatardesk', '');
  document.body.appendChild(host);
  render(h(Widget, config), host);
}

window.AvatarDesk = { init };
