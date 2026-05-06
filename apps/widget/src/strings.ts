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
  | 'status.connected'
  | 'status.error'
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
    'status.connected': 'Verbunden',
    'status.error': 'Fehler',
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
    'status.connected': 'Connected',
    'status.error': 'Error',
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
