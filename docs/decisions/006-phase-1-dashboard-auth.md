# ADR 006 — Phase-1 Dashboard-Auth: Console-Magic-Link, billing_email-Lookup

**Status:** Akzeptiert für Phase 1; **muss** vor erstem externen Tenant ersetzt werden
**Datum:** 2026-05-11
**Entscheider:** Projekt-Owner

---

## Kontext

Sprint 4 baut das Tenant-Admin-Dashboard. PRD §4.2.1 sieht für die
Endausbaustufe vor:

> E-Mail/Passwort + OAuth (Google, Microsoft).
> Mehrbenutzer pro Tenant (Rollen: Owner, Admin, Viewer). 2FA optional.

Für Phase 1 brauchen wir aber nicht die Endausbaustufe — wir brauchen
**genug Auth, damit der Demo-Tenant Axano (für sich selbst) das
Dashboard nutzen kann**, ohne dass wir Wochen an Auth-Infrastruktur
binden, bevor die ersten echten Tenant-Konfigurationen fließen.

Zwei konkrete Sub-Entscheidungen:

1. **Wie wird der Magic-Link zugestellt?**
2. **Wer ist ein gültiger Login-User, wenn wir keine `users`-Tabelle
   haben?**

## Entscheidung

### A — Magic-Link-Zustellung: File-Output statt E-Mail-Provider

In Phase 1 schreibt der API-Server den Magic-Link in eine
gitignorierte Datei am Repo-Root (`.last-magic-link.local`, chmod
0600). Auf der Console erscheint nur ein Token-Tail-Hint. **Kein
E-Mail-Provider wird angebunden.** Der Tenant-Mitarbeiter (in
Phase 1: der Axano-Owner selbst) liest die Datei und klickt den
Link.

Begründung für File-Output statt direktem stdout-Print: Terminal-
Scrollback, IDE-Telemetrie (siehe ADR 002), Screen-Sharing leaken
sonst den vollständigen JWT in Kontexte außerhalb des Geltungs-
bereichs. Das File-Pattern ist konsistent mit der Behandlung der
Tenant-API-Keys und des Internal-Service-Tokens.

### B — User-Modell: kein `users`-Tabelle, billing_email-Lookup

In Phase 1 gibt es **keine `users`-Tabelle**. Login funktioniert so:

1. User gibt E-Mail im Login-Form ein.
2. Server schlägt `SELECT id FROM tenants WHERE billing_email = ?`
   nach.
3. Trifft genau ein Tenant zu → Magic-Link wird auf Console gedruckt.
4. Trifft keiner zu → 401 mit generischer „check your email"-Antwort
   (kein Account-Enumeration).
5. Magic-Link enthält ein JWT mit `tenantId`, TTL 15 min.
6. Verify-Endpoint validiert JWT, setzt Session-Cookie mit `tenantId`,
   TTL 7 Tage.

Eine E-Mail = ein Tenant. Es gibt **keinen Owner/Admin/Viewer-Unterschied**
in Phase 1.

## Warum so

### Console-Magic-Link

- **Kein Drittanbieter:** spart Resend-/SES-/Postmark-Account,
  spart DPA-Klärung, spart eine ENV-Var-Familie, spart ~2 Stunden
  Setup. Phase-2/3 kann den Provider mit unter einer Stunde
  ergänzen.
- **Demo-tauglich:** wir entwickeln gegen einen einzigen Demo-Tenant.
  Ein Owner, der den Server selbst betreibt, hat die Server-Console
  sowieso offen.
- **Kein Phishing-Vektor:** Magic-Links per E-Mail brauchen
  Anti-Phishing-Domain-Whitelist im Dashboard-Frontend. Mit
  Console-Logs entfällt das.

### billing_email-Lookup statt `users`-Tabelle

- **Schema-Komplexität:** `users` braucht ihre eigene Migration,
  Rollen-Enum, FK auf `tenants`, Test-Seeding, RBAC-Middleware.
  Aufwand etwa wie eine ganze Sprint-4-Task.
- **Multi-User pro Tenant ist Phase-2-Feature:** in Phase 1 ist der
  Axano-Owner der einzige Dashboard-User. Multi-User braucht erst
  Rollen, dann macht es Sinn.
- **Migration in Phase 2 ist klar:** wenn `users` kommt, wandern die
  bestehenden Tenant-`billing_email`-Werte als erste Owner-Rows
  rein, der bestehende Auth-Pfad bleibt rückwärtskompatibel.

## Warum das in Produktion ein Problem ist

**Dieser Pfad darf nicht in Produktion mit echten externen Tenants.**
Konkrete Risiken:

1. **Kein E-Mail-Versand → kein Onboarding-Flow.** Externe Tenants
   können sich nicht einloggen, wenn sie nicht physischen Zugriff
   auf den API-Server-Output haben. Trivialerweise Demo-only.
2. **Keine Account-Enumeration-Protection:** wenn wir später die
   Antwort wechseln auf „check your email", müssen wir aufpassen,
   dass die Latenz für valide/invalide E-Mails konstant ist. Phase 1
   ist davon nicht betroffen, weil der Demo-Owner die einzige
   E-Mail ist.
3. **`billing_email` ist eigentlich für Stripe-Invoicing**, nicht für
   Auth. Solange ein Tenant nur einen Mitarbeiter hat, kollidiert
   das nicht, aber Phase-2 muss zwingend trennen.
4. **Keine Audit-Spur:** wir wissen nicht, **wer** sich eingeloggt
   hat — nur, dass „jemand mit Zugang zur Tenant-E-Mail" es war.
   Reicht für Demo, nicht für SOC-2-Audit.
5. **JWT-Session ohne Revocation:** wenn die Session-Cookie 7 Tage
   gültig ist und der User „logout" klickt, wird das Cookie zwar
   gelöscht, das JWT selbst bleibt aber bis Ablauf gültig. Phase 2
   braucht Session-Revocation in Redis.

## Mitigationen in Phase 1

1. **Hardcoded Phase-1-Warnung** auf der Login-Seite: ein kleiner
   Hinweis-Badge oder Footer-Text „Phase-1 dev mode — magic link
   in server console", sodass kein externer Tenant je versehentlich
   in diesem Mode landet.
2. **Session-Cookie ist `HTTP-Only`, `SameSite=Lax`, in Production
   auch `Secure`.** Standard-Hygiene.
3. **Magic-Link-JWT enthält nur `tenantId`** — keine PII über die
   E-Mail hinaus.
4. **Diese ADR** als nachschlagbares Audit-Artefakt.
5. **Phase-2-Sprint-1 als harter Block:** bevor ein externer Tenant
   onboarded wird, muss das Folge-Pattern stehen.

## Nachfolge-Pattern (Phase 2, verbindlich)

Phase 2 ersetzt diesen Pfad durch:

- **`users`-Tabelle** mit Drizzle-Migration: id (uuid), tenant_id
  (FK→tenants), email (unique), role (enum: owner|admin|viewer),
  password_hash (nullable bei Magic-Link-only), created_at,
  last_login_at.
- **E-Mail-Provider** mit EU-Datenresidenz (Resend EU-Region oder
  SES eu-central-1). Provider-Wahl mit DPA-Check als eigene
  Phase-2-ADR.
- **Magic-Link-Versand via Provider**, mit per-User-Rate-Limit
  (z. B. 3 Anfragen pro 5 min).
- **Magic-Link-JWT mit `userId` statt `tenantId`** — Tenant wird
  über `users.tenant_id` erschlossen.
- **Session-Revocation:** Session-Token wird in Redis gespeichert,
  Logout löscht den Eintrag. Cookie-JWT verweist nur auf Session-ID.
- **OAuth-Provider** (Google/Microsoft) als zweite Auth-Option,
  parallel zum Magic-Link.

### Acceptance-Criteria zum ADR-Aufheben

Diese ADR wechselt von „Akzeptiert" zu „Aufgehoben", sobald **alle**
folgenden Punkte erfüllt sind:

1. `users`-Tabelle existiert mit Migration in `services/api/src/db/migrations/`.
2. E-Mail-Provider mit DPA und EU-Endpoint angebunden.
3. Magic-Link-E-Mails werden tatsächlich versandt (Console-Logging
   ist optional als Fallback weiter erlaubt).
4. Session-Revocation funktioniert (Logout invalidiert Session
   server-seitig).
5. Login-Page zeigt keine „dev mode"-Warnung mehr.
6. Phase-2-ADR für E-Mail-Provider-Wahl existiert.

## Referenzen

- [PRD.md §4.2.1](../../PRD.md) — Auth-Zielausbau
- [PRD.md §6.4](../../PRD.md) — Datenmodell mit `users`-Tabelle
- [CLAUDE.md §6](../../CLAUDE.md) — Sicherheitsregeln
- [ADR 003](003-phase-0-token-workaround.md) — analoges Pattern
  „bewusster Workaround mit harter Acceptance-Story"
