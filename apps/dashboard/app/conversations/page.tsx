'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ConversationListItem } from '@avatardesk/shared';
import { fetchConversations } from '@/lib/conversations-api';
import { DashboardShell } from '@/components/dashboard-shell';

const PAGE_SIZE = 20;

export default function ConversationsPage() {
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['conversations', page],
    queryFn: () => fetchConversations(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold">Konversationen</h2>
          <p className="text-sm text-slate-500">
            Alle Gespräche, die deine Endkunden mit Sofia geführt haben.
            Klick auf eine Zeile, um das Transkript zu sehen.
          </p>
        </header>

        {listQuery.isLoading ? (
          <SkeletonTable />
        ) : listQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Konversationen konnten nicht geladen werden.
          </div>
        ) : !listQuery.data || listQuery.data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ConversationsTable items={listQuery.data.items} />
            <Pagination
              page={page}
              pageSize={listQuery.data.pageSize}
              total={listQuery.data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function ConversationsTable({ items }: { items: ConversationListItem[] }) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Datum</th>
            <th className="px-4 py-2 font-medium">Dauer</th>
            <th className="px-4 py-2 font-medium">Sprache</th>
            <th className="px-4 py-2 font-medium text-right">Messages</th>
            <th className="px-4 py-2 font-medium text-right">BP-Min</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">CSAT</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-slate-50 cursor-pointer"
              onClick={() => {
                window.location.href = `/conversations/${item.id}`;
              }}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/conversations/${item.id}`}
                  className="text-ink hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {formatDate(item.startedAt)}
                </Link>
                {item.hasVision && (
                  <span
                    title="Bildschirm wurde analysiert"
                    className="ml-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500"
                  >
                    Vision
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDuration(item.durationSeconds)}
              </td>
              <td className="px-4 py-3 text-slate-600 uppercase">{item.language}</td>
              <td className="px-4 py-3 text-right text-slate-600">{item.messageCount}</td>
              <td className="px-4 py-3 text-right text-slate-600">
                {formatMinutes(item.beyMinutesUsed)}
              </td>
              <td className="px-4 py-3">
                <ResolutionBadge resolution={item.resolution} />
              </td>
              <td className="px-4 py-3">
                {item.csatScore == null ? (
                  <span className="text-slate-300">—</span>
                ) : (
                  <Stars score={item.csatScore} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResolutionBadge({ resolution }: { resolution: ConversationListItem['resolution'] }) {
  const map: Record<ConversationListItem['resolution'], { label: string; cls: string }> = {
    pending: { label: 'läuft', cls: 'bg-blue-50 text-blue-700' },
    resolved: { label: 'gelöst', cls: 'bg-green-50 text-green-700' },
    escalated: { label: 'eskaliert', cls: 'bg-amber-50 text-amber-700' },
    abandoned: { label: 'abgebrochen', cls: 'bg-slate-100 text-slate-500' },
  };
  const { label, cls } = map[resolution];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${cls}`}>{label}</span>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <span aria-label={`${score} von 5 Sternen`} className="text-amber-500">
      {'★'.repeat(score)}
      <span className="text-slate-200">{'★'.repeat(5 - score)}</span>
    </span>
  );
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage === 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <div>
        {from}–{to} von {total}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-400">
      Lädt Konversationen…
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-white p-12 text-center">
      <p className="text-sm text-slate-600">Noch keine Konversationen.</p>
      <p className="mt-1 text-xs text-slate-400">
        Sobald deine Endkunden mit Sofia sprechen, erscheinen sie hier.
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatMinutes(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toFixed(2);
}
