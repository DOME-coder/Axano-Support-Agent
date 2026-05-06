# ADR 001 — Monorepo-Tooling: pnpm + Turborepo

**Status:** Akzeptiert
**Datum:** 2026-05-06
**Entscheider:** Projekt-Owner (gemäß PRD §6.3, CLAUDE §3)

---

## Kontext

AvatarDesk besteht aus mehreren eigenständigen Code-Artefakten, die sich Code, Types und Build-Pipelines teilen sollen:

- `apps/widget` (Preact + Vite, IIFE-Bundle für CDN)
- `apps/dashboard` (Next.js 14)
- `services/api` (NestJS / TypeScript)
- `services/agent` (Python 3.11+ — eigenes Paketmanagement via pip/pyproject)
- `packages/shared` (geteilte TypeScript-Types und Validators)

Wir brauchen ein Tooling, das:

1. **Mehrere TypeScript-Workspaces** mit gemeinsamen Dependencies verwaltet (ohne Duplikation in `node_modules`).
2. **Inkrementelle Builds** über Workspaces hinweg ermöglicht (Caching, parallele Ausführung).
3. **Deterministisch** ist (Lockfile, Version-Pinning).
4. **Schnell** in CI startet.
5. **Mit dem Python-Service koexistiert**, ohne ihn zu kontaminieren.

## Entscheidung

Wir nutzen **pnpm 9** als Package-Manager und **Turborepo 2** als Build-Orchestrator für die TypeScript-Workspaces. Der Python-Agent (`services/agent`) bleibt ein eigenständiges Paket mit eigenem Toolchain (`pyproject.toml`, `ruff`, `pytest`) und wird von Turborepo lediglich über shell-Tasks (Lint, Test) angesteuert, nicht über das Workspace-Protokoll.

### Begründung

- **pnpm:** content-addressable Storage spart drastisch Plattenplatz und Install-Zeit (vs. npm/yarn). Strict-Mode verhindert Phantom-Dependencies — eine echte Anti-Bug-Garantie. Workspaces sind erstklassig integriert (`pnpm-workspace.yaml`).
- **Turborepo:** Remote-Cache (später möglich), parallele Task-Ausführung, klares Pipeline-Modell mit `dependsOn`. Aktiv von Vercel maintained, gut dokumentiert.
- **Konsistenz mit PRD:** PRD §6.3 und CLAUDE §3 nennen explizit pnpm + Turborepo als gesetzten Stack. Abweichung wäre ohne Anlass nicht gerechtfertigt.

## Verworfene Alternativen

- **npm Workspaces:** funktional ähnlich zu pnpm, aber langsamer und ohne strict-Mode. Phantom-Dependency-Probleme treten in größeren Monorepos häufig auf.
- **Yarn (Berry/PnP):** PnP-Modus bricht oft mit Tools, die `node_modules` voraussetzen (z. B. einige Vite-Plugins). Klassischer Yarn ist marginal langsamer als pnpm und bietet keine signifikanten Vorteile.
- **Nx:** mächtiger als Turborepo, aber mehr Boilerplate und steilerer Lernkurve. Für unser Setup (5 Workspaces, klare Pipelines) Overkill.
- **Lerna:** im Wartungsmodus, durch pnpm + Turborepo abgedeckt.
- **Bun-Workspaces:** zu jung für ein Produktivprojekt mit DSGVO-Anspruch; Plugin-Ökosystem für unsere Stacks (Vite, Next, Nest) noch nicht ausgereift.

## Konsequenzen

### Positiv

- Schnelle Installs (Sekunden statt Minuten in CI).
- Deterministische Builds via `pnpm-lock.yaml`.
- Strict-Mode fängt Bugs früh.
- Klare Workspace-Grenzen — keine versehentlichen Cross-Imports.

### Negativ / Aufwand

- Entwickler müssen pnpm 9+ lokal installiert haben (`corepack enable` löst das in den meisten Fällen automatisch).
- `npm install` oder `yarn install` würden Lockfiles korrumpieren — muss klar dokumentiert sein (CLAUDE §3 tut dies bereits).
- Python-Service ist Out-of-Band — Entwickler müssen wissen, dass `pnpm install` im Repo-Root **nicht** den Python-Agent setzt; dafür gibt es ein eigenes Setup in `services/agent/README.md`.

## Referenzen

- [PRD.md §6.3](../../PRD.md) — Tech-Stack-Empfehlung
- [CLAUDE.md §3](../../CLAUDE.md) — Repo-Struktur
- [pnpm-Dokumentation](https://pnpm.io)
- [Turborepo-Dokumentation](https://turbo.build/repo)
