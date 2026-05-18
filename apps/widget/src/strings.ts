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
  | 'screen.start'
  | 'screen.stop'
  | 'screen.active'
  | 'screen.errorDenied'
  | 'screen.consent.title'
  | 'screen.consent.body'
  | 'screen.consent.accept'
  | 'screen.consent.cancel'
  | 'placeholder.waitingForAvatar'
  | 'csat.title'
  | 'csat.subtitle'
  | 'csat.starAria'
  | 'csat.commentPlaceholder'
  | 'csat.submit'
  | 'csat.skip'
  | 'csat.thanks'
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
    'screen.start': 'Bildschirm teilen',
    'screen.stop': 'Teilen beenden',
    'screen.active': 'Du teilst gerade deinen Bildschirm',
    'screen.errorDenied':
      'Bildschirmfreigabe abgelehnt oder abgebrochen. Du kannst es jederzeit erneut versuchen.',
    'screen.consent.title': 'Bildschirm teilen',
    'screen.consent.body':
      'Sofia kann sehen, was du teilst, und dir konkrete Klick-für-Klick-Hilfe geben. ' +
      'Standbilder werden an einen LLM-Anbieter (Anthropic) gesendet und nicht ' +
      'gespeichert. Bitte teile nur das einzelne Fenster, das du brauchst — nicht ' +
      'den ganzen Bildschirm — und schließe vorher Tabs mit sensiblen Inhalten ' +
      '(Online-Banking, E-Mail, Behörden).',
    'screen.consent.accept': 'Verstanden, teilen',
    'screen.consent.cancel': 'Abbrechen',
    'placeholder.waitingForAvatar': 'Avatar lädt…',
    'csat.title': 'Wie war dein Gespräch mit Sofia?',
    'csat.subtitle': 'Deine Bewertung hilft uns, besser zu werden.',
    'csat.starAria': 'Sterne',
    'csat.commentPlaceholder': 'Was sollten wir wissen? (optional)',
    'csat.submit': 'Senden',
    'csat.skip': 'Überspringen',
    'csat.thanks': 'Danke für deine Bewertung!',
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
    'screen.start': 'Share screen',
    'screen.stop': 'Stop sharing',
    'screen.active': 'You are sharing your screen',
    'screen.errorDenied':
      'Screen share was denied or cancelled. You can try again at any time.',
    'screen.consent.title': 'Share your screen',
    'screen.consent.body':
      'Sofia can see what you share and give you precise click-by-click help. ' +
      'Still frames are sent to an LLM provider (Anthropic) and are not stored. ' +
      'Please share only the single window you need — not your whole screen — ' +
      'and close tabs with sensitive content (online banking, email, government ' +
      'forms) before you start.',
    'screen.consent.accept': 'Got it, share',
    'screen.consent.cancel': 'Cancel',
    'placeholder.waitingForAvatar': 'Loading avatar…',
    'csat.title': 'How was your conversation with Sofia?',
    'csat.subtitle': 'Your rating helps us improve.',
    'csat.starAria': 'stars',
    'csat.commentPlaceholder': 'Anything we should know? (optional)',
    'csat.submit': 'Send',
    'csat.skip': 'Skip',
    'csat.thanks': 'Thanks for your feedback!',
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
