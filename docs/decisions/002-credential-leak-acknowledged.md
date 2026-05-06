# ADR 002 — Credential-Leak (Phase 0): Vorfall, Akzeptanz, Rotation

**Status:** Aufgehoben durch Rotation am 2026-05-06
**Datum (Erst-Erstellung):** 2026-05-06
**Datum (Rotation):** 2026-05-06
**Entscheider:** Projekt-Owner

---

## Verlauf in einem Satz

Während Vorbereitung von Task 0.3 wurden Beyond-Presence- und
LiveKit-Credentials in einem Claude-Code-Chat geleakt; der
Projekt-Owner entschied sich zunächst gegen Rotation, revidierte
diese Entscheidung dann aber kurz darauf und rotierte alle
betroffenen Keys. Diese ADR dokumentiert beide Phasen ehrlich.

## Kontext

Am 2026-05-06 wurden bei der Vorbereitung von Task 0.3 (Python-Agent
Hello-World) folgende API-Credentials in einem unverschlüsselten
Chat-Verlauf mit Claude Code übermittelt:

- **Beyond Presence API-Key** (`sk-...`) — Vollzugriff auf den
  Beyond-Presence-Account.
- **LiveKit Cloud API-Key + API-Secret** (Projekt
  `axano-assistent`) — ermöglichte Token-Issuance für jeden Room
  im Projekt.

Avatar-ID und LiveKit-Project-URL gelten ausdrücklich **nicht** als
Geheimnisse — sie sind öffentliche Ressourcen-Kennungen.

Die geleakten Werte lagen damit nachweislich außerhalb des
Geltungsbereichs, in dem sie geheim bleiben sollten:

- in Anthropics API-Logs der Konversation,
- möglicherweise in der Telemetrie der VSCode-Claude-Code-Extension,
- möglicherweise in zukünftigen Memory-Komprimierungs-Snapshots.

## Phase 1 — Initiale Entscheidung: keine Rotation (verworfen)

Standard-Sicherheits-Praxis und CLAUDE §6 + §11 sehen für diesen
Fall vor, beide Keys sofort im jeweiligen Provider-Dashboard zu
rotieren. Aufwand: ~2 Minuten.

Der Projekt-Owner entschied zunächst, die Rotation **nicht**
durchzuführen, mit der wörtlichen Zustimmung:

> „Ich übernehme bewusst das Risiko, die geleakten Keys nicht zu
> rotieren. Mach mit Task 0.3 weiter."

Diese Entscheidung wurde in der Erst-Version dieser ADR (Commit
`c4e7f7f`) festgehalten, inklusive einer Liste der akzeptierten
Risiken (BP-Kostenrisiko, LiveKit-DSGVO-Risiko, SOC-2-Audit-Risiko)
und Pflicht-Mitigationen.

## Phase 2 — Revision: vollständige Rotation (gültig)

Wenig später revidierte der Projekt-Owner diese Entscheidung mit
folgender Aussage:

> „Ich hatte dir zuerst gesagt ‚lass laufen, nicht rotieren' —
> daher dein ADR 002. Inzwischen habe ich es mir anders überlegt
> und alle betroffenen Credentials rotiert. Die alten sind
> revoked, die neuen liegen in .env."

### Konkret durchgeführt

- **Beyond Presence:** alter API-Key im Provider-Dashboard
  revoked; neuer API-Key generiert und ausschließlich in
  lokaler `.env` eingetragen.
- **LiveKit Cloud:** alter API-Key + Secret revoked; neuer Key
  und neuer Secret generiert und ausschließlich in lokaler
  `.env` eingetragen.

Avatar-ID und LiveKit-Project-URL wurden behalten — beides
sind keine Geheimnisse.

### Damit bestehende Risiken aufgelöst

- **Finanzielles Risiko (BP):** behoben. Der geleakte Key ist
  inaktiv, kann keine Sessions mehr starten.
- **DSGVO-Risiko (LiveKit):** behoben. Der geleakte Key+Secret
  kann keine Tokens mehr ausgeben. Falls jemand zwischen Leak
  und Rotation Tokens generiert hatte, sind diese nur so lange
  gültig wie ihr Token-TTL — bei LiveKit-Cloud Standard-Tokens
  typischerweise wenige Stunden bis wenige Tage. Da Phase 0
  noch keine echten Endkunden-Sessions hatte, ist das Restrisiko
  für personenbezogene Daten praktisch null.
- **Audit-Risiko (SOC 2):** der Vorfall **selbst** bleibt in der
  Historie sichtbar (genau dafür ist diese ADR da), aber die
  Reaktion entspricht jetzt der Best Practice „Leak →
  unmittelbare Rotation". Das ist ein verteidigbares Audit-
  Findings-Pattern, nicht ein offener Befund.

## Aktueller Status

Diese ADR ist **aufgehoben durch Rotation**. Die in
[CLAUDE.md §6 + §11](../../CLAUDE.md) verankerten Regeln gelten
unverändert weiter — insbesondere:

- Niemals Geheimnisse im Chat, in Commits oder in Logs.
- Bei jedem zukünftigen Leak: sofortige Rotation als Default-
  Reaktion, ohne Diskussion. Diese ADR dient als Präzedenzfall.

Eine eventuelle erneute Wieder-Akzeptanz eines Leaks ohne
Rotation würde eine **eigene neue ADR** verlangen, nicht eine
Re-Aktivierung dieser hier.

## Lessons Learned

1. **Process-Fehler:** Die Schlüssel-Vorgaben in der vorigen
   Vorschlags-Nachricht hatten zwar einen Sicherheits-Hinweis,
   aber der Hinweis war nicht prominent genug, um den Leak zu
   verhindern. Bei zukünftigen Credential-Schritten sollte die
   Eingabe noch deutlicher *im Repo, nicht im Chat* erzwungen
   werden — z. B. durch eine `scripts/check-env.sh`, die der
   User selbst lokal ausführt, statt einer Chat-Anweisung.
2. **Hygiene-Default:** Selbst wenn ein User „lass laufen" sagt,
   ist Rotation der bessere Default. Diese ADR-Doppel-Phase
   illustriert, dass eine kurze Bedenkphase oft zur richtigen
   Entscheidung führt.
3. **ADR als ehrlicher Audit-Trail:** Diese ADR enthält
   absichtlich beide Phasen (Akzeptanz + Revision) statt die
   Erst-Entscheidung zu überschreiben. Eine ADR, die nur die
   finale Entscheidung zeigt, hätte den Lerneffekt
   verschleiert. Die Roh-Geschichte ist in der Git-Historie
   ohnehin sichtbar (Commit `c4e7f7f` zeigt die Erst-Version).

## Referenzen

- [CLAUDE.md §6 + §11](../../CLAUDE.md) — Sicherheits-Regeln
- [PRD.md §5.3 + §8](../../PRD.md) — DSGVO und Sicherheits-
  Anforderungen
- DSGVO Art. 33 — Meldepflicht bei Datenschutzverletzungen
  (im konkreten Fall **nicht** ausgelöst, da keine
  personenbezogenen Daten betroffen waren)
- Erst-Version dieser ADR: Commit `c4e7f7f`
