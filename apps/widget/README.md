# apps/widget — AvatarDesk Embeddable Widget

> # ⚠️ PHASE 0 ONLY — DO NOT SHIP
>
> **Dieses Widget enthält einen bewussten Sicherheits-Workaround:**
> LiveKit-URL und JWT-Token werden direkt im HTML der Tenant-Seite
> gelesen (`<script data-livekit-token="...">` oder
> `init({ livekitToken })`). Das bedeutet:
>
> - **Token im DOM auslesbar** → Room-Hijacking möglich.
> - **Kein Tenant-Auth** → keine Multi-Tenancy.
> - **Lange Token-Lifetime** → 24-h-Fenster für Missbrauch.
>
> Dieser Pfad **darf nicht in Produktion** und **muss vor dem ersten
> realen Tenant-Onboarding** durch den serverseitigen
> Token-Endpoint aus Phase 1 Sprint 1 (`POST /api/widget-session`)
> ersetzt werden.
>
> Das Widget gibt bei jedem `init()` ein `console.warn` aus, damit
> dieser Modus nicht versehentlich verschifft wird.
>
> **Vollständige Begründung und Acceptance-Criteria zum
> Aufheben:** [docs/decisions/003-phase-0-token-workaround.md](../../docs/decisions/003-phase-0-token-workaround.md)

---

## Was dieses Widget heute tut

- Schwebender Button (Floating Action Button) unten rechts auf jeder
  Tenant-Seite, die das Bundle einbindet.
- Klick → Modal öffnet (Desktop 480 × 720, Mobile Vollbild).
- Modal joint via `livekit-client` einen LiveKit-Room und subscribed
  auf den ersten Video- + Audio-Track des Beyond-Presence-Avatars.
- Status-Indikator: *Bereit* / *Verbinde…* / *Verbunden* / *Fehler*.
- Schließen-Button trennt die Verbindung sauber.

## Was es noch nicht tut (Phase 1+)

- Mikrofon-Capture / Sprach-Eingabe an den Agent (Phase 1 Sprint 2).
- Bildschirm-Sharing (Phase 2).
- Tenant-Branding (Avatar-Vorschaubild, Akzentfarbe).
- Token-Issuance über eigene API (Phase 1 Sprint 1, siehe ADR 003).
- Push-to-Talk, Untertitel, Sprachauswahl.

## Lokale Entwicklung

Aus dem Repo-Root:

```bash
# Einmalig
pnpm install

# Dev-Server (Hot-Reload, Auto-Open)
pnpm --filter @avatardesk/widget dev
# → http://localhost:5173

# TypeScript-Check
pnpm --filter @avatardesk/widget typecheck

# Production-Bundle bauen
pnpm --filter @avatardesk/widget build
# → apps/widget/dist/widget.js  (IIFE, CSS inline)

# Production-Bundle in einer Tenant-Mock-Seite testen
pnpm --filter @avatardesk/widget preview
# → http://localhost:4173/demo.html
```

### Vor dem Browser-Test: Token besorgen

In Phase 0 brauchst du einen LiveKit-Test-Token:

1. LiveKit-Cloud-Dashboard → dein Projekt → **Sandbox** → einen
   Voice-Agent-Sandbox-Test starten.
2. „Generate token" für eine Room mit beliebigem Namen
   (z. B. `phase0-test`).
3. Token kopieren.
4. In `index.html` (Dev) bzw. `demo.html` (Build) die Platzhalter
   `REPLACE-WITH-YOUR-LIVEKIT-URL` und
   `REPLACE-WITH-YOUR-LIVEKIT-TOKEN` ersetzen — **diese Edits**
   **niemals committen**.
5. Parallel den Python-Agent starten
   (`cd services/agent && python main.py dev`), damit Sofia in den
   selben Room joint.

## Architektur

```
src/
├── main.ts            # Library-Entry: window.AvatarDesk.init(...)
├── widget.tsx         # Floating-Button + Modal (Preact)
├── livekit-client.ts  # Wrapper um livekit-client (Track-Attach)
├── strings.ts         # i18n-Skelett (DE/EN)
└── styles.ts          # CSS als String (inline-injected)
```

**Bundle-Strategie:** Vite produziert ein einzelnes IIFE-Bundle
mit inline-CSS. Tenants binden eine einzige Datei ein, kein
separates Stylesheet, keine externen CSS-Bibliotheken.

## Konventionen

- Keine `console.log`-Debug-Statements committen (CLAUDE §11).
  `console.warn` in `main.ts` ist die einzige absichtliche
  Konsolen-Ausgabe und Teil von ADR 003.
- Keine hardcoded UI-Strings. Alles über `t()` aus
  `src/strings.ts` (CLAUDE §11).
- Keine `any`-Types ohne expliziten Kommentar.
- Funktionale Preact-Komponenten, keine Class-Components
  (CLAUDE §5).
