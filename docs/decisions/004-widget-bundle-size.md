# ADR 004 — Widget-Bundle-Size: Abweichung vom PRD-Ziel

**Status:** Akzeptiert
**Datum:** 2026-05-06
**Entscheider:** Projekt-Owner

---

## Kontext

Das PRD §6.3 nennt im Tech-Stack-Quickref „Preact (klein, Bundle ~10 KB)"
als Frontend-Framework des Widgets. Dieser Wert hat sich in der
Praxis als **Page-Load-Impact-Ziel** für die Tenant-Webseite
etabliert — also: was bei Embed des Widgets auf die Performance der
einbettenden Seite zukommt.

Das tatsächliche Bundle der Phase-0-Implementierung erreicht diesen
Wert nicht. Diese ADR dokumentiert das Trade-off, damit es als
**bewusste Entscheidung** nachvollziehbar bleibt — nicht als
unbemerkte Abweichung.

## Beobachtete Bundle-Größen (Phase 0)

Build-Output `apps/widget/dist/widget.js`, gemessen auf Commit der
ersten Widget-Version:

| Maß | Größe |
|---|---|
| Raw (uncompressed) | 507 KB |
| Gzip | 135 KB |
| Brotli (geschätzt) | ~115 KB |

Das ist **~13× größer** als der im PRD genannte Richtwert.

## Bundle-Analyse: Wo kommt die Größe her?

Über `rollup-plugin-visualizer` und Source-Map-Aggregation
(temporäres Diagnose-Setup, **nicht** ins Repo committed):

| Modul | Raw-Größe | Anteil am Bundle |
|---|---|---|
| `livekit-client` (inkl. transitiver Deps wie `webrtc-adapter`, `@livekit/protocol`, `jose`) | 1126 KB | **97.7 %** |
| `preact` | 16.7 KB | 1.4 % |
| Eigener Widget-Code (`widget.tsx`, `styles.ts`, `main.ts`, `strings.ts`, `livekit-client.ts`) | 10.4 KB | 0.9 % |

**Entscheidende Befunde:**

- Der eigene Widget-Code ist **10.4 KB raw**, was nach Minify+Gzip
  bei deutlich unter 5 KB landet — exakt im PRD-Zielbereich.
- Preact ist mit 16.7 KB raw / ~5–6 KB gzipped ebenfalls im
  PRD-Zielbereich.
- **`livekit-client` allein ist 97.7 % des Bundles** und treibt die
  gesamte Größe.

## Warum `livekit-client` nicht weiter reduzierbar ist

`livekit-client` exportiert über sein `package.json` `exports`-Feld
genau einen Hauptpfad (`.`) plus einen separaten E2EE-Worker. Das
heißt:

- **Tree-Shaking** funktioniert nur innerhalb des Hauptbundles.
  Side-Effect-haltiger Code im SDK (Protocol-Buffer-Initialisierung,
  `webrtc-adapter`-Polyfills, ICE-Negotiation) verhindert
  realistisch mehr als 5–10 % Reduktion.
- **Kein modularer Subpath-Import** wie z. B.
  `import { Room } from 'livekit-client/room'` möglich.
- **Transitive Deps sind unvermeidbar:** `webrtc-adapter` (~150 KB,
  Browser-WebRTC-Polyfills), `@livekit/protocol` (Protobuf-
  Definitionen), `jose` (JWT). Alle werden vom SDK intern genutzt.

Eine relevante Reduktion wäre nur durch einen Eigen-Fork des
`livekit-client` möglich — explizit *nicht* gewollt: bricht den
LiveKit-Update-Pfad und ist Wartungs-Overhead, der den Nutzen weit
übersteigt.

## Erwogene Alternativen

| Option | Bundle-Effekt | Verworfen weil |
|---|---|---|
| Tree-Shake härter (z. B. `babel-plugin-transform-imports`) | -5 bis -10 % | Aufwand hoch, Ertrag minimal |
| `livekit-client` durch leichteren WebRTC-Wrapper ersetzen | unklar | Kein gleichwertiger Ersatz mit Beyond-Presence-Kompatibilität |
| Eigen-Fork des SDK | potentiell -30 % | Bricht Update-Pfad, hoher Wartungsaufwand |
| **Lazy-Load** (`livekit-client` als Dynamic-Chunk beim Modal-Open) | Initial-Chunk ~10 KB, Lazy-Chunk ~125 KB | Empfohlen; vom Owner explizit verschoben (siehe „Entscheidung") |

## Entscheidung

**Wir akzeptieren das Initial-Bundle von 135 KB gzipped als
bewusste Phase-0-Entscheidung.** Lazy-Loading wurde diskutiert und
explizit nicht implementiert.

### Begründung

1. **135 KB gzipped ist branchenüblich für ein WebRTC-Widget.**
   Vergleichbare Produkte (Daily.co, Whereby, Twilio Video Widget)
   liegen in derselben Größenordnung. Tenants, die ein
   Avatar-Streaming-Widget einbinden, erwarten WebRTC-typische
   Asset-Größen, nicht die eines reinen Chat-Widgets.
2. **Der eigene Code-Anteil ist diszipliniert klein.** Wir
   verschwenden keine Bytes mit unnötigen Frameworks oder UI-Libs;
   Preact statt React, Inline-CSS statt Tailwind, kein State-
   Management-Library, eigene i18n statt `i18next`. Wenn der Bedarf
   nach Reduktion akut wird, ist der Hebel `livekit-client`, nicht
   unser Code.
3. **Page-Load-Impact ist nicht das einzige Performance-Maß.**
   Caching (CDN + Browser) spielt mit hinein: ein Tenant-Besucher
   lädt das Widget genau einmal pro Cache-TTL, nicht pro
   Pageview.
4. **Phase 0 ist Skelett, nicht Production.** Das Bundle wird mit
   weiteren Features (STT-Capture, Screen-Share, i18n-Locales)
   leicht weiter wachsen; eine grundlegende Bundle-Strategie
   (Lazy-Load, Code-Splitting) ist eine Phase-3-Optimierung,
   sobald das Feature-Set stabil ist.

### Trade-Off, das wir bewusst eingehen

- Wenn Tenants empfindliche Performance-Budgets haben (z. B.
  Mobile-First-E-Commerce), ist 135 KB im Budget bemerkbar. In dem
  Fall werden wir mit dem Tenant individuell sprechen und Lazy-Load
  oder Conditional-Loading-Patterns anbieten — ist Phase-3-Arbeit.

## Bedingungen zur Re-Evaluation

Diese ADR sollte überprüft werden, sobald **eine** der folgenden
Bedingungen eintritt:

- Erster Tenant meldet messbar negative Page-Load-Auswirkung
  (Lighthouse-/Web-Vitals-Verschlechterung) durch das Widget.
- Bundle wächst über **200 KB gzipped**, ohne dass ein klares
  Feature die Größe rechtfertigt.
- LiveKit veröffentlicht eine modularere SDK-Variante, die echtes
  Subpath-Tree-Shaking zulässt.
- Alternativer WebRTC-Stack mit Beyond-Presence-Kompatibilität wird
  verfügbar.

Die einfachste Folge-Maßnahme bei Re-Evaluation ist Lazy-Loading
des `livekit-client`-Imports, das das Initial-Bundle auf ~10 KB
gzipped drückt und den Rest erst beim ersten Modal-Open lädt.

## Referenzen

- [PRD.md §6.3](../../PRD.md) — Tech-Stack und Bundle-Größen-Erwartung
- [ADR 003](003-phase-0-token-workaround.md) — Phase-0-Token-Workaround
  im selben Widget-Kontext
- LiveKit-Client SDK:
  https://github.com/livekit/client-sdk-js
- Bundle-Analyse-Methode: `rollup-plugin-visualizer` plus
  Source-Map-Aggregation, Diagnose-Setup nicht im Repo
  persistiert
