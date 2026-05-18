'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ConversationListItem } from '@avatardesk/shared';
import { fetchConversations } from '@/lib/conversations-api';
import { DashboardShell } from '@/components/dashboard-shell';

const PAGE_SIZE = 20;

export default function ConversationsPage() {
  const t = useTranslations('conversations');
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
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <p className="text-sm text-slate-500">{t('subtitle')}</p>
        </header>

        {listQuery.isLoading ? (
          <SkeletonTable label={t('loading')} />
        ) : listQuery.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('loadError')}
          </div>
        ) : !listQuery.data || listQuery.data.items.length === 0 ? (
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
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
  const t = useTranslations('conversations');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">{t('tableDate')}</th>
            <th className="px-4 py-2 font-medium">{t('tableDuration')}</th>
            <th className="px-4 py-2 font-medium">{t('tableLanguage')}</th>
            <th className="px-4 py-2 font-medium text-right">{t('tableMessages')}</th>
            <th className="px-4 py-2 font-medium text-right">{t('tableBpMin')}</th>
            <th className="px-4 py-2 font-medium">{t('tableStatus')}</th>
            <th className="px-4 py-2 font-medium">{t('tableCsat')}</th>
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
                  {formatDate(item.startedAt, dateLocale)}
                </Link>
                {item.hasVision && (
                  <span
                    title={t('visionTitle')}
                    className="ml-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500"
                  >
                    {t('visionBadge')}
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
  const t = useTranslations('conversations');
  const labels: Record<ConversationListItem['resolution'], string> = {
    pending: t('resolutionPending'),
    resolved: t('resolutionResolved'),
    escalated: t('resolutionEscalated'),
    abandoned: t('resolutionAbandoned'),
  };
  const styles: Record<ConversationListItem['resolution'], string> = {
    pending: 'bg-blue-50 text-blue-700',
    resolved: 'bg-green-50 text-green-700',
    escalated: 'bg-amber-50 text-amber-700',
    abandoned: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${styles[resolution]}`}>
      {labels[resolution]}
    </span>
  );
}

function Stars({ score }: { score: number }) {
  const t = useTranslations('conversations');
  return (
    <span aria-label={t('starsAria', { score })} className="text-amber-500">
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
  const t = useTranslations('conversations');
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  if (lastPage === 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between text-sm text-slate-500">
      <div>{t('pageOf', { from, to, total })}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          {t('back')}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}

function SkeletonTable({ label }: { label: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-400">
      {label}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-white p-12 text-center">
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-1 text-xs text-slate-400">{body}</p>
    </div>
  );
}

function formatDate(iso: string, dateLocale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(dateLocale, {
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
