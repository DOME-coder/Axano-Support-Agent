# ADR 002 — Bewusste Akzeptanz eines Credential-Leaks (Phase 0)

**Status:** Akzeptiert (vom Projekt-Owner ausdrücklich entschieden)
**Datum:** 2026-05-06
**Entscheider:** Projekt-Owner

---

## Kontext

Während der Vorbereitung von Task 0.3 (Python-Agent Hello-World) wurden
am 2026-05-06 folgende API-Credentials in einem unverschlüsselten Chat-Verlauf
mit Claude Code übermittelt:

- **Beyond Presence API-Key** (`sk-...`, gekürzt) — Vollzugriff auf den
  Beyond-Presence-Account, kann beliebige Avatar-Sessions starten und
  Kosten verursachen.
- **LiveKit Cloud API-Key + API-Secret** (Projekt `axano-assistent`) —
  ermöglicht Token-Issuance für **alle** Rooms im Projekt, also
  potentiell Mit-Schnitt fremder Konversationen oder Beitritt zu
  Tenant-Sessions.

Diese Werte liegen seither nachweislich in mindestens einem System
außerhalb der Kontrolle des Projekt-Owners (Anthropic-API-Logs der
Konversation), möglicherweise zusätzlich in IDE-Telemetrie und in
zukünftiger automatischer Memory-Komprimierung der Claude-Code-Session.

Die Avatar-ID und die LiveKit-Project-URL gelten ausdrücklich **nicht**
als Geheimnisse — sie sind öffentliche Ressourcen-Kennungen.

## Empfehlung (verworfen)

Standard-Sicherheits-Praxis und CLAUDE §6 + §11 sehen für diesen Fall
vor:

1. Beide Keys (BP, LiveKit) im jeweiligen Provider-Dashboard rotieren.
2. Neue Keys ausschließlich in die lokale `.env` eintragen, nie im Chat.
3. Bei BP zusätzlich: Anomalie-Monitoring auf Rechnungs-Spitzen aktivieren.

Aufwand: ~2 Minuten.

## Entscheidung

Der Projekt-Owner hat ausdrücklich entschieden, die Rotation **nicht**
durchzuführen, mit der wörtlichen Zustimmung:

> „Ich übernehme bewusst das Risiko, die geleakten Keys nicht zu
> rotieren. Mach mit Task 0.3 weiter."

Diese ADR dokumentiert diese Entscheidung formal.

## Begründung des Owners

Nicht im Detail erläutert; vermutlich wegen geringer Phase-0-
Aktivität auf den Accounts und Vertrauen in Anthropics
Logging-Praxis. Bei Bedarf soll diese Sektion vom Owner ergänzt
werden.

## Konsequenzen

### Akzeptierte Risiken

- **Finanzielles Risiko (BP):** missbräuchliche Sessions mit den
  geleakten BP-Credentials gehen direkt zu Lasten des Projekt-
  Accounts. Konservative Schätzung: bei automatisiertem Missbrauch
  könnten in ≤ 24 h Kosten im drei- bis vierstelligen Euro-Bereich
  entstehen, bevor manuelle Eingriffe möglich sind.
- **DSGVO-Risiko (LiveKit):** mit den geleakten LiveKit-Credentials
  kann ein Angreifer Tokens für beliebige Rooms im Projekt erzeugen.
  In Phase 0 existieren noch keine echten Tenant- oder Endkunden-
  Sessions; sobald in späteren Phasen reale Konversationen entstehen,
  wäre ein nicht rotierter Leak ein **meldepflichtiger Vorfall**
  nach Art. 33 DSGVO. Diese ADR muss spätestens vor Phase-1-
  Demos mit echten Daten überprüft und ggf. revidiert werden.
- **Audit-Risiko:** für ein zukünftiges SOC-2-Type-1-Audit (PRD §8.4)
  ist ein nicht rotierter Credential-Leak ein potentieller
  Findings-Punkt.

### Pflichten zur Schadensbegrenzung

Auch ohne Rotation sind folgende Maßnahmen Pflicht:

1. **Spätestens vor dem ersten Phase-1-Demo mit echten Endkunden-
   Daten** muss diese ADR überprüft werden. Wenn die Keys dann noch
   nicht rotiert sind, ist Phase-1-GA blockiert.
2. **Beyond-Presence-Dashboard:** Tages-Limit auf
   Avatar-Stream-Minuten setzen, falls BP das anbietet
   (Cost-Containment).
3. **LiveKit-Dashboard:** Webhook-Alarm auf ungewöhnliche
   Room-Erstellung aktivieren.
4. Bei jeder Auffälligkeit (unerwartete BP-Rechnung, fremde
   LiveKit-Rooms): **sofortige Rotation** beider Keys, ohne weitere
   Diskussion.

### Auswirkung auf Task 0.3 und folgende

- Task 0.3 läuft mit den bestehenden Credentials weiter.
- Code-Pfade und Logging in `services/agent/main.py` werden so
  geschrieben, dass **kein Wert** der genannten ENV-Variablen
  jemals geloggt wird (CLAUDE §11). Diese Hygiene ist unabhängig
  von dieser ADR Pflicht.
- ADR 002 wird in der ADR-Liste in `docs/decisions/` gepflegt und
  bei Rotation entsprechend mit Status „Aufgehoben" plus Datum
  ergänzt.

## Revision

Diese ADR ist explizit als **vorübergehend** zu verstehen und sollte
spätestens bei Eintritt eines der folgenden Ereignisse aufgehoben
werden:

- Erste Konversation mit echten Endkunden-Daten (Phase 1 GA-Demo).
- Erstes Onboarding eines externen Tenants.
- Aufnahme von SOC-2-Audit-Vorbereitungen.
- Beobachtete Anomalie auf einem der betroffenen Accounts.

Bei Aufhebung: Status oben auf „Aufgehoben — am YYYY-MM-DD durch
Rotation; siehe Commit-Hash" setzen.

## Referenzen

- [CLAUDE.md §6 + §11](../../CLAUDE.md) — Sicherheits-Regeln
- [PRD.md §5.3 + §8](../../PRD.md) — DSGVO und Sicherheits-Anforderungen
- DSGVO Art. 33 — Meldepflicht bei Datenschutzverletzungen
