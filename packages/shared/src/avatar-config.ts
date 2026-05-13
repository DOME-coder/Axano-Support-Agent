import { z } from 'zod';

// Shared validation schema for tenant avatar config. Used by both
// the api (server-side validation on PATCH) and the dashboard
// (client-side form validation + typed responses).

export const LANGUAGE_CODES = ['de', 'en', 'it', 'fr', 'es'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const avatarConfigPatchSchema = z.object({
  beyAvatarId: z.string().min(1).max(200),
  elevenlabsVoiceId: z.string().min(1).max(200),
  language: z.enum(LANGUAGE_CODES),
  personaPrompt: z.string().min(20).max(4000),
  greeting: z.string().min(1).max(500),
  // Phase-2 screen-share gating. Default false on the server side
  // (see migration 0002 + ADR 007); the tenant must explicitly opt
  // their avatar in via the dashboard form before the widget will
  // render a share button.
  allowScreenShare: z.boolean(),
});

export type AvatarConfigPatch = z.infer<typeof avatarConfigPatchSchema>;

export interface AvatarConfigResponse extends AvatarConfigPatch {
  id: string;
  tenantId: string;
  isCustomAvatar: boolean;
}

export interface AvatarOption {
  id: string;
  label: string;
  hint?: string;
}

export interface AvatarOptionsResponse {
  avatars: AvatarOption[];
  voices: AvatarOption[];
  languages: ReadonlyArray<LanguageCode>;
}
