'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { ConversationDetail } from '@avatardesk/shared';
import { fetchConversation } from '@/lib/conversations-api';
import { DashboardShell } from '@/components/dashboard-shell';
import { MessageBubble } from '@/components/conversations/message-bubble';

export default function ConversationDetailPage() {
  const t = useTranslations('conversations');
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const detailQuery = useQuery<ConversationDetail, Error>({
    queryKey: ['conversation', id],
    queryFn: () => fetchConversation(id!),
    enabled: Boolean(id),
    retry: (failureCount, err) => err.message !== 'not_found' && failureCount < 2,
  });

  return (
    <DashboardShell>
      <div className="space-y-6">
        <Link
          href="/conversations"
          className="inline-block text-sm text-slate-500 hover:text-ink"
        >
          {t('backToList')}
        </Link>

        {detailQuery.isLoading ? (
          <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-400">
            {t('loadingDetail')}
          </div>
        ) : detailQuery.isError ? (
          <ErrorState reason={detailQuery.error?.message ?? 'unknown'} />
        ) : detailQuery.data ? (
          <ConversationView detail={detailQuery.data} />
        ) : null}
      </div>
    </DashboardShell>
  );
}

function ConversationView({ detail }: { detail: ConversationDetail }) {
  const t = useTranslations('conversations');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';
  const isActive = detail.endedAt == null;

  return (
    <>
      <header className="rounded border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h2 className="text-lg font-semibold">{formatDate(detail.startedAt, dateLocale)}</h2>
          <Metric label={t('metricDuration')} value={formatDuration(detail.durationSeconds)} />
          <Metric label={t('metricLanguage')} value={detail.language.toUpperCase()} />
          <Metric label={t('metricMessages')} value={String(detail.messageCount)} />
          <Metric label={t('metricBpMin')} value={formatMinutes(detail.beyMinutesUsed)} />
          <CsatMetric score={detail.csatScore} label={t('metricCsat')} />
          <ResolutionBadge resolution={detail.resolution} />
        </div>
        {detail.csatComment && (
          <blockquote className="mt-3 border-l-2 border-amber-300 pl-3 text-sm italic text-slate-600">
            „{detail.csatComment}"
          </blockquote>
        )}
        {isActive && <p className="mt-3 text-xs text-amber-600">{t('activeHint')}</p>}
      </header>

      {detail.escalation && (
        <EscalationBanner escalation={detail.escalation} dateLocale={dateLocale} />
      )}

      <div className="space-y-3 rounded border border-slate-200 bg-slate-50 p-4">
        {detail.messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t('emptyTranscript')}</p>
        ) : (
          detail.messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-slate-400">{label}:</span>{' '}
      <span className="text-ink">{value}</span>
    </div>
  );
}

function CsatMetric({ score, label }: { score: number | null; label: string }) {
  const t = useTranslations('conversations');
  if (score == null) {
    return <Metric label={label} value="—" />;
  }
  return (
    <div className="text-sm">
      <span className="text-slate-400">{label}:</span>{' '}
      <span className="text-amber-500" aria-label={t('starsAria', { score })}>
        {'★'.repeat(score)}
        <span className="text-slate-200">{'★'.repeat(5 - score)}</span>
      </span>
    </div>
  );
}

function ResolutionBadge({ resolution }: { resolution: ConversationDetail['resolution'] }) {
  const t = useTranslations('conversations');
  const labels: Record<ConversationDetail['resolution'], string> = {
    pending: t('resolutionPending'),
    resolved: t('resolutionResolved'),
    escalated: t('resolutionEscalated'),
    abandoned: t('resolutionAbandoned'),
  };
  const styles: Record<ConversationDetail['resolution'], string> = {
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

function EscalationBanner({
  escalation,
  dateLocale,
}: {
  escalation: NonNullable<ConversationDetail['escalation']>;
  dateLocale: string;
}) {
  const t = useTranslations('conversations');
  return (
    <div role="alert" className="rounded border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-lg leading-none">⚠</span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-900">
            {t('escalationTitle')}
            {escalation.status === 'resolved' && (
              <span className="ml-2 text-xs font-normal text-amber-700">
                {t('escalationResolved')}
              </span>
            )}
          </p>
          <p className="text-sm text-amber-800">{escalation.reason}</p>
          <p className="text-xs text-amber-700">
            {formatDate(escalation.createdAt, dateLocale)} ·{' '}
            {t('escalationTarget', { target: escalation.target })}
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ reason }: { reason: string }) {
  const t = useTranslations('conversations');
  if (reason === 'not_found') {
    return (
      <div className="rounded border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-600">{t('notFoundTitle')}</p>
        <p className="mt-1 text-xs text-slate-400">{t('notFoundBody')}</p>
      </div>
    );
  }
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {t('loadDetailError', { reason })}
    </div>
  );
}

function formatDate(iso: string, dateLocale: string): string {
  return new Date(iso).toLocaleString(dateLocale, {
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
