'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { KnowledgeSourceStatus } from '@avatardesk/shared';
import { fetchKnowledgeSources, uploadKnowledgePdf } from '@/lib/knowledge-api';
import { DashboardShell } from '@/components/dashboard-shell';

const STATUS_LABEL: Record<KnowledgeSourceStatus, string> = {
  pending: 'wartet',
  indexing: 'wird indexiert',
  ready: 'bereit',
  failed: 'fehlgeschlagen',
};

const STATUS_COLOR: Record<KnowledgeSourceStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  indexing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export default function KnowledgePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourcesQuery = useQuery({
    queryKey: ['knowledge-sources'],
    queryFn: fetchKnowledgeSources,
    // Poll every 3 seconds so indexing -> ready transitions show
    // up without manual refresh. Phase 2 can move this to SSE or
    // websockets if the polling cost matters.
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

  return (
    <DashboardShell>
      <h2 className="text-xl font-semibold mb-2">Wissensdatenbank</h2>
      <p className="text-sm text-slate-500 mb-6">
        PDFs hochladen, die der Avatar als Wissensquelle nutzt. Indexing
        dauert ein paar Sekunden bis Minuten je nach Größe.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">PDF hochladen</span>
          <span className="block text-xs text-slate-400 mb-2">
            Max. 25 MB, nur PDF. Andere Formate kommen in Phase 2.
          </span>
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
          <p className="text-sm text-slate-500 mt-2">Lade hoch…</p>
        )}
        {error && <p className="text-sm text-red-600 mt-2">Fehler: {error}</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Datei</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Chunks</th>
              <th className="px-4 py-2">Hochgeladen</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Noch nichts hochgeladen.
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
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.chunkCount}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(s.createdAt).toLocaleString('de-DE')}
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
