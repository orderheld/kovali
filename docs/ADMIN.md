# KOVALI Admin-Bereich

Der Admin-Bereich unter `/admin` ist Ferhats persönliches Werkzeug für KOVALI als Ein-Mann-Firma. Er läuft in derselben Next.js-App wie die Website, wird aber nie vorgerendert, nie indexiert und nie zwischengespeichert.

| Bereich | Pfad | Inhalt |
| --- | --- | --- |
| Übersicht | `/admin` | Laufende Aufträge, was davon bleibt, Vakanzen, auslaufende Verträge, angeheftete Texte |
| Aufträge | `/admin/auftraege` | Einsätze mit Satz, Modell (Rechnung über Einzelfirma oder Lohn über Payroll), Pensum, Dokumenten |
| Vakanzen | `/admin/vakanzen` | Bewerbungen mit Ausschreibung, Bewerbungstext, Dokumenten und nächstem Schritt |
| Verträge | `/admin/vertraege` | Ablage der unterzeichneten Verträge mit Laufzeit und Kündigungsfrist |
| Textbausteine | `/admin/texte` | Wiederverwendbare Texte zum Kopieren |
| Firmen & Kontakte | `/admin/firmen` | Vermittler, Endkunden, Partner |
| Rechner | `/admin/rechner` | Was bleibt von einem Satz, in beiden Modellen |
| Einstellungen | `/admin/einstellungen` | Sicherheit, Protokoll, Firmendaten, System |

Es gibt genau ein Login. Niemand sonst kann sich anmelden oder registrieren.

## Einrichtung

Alle Zugangsdaten stehen als Umgebungsvariablen bei Vercel, nie im Repository (es ist öffentlich). Alle vier sind Pflicht; fehlt einer, leitet `/admin` auf `/admin/einrichtung` um.

| Variable | Inhalt |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon, Region Frankfurt). Wird von der Vercel-Integration gesetzt. |
| `ADMIN_PASSWORD_HASH` | `pbkdf2-sha256:<Iterationen>:<Salz>:<Hash>`, erzeugt auf `/admin/einrichtung` im Browser. |
| `ADMIN_SECRET` | 32 zufällige Bytes (base64url). Daraus werden die Schlüssel für Dokumente und IP-Hashes abgeleitet. **Nie ändern**, sonst sind gespeicherte Dokumente nicht mehr lesbar. Zusätzlich im Passwort-Manager ablegen. |
| `ADMIN_TOTP_SECRET` | Zwei-Faktor-Schlüssel (base32, mindestens 16 Zeichen) für Google Authenticator. |

Ablauf:

1. Vercel → Storage → Neon-Datenbank in der Region Frankfurt (`fra1`) anlegen und mit dem Projekt verbinden.
2. Google Authenticator auf dem Handy installieren.
3. `https://<domain>/admin/einrichtung` öffnen, Passwort-Hash, Schlüssel und Zwei-Faktor-Schlüssel erzeugen. Den QR-Code mit Google Authenticator scannen und einen Code prüfen.
4. Vercel → Settings → Environment Variables: Werte für *Production* eintragen, als *Sensitive* markieren.
5. Deployments → letztes Deployment → Redeploy. Danach ist `/admin/login` aktiv. Die Tabellen legt die App beim ersten Aufruf selbst an.

Passwort ändern oder neues Handy: auf `/admin/einrichtung` (angemeldet) einen neuen Wert erzeugen, bei Vercel ersetzen, Redeploy, danach unter Einstellungen alle Sitzungen beenden.

Lokal: `.env.local` mit denselben Variablen (eine lokale Postgres-Datenbank genügt) und `npm run dev`.

## Sicherheit

- Anmeldung immer mit Passwort (PBKDF2-SHA256, 600'000 Iterationen) und Code aus Google Authenticator (TOTP, jeder Code nur einmal gültig). Höchstens 5 Fehlversuche pro IP in 15 Minuten und 50 insgesamt pro Stunde.
- Sitzungen in der Datenbank (nur der SHA-256 des Tokens), Cookie `__Host-`, HttpOnly, Secure, SameSite=Lax. Ende nach 12 Stunden oder 4 Stunden ohne Aktivität (`auth/session.ts`).
- Dokumente sind mit AES-256-GCM verschlüsselt, bevor sie in die Datenbank gehen. Jeder Abruf wird protokolliert.
- Protokoll (`audit_log`) für jede Anmeldung, Änderung und jeden Dokumentabruf, nur mit Nummern wie `A-0003`, nie mit Namen.
- Antworten unter `/admin`: `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`.

## Für Entwickler

| Pfad | Inhalt |
| --- | --- |
| `src/proxy.ts` | Vorab-Check: ohne Sitzungs-Cookie Weiterleitung zum Login. Die echte Prüfung passiert in jeder Seite und Action. |
| `src/app/admin/login`, `einrichtung` | Öffentlich erreichbar. |
| `src/app/admin/(app)/` | Alles hinter dem Login. `layout.tsx` prüft die Sitzung und zeigt die Navigation. |
| `src/app/admin/(app)/_shared/` | Notizen (`ActivityFeed`), Dokumente (`DocumentsCard`), Aufschlüsselung des Einkommens (`EarningsBreakdown`), Suchfeld, gemeinsame Actions. |
| `src/app/admin/api/dokumente/[id]` | Download eines Dokuments. |
| `src/lib/admin/` | Daten und Logik ohne UI: `db/` (Schema, Migrationen, Client), `auth/`, `crypto.ts`, `documents.ts`, `options.ts`, `owner.ts`, `format.ts`, `forms.ts`, `data/` (Abfragen je Modul, Suche, Übersicht). |
| `src/lib/admin/earnings.ts` | Einkommensrechnung für Übersicht, Aufträge und Rechner (rein, mit Tests). Standardwerte mit Quellen und Stand; Ferhats Werte stehen unter dem Einstellungs-Schlüssel `einkommen` (`earnings-settings.ts`). Lohnabzüge kommen aus `payroll.ts`. |
| `src/lib/admin/vacancy-rules.ts`, `texts.ts`, `contracts/` | Regeln der Vakanzen (Status, Fälligkeit), Textbausteine und Verträge (Nummern, Ablauf, Verknüpfungen). |
| `src/components/admin/` | `ui.tsx` (Bausteine), `form.tsx` (Formulare), `long-text-field.tsx` (langer Text mit Zeichenzahl und Textbausteinen), `copy-button.tsx`, `shell.tsx` (Navigation). |

Datenmodell (Migration `0004_personal_admin`): `assignments` (Aufträge), `mandates` (Vakanzen; Tabelle, Export und Owner-Typ heissen aus historischen Gründen «mandate»), `contracts` (Ablage; `template` ist die Vertragsart), `snippets` (Textbausteine), `companies`, `contacts`, `documents` und `activities` (je mit genau einem bzw. mindestens einem Bezug: Firma, Vakanz, Vertrag oder Auftrag). Die Tabellen des früheren Kandidatenmoduls hat 0004 nur gelöscht, wenn nie ein Kandidat gespeichert war; sonst liegen sie unbenutzt in der Datenbank (Hinweis unter Einstellungen → System).

### Konventionen

- **Seiten**: `export const instant = false;`, zuerst `await requireAdmin();`, Parameter mit `parseId()` prüfen, sonst `notFound()`. Zur Build-Zeit keine Arbeit: ein Build ohne Umgebungsvariablen muss durchlaufen.
- **Server Actions**: zuerst `await requireAdmin();`, Eingaben mit Zod über `parseForm(schema, formData)` und `f.*` aus `forms.ts`, gebundene Argumente erneut prüfen. Nach dem Anlegen `redirectAfterChange()`, nach Änderungen auf derselben Seite `refresh()`.
- **Protokoll**: `audit(action, { entity, entityId, summary })`, `summary` nur mit Nummern (`displayNo.*`).
- **Verlauf**: `logActivity(owner, text)` für Ereignisse am Datensatz.
- **Auswahllisten**: nur aus `options.ts`; Werte mit `legacy` gibt es noch in alten Zeilen, angeboten wird `offered(list)`.
- **Datenbank**: neue Spalten nur über eine neue Migration, nie eine ausgelieferte ändern. `npm test` mit `TEST_DATABASE_URL` prüft, dass Schema und Migrationen übereinstimmen.
- **Texte**: Deutsch für die Schweiz, «ss» statt «ß», Ferhat wird geduzt.

### Prüfen

```bash
npm run lint && npm run typecheck
TEST_DATABASE_URL=postgres://… npm test   # die Testdatenbank wird geleert
npm run build
```
