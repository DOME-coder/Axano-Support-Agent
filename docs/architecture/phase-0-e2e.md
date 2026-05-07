# Phase 0 — End-to-End-Anleitung

Diese Anleitung beschreibt, wie ein Entwickler das Phase-0-Setup
lokal hochfährt und einen Beyond-Presence-Avatar im Browser
sprechen sieht. Zielzeit ab frischem Klon: ~10 Minuten (plus
einmaligen Account-Setup beim Erst-Start).

Sobald alle Schritte durchlaufen sind, hat AvatarDesk seine
Foundation: Widget → LiveKit Cloud → Python-Agent → Beyond Presence
funktioniert end-to-end mit einer fixen Begrüßung. Phase 1 baut
darauf den echten Sprach-Loop auf.

---

## Voraussetzungen

| Tool | Version | Hinweis |
| --- | --- | --- |
| Node.js | 20+ | siehe [.nvmrc](../../.nvmrc) |
| pnpm | 9+ | wird per `corepack` automatisch bereitgestellt |
| Python | 3.11.x | siehe [services/agent/.python-version](../../services/agent/.python-version) |
| Docker | aktuell | Docker Desktop oder Colima |
| `.env` | befüllt | Kopie von `.env.example`, mit echten Werten siehe unten |

### Pflicht-Schlüssel in `.env` (Phase 0)

Diese 7 Schlüssel müssen vor dem Test gesetzt sein. Werte holst du
dir aus den jeweiligen Provider-Dashboards:

```env
BEY_API_KEY=                  # https://app.bey.dev → API Keys
BEY_DEFAULT_AVATAR_ID=        # Avatar-Detail-Page im BP-Dashboard
LIVEKIT_URL=                  # wss://<projekt>.livekit.cloud
LIVEKIT_API_KEY=              # LiveKit Cloud → Settings → Keys
LIVEKIT_API_SECRET=           # LiveKit Cloud → Settings → Keys
ELEVENLABS_API_KEY=           # mit text_to_speech + voices_read scope!
ELEVENLABS_DEFAULT_VOICE_ID=  # Voice-Library im ElevenLabs-Dashboard
```

Plus die Postgres/Redis-Defaults aus [.env.example](../../.env.example),
falls du andere Ports brauchst.

> **Wichtig:** `.env` ist durch [.gitignore](../../.gitignore) geschützt,
> aber das hilft nichts, wenn du die Werte versehentlich in eine
> getrackte Datei (z. B. `apps/widget/index.html`) eintippst.
> Siehe [Sicherheit](#sicherheit) ganz unten.

---

## Schritt 1 — Lokale Infrastruktur starten

Im Repo-Root:

```bash
docker compose up -d
```

Wartet, bis beide Services `healthy` sind:

```bash
docker compose ps
```

Vollständige Verifikation (pgvector-Extension, Redis-Ping,
Reset-Anweisungen, Troubleshooting bei Port-Konflikten) steht in
[local-infra.md](./local-infra.md). Wenn die da beschriebenen
Verifikationen grün sind, ist Schritt 1 erledigt.

---

## Schritt 2 — Python-Agent vorbereiten und starten

Erst-Setup (einmalig):

```bash
cd services/agent
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Dauert beim ersten Mal 1–3 Minuten — `livekit-agents` zieht
Anthropic-, Deepgram-, ElevenLabs-, BP- und Silero-Plugins (auch
solche, die in Phase 0 noch nicht aktiv sind, aber für Phase 1
gleich im venv liegen).

Worker starten:

```bash
python main.py dev
```

Erwarteter Log-Output:

```
[info] env validation ok           required_count=7
[info] starting worker
[info] registered worker            id=AW_...
```

Der Prozess bleibt offen — das ist gewollt. Lass das Terminal so.

Ausführliche Setup-Hinweise inkl. Plugin-Architektur:
[services/agent/README.md](../../services/agent/README.md).

---

## Schritt 3 — LiveKit-Token holen

In Phase 0 hat das Widget noch kein Backend, das Tokens für es
ausstellt. Wir generieren den Token manuell aus dem
LiveKit-Cloud-Dashboard. Phase 1 Sprint 1 ersetzt diesen
Workaround durch einen serverseitigen Endpoint
(siehe [ADR 003](../decisions/003-phase-0-token-workaround.md)).

1. https://cloud.livekit.io → dein Projekt → **Settings** → **Keys**.
2. „Generate access token" (oder „Create token", je nach UI-Version).
3. Felder im Dialog **sehr genau** ausfüllen:
   - **Identity / Sub:** `phase0-tester`
   - **Room name:** `phase0-test`  (kein Leerzeichen davor/danach!)
   - **Permissions:** `roomJoin`, `canPublish`, `canSubscribe`
4. „Generate", Token wird angezeigt.

### Pflicht-Sanity-Check des Tokens

Token in einem Inkognito-Tab auf https://jwt.io einfügen, im
„PAYLOAD"-Block prüfen, dass das `video.room`-Feld **exakt**
`"phase0-test"` enthält:

```json
{
  "identity": "phase0-tester",
  "sub": "phase0-tester",
  "video": {
    "canPublish": true,
    "canSubscribe": true,
    "room": "phase0-test",
    "roomJoin": true
  }
}
```

Wenn dort `" phase0-test"` (mit Leerzeichen) oder ein anderer
Room-Name steht, scheitert Schritt 5 mit `401 invalid token` —
neuen Token generieren, Feld diesmal sauber tippen.

---

## Schritt 4 — Widget-Dev-Server starten

Im Repo-Root, einmalig pro Klon:

```bash
corepack pnpm install
```

In `apps/widget/index.html` die Platzhalter-Werte ersetzen — **lokal,
nicht committen**:

```html
window.AvatarDesk?.init({
  livekitUrl: 'wss://<deine-livekit-url>',
  livekitToken: '<dein-frischer-token>',
});
```

Dev-Server starten:

```bash
corepack pnpm --filter @avatardesk/widget dev
```

Erwartet: Vite startet auf `http://localhost:5173/`.

Hintergrund zum Widget (insbesondere zur „DO NOT SHIP"-Warnung,
die sich auf den Phase-0-Token-Workaround bezieht):
[apps/widget/README.md](../../apps/widget/README.md).

---

## Schritt 5 — Browser-Test

1. Browser auf `http://localhost:5173/`.
2. **DevTools öffnen** (`Cmd+Option+I` / `F12`), Tab **Console**.

Was du sofort sehen solltest:

- In der Console eine `console.warn`-Zeile beginnend mit
  `AvatarDesk: phase-0 token mode active, do not use in production.`
  Das ist der hartcodierte Sicherheits-Hinweis aus
  [ADR 003](../decisions/003-phase-0-token-workaround.md).
- Unten rechts ein dunkler runder Button mit `💬`.

Klick auf den Button:

- Modal öffnet (Desktop 480 × 720).
- Status-Indikator: „Verbinde…" → nach 1–3 s „Verbunden".
- Im Terminal des Python-Agents (Schritt 2) erscheinen Log-Zeilen
  wie `agent dispatched to room`, `beyond-presence avatar attached`,
  `agent session started`, `greeting spoken chars=43`.
- Im Modal: Sofia-Avatar erscheint und sagt
  „Hallo, ich bin Sofia. Wobei kann ich dir helfen?" — lippensynchron.

Wenn das passiert, ist Phase 0 end-to-end verifiziert.

---

## Schritt 6 — Aufräumen

Wichtig: Token in `apps/widget/index.html` zurücksetzen, **bevor**
du committest:

```bash
git checkout apps/widget/index.html
```

Verifizieren mit `git status` — muss „nothing to commit, working
tree clean" zeigen.

Services beenden:

```bash
# Terminal-Prozesse: Ctrl+C in Agent- und Vite-Terminals.

# Docker stoppen (Volumes bleiben, Daten beim nächsten up wieder da):
docker compose down

# Komplettes Daten-Wipe (Init-Skript läuft beim nächsten up neu):
docker compose down -v
```

---

## Troubleshooting

Diese Liste reflektiert die echten Stolpersteine aus dem ersten
geglückten E2E-Lauf am 2026-05-07.

### Port-Konflikt mit anderem Postgres / Redis

**Symptom:** `docker compose up` schlägt fehl mit „bind: address
already in use".

**Ursache:** Anderer lokaler Stack belegt 5432 oder 6379 (z. B.
ein paralleles Projekt mit eigener `axano-*`-Compose-Familie).

**Lösung:** in `.env` abweichende Ports setzen, z. B.:

```env
POSTGRES_PORT=5433
REDIS_PORT=6380
DATABASE_URL=postgresql://avatardesk:avatardesk@localhost:5433/avatardesk
REDIS_URL=redis://localhost:6380
```

`docker compose up -d` erneut. Container belegen jetzt
host-seitig die abweichenden Ports.

### LiveKit `401 invalid token`

**Symptom:** Browser-Console zeigt `WebSocket connection ... failed:
There was a bad response from the server` und
`could not establish signal connection: invalid token`.

**Häufigste Ursachen:**

1. **Leerzeichen im Room-Namen** — siehe Sanity-Check in Schritt 3.
2. **Falscher Default aus dem Dashboard** — manche LiveKit-UI-
   Versionen prefillen `room=prova` o. ä.; das Feld muss überschrieben
   werden, nicht angehängt.
3. **Token abgelaufen** — Standard-TTL ist 6 h, neue Token erzeugen.
4. **Falscher API-Key signiert den Token** — beim Generate-Dialog
   wird im Dropdown der API-Key gewählt, der den Token signiert.
   Dieser muss derjenige sein, mit dem der Agent in `.env` läuft.

### TTS scheitert mit `connection closed, status_code=-1`

**Symptom:** Agent crasht mit
`livekit.agents._exceptions.APIStatusError: message='connection closed',
status_code=-1, retryable=True` aus
`livekit/plugins/elevenlabs/tts.py`.

**Ursache:** ElevenLabs-API-Key hat keine ausreichenden
Permissions. Der Plugin schließt die WebSocket-Verbindung sofort,
ohne klare Fehlermeldung.

**Lösung:** API-Key im ElevenLabs-Dashboard auf einen mit
„Has access to all scopes" rotieren — oder mindestens
`text_to_speech`, `voices_read`, `models_read` aktivieren.
Schnellverifikation, ob der Key passt:

```bash
set -a && . ./.env && set +a
curl -sS -w "\nHTTP %{http_code}\n" https://api.elevenlabs.io/v1/voices \
  -H "xi-api-key: $ELEVENLABS_API_KEY" | head -c 100
```

`HTTP 200` mit Voice-Liste = okay. `HTTP 401 missing_permissions`
= Key erweitern oder neuen erzeugen.

### Avatar-Video bleibt schwarz

**Symptom:** Modal verbindet, Status zeigt „Verbunden", aber
Video-Bereich bleibt schwarz, kein Audio.

**Wahrscheinlichste Ursache:** TTS-Pfad ist gebrochen. Beyond
Presence rendert nichts, weil keine Audio-Frames ankommen. Schau
ins Agent-Terminal — wenn dort ein TTS-Fehler steht, ist das die
Wurzel; der Avatar-Stream ist Symptom, nicht Ursache.

**Sekundäre Ursachen:** Browser-Audio-Autoplay-Restriction (einmal
irgendwo auf die Page klicken, damit Audio entsperrt wird), oder
falsche Avatar-ID, die nicht zu deinem BP-Account gehört.

### Vite zeigt alten Token nach Token-Wechsel

**Symptom:** Du hast den Token in `index.html` geändert, aber der
Browser nutzt offensichtlich noch den alten (siehe JWT in
Network-Tab).

**Lösung:** Hard-Reload mit `Cmd+Shift+R` (macOS) bzw.
`Ctrl+Shift+R` (sonst). Vite cached HMR-Module zwischen Requests;
bei Inline-Scripts mit Token-Werten greift HMR nicht zuverlässig.

---

## Sicherheit

In Phase 0 sind LiveKit-Tokens und API-Keys das primäre
Geheimnis-Material. Hygiene-Regeln:

- Tokens **niemals** in eine getrackte Datei schreiben — auch nicht
  „nur kurz für den Test". `apps/widget/index.html` wird nach
  jedem Test mit `git checkout` zurückgesetzt.
- Tokens **niemals** in einen Chat (Slack, Mail, KI-Assistent)
  posten. Auch nicht im Screenshot — JWTs sind im Bild lesbar.
- IDE-Auto-Telemetrie kann Datei-Inhalte mitschicken, ohne dass du
  es merkst — siehe [ADR 002](../decisions/002-credential-leak-acknowledged.md)
  für den konkreten Vorfall in diesem Projekt und die Lessons
  Learned.
- Bei jedem Verdacht auf Leak: Token oder API-Key sofort im
  Provider-Dashboard rotieren. Kostet 30 s, ist immer der bessere
  Default.
- Hintergrund zum Phase-0-Token-Workaround und zum
  Phase-1-Nachfolge-Pattern (`POST /api/widget-session`):
  [ADR 003](../decisions/003-phase-0-token-workaround.md).
- Bundle-Größe und ihre Begründung:
  [ADR 004](../decisions/004-widget-bundle-size.md).

---

## Was Phase 0 abschließt

- ✅ Monorepo-Skelett (pnpm + Turborepo).
- ✅ Lokale Infrastruktur (Postgres + pgvector, Redis).
- ✅ Python-Agent mit Beyond-Presence-Avatar (TTS-only,
  Hello-World).
- ✅ Embeddable Widget, das via LiveKit den Avatar subscribed.
- ✅ End-to-End-Demo: Browser → LiveKit → Agent → BP → Avatar
  spricht.
- ✅ CI-Pipeline (Build- und Lint-Checks auf jedem Push).

## Was Phase 1 bringt

- Mikrofon-Capture im Widget, STT-Loop (Deepgram).
- LLM-Konversation (Claude Sonnet) mit Tool-Use.
- API-Service (NestJS) inkl. `POST /api/widget-session` —
  ersetzt den Token-Workaround aus Schritt 3.
- Drizzle-Migrations und erste Tenant-Daten.
- Wissensdatenbank-Upload und RAG.
- Erste echte Tests (Vitest, Playwright, pytest).

Vollständige Roadmap: [PRD §10](../../PRD.md).
