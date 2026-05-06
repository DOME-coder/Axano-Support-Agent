# Lokale Entwicklungs-Infrastruktur

Diese Doku beschreibt, wie die lokale Datenbank- und Cache-Schicht
für AvatarDesk gestartet, geprüft und zurückgesetzt wird.

Produktions-Deployments laufen über separate Manifeste (k3s/Kubernetes)
und nutzen managed Services — `docker-compose.yml` ist ausschließlich
für lokale Entwicklung gedacht.

---

## Komponenten

| Service  | Image                        | Port  | Zweck                                       |
| -------- | ---------------------------- | ----- | ------------------------------------------- |
| postgres | `pgvector/pgvector:pg16`     | 5432  | Tenant-Daten + RAG-Embeddings (pgvector)    |
| redis    | `redis:7-alpine`             | 6379  | Cache, Session-State, BullMQ-Queues (später) |

Beide Services laufen auf einem geteilten Bridge-Network `avatardesk`
und nutzen Named Volumes (`postgres-data`, `redis-data`), die persistent
über `docker compose down` hinweg sind. Erst `docker compose down -v`
löscht die Daten.

---

## Erststart

Voraussetzung: Docker Desktop oder Colima (macOS), Docker Engine (Linux).

```bash
# 1. Environment-Datei anlegen, falls noch nicht vorhanden
cp .env.example .env

# 2. Services im Hintergrund starten
docker compose up -d

# 3. Auf Healthchecks warten (optional, dauert ~10 s)
docker compose ps
```

`docker compose ps` sollte beide Services im Status `Up (healthy)` zeigen.

Beim ersten Start führt Postgres automatisch das Init-Script
`services/api/src/db/init/01-extensions.sql` aus und aktiviert die
pgvector-Extension.

---

## Verifikation

### Postgres + pgvector

```bash
docker compose exec postgres \
  psql -U avatardesk -d avatardesk \
  -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

Erwartete Ausgabe:

```
 extname | extversion
---------+------------
 vector  | 0.x.x
```

### Redis

```bash
docker compose exec redis redis-cli ping
```

Erwartete Ausgabe: `PONG`.

### Connection-String prüfen

Aus dem Repo-Root:

```bash
docker compose exec postgres \
  psql "$(grep ^DATABASE_URL .env | cut -d= -f2-)" -c "SELECT 1;"
```

Liefert `?column? = 1` zurück, sobald `.env` mit dem korrekten
`DATABASE_URL` befüllt ist.

---

## Stopp & Reset

```bash
# Services stoppen, Daten bleiben erhalten
docker compose down

# Services stoppen UND alle Daten löschen (Init-Script läuft erneut)
docker compose down -v
```

`docker compose down -v` ist die richtige Wahl, wenn das Init-Script
geändert wurde — Postgres führt es nur aus, wenn das Datenverzeichnis
leer ist.

---

## Troubleshooting

### Port 5432 oder 6379 schon belegt

Wenn lokal bereits ein Postgres oder Redis läuft, gibt es einen
Port-Konflikt. Lösungen:

- Lokalen Service stoppen (`brew services stop postgresql`).
- Oder die Mappings in `docker-compose.yml` ändern (z. B.
  `"5433:5432"`) und gleichzeitig `DATABASE_URL` in `.env` anpassen.

### pgvector-Extension fehlt

Falls die Verifikation oben kein `vector` zurückgibt:

1. `docker compose down -v` (löscht das Datenverzeichnis)
2. `docker compose up -d` (Init-Script läuft erneut)

Postgres führt Init-Scripts **nur beim ersten Start** auf einem leeren
Datenverzeichnis aus.

### Logs ansehen

```bash
docker compose logs -f postgres
docker compose logs -f redis
```

---

## Weiterführend

- Schema-Definition und Migrations: kommen mit dem API-Service
  (`services/api/src/db/migrations/`, Phase 1).
- Datenmodell-Übersicht: [PRD §6.4](../../PRD.md).
- DB-Konventionen: [CLAUDE §8](../../CLAUDE.md).
