# KOVALI Website

Website von **KOVALI – Business & Technology Consulting** (*From Requirements to Value.*).
Business Analysis, Requirements Engineering, Application Management, Test Management und Test Engineering für IT-Projekte in der Schweiz.

- Go-live: [docs/GO-LIVE.md](docs/GO-LIVE.md)
- Redaktionsplan Insights: [docs/REDAKTIONSPLAN.md](docs/REDAKTIONSPLAN.md)
- Logo und Markenzeichen: [brand/README.md](brand/README.md)

## Technik

| Bereich | Lösung |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Rendering | Alle Seiten statisch vorgerendert: `cacheComponents` und `ensureStatic = "navigation"` im Root-Layout. Eine Änderung, die eine Seite dynamisch machen würde, lässt den Build fehlschlagen. |
| Styling | Tailwind CSS 4 mit Design-Tokens in `src/app/globals.css` |
| Komponenten | Eigene Komponenten im shadcn/ui-Stil (`cn`, Varianten). Die Website braucht keine komplexen Primitive wie Dialoge oder Menüs, deshalb wurde auf die shadcn-CLI verzichtet. |
| Icons | Lucide |
| Schrift | Geist Sans und Geist Mono, selbst gehostet über das Paket `geist` |
| Animation | Nur CSS (Hero-Linien, Hover). Keine Motion-Bibliothek, um JavaScript zu sparen. `prefers-reduced-motion` wird respektiert. |
| Formular | Server Action mit Zod-Validierung, Resend für den Versand, Neon optional |
| Hosting | Vercel (Region Frankfurt), Domain und DNS bei cyon |

## Lokal starten

```bash
npm install
cp .env.example .env.local   # CONTACT_DRY_RUN=true setzen, dann wird nichts versendet
npm run dev                  # http://localhost:3000
```

| Skript | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Produktions-Build, prüft TypeScript und die statische Ausgabe |
| `npm run start` | Produktions-Build lokal starten |
| `npm run lint` | ESLint |
| `npm run typecheck` | Routentypen erzeugen und `tsc` ausführen |
| `npm run check:launch` | Offene Firmen- und Kontaktangaben sowie fehlende Umgebungsvariablen auflisten |
| `npm run brand` | Logo-Dateien neu erzeugen (Python 3 und `fonttools` nötig) |

## Struktur

```
src/
  app/                    Seiten (App Router), sitemap.ts, robots.ts, manifest.ts, Icons, OG-Bild
    kontakt/actions.ts    Server Action des Kontaktformulars (Unternehmen)
    fachleute/actions.ts  Server Action des Profilformulars (Fachleute, Lebenslauf als PDF)
    api/cron/retention/   Täglicher Lösch-Job für gespeicherte Anfragen (nur mit Neon)
  components/             Layout, Abschnitte, UI-Bausteine, Logo
  config/site.ts          Firmen-, Kontakt- und Rechtsangaben, aktive Logo-Richtung
  content/                Alle Texte: Leistungen, Branchen, Unternehmen, Fachleute, Insights
  lib/                    SEO und strukturierte Daten, Kontakt- und Profilformular, Hilfsfunktionen
brand/                    Logo-Generator und alle drei Logo-Richtungen als SVG
db/schema.sql             Tabelle für die optionale Speicherung in Neon
docs/                     Go-live-Anleitung, Redaktionsplan
```

## Inhalte pflegen

- **Firmendaten** (Name, Rechtsform, UID, Adresse, E-Mail, Telefon, Domain): nur in `src/config/site.ts`. Impressum, Footer, Kontaktseite und strukturierte Daten lesen von dort. Werte mit `confirmed: false` meldet `npm run check:launch`.
- **Leistungen**: `src/content/services.ts`. Jede Leistung hat H1, Meta-Titel, Beschreibung, Aufgaben, Ergebnisse, Nutzen, Szenarien, Branchen, Methoden und FAQ.
- **Branchen**: `src/content/industries.ts`. `kind: "experience"` für Branchen mit Praxiserfahrung (ohne Arbeitgeber, Projekte, Systeme oder Jahreszahlen), `kind: "target"` für Zielmärkte.
- **Insights**: neue Datei in `src/content/insights/` nach dem Muster der bestehenden Artikel anlegen und in `src/content/insights/index.ts` eintragen. Sitemap, Übersicht und strukturierte Daten folgen automatisch.
- **Links im Text**: `[Linktext](/pfad)`.
- **Sprache**: Schweizer Hochdeutsch, immer «ss» statt «ß».
- **Sitemap-Datum**: `SITE_UPDATED` in `src/app/sitemap.ts` anpassen, wenn sich Seiteninhalte ändern.

### Inhaltliche Leitplanken

- Keine erfundenen Teams, Kundenreferenzen, Partnerschaften, Zitate oder Statistiken.
- Keine Angaben aus dem Lebenslauf von Ferhat Demir: keine früheren Arbeitgeber, Projekt- oder Systemnamen, Zeiträume, Funktionsbezeichnungen, Sprachniveaus oder Zertifikatsjahre. Die Website stellt KOVALI und seine Leistungen vor, nicht den Werdegang.
- Banken, Versicherungen und IT-Dienstleister sind Zielmärkte, keine Referenzbranchen.
- Keine Angaben zu Verleih- oder Vermittlungsbewilligungen.
- Profile von Fachleuten dienen nur der Mitarbeit in Mandaten von KOVALI. Keine Vermittlung an Dritte und kein Personalverleih (beides wäre bewilligungspflichtig), keine ausgeschriebenen Stellen behaupten.
- Keine Kundenlogos oder Referenzen ohne eigenes Mandat und schriftliche Freigabe.

## Kontaktformular

Ablauf in `src/app/kontakt/actions.ts`:

1. Honeypot und Mindest-Ausfüllzeit gegen Bots
2. Validierung aller Felder auf dem Server (Zod, `src/lib/contact/schema.ts`) und des optionalen Anforderungsprofils (PDF oder Word bis 4 MB, geprüft am Dateiinhalt, `src/lib/uploads.ts`)
3. Rate Limit pro Absender (gesalzener IP-Hash, im Speicher und optional in Neon)
4. Referenznummer erzeugen, E-Mail über Resend senden (Reply-To an die Absenderin oder den Absender)
5. Optional in Neon speichern, mit Versandstatus `sent` oder `failed` (nur die Textfelder; ein hochgeladenes Anforderungsprofil geht nur als E-Mail-Anhang mit)
6. Erfolgs- oder Fehlermeldung mit Referenz; bei Fehlern mit Hinweis auf `info@kovali.ch`

API-Schlüssel werden nur auf dem Server gelesen (`src/lib/env.ts`, `server-only`). Das Formular funktioniert auch ohne JavaScript.
Ohne Resend-Variablen zeigt die Produktion statt der Formulare die E-Mail-Adresse. Preview-Deployments ohne Resend laufen automatisch im Testmodus (`CONTACT_DRY_RUN`): Die Formulare sind sichtbar, prüfen alles und versenden nichts.
Vorauswahl per Link: `/kontakt?leistung=business-analysis` oder `/kontakt?anfrage=contracting`.

## Profilformular (Für Fachleute)

Ablauf in `src/app/fachleute/actions.ts`, mit denselben Schutzmechanismen wie das Kontaktformular:

1. Honeypot, Mindest-Ausfüllzeit und Rate Limit
2. Validierung der Felder (`src/lib/profile/schema.ts`) und des Lebenslaufs (`src/lib/profile/cv.ts`): genau eine PDF-Datei bis 4 MB, geprüft am Dateiinhalt
3. Versand über Resend mit dem Lebenslauf als Anhang an `CONTACT_TO_EMAIL`
4. Die Website speichert weder Profil noch Lebenslauf, auch nicht in Neon. Aufbewahrung höchstens sechs Monate im Postfach (siehe Datenschutzerklärung).

Wegen des Uploads ist `serverActions.bodySizeLimit` in `next.config.ts` auf 4.5 MB gesetzt, die Obergrenze von Vercel für Anfragen.

## Qualitätssicherung

Vor jedem Merge:

```bash
npm run lint && npm run typecheck && npm run build
```

Geprüft beim Aufbau: Build und TypeScript ohne Fehler, ESLint ohne Befund, axe-Prüfung (WCAG 2.2 AA) auf allen Seiten in Desktop- und Mobilbreite ohne Befund, keine horizontale Scrollbar bei 390 px, alle Formularszenarien (Validierung, Honeypot, zu schnelles Absenden, Rate Limit, Versandfehler, Erfolg, Vorauswahl), 404 für unbekannte Seiten.
