'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchMe, logout } from '@/lib/api';

const NAV = [
  { href: '/avatar', label: 'Avatar' },
  { href: '/knowledge', label: 'Wissen' },
  { href: '/embed', label: 'Embed' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const meQuery = useQuery({ queryKey: ['me'], queryFn: fetchMe });

  if (meQuery.isLoading) {
    return <main className="p-8 text-sm text-slate-500">Lädt…</main>;
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

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">AvatarDesk · {meQuery.data.name}</h1>
            <nav className="flex gap-1 text-sm">
              {NAV.map((n) => {
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
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-ink"
          >
            Abmelden
          </button>
        </div>
      </header>
      <section className="max-w-4xl mx-auto px-6 py-8">{children}</section>
    </main>
  );
}
