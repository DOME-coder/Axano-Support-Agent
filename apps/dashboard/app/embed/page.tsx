'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { fetchApiKeyHint, regenerateApiKey } from '@/lib/tenant-api';
import { DashboardShell } from '@/components/dashboard-shell';

const WIDGET_CDN_PLACEHOLDER = 'https://cdn.avatardesk.io/widget.js';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const KEY_FILE = 'tenant-api-key.local';

function buildSnippet(): string {
  return [
    `<script`,
    `  src="${WIDGET_CDN_PLACEHOLDER}"`,
    `  data-api-url="${API_BASE_URL}"`,
    `  data-tenant-api-key="<<DEIN_TENANT_API_KEY>>"`,
    `></script>`,
  ].join('\n');
}

export default function EmbedPage() {
  const queryClient = useQueryClient();
  const t = useTranslations('embed');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'en' ? 'en-US' : 'de-DE';

  const [copied, setCopied] = useState(false);
  const [regenerateConfirm, setRegenerateConfirm] = useState(false);
  const [regenerateInfo, setRegenerateInfo] = useState<string | null>(null);

  const hintQuery = useQuery({
    queryKey: ['tenant-api-key-hint'],
    queryFn: fetchApiKeyHint,
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-api-key-hint'], data.hint);
      setRegenerateConfirm(false);
      setRegenerateInfo(t('rotateInfo', { file: data.storedAt }));
    },
  });

  const snippet = buildSnippet();

  async function handleCopy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <DashboardShell>
      <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>
      <p className="text-sm text-slate-500 mb-6">
        {t('subtitlePart1')}
        <code className="mx-1 px-1 bg-slate-100 rounded font-mono text-xs">
          &lt;&lt;DEIN_TENANT_API_KEY&gt;&gt;
        </code>
        {t('subtitlePart2')}
        <code className="mx-1 px-1 bg-slate-100 rounded font-mono text-xs">.{KEY_FILE}</code>
        {t('subtitlePart3')}
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-medium">{t('snippetTitle')}</h3>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-50"
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
        <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
          {snippet}
        </pre>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-medium mb-1">{t('keyTitle')}</h3>
        <p className="text-xs text-slate-500 mb-4">{t('keyHint')}</p>

        {hintQuery.data && (
          <div className="text-sm text-slate-600 mb-4 font-mono">
            <span className="text-slate-400">{t('keyActive')}</span>{' '}
            <span>
              {hintQuery.data.prefix}…<span className="text-ink">{hintQuery.data.tail}</span>
            </span>
            {hintQuery.data.generatedAt && (
              <span className="text-slate-400 ml-3">
                {t('keySince', {
                  date: new Date(hintQuery.data.generatedAt).toLocaleString(dateLocale),
                })}
              </span>
            )}
          </div>
        )}

        {!regenerateConfirm ? (
          <button
            type="button"
            onClick={() => setRegenerateConfirm(true)}
            className="text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"
          >
            {t('rotateButton')}
          </button>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900 mb-2">
              {t('rotateConfirmTitle')}
            </p>
            <p className="text-xs text-amber-700 mb-3">{t('rotateConfirmBody')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
                className="text-sm px-3 py-1.5 rounded bg-amber-600 text-white hover:opacity-90 disabled:opacity-50"
              >
                {regenerateMutation.isPending ? t('rotating') : t('rotateConfirmYes')}
              </button>
              <button
                type="button"
                onClick={() => setRegenerateConfirm(false)}
                className="text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"
              >
                {tCommon('cancel')}
              </button>
            </div>
          </div>
        )}

        {regenerateInfo && (
          <p className="text-sm text-emerald-700 mt-3">{regenerateInfo}</p>
        )}
        {regenerateMutation.isError && (
          <p className="text-sm text-red-600 mt-3">
            {tCommon('errorPrefix', { message: (regenerateMutation.error as Error).message })}
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
