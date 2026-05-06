# Product Requirements Document (PRD)
## AI-Avatar Customer Service Plattform

**Projektname (Arbeitstitel):** AvatarDesk
**Version:** 2.0 (Beyond Presence Edition)
**Datum:** 2026-05-06
**Status:** Draft – bereit zur Implementierung mit Claude Code
**Sprache:** Deutsch

---

## 1. Executive Summary

AvatarDesk ist eine **White-Label B2B-SaaS-Lösung**, die Unternehmen einen visuellen, sprachgesteuerten KI-Customer-Service ermöglicht. Statt eines klassischen Text-Chatbots oder Hotline-Telefonats sieht der Endkunde einen **fotorealistischen weiblichen Video-Avatar**, mit dem er per Sprache in Echtzeit kommuniziert. Der Avatar kann zusätzlich den **vom Kunden geteilten Bildschirm live analysieren** und basierend auf dem, was er sieht, konkrete Hilfe leisten.

Die Lösung wird als **embeddierbares Widget (JavaScript-Snippet bzw. iFrame)** ausgeliefert, das Kundenunternehmen mit einer einzigen Code-Zeile in ihre Website einbinden können.

### 1.1 Strategische Kerntechnologie: Beyond Presence

Als Avatar-Streaming-Anbieter setzen wir auf **Beyond Presence** (Beyond Presence GmbH, Deutschland). Begründung:

- **DSGVO-Vorteil:** Deutsches Unternehmen, EU-Datenverarbeitung – entscheidend für unsere B2B-Zielgruppe.
- **Beste Latenz am Markt:** Unter 100 ms Avatar-Lippen-Sync (Genesis-Modell), Industrie-Benchmark.
- **Managed Agent API:** Beyond Presence orchestriert STT, LLM, TTS und Avatar-Streaming in einer einzigen API. Erspart uns ca. 60 % der eigenen Realtime-Backend-Entwicklung.
- **Speech-to-Video API:** Falls volle Pipeline-Kontrolle nötig (z. B. eigenes LLM, eigene Stimme), bleibt diese Option offen.
- **Native LiveKit-Integration:** Offizielles Open-Source-Plugin für `livekit-agents` verfügbar.
- **Stack-Konsistenz:** Beyond Presence nutzt selbst ElevenLabs (TTS) und LiveKit (WebRTC) – passt nahtlos zu unserer geplanten Infrastruktur.

### 1.2 Kernwertversprechen

- **Menschlicher als ein Chatbot:** Sichtbarer, sprechender Avatar schafft emotionale Nähe.
- **Schneller als ein Callcenter:** 24/7 verfügbar, keine Wartezeiten, mehrsprachig.
- **Konkreter als ein FAQ:** Avatar sieht den Bildschirm und führt Schritt für Schritt durch das Problem.
- **Günstiger als menschliche Agenten:** Skaliert ohne Personalkosten.

### 1.3 Zielgruppe

- **Primärer Käufer (B2B):** Mittelständische Unternehmen mit eigenem Online-Produkt (SaaS, E-Commerce, Banking, Versicherung, Telekommunikation), die Customer Service skalieren wollen.
- **Endnutzer (B2C):** Kunden dieser Unternehmen, die Hilfe bei der Nutzung des Produkts benötigen.

---

## 2. Problemstellung

Klassische Support-Kanäle haben jeweils erhebliche Schwächen:

| Kanal | Probleme |
|---|---|
| Text-Chatbots | Wirken kalt, missverstehen oft, lösen visuelle Probleme nicht |
| Telefon-Hotline | Hohe Personalkosten, lange Wartezeiten, nicht skalierbar |
| Klassische FAQ | Statisch, Kunde muss selbst suchen und übersetzen |
| Video-Calls mit Agent | Teuer, nicht 24/7, Personalengpass |

**Die zentrale Lücke:** Es gibt keinen Service, der die **Wärme eines menschlichen Videogesprächs**, die **Skalierbarkeit eines Chatbots** und die **konkrete Problemlösung eines Bildschirm-Sharings** in einer einzigen Erfahrung kombiniert.

AvatarDesk schließt genau diese Lücke.

---

## 3. Produktvision & Hauptszenario

### 3.1 User-Journey (Endkunde)

1. Kunde befindet sich auf der Website eines Unternehmens (z. B. einer Online-Bank).
2. Unten rechts erscheint ein **schwebender Button** mit Profilbild der Avatar-Frau und Text „Brauchst du Hilfe? Sprich mit Sofia“.
3. Kunde klickt – ein **Modal-Fenster** öffnet sich (ca. 480×720 px) mit dem **Live-Video-Avatar** in einer ansprechenden Hintergrundumgebung.
4. Avatar begrüßt mit Stimme: *„Hallo, ich bin Sofia. Wobei kann ich dir helfen?“* – Lippen synchronisieren mit der Stimme.
5. Kunde antwortet **per Mikrofon** (z. B. „Ich kann mein Passwort nicht zurücksetzen“).
6. Sofia versteht (Speech-to-Text), denkt nach (LLM mit Wissensdatenbank des Tenants) und antwortet **gesprochen + lippensynchron** in Echtzeit.
7. Falls nötig: Sofia bittet um Bildschirm-Sharing – Kunde klickt auf den Button „Bildschirm teilen“.
8. Sofia **sieht live**, was der Kunde sieht (Vision-LLM analysiert Frames), und sagt z. B.: *„Ich sehe, du bist auf der Login-Seite. Klick bitte unten rechts auf den blauen Link ‚Passwort vergessen‘.“*
9. Kunde folgt – Sofia bestätigt visuell und führt durch die nächsten Schritte.
10. Bei Bedarf: Eskalation an menschlichen Agenten oder E-Mail-Ticket.

### 3.2 User-Journey (Unternehmenskunde / Käufer)

1. Unternehmen registriert sich auf `app.avatardesk.io`.
2. Loggt sich ins **Admin-Dashboard** ein.
3. Wählt einen Beyond-Presence-Avatar aus der Bibliothek (oder lädt eigenes 2-Min-Video hoch für Custom-Avatar).
4. Konfiguriert Persona-Prompt, Stimme (ElevenLabs-Voice), Sprache.
5. **Lädt Wissensdatenbank hoch** (PDFs, FAQ-Dokumente, Website-URL für automatisches Crawling, API-Endpoints).
6. Konfiguriert Eskalationsregeln (wann an Mensch übergeben).
7. Kopiert das Embed-Snippet (`<script src="https://cdn.avatardesk.io/widget.js" data-tenant="xyz123"></script>`) und fügt es in die eigene Website ein.
8. Sieht im Dashboard Conversation-Logs, KPIs, CSAT-Werte, häufigste Probleme.

---

## 4. Funktionale Anforderungen

### 4.1 Endkunden-Widget (Frontend, embedded)

#### 4.1.1 Widget-Trigger
- Schwebender Button (Floating Action Button) unten rechts (Position konfigurierbar).
- Anpassbar: Farbe, Avatar-Vorschaubild, Begrüßungstext, Sprache.
- Reagiert auf Klick/Tap (Desktop + Mobile).
- Optional: Auto-Trigger nach X Sekunden Inaktivität oder bei Exit-Intent.

#### 4.1.2 Hauptfenster (Modal)
- Größe Desktop: 480 × 720 px, abgerundete Ecken, Schatten.
- Mobile: Vollbild.
- Layout (von oben nach unten):
  - Header: Avatar-Name, Status-Indikator („Sofia hört zu…“ / „Sofia denkt nach…“ / „Sofia spricht…“), Schließen-Button.
  - **Video-Bereich** (zentral, ca. 70 % der Höhe): Live-Avatar (Beyond-Presence-Stream über LiveKit).
  - Mikrofon-Indikator (Wellenform / Pegel) während der Kunde spricht.
  - Untertitel-Overlay (optional ein-/ausschaltbar).
  - Aktionsleiste unten:
    - Mikrofon ein/aus (Push-to-Talk oder Voice Activity Detection)
    - „Bildschirm teilen“-Button
    - „An Mensch übergeben“-Button (falls aktiviert)
    - Sprache wechseln (Dropdown)

#### 4.1.3 Avatar-Rendering (über Beyond Presence)
- **Anbieter:** Beyond Presence (Genesis-Modell für Premium-Tier, Standard-Avatar für Basic-Tier).
- **Integration:** über Beyond-Presence-Speech-to-Video-API mittels offiziellem `bey`-Plugin für `livekit-agents`.
- **Transport:** WebRTC via LiveKit (Beyond Presence streamt direkt in unseren LiveKit-Room).
- **Latenz:** < 100 ms Avatar-Lippen-Sync laut Hersteller.
- **Avatar-Bibliothek:** mindestens 5 weibliche Avatare unterschiedlicher Ethnien/Altersgruppen aus dem Beyond-Presence-Katalog.
- **Custom-Avatar:** Tenant kann optional eigenes 2-Minuten-Video hochladen → Beyond Presence erstellt Custom-Avatar (Tier-abhängig).
- **Hintergrund:** Studio-Hintergründe in Beyond Presence integriert; alternativ Greenscreen-Ausgabe + eigener Hintergrund client-seitig (späterer Ausbau).

#### 4.1.4 Sprach-Eingabe (Customer → Avatar)
- WebRTC-Mikrofonzugriff via Browser-API (`getUserMedia`).
- **Voice Activity Detection (VAD):** erkennt automatisch, wann Kunde fertig spricht (LiveKit-Agents-Plugin, Silero VAD).
- **Push-to-Talk** als Alternative (Leertaste oder Halten des Mic-Buttons).
- **Speech-to-Text:** Deepgram Nova-2 (Streaming) – via LiveKit-Agents-Plugin.
- Latenz-Ziel: < 300 ms vom Sprachende bis Transkript.

#### 4.1.5 Sprach-Ausgabe (Avatar → Customer)
- **Text-to-Speech:** ElevenLabs Flash v2.5 (Streaming, < 200 ms) – nativ in Beyond Presence integriert.
- Stimme synchron zur Lippenbewegung des Avatars.
- **Barge-In:** Wenn der Kunde während der Avatar-Sprache anfängt zu reden, hört der Avatar auf zu sprechen.

#### 4.1.6 Bildschirm-Sharing
- Browser-API: `navigator.mediaDevices.getDisplayMedia()`.
- Kunde wählt: ganzer Bildschirm / Anwendungsfenster / Browser-Tab.
- Stream wird über LiveKit als zweiter Track in den Room gepublisht.
- **Frame-Sampling:** ein Worker-Service zieht 1 Frame pro 1–2 Sekunden aus dem Stream.
- **Vision-Analyse:** Frame wird an Vision-LLM (Claude Sonnet 4.6 Vision oder GPT-4o Vision) gesendet.
- Vision-LLM produziert Beschreibung + Auffälligkeiten → wird als Tool-Result in den Konversations-Kontext des Haupt-LLMs injiziert.
- **Privacy:** Kunde sieht in eigener UI dauerhaft, dass Bildschirm geteilt wird; Stop-Button immer sichtbar.
- Frames werden NICHT persistiert (nur temporär im Speicher).

#### 4.1.7 Konversationsfluss
- Multi-Turn-Dialog mit Memory innerhalb der Session.
- Kontext umfasst: Sprachhistorie + aktuelle Bildschirm-Snapshots + Wissensdatenbank des Tenants.
- **Tool-Use des LLMs:**
  - `search_knowledge_base(query)`: durchsucht Tenant-Dokumente (RAG)
  - `analyze_screen()`: holt aktuellen Bildschirm-Snapshot + Vision-Analyse
  - `escalate_to_human(reason)`: triggert Übergabe
  - `create_ticket(summary, customer_info)`: erstellt Support-Ticket im CRM des Kunden
  - `lookup_order(order_id)` / `lookup_account(email)`: API-Hooks zum Backend des Kunden (konfigurierbar)

#### 4.1.8 Eskalation
- **Auslöser:** Kunden-Anfrage, LLM-Confidence-Schwelle unterschritten oder dreifaches Missverstehen.
- **Optionen:** Live-Übergabe an menschlichen Agenten (Video oder Chat), E-Mail-Ticket, Rückrufanforderung.
- Bei Live-Übergabe: gesamter bisheriger Konversations-Kontext + Bildschirm-Sharing wird an Agent-Tool weitergereicht.

### 4.2 Admin-Dashboard (Backend für Tenants)

#### 4.2.1 Authentifizierung
- E-Mail/Passwort + OAuth (Google, Microsoft).
- Mehrbenutzer pro Tenant (Rollen: Owner, Admin, Viewer).
- 2FA optional.

#### 4.2.2 Avatar-Konfiguration
- Avatar-Auswahl aus Beyond-Presence-Bibliothek (`avatar_id` wird gespeichert).
- Stimme auswählen (ElevenLabs-Voice-IDs).
- Tonalität (formell/locker), Geschwindigkeit.
- Begrüßungstext, Persona-Prompt („Du bist Sofia, freundliche Support-Mitarbeiterin von Bank XYZ. Sprichst Sie-Form, bist geduldig…“).
- Sprachen initial: Deutsch, Englisch, Italienisch, Französisch, Spanisch.
- **Custom-Avatar-Workflow:** Tenant lädt 2-Min-Video → wir leiten an Beyond-Presence-Custom-Avatar-API weiter → erhalten neue `avatar_id` zurück.

#### 4.2.3 Wissensdatenbank
- Upload: PDF, DOCX, MD, TXT, HTML.
- Website-Crawling: URL eingeben, Sitemap auslesen, Inhalte indexieren.
- Manuelle FAQ-Einträge (Frage/Antwort-Paare).
- Vector Store: Embeddings (OpenAI text-embedding-3-large), pgvector in Postgres.
- Re-Indexing-Schedule (täglich/wöchentlich für gecrawlte Websites).

#### 4.2.4 Integrationen
- API-Konnektoren: Salesforce, HubSpot, Zendesk, Intercom, Shopify, Stripe.
- Webhooks für eingehende Events.
- Custom-API-Endpoints konfigurierbar (für Order-Lookup, Account-Lookup etc.).
- **n8n-Integration** (Beyond Presence bietet native n8n-Nodes – nutzen wir für Workflow-Automation auf Tenant-Seite).

#### 4.2.5 Analytics
- Conversation-Volumen pro Tag/Woche/Monat.
- Average-Handling-Time, Resolution-Rate, Eskalationsrate.
- CSAT-Score (Kunde wird am Ende gefragt: 1–5 Sterne).
- Top-Fragen (geclustert), nicht beantwortbare Fragen (für Wissensdatenbank-Lücken).
- Conversation-Replay: einzelne Gespräche ansehen (Transkript; Bildschirm-Aufzeichnung nur, falls Tenant explizit aktiviert).

#### 4.2.6 Embed-Code-Generator
- One-Click-Copy des `<script>`-Tags.
- WordPress-Plugin, Shopify-App, Webflow-Snippet (Phase 4).

#### 4.2.7 Abrechnung
- Pricing nach Conversations/Monat oder Sprechminuten.
- Stripe-Integration.
- Usage-Dashboard mit Echtzeit-Verbrauch.

### 4.3 Plattform-Backend (intern)

- **API-Gateway:** empfängt alle Widget-Calls, prüft Tenant-Authentifizierung (über `data-tenant`-Token).
- **Realtime-Service:** orchestriert LiveKit-Rooms, ruft Beyond-Presence-Agent-API auf, übergibt Tenant-Konfiguration.
- **LLM-Orchestrator:** läuft als LiveKit-Agent (Python), routet zwischen Haupt-LLM (Claude Sonnet 4.6) und Vision-LLM, hält Konversations-State.
- **Vision-Worker:** subscribiert auf Screen-Share-Track im LiveKit-Room, sampelt Frames, ruft Vision-LLM auf, gibt Erkenntnisse an LLM-Orchestrator zurück.
- **Vector-DB-Service:** pgvector-Backed RAG für Tenant-Wissensdatenbank.
- **Recording-Service:** speichert Transkripte (DSGVO-konform), optional Bildschirm-Aufzeichnungen.
- **Billing-Service:** misst Verbrauch (Beyond-Presence-Minuten, LLM-Tokens, STT-Sekunden, TTS-Zeichen).

---

## 5. Nicht-funktionale Anforderungen

### 5.1 Performance
- End-to-End-Latenz (Kunde spricht → Avatar antwortet): **Ziel < 1,2 Sekunden**, max. 2 s.
  - STT-Endpoint-Detection: 200 ms
  - LLM Time-to-First-Token: 400 ms
  - TTS-First-Byte: 150 ms
  - Beyond-Presence-Avatar-Stream-First-Frame: < 100 ms
  - **Total: ~850 ms**
- Avatar-Video: 25 fps, mindestens 720p.
- Concurrency: System muss mindestens 1.000 parallele Konversationen pro Tenant-Cluster unterstützen.

### 5.2 Verfügbarkeit
- Uptime SLA: 99,9 % (max. 8,76 h Downtime/Jahr).
- Multi-Region-Deployment (EU + US), Failover.
- **Risiko Beyond-Presence-Ausfall:** Fallback auf Text-Chat (kein Avatar-Stream) – aktiviert sich automatisch bei API-Fehlern.

### 5.3 Datenschutz / DSGVO
- **Vorteil Beyond Presence:** EU-Anbieter, EU-Datenverarbeitung möglich – einfacherer DPA-Workflow.
- AVV (Auftragsverarbeitungsvertrag) mit jedem Tenant.
- Einwilligungs-Modal vor Bildschirm-Sharing (explizit), Sprach-Aufzeichnung, Conversation-Logging.
- Recht auf Löschung: Tenant kann alle Konversationen eines Endkunden auf Anfrage löschen.
- Verschlüsselung at-rest (AES-256) und in-transit (TLS 1.3).
- Sprachaufzeichnungen werden nicht dauerhaft gespeichert (nur Transkripte, falls Tenant erlaubt).
- Bildschirm-Frames werden nach Verarbeitung sofort gelöscht (kein Storage).

### 5.4 Skalierbarkeit
- Microservices-Architektur, horizontal skalierbar.
- Stateless-API-Layer, State in Redis/Postgres.
- CDN für Widget-Auslieferung (Cloudflare/Fastly).

### 5.5 Browser-Kompatibilität
- Chrome, Firefox, Safari, Edge – jeweils letzte 2 Major-Versionen.
- iOS Safari 15+, Android Chrome 100+.
- Fallback bei fehlender Mikrofon-/Bildschirm-Berechtigung: Text-Chat-Modus.

### 5.6 Barrierefreiheit
- WCAG 2.1 Level AA.
- Untertitel verpflichtend verfügbar.
- Tastaturnavigation.
- Screen-Reader-kompatibel (Widget-Trigger).

---

## 6. Technische Architektur

### 6.1 High-Level-Architektur

```
┌──────────────────────────┐
│  Endkunde (Browser)      │
│  ┌────────────────────┐  │
│  │  Widget (JS)       │  │
│  │  - LiveKit-Client  │──┼─── WebRTC Audio ────┐
│  │  - Mic / Speakers  │  │                     │
│  │  - Screen-Share    │──┼─── WebRTC Video ────┤
│  │  - Avatar-Video    │◄─┼─── LiveKit-Room ────┤
│  └────────────────────┘  │                     │
└──────────────────────────┘                     │
                                                 ▼
                       ┌──────────────────────────────────────┐
                       │  AvatarDesk Backend                  │
                       │                                      │
                       │  ┌────────────────────────────────┐  │
                       │  │  LiveKit Cloud / Self-Hosted   │  │
                       │  │  (WebRTC SFU)                  │  │
                       │  └─────────────┬──────────────────┘  │
                       │                │                     │
                       │   ┌────────────┴──────────────┐      │
                       │   ▼                           ▼      │
                       │  ┌────────────────┐    ┌──────────┐  │
                       │  │ LiveKit Agent  │    │ Vision   │  │
                       │  │ (Python)       │    │ Worker   │  │
                       │  │                │    │ (Python) │  │
                       │  │ - Deepgram STT │    └──────────┘  │
                       │  │ - Claude LLM   │         │        │
                       │  │ - Tool-Use     │         │        │
                       │  │   (RAG, APIs)  │         │        │
                       │  │ - ElevenLabs   │         │        │
                       │  │   TTS          │         │        │
                       │  │ - bey plugin   │◄────────┘        │
                       │  │   (Avatar)     │                  │
                       │  └────────┬───────┘                  │
                       │           │                          │
                       │           ▼                          │
                       │   ┌───────────────────────────┐      │
                       │   │  Beyond Presence API      │      │
                       │   │  (api.bey.dev)            │      │
                       │   │  Audio → Avatar-Video     │      │
                       │   │  → published in LiveKit   │      │
                       │   └───────────────────────────┘      │
                       │                                      │
                       │  ┌──────────────────┐                │
                       │  │ Tenant-Services  │                │
                       │  │ - pgvector       │                │
                       │  │ - Postgres       │                │
                       │  │ - Redis          │                │
                       │  └──────────────────┘                │
                       └──────────────────────────────────────┘
                                         ▲
                            ┌────────────┴───────────────┐
                            │  Admin-Dashboard           │
                            │  (Tenant-Mitarbeiter)      │
                            └────────────────────────────┘
```

### 6.2 Beyond-Presence-Integration: zwei Modi

Wir entscheiden uns für **Modus A** als Standardpfad und behalten **Modus B** für Quick-Setup-Fälle:

#### Modus A: Speech-to-Video API (volle Kontrolle, empfohlen)
- Wir betreiben eigenen LiveKit-Agent in Python.
- Agent nutzt offizielles `bey`-Plugin für `livekit-agents`.
- STT (Deepgram), LLM (Claude), TTS (ElevenLabs) laufen in unserem Agent.
- Beyond Presence empfängt nur den TTS-Audiostream und gibt lippensynchrones Video zurück.
- **Vorteil:** Volle Kontrolle über Konversations-Logik, Tool-Use, Wissensdatenbank.
- **Beispiel-Code:**
  ```python
  from livekit.plugins import bey, deepgram, elevenlabs, anthropic, silero
  from livekit.agents import AgentSession

  session = AgentSession(
      stt=deepgram.STT(model="nova-2", language="de"),
      llm=anthropic.LLM(model="claude-sonnet-4-6"),
      tts=elevenlabs.TTS(voice_id="..."),
      vad=silero.VAD.load(),
  )
  avatar = bey.AvatarSession(avatar_id=tenant.avatar_id)
  await avatar.start(session, room=ctx.room)
  await session.start(agent=ConversationalAgent(), room=ctx.room)
  ```

#### Modus B: Managed Agent API (schnell, weniger Kontrolle)
- Beyond Presence orchestriert alles selbst (STT, LLM, TTS, Avatar).
- Wir konfigurieren via API: `avatar_id`, `system_prompt`, `voice_id`, `knowledge_base`.
- Embed via iFrame oder Konversations-Link.
- **Vorteil:** Schnellster Time-to-Market (Tage statt Wochen).
- **Nachteil:** Weniger Kontrolle über Tool-Use, Vision-Integration komplexer, Vendor-Lock-in größer.

**Entscheidung:** **Modus A für die Kernplattform**. Modus B als Option für das „Quick Setup“-Tier.

### 6.3 Tech-Stack-Empfehlung

#### Frontend (Widget)
- **Sprache:** TypeScript
- **Framework:** Preact (klein, Bundle ~10 KB) oder Lit (Web Components)
- **Build:** Vite
- **WebRTC:** LiveKit Client SDK
- **Distribution:** als IIFE-Bundle, ausgeliefert über CDN

#### Frontend (Admin-Dashboard)
- **Framework:** Next.js 14 (App Router) + React 18
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query + Zustand
- **Auth:** NextAuth oder Clerk

#### Backend
- **API-Layer:** TypeScript / NestJS
- **Realtime-Agent:** Python / `livekit-agents` Framework
- **Datenbank:** PostgreSQL (Supabase oder selbst gehostet) + pgvector
- **Cache:** Redis
- **Queue:** BullMQ / Temporal

#### KI / Modelle
- **LLM-Hauptmodell:** Claude Sonnet 4.6 (Tool-Use, lange Konversationen, multilingual)
- **Vision:** Claude Sonnet 4.6 Vision oder GPT-4o
- **STT:** Deepgram Nova-2 (Streaming)
- **TTS:** ElevenLabs Flash v2.5 (in Beyond Presence integriert)
- **Embeddings:** OpenAI text-embedding-3-large
- **Avatar-Streaming:** **Beyond Presence** (Genesis-Modell)

#### Infrastruktur
- **Cloud:** Hetzner (Frankfurt) + Cloudflare ODER AWS (eu-central-1)
- **Container:** Docker + Kubernetes (k3s genügt für Phase 1)
- **CI/CD:** GitHub Actions
- **Observability:** Grafana + Loki + Tempo
- **Error-Tracking:** Sentry

### 6.4 Datenmodell (vereinfacht)

```
Tenant
  - id (uuid)
  - name, billing_email, plan, created_at
  - api_key (gehasht)
  - bey_api_key (verschlüsselt; falls Tenant eigenen Beyond-Presence-Account nutzt)

User (Tenant-Mitarbeiter)
  - id, tenant_id, email, role, password_hash

AvatarConfig
  - id, tenant_id
  - bey_avatar_id (Beyond-Presence-Avatar-ID)
  - elevenlabs_voice_id
  - language
  - persona_prompt (text)
  - greeting (text)
  - is_custom_avatar (bool; falls vom Tenant eigenes Video hochgeladen)

KnowledgeSource
  - id, tenant_id
  - type (pdf|url|manual)
  - source_uri
  - last_indexed_at

KnowledgeChunk
  - id, source_id
  - content (text)
  - embedding (vector(1536))

Conversation
  - id, tenant_id
  - end_user_id (anonym/Cookie)
  - livekit_room_id
  - started_at, ended_at
  - language
  - resolution (resolved|escalated|abandoned)
  - csat_score (1-5, nullable)
  - bey_minutes_used (numeric)

Message
  - id, conversation_id
  - role (user|assistant|system|tool)
  - content (text)
  - audio_duration_ms
  - timestamp

ScreenAnalysis
  - id, conversation_id
  - timestamp
  - vision_summary (text)
  (kein Bild gespeichert!)

Escalation
  - id, conversation_id
  - reason, target (email|human-agent)
  - status, created_at
```

### 6.5 Realtime-Pipeline (Modus A)

Sequenzdiagramm einer Konversationsrunde:

```
1. Kunde spricht ins Mikrofon (Browser)
2. LiveKit-Client publisht Audio-Track in Room
3. LiveKit-Agent (unser Backend) subscribed auf Audio-Track
4. Deepgram-STT-Plugin transkribiert in Echtzeit; VAD erkennt Sprachende
5. Transkript → Claude LLM mit Konversations-History + RAG-Resultate +
   ggf. letztes Vision-Summary
6. LLM streamt Tokens
7. Sobald erster Satz vollständig → ElevenLabs TTS streamt Audio-Bytes
8. bey-Plugin streamt diese Audio-Bytes an Beyond-Presence-API
9. Beyond Presence generiert lippensynchronen Video-Stream und publisht ihn
   als Track in den selben LiveKit-Room
10. Browser des Endkunden subscribed auf Avatar-Track → Video + Audio
    werden synchron abgespielt
11. Während Avatar spricht: VAD lauscht weiter; bei Kunden-Unterbrechung →
    Cancel-Signal an alle Stages, Avatar verstummt
```

**Performance-Budget Modus A:**
- STT-Endpoint-Detection: 200 ms
- LLM Time-to-First-Token: 400 ms
- TTS First-Byte: 150 ms
- Beyond-Presence-First-Frame: < 100 ms
- **Total ~850 ms** End-to-End.

---

## 7. Drittanbieter-Auswahl & Begründung

| Komponente | Empfehlung | Begründung | Fallback |
|---|---|---|---|
| Avatar-Video | **Beyond Presence (Genesis)** | EU/DE-Anbieter (DSGVO), <100 ms Latenz, native LiveKit-Integration, Custom-Avatar via 2-Min-Video | HeyGen, D-ID |
| LLM | Claude Sonnet 4.6 | Lange Konversationen, Tool-Use stark, Vision integriert, mehrsprachig | GPT-4o |
| STT | Deepgram Nova-2 | Echte Streaming-API, niedrige Latenz, mehrsprachig | OpenAI Whisper Realtime |
| TTS | ElevenLabs Flash v2.5 | Streaming, sehr menschlich, mehrsprachig, native Integration in Beyond Presence | OpenAI TTS, Azure Neural |
| WebRTC SFU | LiveKit Cloud | Beyond Presence streamt direkt in LiveKit-Rooms, native Integration | Self-hosted LiveKit |
| Vector DB | pgvector | Reicht für Phase 1, in Postgres integriert | Pinecone, Weaviate |

**Wichtig:** Pro Drittanbieter gilt es, AVV/DPA zu unterzeichnen und Sub-Processor-Liste den Tenants verfügbar zu machen.

---

## 8. Sicherheit & Compliance

### 8.1 Authentifizierung & Autorisierung
- Tenant-API-Keys (rotierbar) für Widget-Authentifizierung.
- JWT-Tokens für Admin-Dashboard, kurze Lebensdauer + Refresh.
- Role-Based-Access-Control (Owner / Admin / Viewer).
- Rate-Limiting pro Tenant + pro IP (Cloudflare-Layer).

### 8.2 Tenant-Isolation
- Strikte Trennung in Datenbank über `tenant_id`-Foreign-Keys + Row-Level-Security in Postgres.
- Kein Cross-Tenant-Datenzugriff in irgendeinem API-Endpunkt.
- LiveKit-Rooms: pro Konversation eigener Room mit kurzlebigem Token.

### 8.3 DSGVO-Spezifika
- **Beyond Presence ist deutsche GmbH:** vereinfachter DPA-Prozess.
- Cookie-Banner / Consent-Modal vor erstem Mikrofonzugriff.
- Auftragsverarbeitungsvertrag im Onboarding pflichtig.
- Datenschutzerklärung für Endkunden (white-label-fähig).
- Datenexport-API (Right to Portability).
- Lösch-API (Right to be Forgotten).
- Datenresidenz: EU-Tenants ausschließlich auf EU-Servern.

### 8.4 Sicherheits-Audits
- Vor GA: Penetrationstest durch externes Sicherheitsunternehmen.
- SOC 2 Type 1 binnen 12 Monaten anstreben (für Enterprise-Verkauf).

---

## 9. UX / UI-Richtlinien

### 9.1 Tonalität / Persona-Defaults
- Frauen-Avatar wirkt warm, kompetent, nicht aufdringlich.
- Stimme: ruhig, klar, mittlere Geschwindigkeit (~150 WPM).
- Gesprächsstil: Du- oder Sie-Form je nach Tenant-Konfiguration.

### 9.2 Visual-Design
- Modal: helle und dunkle Mode-Variante.
- Akzentfarbe: per Tenant konfigurierbar (CSS-Variable).
- Typografie: System-Fonts oder Inter.
- Animationen: weich, nicht ablenkend.

### 9.3 Mikro-Interaktionen
- Statusübergänge (hört zu / denkt nach / spricht) klar visuell unterscheidbar.
- Subtile Atmungsanimation des Avatars im Idle-State (Beyond Presence liefert das nativ).
- Visuelles Feedback bei Bildschirm-Sharing (rot pulsierender Punkt).

### 9.4 Fehlerzustände
- Mikrofon nicht verfügbar → Hinweis + Fallback auf Text-Chat.
- Bildschirm-Sharing abgelehnt → Avatar sagt freundlich, dass es ohne weitergeht.
- Backend-Fehler → kontextueller Hinweis + Retry-Option.
- Beyond-Presence-Ausfall → Avatar-Video wird durch statisches Bild ersetzt, Sprach-Konversation läuft weiter.
- Verbindungsabbruch → Auto-Reconnect mit Statusanzeige.

---

## 10. Roadmap & Releases

### 10.1 Phase 0 – Foundation (Woche 1–2)
- Repo-Setup (Monorepo mit pnpm + Turborepo).
- Infrastruktur-Setup (Hetzner-Server, Postgres, Redis, LiveKit Cloud Account).
- CI/CD-Pipelines (GitHub Actions).
- Auth-Service für Admin-Dashboard lauffähig.
- Beyond-Presence-Account angelegt, API-Key getestet, erstes Avatar-Streaming-Demo lokal.

### 10.2 Phase 1 – Core MVP (Woche 3–7)
- Widget-Trigger + Modal (statisch).
- LiveKit-Client im Widget, joint einen Room.
- Python-LiveKit-Agent: STT (Deepgram) + LLM (Claude) + TTS (ElevenLabs) + bey-Plugin (Beyond Presence).
- Erste End-to-End-Konversation in Deutsch.
- Admin-Dashboard: Avatar-Auswahl (aus BP-Bibliothek), Wissensdatenbank-Upload (PDF only), Embed-Snippet-Generator.
- Demo-Tenant für eigene Tests.

**Meilenstein 1:** „Endkunde spricht mit Beyond-Presence-Avatar; Avatar antwortet mit Wissen aus Tenant-PDFs.“ (~5 Wochen ab heute)

### 10.3 Phase 2 – Bildschirm-Sharing & RAG (Woche 8–12)
- Screen-Share-Funktion im Widget (Publish als zweiter Track).
- Vision-Worker: subscribed auf Screen-Track, sampelt Frames, ruft Vision-LLM.
- LLM-Tool `analyze_screen()` integriert.
- Konversations-Memory + RAG vollständig produktiv.
- Mehrsprachig (EN, IT zusätzlich zu DE).
- Conversation-Logs im Dashboard.
- Analytics (Basic).

**Meilenstein 2:** „Avatar sieht Bildschirm und löst Probleme konkret.“

### 10.4 Phase 3 – Skalierung & Enterprise (Woche 13–20)
- Eskalation an menschliche Agenten.
- CRM-Integrationen (Zendesk, HubSpot).
- Detaillierte Analytics + CSAT.
- Webhook-System.
- Stripe-Billing + Usage-Metering.
- Custom-Avatar-Workflow (Tenant lädt 2-Min-Video → BP-API).
- Pen-Test + DSGVO-Audit.
- Marketing-Website + Landing-Pages.

**Meilenstein 3:** „Erstes zahlendes Kundenunternehmen live.“

### 10.5 Phase 4 – Wachstum (ab Monat 6)
- Mobile-SDKs (iOS/Android-Native-Integration für Apps der Kunden).
- Erweiterte Avatar-Bibliothek.
- KI-Auto-Eskalation mit besserer Confidence-Schätzung.
- Outbound-Modus: Avatar ruft proaktiv an (z. B. nach abgebrochenem Kauf).
- WordPress-Plugin, Shopify-App.

---

## 11. Erfolgskennzahlen (KPIs)

### 11.1 Produkt-KPIs
- **First-Response-Latenz:** Median < 1 s (dank Beyond Presence < 100 ms Avatar-Latenz).
- **Resolution-Rate** (ohne Eskalation): > 70 %.
- **CSAT** (4–5 Sterne): > 80 %.
- **Average Conversation Length:** 3–5 Min.
- **Eskalationsrate:** < 20 %.

### 11.2 Business-KPIs
- 10 Pilotkunden in den ersten 6 Monaten.
- 50 zahlende Tenants im ersten Jahr.
- ARR-Ziel Jahr 1: 500 k €.
- Customer Churn < 5 % monatlich.

---

## 12. Kostenstruktur (Schätzung pro Konversation à 5 Min)

| Komponente | Kosten ca. |
|---|---|
| Beyond Presence Avatar-Streaming (5 Min) | 0,75 € – 1,25 € (je nach Tier) |
| ElevenLabs TTS (~3.000 Zeichen) | 0,30 € |
| Deepgram STT (5 Min) | 0,02 € |
| Claude Sonnet 4.6 LLM (~10k Tokens) | 0,06 € |
| Vision-LLM (5 Frames) | 0,05 € |
| LiveKit (5 Min, 2 Tracks) | 0,03 € |
| Server/DB anteilig | 0,02 € |
| **Gesamt** | **~1,25 € – 1,75 €** |

*Hinweis:* exakte Beyond-Presence-Preise sind nicht öffentlich; hier konservativ geschätzt. Reale Zahlen bestätigen wir mit BP-Sales.

**Pricing-Empfehlung an Tenants:** 0,80 € – 1,20 € pro Konversation oder Flat-Tarife (z. B. 299 €/Monat für 500 Konversationen).
**Bruttomarge-Ziel:** 60–70 % nach Skalierung und Volumenrabatten.

---

## 13. Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|---|---|---|---|
| Beyond Presence ändert Pricing oder API | Mittel | Hoch | Modus B als reine API-Abstraktion; HeyGen/D-ID als Fallback-Adapter im Code vorbereiten |
| Beyond-Presence-Ausfall | Niedrig | Hoch | Auto-Fallback auf Sprach-only-Modus; SLA mit BP verhandeln |
| DSGVO-Beanstandung wegen Voice-Recording | Mittel | Hoch | Sprachdaten nicht persistieren, nur Transkripte; vollständige AVV |
| Vision-LLM erkennt sensible Daten auf Screen | Hoch | Hoch | Hinweis im Consent; Tenant kann Screen-Share deaktivieren; PII-Redaktion vor Speicherung |
| LLM gibt falsche Antworten / halluziniert | Hoch | Mittel | Strenges RAG-Grounding; LLM darf nur aus Wissensdatenbank antworten; Confidence-Scoring; bei Unsicherheit eskalieren |
| Hohe API-Kosten | Mittel | Hoch | Pricing entsprechend kalkulieren; Caching häufiger Antworten; Volumenrabatt mit BP verhandeln |
| Endkunde missbraucht Service (Trolling) | Mittel | Niedrig | Rate-Limits, Toxicity-Filter, Tenant-Blocklisten |
| Browser blockiert Mikrofon/Screen | Niedrig | Mittel | Klarer Onboarding-Flow, Permissions-Erklärung, Text-Fallback |
| Avatar wirkt unheimlich (Uncanny Valley) | Niedrig (BP Genesis sehr gut) | Mittel | Mehrere Avatar-Optionen, User-Test mit echten Kunden |

---

## 14. Out-of-Scope (Phase 1)

Folgende Punkte werden bewusst nicht im Initial-Scope behandelt:

- Native iOS/Android-SDKs.
- Outbound-Calls (Avatar ruft proaktiv).
- Nicht-textuelle Wissensquellen (Videos, Audio-Dateien).
- White-Label-Domain (eigene Subdomain pro Tenant).
- On-Premise-Deployment.
- Eigenes Avatar-Training (Foundation-Model-Training).

---

## 15. Offene Punkte / zu entscheiden

1. **Beyond-Presence-Vertrag:** Termin mit BP-Sales vereinbaren – Volumenpreise, DPA, Custom-Avatar-Konditionen klären.
2. **Pricing-Modell:** Pro Konversation, pro Minute oder Flat-Fee mit Limits?
3. **Markenname final:** AvatarDesk vs. Alternativen (Naming-Workshop nötig).
4. **Pilot-Kunden:** wer sind die ersten 3–5 Test-Tenants?
5. **Teamgröße & Hiring-Plan** für Phase 2/3.

---

## 16. Anhänge

### 16.1 Glossar
- **Tenant:** Kundenunternehmen, das AvatarDesk auf seiner Website einbettet.
- **Endkunde / Endnutzer:** Kunde des Tenants, der mit dem Avatar spricht.
- **Avatar:** der visuelle, sprechende Charakter (z. B. „Sofia“) – in unserem Fall ein Beyond-Presence-Avatar.
- **RAG:** Retrieval-Augmented Generation – Wissensdatenbank-Lookup vor LLM-Antwort.
- **STT/TTS:** Speech-to-Text / Text-to-Speech.
- **VAD:** Voice Activity Detection.
- **WebRTC:** Browser-Standard für Echtzeit-Audio/Video.
- **SFU:** Selective Forwarding Unit (WebRTC-Server) – wird durch LiveKit gestellt.
- **bey-Plugin:** offizielles Beyond-Presence-Plugin für `livekit-agents`.
- **Genesis:** Beyond-Presence-Premium-Avatar-Modell mit < 100 ms Latenz.

### 16.2 Referenzdokumentation
- Beyond Presence Docs: https://docs.bey.dev
- LiveKit-Agents-Docs (mit bey-Plugin): https://docs.livekit.io/agents/models/avatar/plugins/bey/
- Anthropic Claude API: https://docs.claude.com
- ElevenLabs API: https://elevenlabs.io/docs
- Deepgram API: https://developers.deepgram.com

### 16.3 Hinweise zur Implementierung mit Claude Code

Empfohlene Vorgehensweise:

1. **Repo-Struktur initial anlegen** (Monorepo: `apps/widget`, `apps/dashboard`, `services/api`, `services/agent` (Python), `packages/shared`).
2. **Phase 0, Sprint 1:** Beyond-Presence-Account einrichten, lokales Hello-World mit `livekit-agents` + `bey`-Plugin in Python: Agent spricht „Hallo, wie kann ich helfen?“ und Avatar wird in einem Test-LiveKit-Room sichtbar.
3. **Phase 1, Sprint 1:** Widget-Trigger + Modal-Skelett (Preact + LiveKit-Client) + Verbindung zu lokalem Agent.
4. **Phase 1, Sprint 2:** STT (Deepgram) + LLM (Claude) + TTS (ElevenLabs) im Agent verkabeln, erste vollständige Konversation.
5. **Phase 1, Sprint 3:** Wissensdatenbank (PDF-Upload, pgvector, RAG-Tool im Agent) + Admin-Dashboard-Skelett (Next.js).
6. **Phase 2, Sprint 1:** Screen-Share im Widget, Vision-Worker, `analyze_screen`-Tool.
7. Pro Sprint: detaillierte Tickets in Linear; Claude Code arbeitet diese ab.
8. Bei jedem Sprint-Ende: Demo-Video + manuelles QA + automatische Tests (Playwright für Widget, Pytest für Agent).

**Erste Code-Kommandos für Claude Code:**

```bash
# Monorepo
pnpm dlx create-turbo@latest avatardesk
cd avatardesk

# Agent-Service (Python)
mkdir -p services/agent && cd services/agent
python -m venv .venv && source .venv/bin/activate
pip install "livekit-agents[deepgram,elevenlabs,silero,anthropic]" \
            livekit-plugins-bey python-dotenv

# Widget
cd ../../apps/widget
pnpm create vite . --template preact-ts
pnpm add livekit-client

# Dashboard
cd ../dashboard
pnpm create next-app . --typescript --tailwind --app
```

---

**Ende des PRD v2.0 (Beyond Presence Edition).**
