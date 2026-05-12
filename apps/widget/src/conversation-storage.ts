// Persists the active conversation id in localStorage so a user
// who closes and re-opens the modal within the resume window
// continues the same conversation row (and thus the same
// transcript in the dashboard's replay UI).
//
// NOTE: CONVERSATION_RESUME_TTL_MS lives in @avatardesk/shared so
// the api and widget can't drift apart. We duplicate the literal
// value here because vite/rollup's static analysis can't resolve
// const re-exports through tsc's CJS `__exportStar` wrapper. The
// api enforces the real TTL server-side — the widget value is
// only a hint for when to drop a stale entry locally. A small
// drift between client and server here is benign (worst case:
// widget offers a stale id, server rejects it, silent fallback).
// Phase-3 build-pipeline refactor: ship shared as ESM too.
const CONVERSATION_RESUME_TTL_MS = 30 * 60 * 1000;

const STORAGE_KEY = 'avatardesk:conversation';

interface StoredConversation {
  id: string;
  savedAt: number;
}

function getStorage(): Storage | null {
  // SSR or privacy-restricted browsers may not expose localStorage.
  // Treat that as "no resume" — never throw.
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readActiveConversationId(): string | undefined {
  const storage = getStorage();
  if (!storage) {
    return undefined;
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredConversation>;
    if (typeof parsed.id !== 'string' || typeof parsed.savedAt !== 'number') {
      return undefined;
    }
    if (Date.now() - parsed.savedAt > CONVERSATION_RESUME_TTL_MS) {
      // Stale — drop it so we don't keep handing the api an id it
      // will reject anyway.
      storage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return parsed.id;
  } catch {
    storage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function writeActiveConversationId(conversationId: string): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const payload: StoredConversation = {
    id: conversationId,
    savedAt: Date.now(),
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota or private mode — silently skip. Resume is a nice-to-have.
  }
}

export function clearActiveConversationId(): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
