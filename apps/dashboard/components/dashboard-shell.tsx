'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { fetchMe, logout } from '@/lib/api';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n/config';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const tShell = useTranslations('shell');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  const nav = [
    { href: '/avatar', label: tNav('avatar') },
    { href: '/knowledge', label: tNav('knowledge') },
    { href: '/conversations', label: tNav('conversations') },
    { href: '/embed', label: tNav('embed') },
  ];

  if (meQuery.isLoading) {
    return <main className="p-8 text-sm text-slate-500">{tCommon('loading')}</main>;
  }
  if (meQuery.isError || !meQuery.data) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return null;
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  function handleLocaleChange(next: Locale) {
    if (next === locale) return;
    // Client-side cookie write + refresh so the next request reads the
    // new locale via the next-intl request-config reader. Setting
    // SameSite=Lax keeps it usable across the magic-link redirect.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">
              {tShell('appName')} · {meQuery.data.name}
            </h1>
            <nav className="flex gap-1 text-sm">
              {nav.map((n) => {
                const active = pathname?.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`px-3 py-1.5 rounded ${
                      active
                        ? 'bg-slate-100 text-ink font-medium'
                        : 'text-slate-500 hover:text-ink'
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-xs text-slate-500 flex items-center gap-2">
              <span className="sr-only">{tShell('localeLabel')}</span>
              <select
                value={locale}
                onChange={(e) => handleLocaleChange(e.currentTarget.value as Locale)}
                className="text-xs rounded border border-slate-200 px-2 py-1 bg-white"
                aria-label={tShell('localeLabel')}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {l.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-ink"
            >
              {tShell('logout')}
            </button>
          </div>
        </div>
      </header>
      <section className="max-w-4xl mx-auto px-6 py-8">{children}</section>
    </main>
  );
}
