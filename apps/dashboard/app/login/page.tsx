'use client';

import { useState } from 'react';
import { requestMagicLink } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage(null);
    try {
      await requestMagicLink(email.trim().toLowerCase());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold mb-1">AvatarDesk Dashboard</h1>
        <p className="text-sm text-slate-500 mb-6">
          Trage deine Tenant-E-Mail-Adresse ein, um einen Magic-Link zu erhalten.
        </p>

        {status === 'sent' ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
            <p className="font-medium mb-1">Magic-Link angefordert.</p>
            <p className="text-slate-600">
              Phase 1 (Dev-Mode): Der Link wurde nach
              <code className="mx-1 px-1 bg-white border border-slate-200 rounded">
                .last-magic-link.local
              </code>
              im Repo-Root geschrieben. Datei öffnen und die URL klicken.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setEmail('');
              }}
              className="mt-3 text-sm text-accent hover:underline"
            >
              Andere E-Mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">E-Mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                disabled={status === 'submitting'}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="team@axano.com"
              />
            </label>

            {errorMessage && (
              <p className="text-sm text-red-600">Fehler: {errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full rounded-lg bg-ink text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sende…' : 'Magic-Link anfordern'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400">
          Phase 1 — Dev-Mode aktiv (Magic-Link via Server-Console). Siehe
          ADR 006.
        </div>
      </div>
    </main>
  );
}
