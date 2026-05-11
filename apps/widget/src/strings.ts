// Tiny i18n scaffold — no library dependency in phase 0.
// Phase 2 will add IT/FR/ES; phase 3 may swap this for a proper
// runtime locale-switcher driven by tenant config.
// CLAUDE §11 forbids hardcoded UI strings — every visible string
// goes through this map.

type Locale = 'de' | 'en';

export type StringKey =
  | 'trigger.label'
  | 'trigger.aria'
  | 'modal.aria'
  | 'modal.close'
  | 'status.idle'
  | 'status.connecting'
  | 'status.requestingPermission'
  | 'status.connected'
  | 'status.error'
  | 'agent.listening'
  | 'agent.speaking'
  | 'mic.enable'
  | 'mic.disable'
  | 'mic.permissionDenied'
  | 'placeholder.waitingForAvatar'
  | 'footer.poweredBy';

const TABLE: Record<Locale, Record<StringKey, string>> = {
  de: {
    'trigger.label': '💬',
    'trigger.aria': 'Mit Sofia sprechen',
    'modal.aria': 'AvatarDesk-Konversation',
    'modal.close': 'Schließen',
    'status.idle': 'Bereit',
    'status.connecting': 'Verbinde…',
    'status.requestingPermission': 'Mikrofon-Freigabe…',
    'status.connected': 'Verbunden',
    'status.error': 'Fehler',
    'agent.listening': 'Sofia hört zu',
    'agent.speaking': 'Sofia spricht',
    'mic.enable': 'Mikrofon einschalten',
    'mic.disable': 'Mikrofon stummschalten',
    'mic.permissionDenied':
      'Mikrofon-Zugriff abgelehnt. Bitte in den Browser-Einstellungen freigeben und Modal neu öffnen.',
    'placeholder.waitingForAvatar': 'Avatar lädt…',
    'footer.poweredBy': 'powered by AvatarDesk',
  },
  en: {
    'trigger.label': '💬',
    'trigger.aria': 'Talk to Sofia',
    'modal.aria': 'AvatarDesk conversation',
    'modal.close': 'Close',
    'status.idle': 'Ready',
    'status.connecting': 'Connecting…',
    'status.requestingPermission': 'Microphone permission…',
    'status.connected': 'Connected',
    'status.error': 'Error',
    'agent.listening': 'Sofia is listening',
    'agent.speaking': 'Sofia is speaking',
    'mic.enable': 'Enable microphone',
    'mic.disable': 'Mute microphone',
    'mic.permissionDenied':
      'Microphone access denied. Enable it in your browser settings and re-open the modal.',
    'placeholder.waitingForAvatar': 'Loading avatar…',
    'footer.poweredBy': 'powered by AvatarDesk',
  },
};

let activeLocale: Locale = 'de';

export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

export function t(key: StringKey): string {
  return TABLE[activeLocale][key];
}
