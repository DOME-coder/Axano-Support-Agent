'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ConversationMessageItem } from '@avatardesk/shared';

const VISION_PREFIX = '[analyze_screen]';
const RAG_PREFIX = '[search_knowledge_base]';

export function MessageBubble({ message }: { message: ConversationMessageItem }) {
  const locale = useLocale();
  const timeLocale = locale === 'en' ? 'en-US' : 'de-DE';

  if (message.role === 'system') return null;
  if (message.role === 'tool') return <ToolRow message={message} timeLocale={timeLocale} />;

  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
          isUser
            ? 'bg-ink text-white rounded-br-sm'
            : 'bg-slate-100 text-ink rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p
          className={`mt-1 text-[10px] ${
            isUser ? 'text-slate-300' : 'text-slate-400'
          }`}
        >
          {formatTime(message.timestamp, timeLocale)}
        </p>
      </div>
    </div>
  );
}

function ToolRow({
  message,
  timeLocale,
}: {
  message: ConversationMessageItem;
  timeLocale: string;
}) {
  const t = useTranslations('conversations');
  const content = message.content;
  let label = t('toolGeneric');
  let preview = content;
  let icon = '⚙';

  if (content.startsWith(VISION_PREFIX)) {
    label = t('toolVision');
    preview = content.slice(VISION_PREFIX.length).trim();
    icon = '👁';
  } else if (content.startsWith(RAG_PREFIX)) {
    label = t('toolRag');
    preview = content.slice(RAG_PREFIX.length).trim();
    icon = '📚';
  }

  const tooltip = preview.slice(0, 200) + (preview.length > 200 ? '…' : '');

  return (
    <div className="flex justify-center" title={tooltip}>
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-400">{formatTime(message.timestamp, timeLocale)}</span>
      </div>
    </div>
  );
}

function formatTime(iso: string, timeLocale: string): string {
  return new Date(iso).toLocaleTimeString(timeLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
