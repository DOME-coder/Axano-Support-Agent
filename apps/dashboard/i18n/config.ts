// Locale config. Cookie-based instead of URL-prefix routing — the
// dashboard isn't SEO-relevant and a stable URL keeps the api routes,
// magic-link callbacks, and conversation deep-links simple. The
// switcher in DashboardShell writes this cookie; the request-config
// reader maps it to a messages bundle.

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'de';
export const LOCALE_COOKIE = 'avatardesk_locale';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'de' || value === 'en';
}
