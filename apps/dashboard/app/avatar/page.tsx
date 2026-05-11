'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMe, logout } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AvatarPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  });

  if (isLoading) {
    return <main className="p-8 text-sm text-slate-500">Lädt…</main>;
  }

  if (isError || !data) {
    // The middleware should have caught this, but if the cookie is
    // stale and /me returns 401, kick back to login.
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
          <h1 className="text-lg font-semibold">AvatarDesk · {data.name}</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-ink"
          >
            Abmelden
          </button>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-2">Avatar-Konfiguration</h2>
        <p className="text-sm text-slate-500 mb-6">
          Persona, Stimme und Begrüßung — Form folgt in Task 1.4.2.
        </p>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-400">
          (Konfigurations-Form kommt in Task 1.4.2)
        </div>
      </section>
    </main>
  );
}
