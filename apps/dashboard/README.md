# apps/dashboard — AvatarDesk Tenant-Admin-Dashboard

Phase-1 Skelett. Next.js 14 (App Router) + React 18 + Tailwind 3 +
TanStack Query. Auth läuft gegen den AvatarDesk-API-Service
(`services/api`) und nutzt einen HTTP-only Session-Cookie.

## Was hier (Task 1.4.1) drin ist

- Login-Page mit Magic-Link-Request (Phase 1: Link erscheint in
  der API-Console — siehe
  [ADR 006](../../docs/decisions/006-phase-1-dashboard-auth.md)).
- Geschützte `/avatar`-Page (Placeholder, echte UI folgt in 1.4.2).
- Middleware, die auf gesetzte Session-Cookie checkt und sonst auf
  `/login` redirected.
- TanStack-Query-Provider, `apiFetch`-Wrapper mit
  `credentials: 'include'` für Cookie-Roundtrips.

## Was hier noch nicht ist

- Avatar-Config-Form → Task 1.4.2.
- Knowledge-Upload-UI + Embed-Snippet-Generator → Task 1.4.3.
- Owner/Admin/Viewer-Rollen, `users`-Tabelle, E-Mail-Provider → Phase 2
  (siehe ADR 006).

## Lokale Entwicklung

```bash
# Aus dem Repo-Root, einmalig
corepack pnpm install

# Voraussetzungen (in eigenen Terminals)
docker compose up -d
corepack pnpm --filter @avatardesk/api start:dev
# → API auf http://localhost:3000

# Dashboard
corepack pnpm --filter @avatardesk/dashboard dev
# → http://localhost:3001
```

### Login-Flow (Dev-Mode)

1. Browser auf http://localhost:3001 — wird auf `/login` redirected.
2. E-Mail des Demo-Tenants eingeben (`team@axano.com` aus dem Seed).
3. „Magic-Link anfordern" klicken.
4. Im API-Terminal erscheint nur `magic-link generated: tenant=...
   tail=...XXXXXX`. Den **vollständigen Link** schreibt der API in
   `.last-magic-link.local` im Repo-Root (gitignored, 0600).
5. Die Datei öffnen (`cat .last-magic-link.local`), die URL in den
   Browser kopieren und öffnen.
6. API setzt das Session-Cookie und redirected auf
   `http://localhost:3001/avatar`.

Warum nicht der ganze Link auf der Konsole: Terminal-Scrollback,
IDE-Telemetrie und Screen-Sharing leaken Tokens leicht. Das
File-Pattern ist analog zur Behandlung der Tenant- und Internal-
Service-Tokens (siehe ADR 002 + 005 + 006).

## Architektur

```
app/
├── layout.tsx           # Root-Layout, Tailwind
├── providers.tsx        # TanStack Query Provider
├── globals.css          # @tailwind base/components/utilities
├── page.tsx             # redirected nach /avatar
├── login/page.tsx       # Magic-Link-Form
└── avatar/page.tsx      # geschütztes Placeholder

lib/
└── api.ts               # apiFetch + fetchMe + requestMagicLink + logout

middleware.ts            # leichter Cookie-Gate; volle Verifikation in /me
```

## Konventionen

- Server-Code für Auth lebt im NestJS-API (`services/api/src/dashboard-auth/`),
  nicht hier. Das Dashboard ist reines Frontend plus
  Next.js-spezifische Auth-Glue (Middleware, Cookie-aware Fetches).
- Keine UI-Strings hardcoded außerhalb der Komponenten —
  i18n-Aufbau steht in Phase 2 mit Locale-Switcher.
- `'use client'` nur dort wo wirklich nötig (interaktive
  Komponenten). Root und statische Seiten bleiben Server-Components.
