# KOVALI Admin-Bereich und Kandidatenportal

Der Admin-Bereich unter `/admin` ist das interne Werkzeug von KOVALI: Firmen und Kontakte, Kandidaten mit verschlüsselten Lebensläufen, Mandate und Vakanzen mit Matching, Vorschläge an Auftraggeber, Verträge als PDF und Word, Rechner, Kandidatenportal und Datenschutz. Er läuft in derselben Next.js-App wie die Website, wird aber nie vorgerendert, nie indexiert und nie zwischengespeichert.

## Einrichtung

Alle Zugangsdaten stehen als Umgebungsvariablen bei Vercel, nie im Repository (es ist öffentlich).

| Variable | Pflicht | Inhalt |
| --- | --- | --- |
| `DATABASE_URL` | ja | Postgres (Neon, Region Frankfurt). Wird von der Vercel-Integration gesetzt. |
| `ADMIN_PASSWORD_HASH` | ja | `pbkdf2-sha256:<Iterationen>:<Salz>:<Hash>`, erzeugt auf `/admin/einrichtung` im Browser. |
| `ADMIN_SECRET` | ja | 32 zufällige Bytes (base64url). Daraus werden die Schlüssel für Dokumente und IP-Hashes abgeleitet. **Nie ändern**, sonst sind gespeicherte Dokumente nicht mehr lesbar. Zusätzlich im Passwort-Manager ablegen. |
| `ADMIN_TOTP_SECRET` | empfohlen | Zwei-Faktor-Code (base32) für eine Authenticator-App. |

Ablauf:

1. Vercel → Storage → Neon-Datenbank in der Region Frankfurt (`fra1`) anlegen und mit dem Projekt verbinden.
2. `https://<domain>/admin/einrichtung` öffnen, Passwort-Hash, Schlüssel und Zwei-Faktor-Code erzeugen.
3. Vercel → Settings → Environment Variables: Werte für *Production* eintragen, als *Sensitive* markieren.
4. Deployments → letztes Deployment → Redeploy. Danach ist `/admin/login` aktiv. Die Tabellen legt die App beim ersten Aufruf selbst an.

Lokal: `.env.local` mit denselben Variablen (eine lokale Postgres-Datenbank genügt) und `npm run dev`.

## Sicherheit und Datenschutz

- Anmeldung mit Passwort (PBKDF2-SHA256, 600'000 Iterationen) und optional Zwei-Faktor-Code (TOTP, jeder Code nur einmal gültig). Höchstens 5 Fehlversuche pro IP in 15 Minuten; im Kandidatenportal zusätzlich höchstens 10 pro Konto (Hash der E-Mail-Adresse), und eine erfolgreiche Portal-Anmeldung setzt die Fehlversuche nicht zurück.
- Sitzungen in der Datenbank (nur der SHA-256 des Tokens), Cookie `__Host-`, HttpOnly, Secure, SameSite=Lax. Admin-Bereich: Ende nach 12 Stunden oder 4 Stunden ohne Aktivität; Kandidatenportal: nach 7 Tagen oder 8 Stunden ohne Aktivität. Das Verzeichnis der Bearbeitungstätigkeiten nimmt die Werte aus den Konstanten in `auth/session.ts` und `portal/session.ts`.
- Dokumente und extrahierter Lebenslauf-Text sind mit AES-256-GCM verschlüsselt, bevor sie in die Datenbank gehen.
- Jede Anmeldung, Änderung, jeder Dokumentabruf und Export landet im Audit-Log, ohne Personendaten (nur Nummern wie `K-0042`).
- Antworten unter `/admin` und `/portal`: `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`.
- Weitergabe eines Profils an eine Firma nur mit erfasster Einwilligung für genau dieses Mandat (Datenbank-Regel `submissions_consent_before_submit`). Das Dossier mit Namen nur, wenn die Einwilligung auch dafür gilt (`submissions.consent_scope`); eine Einwilligung im Kandidatenportal gilt nur für das anonymisierte Dossier. Ein unterschriebenes Einwilligungsformular wird nur übernommen, wenn Empfängerin und Profilvariante zum Vorschlag passen.
- Einwilligung, Widerruf und Widerspruch stehen in eigenen Spalten: `submissions.consent_method`, `withdrawn_at` und `withdrawal_note` je Mandat, `candidates.objection_at` und `objection_note` für einen Widerspruch gegen jede Weitergabe (sperrt Vormerken, Einwilligung und Vorschlag bei allen Mandaten). Gemeinsame Logik in `src/lib/admin/consent.ts`.
- Ein einmal versendeter Vertrag (`contracts.sent_at`) kann nicht mehr gelöscht, nur storniert werden; so wird keine Vertragsnummer ein zweites Mal vergeben.

## Für Entwickler: Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/proxy.ts` | Schneller Vorab-Check: ohne Sitzungs-Cookie Weiterleitung zum Login. Die echte Prüfung passiert in jeder Seite und Action. |
| `src/app/admin/layout.tsx` | Metadaten (noindex), `instant = false`. |
| `src/app/admin/login`, `einrichtung` | Öffentlich erreichbar. |
| `src/app/admin/(app)/` | Alles hinter dem Login. `layout.tsx` prüft die Sitzung und zeigt die Navigation. |
| `src/app/admin/(app)/_shared/` | Notizen/Verlauf (`ActivityFeed`), Dokumente (`DocumentsCard`), Suchfeld, gemeinsame Actions. |
| `src/app/admin/api/` | Route Handler für Downloads (Dokumente, PDF/Word-Exporte). |
| `src/lib/admin/` | Daten, Sicherheit und Logik ohne UI: `db/` (Schema, Migrationen, Client), `auth/`, `crypto.ts`, `documents.ts`, `matching.ts`, `skills.ts`, `rates.ts`, `options.ts`, `format.ts`, `forms.ts`, `render/` (PDF und Word), `data/` (Abfragen). |
| `src/components/admin/` | `ui.tsx` (Server-taugliche Bausteine), `form.tsx` (Formulare, Client), `shell.tsx` (Navigation). |

### Konventionen

- **Seiten** (`page.tsx`): `export const instant = false;`, zuerst `await requireAdmin();`, Parameter mit `parseId()` prüfen, sonst `notFound()`. Metadaten-Titel ohne Personennamen (z. B. `K-0042`), weil Titel in Browser-Verläufen landen.
- **Server Actions** (`actions.ts` mit `"use server"`): immer zuerst `await requireAdmin();`. Eingaben mit Zod über `parseForm(schema, formData)` und den Helfern `f.*` aus `forms.ts`. Gebundene Argumente (`action.bind(null, id)`) erneut mit Zod prüfen. Rückgabe `ActionState` (`ok()`, `fail()`); nach dem Anlegen `redirectAfterChange()` aus `redirect.ts` (`refresh()` und `redirect()`, damit auch die Zähler in der Navigation neu geladen werden), nach Änderungen auf derselben Seite `refresh()` aus `next/cache`.
- **Audit**: `audit(action, { entity, entityId, summary })` bei jeder Änderung, jedem Export und Dokumentabruf. `summary` ohne Namen, nur Nummern (`displayNo.*`).
- **Verlauf**: `logActivity(owner, text)` für Ereignisse, die Ferhat am Datensatz sehen soll (Status geändert, Profil vorgeschlagen).
- **Formulare**: `ActionForm` mit den Feldern aus `form.tsx`; Feldnamen = Zod-Schlüssel, damit Fehlermeldungen beim Feld erscheinen. Wiederholbare Bereiche (Sprachen, Werdegang) als JSON in einem Hidden-Feld und `f.jsonList(itemSchema)`.
- **Auswahllisten**: nur aus `options.ts` (mit `labelOf`, `toneOf`, `valuesOf`). Die Datenbank hat dazu passende Check-Constraints.
- **Datenbank**: Drizzle (`getDb()`), Tabellen in `db/schema.ts`, SQL in `db/migrations.ts`. Neue Spalten nur über eine neue Migration (nie eine ausgelieferte ändern); `npm test` mit `TEST_DATABASE_URL` prüft, dass Schema und Migration übereinstimmen.
- **Dokumente**: `checkUpload()` prüft Grösse und Dateityp am Inhalt; `storeDocument()` verschlüsselt. Ausgabe nur über Route Handler mit `adminSessionForApi()`, `audit()` und `documentResponse()`.
- **Exporte (PDF/Word)**: Inhalt als `DocModel` (`render/model.ts`) bauen, dann `renderPdf()` oder `renderDocx()`. Dateiname mit `exportFileName()`.
- **Texte**: Deutsch für die Schweiz, «ss» statt «ß», Ferhat wird geduzt. Keine Aussagen über Bewilligungen (Personalverleih, Arbeitsvermittlung), die KOVALI nicht hat.
- **Activity**: Next.js hält zuletzt besuchte Seiten versteckt im DOM. `ActionForm` setzt sich beim Verlassen zurück; eigene Client-Komponenten mit flüchtigem Zustand (offene Menüs) ebenso.

### Tests

```bash
npm run lint && npm run typecheck
TEST_DATABASE_URL=postgres://… npm test   # die Testdatenbank wird geleert
npm run build
```
