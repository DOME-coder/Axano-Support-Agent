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

function init(options?: InitOptions): void {
  // Guard against duplicate mounts. Two trees competing for the same
  // livekit room cause the publish/disconnect loop we hit during
  // welle-A verification on 2026-05-18.
  if (document.querySelectorAll('[data-avatardesk]').length > 0) {
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
