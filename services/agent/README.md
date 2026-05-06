# services/agent — AvatarDesk Realtime Agent

Python worker built on `livekit-agents` 1.x that orchestrates the
realtime conversation pipeline: STT (Deepgram) → LLM (Claude) →
TTS (ElevenLabs) → Beyond-Presence avatar. In Phase 0 the agent
only speaks a fixed greeting — STT and LLM are wired up but not
yet driving a conversational loop.

The canonical integration pattern follows
[CLAUDE.md §7](../../CLAUDE.md) and [PRD.md §6.2](../../PRD.md).

---

## Voraussetzungen

- Python ≥ 3.11 (siehe `.python-version`)
- pyenv oder uv empfohlen, damit lokal die richtige Version aktiv ist
- Repo-Root `.env` mit den 7 Phase-0-Schlüsseln (siehe `.env.example`)

## Erst-Setup

Aus diesem Verzeichnis (`services/agent/`):

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Beim ersten Start lädt `livekit-agents` zusätzliche Modelle
(Silero VAD). Falls das in deinem Netzwerk geblockt sein sollte,
gibt es einen expliziten Pre-Download:

```bash
python main.py download-files
```

## Agent starten

```bash
source .venv/bin/activate
python main.py dev
```

Der Worker registriert sich bei deiner LiveKit-Cloud-Instanz. Der
Status wird strukturiert via `structlog` auf stdout geloggt.

### Test-Run mit dem LiveKit-Cloud-Sandbox-Client

In Phase 0 gibt es noch kein eigenes Widget — die einfachste
Möglichkeit, den Avatar zu sehen:

1. LiveKit-Cloud-Dashboard → dein Projekt → **Sandbox** →
   **Voice Agent** (oder **Hosted Sandbox Demo**).
2. Als „room" einen beliebigen Namen wählen, z. B. `phase0-test`.
3. „Connect" klicken.
4. Der Worker wird automatisch dispatched und der Avatar joint
   den Room. Nach wenigen Sekunden sollte Sofia den
   Begrüßungstext sagen.

In Task 0.4 ersetzen wir diesen Sandbox-Client durch unser
eigenes Preact-Widget.

## Verifikation und Linting

```bash
ruff check .
black --check .
python -m py_compile main.py    # static syntax check
pytest                           # noch keine echten Tests in Phase 0
```

## Logging-Konventionen

- `structlog` mit Console-Renderer in Dev, später JSON in Prod.
- **Niemals** API-Keys, Tokens, Stimm-IDs oder Avatar-IDs in
  Log-Felder schreiben (CLAUDE §6 + §11). Strukturierte Felder
  wie `room`, `chars`, `missing` (Schlüsselnamen, nie Werte) sind
  okay.

## Was Phase 0 nicht abdeckt

- Kein STT-Hör-Loop — der Agent reagiert nicht auf Sprache.
- Keine Tool-Use, kein RAG.
- Keine Tests mit Inhalt — Pytest-Setup ist Skelett.
- Keine Tenant-Konfiguration — alle Werte kommen aus `.env`.

Diese Punkte landen in Phase 1, siehe [PRD.md §10.2](../../PRD.md).
