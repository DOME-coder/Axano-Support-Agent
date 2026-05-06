# CLAUDE.md — Anweisungen für Claude Code

Dieses Dokument beschreibt, wie Claude Code in diesem Repository arbeiten soll. Es wird bei jeder Session automatisch geladen.

---

## 1. Projektkontext

**AvatarDesk** ist eine White-Label B2B-SaaS-Plattform: Unternehmen embedden ein JavaScript-Widget in ihre Website; Endkunden sprechen dann per Sprache mit einem fotorealistischen KI-Avatar (Beyond Presence), der ihre Fragen beantwortet und ihren geteilten Bildschirm analysieren kann.

**Lies vor jeder größeren Aufgabe das [PRD.md](./PRD.md)**. Es ist die Single Source of Truth für Anforderungen, Architektur und Tech-Stack-Entscheidungen.

---

## 2. Goldene Regeln

1. **PRD ist verbindlich.** Weiche nicht ohne expliziten Hinweis vom dort beschriebenen Stack ab. Wenn dir eine Alternative besser erscheint, schlage sie vor und dokumentiere die Abweichung als ADR (Architecture Decision Record) in `docs/decisions/`.
2. **Beyond Presence ist gesetzt.** Wir nutzen das offizielle `bey`-Plugin für `livekit-agents`. Kein HeyGen, kein D-ID — die sind nur Fallback-Optionen im Code-Adapter.
3. **DSGVO first.** Wir sind ein EU-Produkt. Keine Drittanbieter ohne EU-Datenresidenz oder DPA. Keine Speicherung von Sprach-/Video-/Screen-Daten ohne expliziten Zweck.
4. **Frag bei Unklarheiten nach.** Lieber eine Rückfrage als eine falsche Annahme. Vor allem bei: Datenmodell-Änderungen, neuen Drittanbietern, Sicherheitsentscheidungen, Pricing-/Billing-Logik.
5. **Keine Geheimnisse im Code.** API-Keys, Tokens, Passwörter — immer aus `.env`. Niemals committen. Vor jedem Commit prüfen.

---

## 3. Repo-Struktur

```
avatardesk/
├── apps/
│   ├── widget/          # Embeddable Widget (Preact + TypeScript + Vite)
│   └── dashboard/       # Tenant-Admin-Dashboard (Next.js 14)
├── services/
│   ├── api/             # REST-API (NestJS / TypeScript)
│   └── agent/           # LiveKit-Agent (Python)
├── packages/
│   └── shared/          # Geteilte Types, Validators, Utilities
├── docs/
│   ├── architecture/    # Architektur-Diagramme
│   └── decisions/       # ADRs (numeriert: 001-..., 002-...)
├── PRD.md
├── CLAUDE.md
├── README.md
├── .env.example
└── .gitignore
```

**Monorepo-Tool:** pnpm + Turborepo. Niemals `npm` oder `yarn` — bricht das Lockfile.

---

## 4. Tech-Stack-Quickref

Vollständige Begründung in PRD Sektion 6.3 und 7.

| Bereich | Tool | Befehl |
|---|---|---|
| Package-Manager | pnpm 9+ | `pnpm install`, `pnpm add <pkg>`, `pnpm dev` |
| Build-Orchestrator | Turborepo | `pnpm turbo run build` |
| Widget-Frontend | Preact + Vite + TS | `pnpm --filter widget dev` |
| Dashboard-Frontend | Next.js 14 (App Router) | `pnpm --filter dashboard dev` |
| API-Backend | NestJS | `pnpm --filter api start:dev` |
| Realtime-Agent | Python 3.11+ / livekit-agents | `cd services/agent && python main.py dev` |
| DB | PostgreSQL + pgvector | über Docker Compose |
| Cache | Redis | über Docker Compose |
| Migrations | Drizzle ORM | `pnpm db:migrate` |
| Tests Frontend | Vitest + Playwright | `pnpm test`, `pnpm test:e2e` |
| Tests Backend (TS) | Vitest | `pnpm test` |
| Tests Agent (Py) | pytest | `pytest services/agent/tests` |
| Linting | ESLint + Prettier (TS), Ruff + Black (Py) | `pnpm lint`, `ruff check`, `black .` |

---

## 5. Code-Konventionen

### TypeScript / JavaScript
- Strict mode überall (`"strict": true` in tsconfig).
- Keine `any`-Types ohne Kommentar (`// eslint-disable-next-line @typescript-eslint/no-explicit-any -- BEGRÜNDUNG`).
- Funktionale Komponenten in React, keine Class-Components.
- Imports gruppieren: 1) externe Pakete, 2) `@/*` Aliases, 3) relative Imports.
- File-Naming: `kebab-case.ts` für Module, `PascalCase.tsx` für React-Komponenten.

### Python (Agent-Service)
- Python 3.11+, type hints obligatorisch.
- `ruff` als Linter, `black` als Formatter (Line-Length 100).
- Async/await für alle I/O-Operationen.
- Logging über `structlog`, niemals `print` in Produktionscode.

### Allgemein
- **Sprache der Code-Kommentare:** Englisch (für internationale Lesbarkeit).
- **Sprache der UI-Strings:** mehrsprachig über i18n-Files (DE/EN/IT/FR/ES).
- **Sprache der Doku/ADRs:** Deutsch (Hauptmarkt) oder Englisch (Acceptable). Konsistenz pro Dokument.
- Commit-Messages: [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

---

## 6. Sicherheit

- **API-Keys & Secrets:** ausschließlich über `.env` (lokal) bzw. Secret-Manager (Produktion). Niemals committen.
- **Vor jedem Commit prüfen:** keine Keys, keine Passwörter, keine Tenant-Daten in Git.
- **Tenant-Isolation:** jede DB-Query muss `tenant_id` filtern (Postgres Row-Level-Security wo möglich).
- **CORS:** strikt auf erlaubte Tenant-Domains beschränken.
- **Rate-Limiting:** auf API-Gateway-Ebene (Cloudflare oder NestJS-Throttler).
- **Input-Validierung:** Zod (TS) bzw. Pydantic (Python) auf allen externen Inputs.
- **Logs:** keine PII (E-Mails, Namen, Sprach-Inhalt) in Logs ohne Bedarf.

---

## 7. Beyond-Presence-Integration (kritisch)

Wir verwenden den **Modus A: Speech-to-Video API** mit dem `bey`-Plugin für `livekit-agents`. Modus B (Managed Agent API) nur für „Quick Setup“-Tier.

**Kanonischer Code-Pfad** (siehe PRD 6.2):

```python
from livekit.plugins import bey, deepgram, elevenlabs, anthropic, silero
from livekit.agents import AgentSession

session = AgentSession(
    stt=deepgram.STT(model="nova-2", language="de"),
    llm=anthropic.LLM(model="claude-sonnet-4-6"),
    tts=elevenlabs.TTS(voice_id=tenant.voice_id),
    vad=silero.VAD.load(),
)
avatar = bey.AvatarSession(avatar_id=tenant.avatar_id)
await avatar.start(session, room=ctx.room)
await session.start(agent=ConversationalAgent(), room=ctx.room)
```

**Niemals:**
- Den `bey_api_key` direkt im Code hardcoden.
- Avatar-Frames im Backend abfangen und woanders weiterleiten (verstößt gegen BP-ToS und blendet GDPR aus).
- Mehrere parallele BP-Sessions pro Konversation öffnen (Kosten explodieren).

**Immer:**
- Pro Konversation genau eine BP-Session, sauber beendet (`await avatar.stop()`).
- Verbrauchte Minuten in `Conversation.bey_minutes_used` mitschreiben für Billing.
- Bei BP-Fehler: Fallback auf Sprach-only-Modus, nicht Crash.

---

## 8. Datenbank

- **PostgreSQL 16+** mit `pgvector`-Extension.
- **Migrations:** Drizzle ORM, in `services/api/src/db/migrations/`.
- **Niemals:** direkte `ALTER TABLE` in Produktion. Alles über Migrations.
- **Schema-Änderungen:** vorher in PR diskutieren, nicht silently ändern.
- **Test-DB:** separate Datenbank, wird vor jedem Testlauf gemigrated.

Datenmodell siehe PRD Sektion 6.4.

---

## 9. Testing-Strategie

- **Unit-Tests:** für reine Logik (RAG-Prompt-Builder, Validators, Utilities).
- **Integration-Tests:** für API-Endpoints (mit Test-DB).
- **E2E-Tests:** Playwright für Widget + Dashboard-Flows.
- **Agent-Tests:** Mock-LiveKit-Room, deterministische STT/LLM/TTS-Stubs.
- **Coverage-Ziel:** > 70 % auf Backend, > 50 % auf Frontend.
- **Vor jedem PR:** Tests müssen grün sein, sonst kein Merge.

---

## 10. Workflow für Aufgaben

Wenn du (Claude Code) eine Aufgabe bekommst:

1. **Verstehen:** Lies die Issue / das Ticket. Wenn unklar → frag nach.
2. **PRD-Check:** Suche im PRD nach dem relevanten Abschnitt. Halte dich daran.
3. **Plan:** Skizziere, welche Dateien du anlegen / ändern wirst, bevor du Code schreibst. Bei größeren Aufgaben (>5 Dateien) zeig den Plan dem User vor der Umsetzung.
4. **Implementieren:** Kleine, fokussierte Änderungen. Eine Aufgabe = ein Branch = ein PR.
5. **Testen:** Lokal Tests laufen lassen. Wenn neu eingebauter Code nicht testbar ist, frag nach Refactoring.
6. **Dokumentieren:** Wenn du eine Architektur-Entscheidung triffst, lege einen ADR in `docs/decisions/` an.
7. **Committen:** Conventional Commits. Eine logische Änderung = ein Commit.
8. **PR-Beschreibung:** was, warum, wie getestet. Verlinke das relevante PRD-Kapitel.

---

## 11. Was du NICHT tun sollst

- ❌ Eigenmächtig den Tech-Stack ändern (z. B. Vue statt Preact, Postgres → MongoDB).
- ❌ Drittanbieter hinzufügen, die nicht im PRD stehen, ohne Rückfrage.
- ❌ Tests deaktivieren oder skippen, um schneller zu mergen.
- ❌ `console.log` / `print` Debug-Statements committen.
- ❌ Migration-Files nachträglich editieren (immer eine neue Migration anlegen).
- ❌ Geheimnisse loggen oder in Fehlermeldungen ausgeben.
- ❌ Avatar-Streaming-Frames im Backend speichern.
- ❌ Sprach-Audio des Endkunden persistieren (nur Transkripte, falls Tenant erlaubt).
- ❌ Frontend-Strings hardcoden (immer i18n).

---

## 12. Wenn du nicht weiterkommst

- **Bei technischen Unklarheiten:** sag explizit „Ich brauche Klärung zu X.“ Lieber stoppen als raten.
- **Bei API-Limits / fehlenden Keys:** dokumentiere im PR, was zum Testen fehlt.
- **Bei Konflikten zwischen PRD und Realität:** notiere den Konflikt, schlage Lösung vor, warte auf Bestätigung.

---

## 13. Erste Aufgaben (Phase 0)

Empfohlene Reihenfolge für den Einstieg (siehe PRD Sektion 10.1 + 16.3):

1. Monorepo-Skelett anlegen (Turborepo + pnpm workspaces).
2. `.env.example` befüllen, Docker Compose mit Postgres + Redis aufsetzen.
3. Python-Agent „Hello World“: lokales Beyond-Presence-Avatar in einem Test-LiveKit-Room sichtbar machen.
4. Widget-Skelett (Preact + Vite + LiveKit-Client), das in den Test-Room joint und das Avatar-Video anzeigt.
5. Erstes End-to-End-Demo: Endkunde sieht Avatar, Avatar sagt fix-konfigurierten Begrüßungstext.

Wenn diese 5 Schritte stehen, hast du das Fundament — alles weitere ist iterative Erweiterung gemäß PRD.

---

**Bei Fragen zum Projekt:** PRD lesen, dann fragen. PRD ist die Wahrheit, ich (User) bin die Eskalationsstufe.
