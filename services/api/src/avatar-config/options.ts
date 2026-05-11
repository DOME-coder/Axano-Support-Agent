import type { AvatarOption } from '@avatardesk/shared';

// Phase-1 pragmatic curated lists. Phase 2 will pull these live
// from the Beyond Presence and ElevenLabs APIs and let tenants
// preview each option before selecting. For now the dashboard
// gets a small set of vetted IDs plus whatever default the
// operator has in .env so a fresh setup always renders the
// currently-active config.

// Beyond Presence stock avatars. IDs are public, no secrets.
// Stock catalog: https://app.bey.dev/avatars
export const BEY_AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: '7c9ca52f-d4f7-46e1-a4b8-0c8655857cc3',
    label: 'Sofia (Studio, dunkles Haar)',
    hint: 'Standard-Genesis-Avatar, neutraler Studio-Hintergrund',
  },
  {
    id: 'ege',
    label: 'Ege (Studio, Anzug)',
    hint: 'Männlicher Genesis-Avatar; Phase-1-Demo nur',
  },
];

// ElevenLabs voices. The first ID matches text-to-speech.eleven_multilingual_v2
// stock voice "Rachel"; the rest are well-known multilingual options
// that support German. The dashboard renders these in a dropdown.
// Tenants who want their own voice can paste the ElevenLabs voice
// id directly via the form's "Other" affordance (phase-2 work).
export const ELEVENLABS_VOICE_OPTIONS: AvatarOption[] = [
  {
    id: 'zKHQdbB8fOJUO5kZynE2',
    label: 'Sofia DE (Female, soft)',
    hint: 'Standard-Voice für Axano-Demo',
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    label: 'Rachel (Multilingual, Female)',
    hint: 'ElevenLabs stock voice, leichter englischer Akzent in DE',
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    label: 'Domi (Multilingual, Female)',
    hint: 'ElevenLabs stock voice',
  },
];

function ensureOption(list: AvatarOption[], id: string | undefined, label: string): AvatarOption[] {
  if (!id || list.some((o) => o.id === id)) {
    return list;
  }
  return [{ id, label, hint: 'aus .env (Default des Servers)' }, ...list];
}

export function getAvatarOptions(): AvatarOption[] {
  return ensureOption(BEY_AVATAR_OPTIONS, process.env.BEY_DEFAULT_AVATAR_ID, 'Server-Default-Avatar');
}

export function getVoiceOptions(): AvatarOption[] {
  return ensureOption(
    ELEVENLABS_VOICE_OPTIONS,
    process.env.ELEVENLABS_DEFAULT_VOICE_ID,
    'Server-Default-Voice',
  );
}
