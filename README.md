# AvatarDesk

> White-Label B2B-SaaS-Plattform für visuellen, sprachgesteuerten KI-Customer-Service.

AvatarDesk ermöglicht Unternehmen, einen fotorealistischen weiblichen Video-Avatar als Customer-Service-Lösung in ihre Website einzubetten. Endkunden sprechen per Sprache mit dem Avatar, der ihre Fragen beantwortet, ihre Wissensdatenbank durchsucht und sogar live ihren geteilten Bildschirm analysieren kann.

## Vision

Wärme eines menschlichen Videogesprächs + Skalierbarkeit eines Chatbots + konkrete Problemlösung durch Bildschirm-Sharing — alles in einem Widget, das mit einer Zeile JavaScript-Code in jede Website integriert wird.

## Tech-Stack (High-Level)

- **Avatar-Streaming:** [Beyond Presence](https://www.beyondpresence.ai) (Genesis-Modell, < 100 ms Latenz, EU/DSGVO)
- **Realtime-Transport:** [LiveKit](https://livekit.io) (WebRTC SFU)
- **Sprache (STT):** [Deepgram](https://deepgram.com) Nova-2
- **Sprache (TTS):** [ElevenLabs](https://elevenlabs.io) Flash v2.5
- **LLM:** [Anthropic Claude](https://claude.com) Sonnet 4.6 (inkl. Vision)
- **Datenbank:** PostgreSQL + pgvector
- **Frontend Widget:** Preact + TypeScript + Vite
- **Frontend Dashboard:** Next.js 14 + Tailwind + shadcn/ui
- **Backend Agent:** Python (`livekit-agents` Framework)
- **Backend API:** TypeScript / NestJS

Vollständige Architektur und Begründung im [PRD](./PRD.md).

## Repo-Struktur (geplant)

```
avatardesk/
├── apps/
│   ├── widget/          # Embeddable JS-Widget (Preact)
│   └── dashboard/       # Tenant-Admin-Dashboard (Next.js)
├── services/
│   ├── api/             # REST-API (NestJS)
│   └── agent/           # LiveKit-Agent (Python)
├── packages/
│   └── shared/          # Geteilte Types & Utilities
├── docs/                # Architektur-Dokumente, ADRs
├── PRD.md               # Product Requirements Document
├── CLAUDE.md            # Anweisungen für Claude Code
└── README.md
```

## Schnellstart (Entwicklung)

Vollständige, schrittweise Anleitung mit Provider-Setup,
Token-Generierung und Troubleshooting:
**[docs/architecture/phase-0-e2e.md](./docs/architecture/phase-0-e2e.md)**.

Kurzfassung für jemanden, der die Anleitung schon kennt:

```bash
# 1. .env anlegen und mit echten Werten befüllen
cp .env.example .env

# 2. Lokale Infra (Postgres + Redis) starten
docker compose up -d

# 3. Python-Agent (in eigenem Terminal)
cd services/agent
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
python main.py dev

# 4. Widget-Dev-Server (in eigenem Terminal, Repo-Root)
corepack pnpm install            # einmalig pro Klon
corepack pnpm --filter @avatardesk/widget dev
```

Browser auf `http://localhost:5173/` → Floating-Button →
Beyond-Presence-Avatar spricht.

## Roadmap (Übersicht)

- ✅ **Phase 0** — Foundation: Repo, Infra, Beyond-Presence-Hello-World, Widget-Skelett, CI. End-to-End-Demo verifiziert.
- 🚧 **Phase 1** (Wo. 3–7) — Core MVP: Sprach-Loop (STT + LLM + TTS), RAG, Tenant-Auth, Token-Endpoint, erste echte Konversation.
- **Phase 2** (Wo. 8–12) — Bildschirm-Sharing, Vision, mehrsprachig.
- **Phase 3** (Wo. 13–20) — Eskalation, CRM-Integrationen, Billing, GA-Launch.
- **Phase 4** (ab Monat 6) — Mobile-SDKs, Outbound, WordPress/Shopify-Plugins.

Details in [PRD.md, Sektion 10](./PRD.md).

## Dokumentation

- [PRD.md](./PRD.md) — Vollständiges Product Requirements Document
- [CLAUDE.md](./CLAUDE.md) — Anweisungen für Claude Code
- `docs/` — Architektur-Diagramme, Architecture Decision Records (ADRs)

## Status

✅ **Phase 0 abgeschlossen** (2026-05-07) — Foundation steht, End-to-End-Demo läuft. Setup-Anleitung in [docs/architecture/phase-0-e2e.md](./docs/architecture/phase-0-e2e.md).

🚧 **Aktuell:** Vorbereitung Phase 1 (Sprach-Loop + Tenant-Auth-Endpoint).

## Lizenz

Proprietär. Alle Rechte vorbehalten. Siehe [LICENSE](./LICENSE) (folgt).

## Kontakt

Projektowner: _(deinen Namen / E-Mail hier eintragen)_
