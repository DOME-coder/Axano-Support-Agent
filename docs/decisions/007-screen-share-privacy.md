# ADR 007 — Bildschirm-Sharing + Vision-LLM: Opt-In, Consent, kein Frame-Storage

**Status:** Akzeptiert für Phase 2; in Phase 3 mit PII-Redaktion zu ergänzen
**Datum:** 2026-05-13
**Entscheider:** Projekt-Owner

---

## Kontext

PRD §1.2 beschreibt Screen-Sharing + Vision-LLM als **Kern-Differenzierungs-
Merkmal** von AvatarDesk gegenüber generischen Chatbots: Sofia sieht, was
der Endkunde sieht, und gibt konkrete Klick-für-Klick-Hilfe statt
abstrakter FAQ-Antworten. PRD §4.1.6 und §4.1.7 listen das als Phase-2-
Meilenstein-2.

Die technische Umsetzung ist absehbar (LiveKit `getDisplayMedia` →
zweiter Video-Track im Room → Vision-Worker subscribed → Anthropic
Claude Sonnet 4.6 Vision → Snapshot-Beschreibung in Redis → `analyze_screen`-
Tool im Agent). Was nicht trivial ist: **was passiert datenschutz-
rechtlich**, wenn der Endkunde versehentlich Online-Banking, Krankenakten,
Steuererklärungen, private E-Mails oder das Auswahlfenster mit anderen
offenen Tabs teilt.

Ohne saubere Leitplanken landet die Funktion in einem DSGVO- und
Geschäftsrisiko-Bereich, den wir in Phase 2 nicht vollständig absichern
können — wir können ihn aber bewusst einschränken und transparent
machen.

## Entscheidung

Vier zusammenhängende Festlegungen:

### A — Tenant-Opt-In über `avatar_configs.allow_screen_share`

Neue Boolean-Spalte mit Default `false`. Der Screen-Share-Button im Widget
wird nur gerendert, wenn der Tenant das Feature im Dashboard explizit
aktiviert. Das macht den Tenant für die Aktivierung verantwortlich
(er kennt seine Endkunden-Kontexte besser als wir) und liefert uns
gleichzeitig einen Audit-Hebel: deaktivieren = sofort weg, ohne
Code-Change.

### B — Per-Session-Consent-Modal vor jedem Share-Start

Auch bei aktiviertem Tenant-Feature muss der Endkunde **pro Session**
explizit zustimmen — kein „remember choice", kein localStorage-Persist.
Modal-Text nennt konkret: dass Frames an einen LLM-Anbieter gesendet
werden, dass keine Speicherung erfolgt, dass jederzeit gestoppt werden
kann, und Empfehlung „teile nur das Fenster, das du brauchst — nicht
den ganzen Bildschirm".

### C — Kein Frame-Storage, kein Persist auf Disk

Vision-Worker hält Frames nur im Prozess-Speicher (Pillow-Image-Objekt).
Nach dem Vision-LLM-Call wird der Frame freigegeben. Der **textuelle
Latest-Snapshot** (LLM-Antwort: „User sieht eine Login-Seite mit
…") wird in Redis mit TTL 60 s gecached, damit der konversierende
Agent ihn ohne Round-Trip lesen kann. **Niemals** wird ein Frame in
Postgres, S3, lokalem Filesystem oder Logfile persistiert.

### D — Sichtbarer Live-Indikator im Widget

Während aktivem Share blinkt ein roter Pulse-Indikator im Modal-Header,
mit Stop-Button daneben. Browser-Native-Indicator (Chrome zeigt eh
„This page is sharing your screen") ist da, aber redundante UI-Klarheit
ist hier billig und wichtig — Endkunde soll nie überrascht sein.

## Warum so

### Opt-In statt Opt-Out

Default-On wäre für Pilot-Demos verlockend (mehr Wow-Effekt), aber
operativ riskant: der erste Tenant in einem regulierten Umfeld (z. B.
Versicherung, Bank, Praxis) bekommt eine Compliance-Frage, die wir
für sie nicht beantworten können. Default-Off macht den Tenant zum
informierten Akteur und uns zum technischen Enabler — die saubere
Verantwortungs-Verteilung.

### Per-Session-Consent statt Cookie-Consent

Ein „remember this choice"-Cookie wäre für UX angenehmer, ist aber
unter DSGVO Art. 6/7 problematisch: jeder Share-Start ist eine
separate Datenverarbeitung mit potenziell neuem Kontext (anderer
Tab, anderes Fenster). Lieber jedes Mal kurz fragen als einen
generischen Vorab-Consent, der vor Gericht nicht hält.

### Kein Frame-Storage

PRD §13.1 verlangt explizit „Avatar-Streams: niemals persistieren".
Wir dehnen das auf Endkunden-Screen-Streams aus. Der einzige
persistierte Vision-Output ist die **textuelle Beschreibung im
Conversation-Transkript** — das ist für Replay nötig und steht
unter den selben Tenant-Isolation-Regeln wie alle anderen Messages.

### Vision-LLM-Wahl: Claude Sonnet 4.6

Bereits in der Plan-Diskussion am 2026-05-12 bestätigt. Kurz hier:
selber Provider wie der konversierende LLM = ein DPA, ein Auth-Pfad,
konsistente Persona-Tonalität. Anthropic ist EU-DPA-tauglich (DPA
verfügbar, Sub-Processor-Liste aktuell).

## Was bewusst NICHT in Phase 2

1. **PII-Redaktion vor Vision-LLM.** Wir senden Frames unverändert
   an Anthropic. Phase 3 soll vorgeschaltete Bild-Redaktion
   prüfen (OCR + Pattern-Match auf IBAN, Kreditkarten, Sozial-
   versicherungs-Nr, Mail-Adressen) und sensitive Bereiche
   verpixeln. Aufwand und False-Positive-Risiko sind hoch genug,
   dass das eine eigene Sprint-Iteration braucht — nicht jetzt.
2. **Frame-Rate-Limits pro Tenant.** Phase 2 sampled fix 1 Frame
   alle 1.5 s. Wenn ein Tenant das produktiv nutzt und Kosten
   explodieren, kommt Tenant-spezifisches Throttling als
   Billing-Vorarbeit in Phase 3.
3. **Domain-Whitelist für Screen-Share** (z. B. nur auf
   `tenant.example.com`-Origin). Phase-3-Material; in Phase 2
   ist die Annahme: Widget läuft eh nur auf Tenant-eigenen
   Seiten, und der Tenant-API-Key-Guard verhindert
   Fremd-Embedding.
4. **Audit-Log für Share-Sessions.** Ein „wer hat wann was
   geteilt"-Log ist für SOC-2 relevant, in Phase 2 reichen die
   ohnehin geloggten Conversation-Events.

## Mitigationen in Phase 2

1. **`allow_screen_share` default `false`.** Tenant muss aktiv
   zustimmen.
2. **Consent-Modal pro Session**, mit deutschem Standard-Text
   (i18n folgt in Sprint 2.4).
3. **Pulse-Indikator immer sichtbar während Share**.
4. **Frame-Lebenszyklus**: Pillow-Image wird nach
   Vision-LLM-Call dereferenziert; Redis-Cache des Text-
   Snapshots mit TTL 60 s.
5. **Diese ADR** als nachschlagbares Audit-Artefakt.

## Nachfolge-Anforderungen (Phase 3, verbindlich)

Diese ADR bleibt „Akzeptiert für Phase 2" bestehen und wird in
Phase 3 **ergänzt** (nicht aufgehoben) durch:

- Vorgeschaltete PII-Redaktion mit OCR + Regex-Pattern.
- Tenant-spezifisches Frame-Rate-Throttling (Billing-Vorarbeit).
- Audit-Log für Share-Sessions (SOC-2-Vorbereitung).
- DPA-Aktualisierung mit Vision-LLM-Use-Case explizit benannt.

### Acceptance-Criteria zur Phase-3-Ergänzung

Diese ADR wechselt von „Akzeptiert für Phase 2" zu „Akzeptiert für
Phase 2 + 3", sobald **alle** folgenden Punkte erfüllt sind:

1. PII-Redaktions-Pipeline existiert und ist im Vision-Worker
   aktiviert.
2. Audit-Log-Schema (`screen_share_events`) ist gemigriert und
   wird beschrieben.
3. DPA enthält Vision-LLM-Use-Case explizit.
4. Tenant-spezifisches Frame-Rate-Limit konfigurierbar.

## Referenzen

- [PRD.md §1.2](../../PRD.md) — Vision als Kern-Differenzierungs-Merkmal
- [PRD.md §4.1.6, §4.1.7](../../PRD.md) — Phase-2-Meilenstein-2
- [PRD.md §13.1](../../PRD.md) — keine Persistierung von Streams
- [CLAUDE.md §6](../../CLAUDE.md) — Sicherheitsregeln
- [Plan-File Sprint 2.1](../../../.claude/plans/hallo-claude-wir-starten-lucky-falcon.md)
