# apps/widget — AvatarDesk Embeddable Widget

Embeddable JS-Widget (Preact + LiveKit-Client). Beim Klick auf den
Floating-Button öffnet das Modal, holt einen kurzlebigen
LiveKit-Token von der AvatarDesk-API und joint einen
Conversation-spezifischen Room, in dem der
Beyond-Presence-Avatar streamt.

## Was dieses Widget heute tut

- Schwebender Button (Floating Action Button) unten rechts auf jeder
  Tenant-Seite, die das Bundle einbindet.
- Klick → Modal öffnet (Desktop 480 × 720, Mobile Vollbild).
- Beim Open-Event: `POST /api/widget-session` mit dem Tenant-API-Key
  (`X-Tenant-API-Key`-Header). API-Antwort enthält
  `{ url, token, room, conversationId, avatar }`.
- Modal joint mit `url + token` via `livekit-client`, subscribed auf
  den ersten Video- + Audio-Track des Beyond-Presence-Avatars.
- Status-Indikator: *Bereit* / *Verbinde…* / *Verbunden* / *Fehler*.
- Schließen-Button trennt die Verbindung sauber.

## Was es noch nicht tut (Phase 1 Sprint 2+)

- Mikrofon-Capture / Sprach-Eingabe (Sprint 2).
- Bildschirm-Sharing (Phase 2).
- Tenant-Branding (Avatar-Vorschaubild, Akzentfarbe; Phase 1 Sprint 4).
- Push-to-Talk, Untertitel, Sprachauswahl (Phase 1 Sprint 2+).

## Embed-Pattern für Tenants

```html
<script
  src="https://cdn.avatardesk.io/widget.js"
  data-api-url="https://api.avatardesk.io"
  data-tenant-api-key="ad_..."
></script>
```

Alternative programmatische Init:

```html
<script src="https://cdn.avatardesk.io/widget.js"></script>
<script>
  window.AvatarDesk.init({
    apiUrl: 'https://api.avatardesk.io',
    tenantApiKey: 'ad_...',
  });
</script>
```

**Sicherheit:** Der `tenantApiKey` ist pro Embed-Domain öffentlich
und wird durch CORS-Allowlist + Rate-Limit auf API-Seite geschützt.
Der LiveKit-JWT selbst lebt nie im DOM — er wird zur Laufzeit per
`fetch` geholt, ist Conversation-spezifisch und hat eine TTL von
60 Minuten.

## Lokale Entwicklung

Aus dem Repo-Root:

```bash
# Einmalig
corepack pnpm install

# AvatarDesk-API in einem Terminal hochfahren
corepack pnpm --filter @avatardesk/api start:dev
# → http://localhost:3000

# Demo-Tenant + API-Key anlegen (idempotent)
corepack pnpm --filter @avatardesk/api db:seed
# → schreibt API-Key nach .tenant-api-key.local (gitignored, 0600)

# Widget-Dev-Server in einem zweiten Terminal
corepack pnpm --filter @avatardesk/widget dev
# → http://localhost:5173

# TypeScript-Check
corepack pnpm --filter @avatardesk/widget typecheck

# Production-Bundle bauen
corepack pnpm --filter @avatardesk/widget build
# → apps/widget/dist/widget.js  (IIFE, CSS inline)

# Production-Bundle in einer Tenant-Mock-Seite testen
corepack pnpm --filter @avatardesk/widget preview
# → http://localhost:4173/demo.html
```

### Vor dem Browser-Test: API-Key eintragen

1. `corepack pnpm --filter @avatardesk/api db:seed` einmalig laufen
   lassen — der erzeugte Tenant-API-Key landet in
   `.tenant-api-key.local` (gitignored).
2. In `index.html` (Dev) bzw. `demo.html` (Build) den Platzhalter
   `REPLACE-WITH-CONTENT-OF-.tenant-api-key.local` durch den Inhalt
   dieser Datei ersetzen.
3. Diese Edits **niemals committen** — Platzhalter sind die
   gewünschte Repo-Form.
4. Parallel den Python-Agent starten
   (`cd services/agent && python main.py dev`), damit der Avatar in
   die per `widget-session` erzeugte Room joint.

## Architektur

```
src/
├── main.ts            # Library-Entry: window.AvatarDesk.init(...)
├── widget.tsx         # Floating-Button + Modal (Preact)
├── session.ts         # POST /api/widget-session
├── livekit-client.ts  # Wrapper um livekit-client (Track-Attach)
├── strings.ts         # i18n-Skelett (DE/EN)
└── styles.ts          # CSS als String (inline-injected)
```

**Bundle-Strategie:** Vite produziert ein einzelnes IIFE-Bundle
mit inline-CSS. Tenants binden eine einzige Datei ein, kein
separates Stylesheet, keine externen CSS-Bibliotheken.

## Konventionen

- Keine `console.log`-Debug-Statements committen (CLAUDE §11).
  `console.error` für echte Fehlerpfade ist okay.
- Keine hardcoded UI-Strings. Alles über `t()` aus
  `src/strings.ts` (CLAUDE §11).
- Keine `any`-Types ohne expliziten Kommentar.
- Funktionale Preact-Komponenten, keine Class-Components
  (CLAUDE §5).
