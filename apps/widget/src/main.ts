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
  apiUrl?: string;
  tenantApiKey?: string;
}

export interface ResolvedConfig {
  apiUrl: string;
  tenantApiKey: string;
}

function readScriptDataAttrs(): Partial<ResolvedConfig> {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    return {};
  }
  const apiUrl = script.dataset.apiUrl;
  const tenantApiKey = script.dataset.tenantApiKey;
  return {
    ...(apiUrl ? { apiUrl } : {}),
    ...(tenantApiKey ? { tenantApiKey } : {}),
  };
}

// Capture data attributes at module-load time, before any tenant code
// can swap document.currentScript out from under us.
const SCRIPT_DEFAULTS = readScriptDataAttrs();

function resolveConfig(options?: InitOptions): ResolvedConfig | null {
  const apiUrl = options?.apiUrl ?? SCRIPT_DEFAULTS.apiUrl;
  const tenantApiKey = options?.tenantApiKey ?? SCRIPT_DEFAULTS.tenantApiKey;
  if (!apiUrl || !tenantApiKey) {
    console.error(
      'AvatarDesk: missing apiUrl or tenantApiKey. Pass them via init() or as data-api-url / data-tenant-api-key on the <script> tag.',
    );
    return null;
  }
  return { apiUrl: apiUrl.replace(/\/$/, ''), tenantApiKey };
}

// Diagnostic: counts init() calls so we can spot double-mounts (HMR,
// duplicate <script> tag, etc.) that would create two Widget trees
// fighting for the same livekit room. Logged so the value shows up
// in the browser console at module load.
let initCount = 0;

function init(options?: InitOptions): void {
  initCount += 1;
  // eslint-disable-next-line no-console
  console.log('AvatarDesk: init() called, count=' + initCount, new Error().stack);
  const existing = document.querySelectorAll('[data-avatardesk]');
  if (existing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      'AvatarDesk: another widget host already exists in the DOM (' +
        existing.length +
        '). Skipping this init() to avoid duplicate-mount.',
    );
    return;
  }
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
