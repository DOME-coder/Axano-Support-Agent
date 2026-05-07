# ADR 005 — Direct-to-main statt Branch+PR-Workflow

**Status:** Akzeptiert (ersetzt Phase-1-Plan-Entscheidung)
**Datum:** 2026-05-08
**Entscheider:** Projekt-Owner

---

## Kontext

Im Phase-1-Plan (vom 2026-05-08) war als eine von vier Voraus-Ent-
scheidungen festgelegt: „Strikt Branch+PR pro Task ab Phase 1.
Jede Task = eigener Branch + PR + CI-grün vor Merge."

Diese Entscheidung wurde nach exakt **einer** durchgeführten Iteration
revidiert — nach dem zweiten erfolgreichen PR (Sprint-1 Task 1.1.2,
PR #2 mergte am 2026-05-08 den Drizzle-Branch).

CLAUDE.md §10 schrieb diesen Workflow ebenfalls vor („Eine Aufgabe
= ein Branch = ein PR"). Diese ADR dokumentiert die Revision an
beiden Stellen.

## Beobachtung aus den ersten zwei Tasks

Der Branch+PR-Zyklus pro Task kostete pro Iteration:

- Branch erstellen (`git checkout -b ...`).
- Lokal arbeiten und committen.
- Push mit `-u origin <branch>`.
- Browser öffnen, GitHub-PR-Dialog ausfüllen (Title, Body, Test-Plan),
  PR erstellen.
- Auf CI warten.
- Merge-Button klicken, Branch-Cleanup im Browser bestätigen.
- Lokal `git checkout main && git pull && git branch -d ...`.

Geschätzter Overhead: ~5–8 Minuten pro Task, vor allem in den
Browser-Klicks und im Kontext-Wechsel zwischen Editor, Terminal
und Browser.

## Warum der Workflow für unser Setup nicht passt

Der Standard-Branch+PR-Workflow optimiert auf zwei Dinge, die wir
nicht haben:

1. **Code-Review durch eine andere Person.** Es gibt nur einen
   Solo-Entwickler (DOME-coder), der gleichzeitig Owner und
   einziger Reviewer ist. Eine PR-Beschreibung schreiben, die nur
   man selbst liest, ist Aufwand ohne Empfänger.
2. **Branch-Isolation für parallele Features.** Der Solo-Workflow
   in diesem Projekt arbeitet sequenziell, eine Task nach der
   anderen, mit User-OK pro Task. Es gibt nie zwei parallele
   Branches, die gegeneinander rebased oder vor einem Release
   gebündelt werden müssten.

Der gleiche Owner berichtet, dass seine bestehenden Schwester-
projekte (Axano LeadFlow, Axano System) ohne Branch+PR-Workflow
liefen und das funktioniert. Der hier in Phase 1 eingeführte
Workflow war eine spekulative „best practice" ohne konkretes
Problem, das er gelöst hätte.

## Entscheidung

Ab dieser ADR (Commit-Datum 2026-05-08) gilt für AvatarDesk:

- **Alle Commits direkt auf `main`.**
- **Kein Feature-Branch pro Task.**
- **Kein Pull Request pro Task.**
- **Kein Merge-Commit, kein Branch-Cleanup.**
- **Push direkt auf `origin/main`** nach Bestätigung durch User.

Die CI-Pipeline läuft weiter auf jedem Push auf `main` (siehe
`.github/workflows/ci.yml`) und schlägt Build- oder Lint-Fehler
genauso früh wie zuvor. Der Unterschied ist nur, dass bei einem
roten CI-Lauf der Fix als nächster Commit auf `main` landet,
nicht in einem PR davor.

## Was bleibt unverändert

- **User-OK pro Task vor Ausführung.** Das war nie an PRs
  gebunden, sondern an unsere Workflow-Vereinbarung. Bleibt.
- **Vorschlag → User-OK → Ausführung → Diff zeigen → User-Bestätigung
  → Commit + Push.** Reihenfolge identisch, nur ohne Branch-Schritt.
- **CI-Workflow** bleibt aktiv und blockiert nichts mehr im
  Release-Pfad, fängt aber Lint-/Build-Fehler nach dem Push.
- **ADRs werden weiterhin angelegt**, wenn architektonische oder
  Sicherheits-Entscheidungen anstehen.
- **Sicherheits-Hygiene** (keine Secrets im Commit, ADR 002 + 003
  Lessons) gilt unverändert.

## Konsequenzen

### Positiv

- Direkter Iterations-Pfad, ~5–8 Minuten gespart pro Task.
- Weniger Kontext-Wechsel zwischen Editor/Terminal/Browser.
- Linearer Git-Verlauf ohne Merge-Commits — `git log` lesbarer.
- Keine veralteten Remote-Branches im GitHub-UI.

### Negativ / akzeptiertes Risiko

- **Kein Pre-Merge-CI-Gate.** Wenn ein Commit CI-rot macht, ist
  `main` für die Dauer des Fixes „rot". Solo-Solution: schneller
  Fix-Commit. Bei Bedarf kurz `git push --force-with-lease` nach
  `git revert`.
- **Kein Audit-Punkt im PR-UI.** Falls je ein Audit (SOC 2, DSGVO)
  einen formalen Code-Review-Prozess fordert, muss vor diesem
  Punkt der Workflow erneut umgestellt werden. Der Trigger ist
  klar: vor dem ersten zahlenden Tenant oder vor Audit-
  Vorbereitungen die Entscheidung neu prüfen.
- **Kein Schutz gegen versehentliche Pushs.** `git push origin main`
  geht ohne Zwischenfrage durch. Keine extra Mitigation; falls
  was kaputtgeht, ist `git revert` der Standardweg.

## Bedingungen zur Re-Evaluation

Diese ADR sollte überprüft werden, sobald **eine** der folgenden
Bedingungen eintritt:

- Zweiter Entwickler tritt dem Projekt bei.
- Ein Reviewer (extern, z. B. ein technischer Investor oder
  Co-Founder) wird Teil des Workflows.
- Vorbereitung auf SOC-2-Type-1-Audit beginnt (PRD §8.4).
- Erstes externes Tenant-Onboarding (Phase 1 Sprint 4 oder
  Anfang Phase 2). Bis dahin produzieren wir lokal, da
  ist Direct-to-main akzeptabel.

Bei Aufhebung: Status auf „Aufgehoben am YYYY-MM-DD durch
Wieder­einführung von Branch+PR" setzen, mit Verweis auf den
neuen Workflow-ADR.

## Referenzen

- [CLAUDE.md §10](../../CLAUDE.md) — wird in diesem Commit
  entsprechend aktualisiert
- Phase-1-Plan-Entscheidung (per AskUserQuestion am 2026-05-08):
  „Strikt Branch+PR pro Task ab Phase 1" — durch diese ADR
  revidiert nach Task 1.1.2.
- PR-History dieses Projekts: PR #1 (nest-skeleton, gemerged
  2026-05-08), PR #2 (drizzle-schema, gemerged 2026-05-08).
- Schwester­projekte mit funktionierendem Direct-to-main:
  Axano LeadFlow, Axano System.
