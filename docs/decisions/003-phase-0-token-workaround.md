# ADR 003 — Phase-0 Token-Workaround im Widget

**Status:** Akzeptiert für Phase 0; **muss** in Phase 1 Sprint 1 ersetzt werden
**Datum:** 2026-05-06
**Entscheider:** Projekt-Owner

---

## Kontext

Das Phase-0-Widget (Task 0.4) muss sich gegen LiveKit-Cloud
authentifizieren, um einem Room beizutreten und den
Beyond-Presence-Avatar-Track zu subscriben. LiveKit erwartet
hierfür ein **JWT-Token**, das per `LIVEKIT_API_KEY` +
`LIVEKIT_API_SECRET` serverseitig signiert wird.

In Phase 0 existiert noch **kein eigenes Backend**, das diese
Token-Issuance übernehmen könnte:

- `services/api` (NestJS) ist bewusst noch leer (siehe
  Phase-0-Plan in `.claude/plans/`).
- Kein Tenant-Authentifizierungs-System vorhanden.
- Keine Datenbank-gestützte Konversations-Anlage.

Wir brauchen aber **jetzt** einen Weg, Widget und Agent
miteinander reden zu lassen, um die End-to-End-Pipeline
(Widget → LiveKit-Room → Beyond-Presence-Avatar → ElevenLabs-TTS)
zu verifizieren.

## Entscheidung (Phase 0)

Das Widget liest LiveKit-URL und LiveKit-Token aus
**`<script>`-Data-Attributen** im einbindenden HTML:

```html
<script
  src="/dist/widget.js"
  data-livekit-url="wss://..."
  data-livekit-token="eyJhbGc..."
></script>
```

Das Token wird **manuell** über das LiveKit-Cloud-Dashboard
(Sandbox → Generate Token) erzeugt und vom Entwickler in das
HTML kopiert.

## Warum das in Produktion ein Sicherheitsproblem ist

Dieser Pfad **darf nicht in Produktion ausgeliefert werden** —
hier ist die explizite Begründung, damit kein Reviewer später
denkt „kann man doch so lassen":

### 1. Token-Auslese in DevTools

Jedes JWT im DOM oder in einem `<script>`-Tag ist für jeden
Browser-Besucher der Tenant-Website per `View Source`,
DevTools → Elements oder einer simplen Console-Zeile
(`document.querySelector('script[data-livekit-token]')`)
trivial auslesbar. Auch wenn das Widget den Token
irgendwann in einen Closure schreibt: bis zum Closure-Push
ist er bereits aus dem DOM lesbar.

### 2. Room-Hijacking

Mit einem gültigen LiveKit-Token kann ein Angreifer:

- dem Room beitreten und das Avatar-Video mitschneiden,
- als zweiter Teilnehmer eigene Audio-Tracks publishen
  (Avatar hört dann fremde Stimme),
- bei aktiver Customer-Sprach-Eingabe potentiell den
  Endkunden mithören.

In Phase 0 existieren noch keine Endkunden-Sessions, also
ist das aktuelle Risiko theoretisch null — aber das Pattern
selbst skaliert nicht in eine Welt mit echten Tenants.

### 3. Token-Lifetime

LiveKit-Cloud-Sandbox-Tokens sind typischerweise **24 h**
gültig. Ein in der Tenant-Website eingebetteter Token ist
also ein 24-Stunden-Fenster, in dem jeder Webseiten-Besucher
einer **gemeinsamen** Room-Instanz beitritt — also potentiell
in fremde Konversationen platzt.

### 4. Tenant-Identität fehlt komplett

Im Phase-0-Pattern gibt es keinen Tenant-Auth-Schritt. Das
Widget weiß nicht, welcher Tenant es einbindet, kann also
keine Tenant-spezifische Konfiguration laden (Avatar,
Persona, Wissensdatenbank). Für ein Hello-World ausreichend,
für jede echte Multi-Tenant-Plattform absurd unzureichend.

### 5. DSGVO-Implikation

Sobald reale Endkunden-Sprache durch das Widget fließt,
würde ein offener Token einem Angreifer ermöglichen,
personenbezogene Sprach-Daten abzugreifen — also
**meldepflichtige Datenpanne** nach Art. 33 DSGVO. Phase 0
hat keine echten Endkunden, deshalb noch keine Pflicht;
ab erstem realem Tenant-Onboarding **muss** dieser Pfad
abgeschaltet sein.

## Mitigationen in Phase 0 selbst

Damit das Pattern nicht versehentlich „durchrutscht":

1. **Runtime-Warnung im Widget:** Beim Lesen des Tokens aus
   dem `<script>`-Data-Attribut gibt das Widget ein
   `console.warn` aus:
   `"AvatarDesk: phase-0 token mode active, do not use in production"`.
   Hard-coded, nicht abschaltbar. Macht es schwer, das
   Pattern unbeabsichtigt in einen Production-Build zu
   schicken.

2. **Sichtbare Warnung im Widget-README:** Erste Sektion
   des `apps/widget/README.md` ist eine **„Phase 0 only —
   DO NOT SHIP"-Warnung**, nicht nur ein versteckter
   TODO-Kommentar.

3. **Diese ADR** als nachschlagbares Audit-Artefakt: jede
   Diskussion „warum lest ihr Token im Widget aus?" landet
   bei diesem Dokument, nicht bei einer mündlichen
   Erinnerung.

4. **Phase-1-Sprint-1 als Hard-Block:** Bevor Phase 1
   irgendeinen Tenant onboarded, **muss** der Token-Workaround
   ersetzt sein (siehe nächste Sektion).

## Nachfolge-Pattern (Phase 1 Sprint 1, verbindlich)

Phase 1 Sprint 1 ersetzt diesen Pfad durch:

```
Browser-Widget                        AvatarDesk-API (NestJS)            LiveKit
      │                                       │                              │
      │  POST /api/widget-session             │                              │
      │  X-Tenant-API-Key: <hashed>           │                              │
      │ ─────────────────────────────────────►                               │
      │                                       │                              │
      │                                       │  serverseitig:               │
      │                                       │   1. Tenant per API-Key      │
      │                                       │      authentifizieren        │
      │                                       │   2. neue Conversation-Row   │
      │                                       │      anlegen                 │
      │                                       │   3. LiveKit-JWT signen      │
      │                                       │      mit kurzem TTL          │
      │                                       │      (z. B. 60 min) und      │
      │                                       │      `room`-Claim auf        │
      │                                       │      Conversation-ID         │
      │                                       │      eingeschränkt           │
      │                                       │                              │
      │  { url, token, room, conversationId } │                              │
      │ ◄─────────────────────────────────────                               │
      │                                       │                              │
      │  WSS connect (token)                                                 │
      │ ─────────────────────────────────────────────────────────────────────►
```

### Eigenschaften des Phase-1-Pattern

- **Token niemals im HTML.** Wird vom Widget per `fetch` geholt,
  nur im JavaScript-Heap, vom DOM nicht auslesbar.
- **Token ist Conversation-spezifisch:** der LiveKit-JWT-Claim
  `room` zeigt nur auf eine **einzelne** Konversations-Room-ID,
  die serverseitig für diese Session generiert wurde. Andere
  Räume sind unzugänglich.
- **Token ist kurzlebig:** TTL ≤ 60 Minuten. Nach Ablauf wird
  durch Refresh-Endpoint ein neuer Token geholt; bei
  Konversations-Ende wird der Refresh-Token revoked.
- **Tenant-Identität ist erzwungen:** ohne gültigen
  Tenant-API-Key-Header gibt der Endpoint keinen Token aus.
  Tenant-Konfiguration (Avatar, Persona, Wissensdatenbank)
  fließt direkt in die Conversation-Row ein.
- **Rate-Limiting:** pro Tenant- und IP-Throttling am
  API-Gateway (CLAUDE §6 + PRD §5).

### Acceptance-Criteria zum ADR-Aufheben

Diese ADR wechselt von „Akzeptiert" zu „Aufgehoben",
sobald **alle** der folgenden Punkte erfüllt sind:

1. `POST /api/widget-session` existiert und ist
   tenant-authentifiziert.
2. Widget liest Token **ausschließlich** aus dem JSON-Response
   dieses Endpoints, keinen Fallback auf
   `<script>`-Data-Attribute mehr.
3. Die `console.warn`-Mitigation aus Phase 0 ist entfernt
   (weil nicht mehr relevant).
4. Die README-Warnung ist durch Standard-Setup-Doku ersetzt.
5. Ein Integrations-Test prüft, dass der Token-Endpoint
   ohne gültigen Tenant-Key 401 antwortet.

Bei Aufhebung: Status oben auf „Aufgehoben am YYYY-MM-DD
durch Commit `<hash>`" setzen.

## Referenzen

- [PRD.md §4.3](../../PRD.md) — API-Gateway, Realtime-Service
- [PRD.md §8.1 + §8.2](../../PRD.md) — Authentifizierung, Tenant-Isolation
- [CLAUDE.md §6 + §11](../../CLAUDE.md) — Sicherheitsregeln
- DSGVO Art. 33 — Meldepflicht bei Datenschutzverletzungen
- LiveKit Token-Doc:
  https://docs.livekit.io/home/server/generating-tokens/
