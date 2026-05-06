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

> Voraussetzungen: Node.js ≥ 20, pnpm ≥ 9, Python ≥ 3.11, Docker, Beyond-Presence-Account.

```bash
# 1. Repo klonen
git clone https://github.com/<your-org>/avatardesk.git
cd avatardesk

# 2. Abhängigkeiten installieren
pnpm install

# 3. Environment-Variablen konfigurieren
cp .env.example .env
# .env editieren und API-Keys eintragen (Beyond Presence, Claude, ElevenLabs, Deepgram, LiveKit)

# 4. Lokale Infrastruktur starten (Postgres, Redis)
docker compose up -d

# 5. Datenbank-Migrationen ausführen
pnpm db:migrate

# 6. Alle Services im Dev-Modus starten
pnpm dev
```

Der Python-Agent läuft separat:

```bash
cd services/agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py dev
```

## Roadmap (Übersicht)

- **Phase 0** (Wo. 1–2): Foundation – Repo, Infra, Beyond-Presence-Setup
- **Phase 1** (Wo. 3–7): Core MVP – Widget + Agent + erste End-to-End-Konversation
- **Phase 2** (Wo. 8–12): Bildschirm-Sharing + RAG + mehrsprachig
- **Phase 3** (Wo. 13–20): Eskalation, CRM-Integrationen, Billing, GA-Launch
- **Phase 4** (ab Monat 6): Mobile-SDKs, Outbound, WordPress/Shopify-Plugins

Details in [PRD.md, Sektion 10](./PRD.md).

## Dokumentation

- [PRD.md](./PRD.md) — Vollständiges Product Requirements Document
- [CLAUDE.md](./CLAUDE.md) — Anweisungen für Claude Code
- `docs/` — Architektur-Diagramme, Architecture Decision Records (ADRs)

## Status

🚧 **In Entwicklung** — Phase 0 (Foundation).

## Lizenz

Proprietär. Alle Rechte vorbehalten. Siehe [LICENSE](./LICENSE) (folgt).

## Kontakt

Projektowner: _(deinen Namen / E-Mail hier eintragen)_
