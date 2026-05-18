'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import type { KnowledgeSourceStatus } from '@avatardesk/shared';
import { fetchKnowledgeSources, uploadKnowledgePdf } from '@/lib/knowledge-api';
import { DashboardShell } from '@/components/dashboard-shell';

const STATUS_COLOR: Record<KnowledgeSourceStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  indexing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const t = useTranslations('knowledge');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusLabel: Record<KnowledgeSourceStatus, string> = {
    pending: t('statusPending'),
    indexing: t('statusIndexing'),
    ready: t('statusReady'),
    failed: t('statusFailed'),
  };

  const sourcesQuery = useQuery({
    queryKey: ['knowledge-sources'],
    queryFn: fetchKnowledgeSources,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) {
        return 3000;
      }
      const hasActive = data.sources.some(
        (s) => s.status === 'pending' || s.status === 'indexing',
      );
      return hasActive ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: uploadKnowledgePdf,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-sources'] });
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err) => {
      setError((err as Error).message);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    uploadMutation.mutate(file);
  }

  const sources = sourcesQuery.data?.sources ?? [];
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  return (
    <DashboardShell>
      <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('subtitle')}</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">{t('uploadLabel')}</span>
          <span className="block text-xs text-slate-400 mb-2">{t('uploadHint')}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={uploadMutation.isPending}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-ink file:text-white file:cursor-pointer hover:file:opacity-90 disabled:opacity-50"
          />
        </label>
        {uploadMutation.isPending && (
          <p className="text-sm text-slate-500 mt-2">{t('uploading')}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 mt-2">
            {tCommon('errorPrefix', { message: error })}
          </p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">{t('tableFile')}</th>
              <th className="px-4 py-2">{t('tableStatus')}</th>
              <th className="px-4 py-2 text-right">{t('tableChunks')}</th>
              <th className="px-4 py-2">{t('tableUploadedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {t('emptyState')}
                </td>
              </tr>
            ) : (
              sources.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.displayName}</div>
                    {s.error && (
                      <div className="text-xs text-red-600 mt-1">{s.error}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[s.status]}`}
                    >
                      {statusLabel[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.chunkCount}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.createdAt).toLocaleString(dateLocale)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
