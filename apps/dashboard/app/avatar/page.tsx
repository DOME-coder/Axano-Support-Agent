'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { avatarConfigPatchSchema, type AvatarConfigPatch } from '@avatardesk/shared';
import {
  fetchAvatarConfig,
  fetchAvatarOptions,
  updateAvatarConfig,
} from '@/lib/avatar-config-api';
import { DashboardShell } from '@/components/dashboard-shell';

type FieldErrors = Partial<Record<keyof AvatarConfigPatch, string>>;

export default function AvatarPage() {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['avatar-config'],
    queryFn: fetchAvatarConfig,
  });
  const optionsQuery = useQuery({
    queryKey: ['avatar-options'],
    queryFn: fetchAvatarOptions,
  });

  const [form, setForm] = useState<AvatarConfigPatch | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (configQuery.data && !form) {
      const { beyAvatarId, elevenlabsVoiceId, language, personaPrompt, greeting } =
        configQuery.data;
      setForm({ beyAvatarId, elevenlabsVoiceId, language, personaPrompt, greeting });
    }
  }, [configQuery.data, form]);

  const mutation = useMutation({
    mutationFn: updateAvatarConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(['avatar-config'], data);
      // Re-sync the local form from the authoritative server response
      // so any server-side normalization (trim, voice-id remap, ...)
      // is visible to the user. The initial-fill useEffect above is
      // guarded by `!form` and won't run again on its own.
      setForm({
        beyAvatarId: data.beyAvatarId,
        elevenlabsVoiceId: data.elevenlabsVoiceId,
        language: data.language,
        personaPrompt: data.personaPrompt,
        greeting: data.greeting,
      });
      setSavedAt(Date.now());
      setFieldErrors({});
    },
  });

  function update<K extends keyof AvatarConfigPatch>(key: K, value: AvatarConfigPatch[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setSavedAt(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) {
      return;
    }
    const result = avatarConfigPatchSchema.safeParse(form);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const k = issue.path[0] as keyof AvatarConfigPatch | undefined;
        if (k) {
          next[k] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }
    mutation.mutate(result.data);
  }

  const ready = !!form && optionsQuery.data;

  return (
    <DashboardShell>
        <h2 className="text-xl font-semibold mb-2">Avatar-Konfiguration</h2>
        <p className="text-sm text-slate-500 mb-6">
          Änderungen greifen ab der nächsten Konversation — kein Neustart nötig.
        </p>

        {!ready ? (
          <p className="text-sm text-slate-500">Konfiguration lädt…</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6"
          >
            <Field
              label="Avatar"
              hint="Beyond-Presence-Avatar-ID. Auswahl aus kuratierter Liste oder eigene ID eintragen."
              error={fieldErrors.beyAvatarId}
            >
              <SelectWithCustom
                value={form!.beyAvatarId}
                options={optionsQuery.data!.avatars}
                onChange={(v) => update('beyAvatarId', v)}
              />
            </Field>

            <Field
              label="Stimme"
              hint="ElevenLabs-Voice-ID."
              error={fieldErrors.elevenlabsVoiceId}
            >
              <SelectWithCustom
                value={form!.elevenlabsVoiceId}
                options={optionsQuery.data!.voices}
                onChange={(v) => update('elevenlabsVoiceId', v)}
              />
            </Field>

            <Field
              label="Sprache"
              hint="ISO-Code der Konversationssprache."
              error={fieldErrors.language}
            >
              <select
                value={form!.language}
                onChange={(e) =>
                  update('language', e.currentTarget.value as AvatarConfigPatch['language'])
                }
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {optionsQuery.data!.languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Persona-Prompt"
              hint="System-Anweisung an das LLM. Tonalität, Anrede, Verhalten."
              error={fieldErrors.personaPrompt}
            >
              <textarea
                value={form!.personaPrompt}
                onChange={(e) => update('personaPrompt', e.currentTarget.value)}
                rows={6}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono text-sm"
              />
            </Field>

            <Field
              label="Begrüßungstext"
              hint="Erster Satz, den der Avatar beim Modal-Öffnen sagt."
              error={fieldErrors.greeting}
            >
              <input
                type="text"
                value={form!.greeting}
                onChange={(e) => update('greeting', e.currentTarget.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </Field>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-lg bg-ink text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? 'Speichere…' : 'Speichern'}
              </button>
              {savedAt && <span className="text-sm text-emerald-600">Gespeichert.</span>}
              {mutation.isError && (
                <span className="text-sm text-red-600">
                  Fehler: {(mutation.error as Error).message}
                </span>
              )}
            </div>
          </form>
        )}
    </DashboardShell>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <span className="block text-xs text-slate-400 mb-1">{hint}</span>}
      <div className="mt-1">{children}</div>
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}

function SelectWithCustom({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ReadonlyArray<{ id: string; label: string; hint?: string }>;
  onChange: (v: string) => void;
}) {
  const isPreset = options.some((o) => o.id === value);
  const [mode, setMode] = useState<'preset' | 'custom'>(isPreset ? 'preset' : 'custom');

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('preset')}
          className={`px-2 py-1 rounded ${
            mode === 'preset' ? 'bg-slate-100 text-ink' : 'text-slate-500'
          }`}
        >
          Auswählen
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`px-2 py-1 rounded ${
            mode === 'custom' ? 'bg-slate-100 text-ink' : 'text-slate-500'
          }`}
        >
          Eigene ID
        </button>
      </div>
      {mode === 'preset' ? (
        <select
          value={isPreset ? value : ''}
          onChange={(e) => onChange(e.currentTarget.value)}
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          {!isPreset && <option value="">— wählen —</option>}
          {options.map((o) => (
            <option key={o.id} value={o.id} title={o.hint}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder="ID eintragen"
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      )}
    </div>
  );
}
