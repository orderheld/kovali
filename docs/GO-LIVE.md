# Go-live-Anleitung KOVALI

Diese Anleitung führt Schritt für Schritt von diesem Repository zur öffentlichen Website unter `www.kovali.ch`.
Reihenfolge einhalten: Zuerst die offenen Angaben klären, dann Vercel, Domain, E-Mail-Versand und zum Schluss Search Console.

| Schritt | Wo | Dauer |
| --- | --- | --- |
| 1. Offene Angaben bestätigen | `src/config/site.ts` | kurz |
| 2. Vercel-Projekt anlegen | vercel.com | kurz |
| 3. Domain bei cyon verbinden | my.cyon.ch + Vercel | DNS braucht bis zu einigen Stunden |
| 4. Resend für das Kontaktformular | resend.com + cyon DNS | DNS-Prüfung kann dauern |
| 5. Neon (optional) | neon.tech | kurz |
| 6. Google Search Console | search.google.com/search-console | kurz |
| 7. Rechtliche Schlusskontrolle | Checkliste unten | |
| 8. Abnahmetest nach Go-live | Browser | kurz |

---

## 1. Offene Angaben bestätigen

```bash
npm run check:launch
```

Das Skript listet alle Werte in `src/config/site.ts`, die noch `confirmed: false` haben, und fehlende Umgebungsvariablen.
Bestätigt sind bereits Firmenname (Webnova Solutions F. Demir) und E-Mail (info@kovali.ch).

Noch offen:

- **Domain**: `kovali.ch` registriert? Falls ja, `url.confirmed` auf `true` setzen.
- **Firmenname**: Gross- und Kleinschreibung mit dem Eintrag auf [zefix.ch](https://www.zefix.ch) abgleichen.
- **UID, MWST-Nummer, Handelsregister**: eintragen, falls vorhanden. Gibt es keine, `value: null` lassen und `confirmed: true` setzen. Leere Felder erscheinen nicht im Impressum.
- **Telefon**: nur eintragen, wenn die Nummer öffentlich sein soll.

Beim Wechsel zur GmbH: `legal.form` auf `"gmbh"` setzen, Firmenname, UID und Handelsregister anpassen. Impressum, Footer und strukturierte Daten übernehmen die Werte automatisch.

## 2. Vercel

1. Auf [vercel.com](https://vercel.com) mit GitHub anmelden, **Add New → Project**, Repository `orderheld/kovali` importieren.
2. Framework wird als Next.js erkannt. Build-Befehl und Output nicht ändern.
3. **Plan**: Für eine geschäftliche Website ist der **Pro-Plan** nötig. Der Hobby-Plan ist laut Vercel nur für private, nicht kommerzielle Nutzung erlaubt.
4. **Umgebungsvariablen** unter *Settings → Environment Variables* (Werte siehe `.env.example`):

| Variable | Production | Preview | Hinweis |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | erst mit eigener Domain: `https://www.kovali.ch` | gleich | Für Canonical-URLs und Sitemap. Solange die Seite auf `*.vercel.app` läuft, gilt diese Adresse |
| `RESEND_API_KEY` | Schlüssel aus Schritt 4 | leer lassen | Nur auf dem Server, nie im Browser |
| `CONTACT_TO_EMAIL` | `info@kovali.ch` | `info@kovali.ch` | Empfänger der Anfragen |
| `CONTACT_FROM_EMAIL` | `KOVALI Website <website@mail.kovali.ch>` | gleich | Absender auf verifizierter Domain |
| `CONTACT_IP_SALT` | Zufallswert | Zufallswert | `openssl rand -hex 32` |
| `CONTACT_DRY_RUN` | `false` | `true` | Previews senden keine E-Mails |
| `DATABASE_URL` | optional, Schritt 5 | leer | Ohne Wert nur E-Mail-Versand |
| `CRON_SECRET` | Zufallswert | – | Nur mit Neon nötig |
| `CONTACT_RETENTION_DAYS` | `365` | – | Löschfrist gespeicherter Anfragen |

5. **Deploy** auslösen. Die Funktionsregion ist in `vercel.json` auf Frankfurt (`fra1`) gesetzt.
6. Suchmaschinen indexieren nur die Produktion auf der eigenen Domain. Preview-Deployments und die Adresse `*.vercel.app` tragen ein `noindex`-Tag, bis eine eigene Domain verbunden und neu deployt ist.
7. Solange `RESEND_API_KEY`, `CONTACT_TO_EMAIL` und `CONTACT_FROM_EMAIL` fehlen, zeigt die Kontaktseite statt des Formulars die E-Mail-Adresse. Das Formular erscheint nach dem nächsten Deployment mit diesen Variablen.

## 3. Domain bei cyon verbinden

1. In Vercel unter *Settings → Domains* `www.kovali.ch` und `kovali.ch` hinzufügen.
   `www.kovali.ch` als Hauptdomain wählen, `kovali.ch` leitet darauf um.
2. Im cyon-Kundenbereich ([my.cyon.ch](https://my.cyon.ch)) den DNS-Editor der Domain öffnen und die Einträge setzen, die Vercel anzeigt. Üblich sind:

| Typ | Name | Wert |
| --- | --- | --- |
| A | `kovali.ch` (bzw. `@`) | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

   Zeigt Vercel andere Werte an, gelten die Werte aus Vercel.
3. **Wichtig:** Bestehende **MX-Einträge** und den SPF-Eintrag der E-Mail bei cyon **nicht ändern**, sonst kommt keine E-Mail mehr an `info@kovali.ch` an. Bestehende A- oder AAAA-Einträge für `@` und `www`, die auf cyon zeigen, ersetzen bzw. entfernen.
4. Warten, bis Vercel die Domain als *Valid Configuration* meldet. Das SSL-Zertifikat erstellt Vercel automatisch.
5. `NEXT_PUBLIC_SITE_URL` auf `https://www.kovali.ch` setzen und neu deployen (*Deployments → Redeploy*). Erst danach gibt die Website die Indexierung frei und verweist in Canonical-URLs, Sitemap und Vorschaubildern auf die eigene Domain.

## 4. Resend für das Kontaktformular

Das Formular sendet jede Anfrage über [Resend](https://resend.com) an `info@kovali.ch`. Antworten gehen direkt an die Absenderin oder den Absender (Reply-To).

1. Konto bei Resend anlegen, **Domains → Add Domain**.
   Empfehlung: eine Subdomain wie `mail.kovali.ch` verwenden. So bleibt der SPF-Eintrag der Hauptdomain bei cyon unberührt.
   Als Region **EU (Irland, eu-west-1)** wählen.
2. Resend zeigt drei bis vier DNS-Einträge an (MX und TXT für SPF auf `send.mail`, TXT für DKIM auf `resend._domainkey.mail`). Diese exakt so im cyon-DNS-Editor anlegen.
3. Empfohlen zusätzlich ein DMARC-Eintrag für die Hauptdomain, falls noch keiner besteht:

| Typ | Name | Wert |
| --- | --- | --- |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@kovali.ch` |

   Nach einigen Wochen ohne Probleme kann `p=none` auf `p=quarantine` erhöht werden.
4. In Resend **Verify** klicken und warten, bis die Domain als *Verified* erscheint.
5. **API Keys → Create API Key** mit Berechtigung *Sending access*, eingeschränkt auf die Domain. Den Schlüssel als `RESEND_API_KEY` in Vercel (nur Production) eintragen.
6. `CONTACT_FROM_EMAIL` auf eine Adresse der verifizierten Domain setzen, z. B. `KOVALI Website <website@mail.kovali.ch>`. Diese Adresse braucht kein Postfach.
7. Neu deployen (*Deployments → Redeploy*), damit die Variablen greifen.

**Was passiert bei Fehlern?** Jede Anfrage erhält eine Referenz (z. B. `KOV-20261013-7KQ4`). Diese wird angezeigt, mit der E-Mail versendet und im Vercel-Log protokolliert (ohne Personendaten). Kann die E-Mail nicht versendet werden, sieht die Person eine Fehlermeldung mit Referenz und der Adresse `info@kovali.ch`. Ist Neon eingerichtet, wird die Anfrage trotzdem gespeichert, mit Status `failed`.

**Schutz vor Missbrauch:** verstecktes Honeypot-Feld, Mindestzeit beim Ausfüllen, Begrenzung auf fünf Anfragen pro 15 Minuten und Absender (zusätzlich über die Datenbank, falls Neon aktiv ist), serverseitige Validierung aller Felder.

## 5. Neon (optional)

**Empfehlung:** Für den Start nicht nötig. Die E-Mail ist der Hauptkanal. Neon lohnt sich, wenn eine zweite Ablage aller Anfragen gewünscht ist, damit auch bei einer E-Mail-Störung nichts verloren geht.

1. Auf [neon.tech](https://neon.tech) ein Projekt anlegen, Region **AWS Europe Central 1 (Frankfurt)**.
   Alternativ in Vercel über *Storage → Neon* (Marketplace), dann wird `DATABASE_URL` automatisch gesetzt.
2. Im SQL Editor von Neon den Inhalt von `db/schema.sql` ausführen.
3. Den Connection String (Pooled) als `DATABASE_URL` in Vercel (Production) eintragen.
4. `CRON_SECRET` setzen. Der tägliche Cron-Job (`vercel.json`, 03:00 UTC) löscht Anfragen, die älter als `CONTACT_RETENTION_DAYS` sind. Das entspricht der Angabe in der Datenschutzerklärung (zwölf Monate).
   Gespeichert wird erst, wenn `DATABASE_URL`, `CRON_SECRET` und `CONTACT_IP_SALT` gesetzt sind. So gelten die Löschfrist und die nicht umkehrbare IP-Kennung aus der Datenschutzerklärung.
5. Neu deployen und eine Testanfrage senden. In Neon prüfen: `select reference, created_at, email_status from contact_requests order by created_at desc;`

## 6. Google Search Console

1. In der [Search Console](https://search.google.com/search-console) eine **Domain-Property** `kovali.ch` anlegen.
2. Google zeigt einen TXT-Eintrag (`google-site-verification=…`). Diesen im cyon-DNS-Editor für `kovali.ch` anlegen und bestätigen.
   Alternative: die URL-Präfix-Methode mit HTML-Tag. Dann den Code als `GOOGLE_SITE_VERIFICATION` in Vercel eintragen und neu deployen.
3. Unter **Sitemaps** `https://www.kovali.ch/sitemap.xml` einreichen.
4. Mit der **URL-Prüfung** die Startseite und die fünf Leistungsseiten zur Indexierung anmelden.
5. Optional: [Bing Webmaster Tools](https://www.bing.com/webmasters) über den Import aus der Search Console einrichten.
6. Optional: ein Google-Unternehmensprofil als Unternehmen mit Einzugsgebiet anlegen und die Adresse dort ausblenden.

## 7. Rechtliche Schlusskontrolle

- [ ] Impressum: Firmenname, Adresse, E-Mail, gegebenenfalls UID, MWST und Handelsregister korrekt.
- [ ] Datenschutzerklärung: Regionen der Anbieter bestätigen (Vercel Funktionen Frankfurt, Resend EU, Neon Frankfurt) und prüfen, ob Vercel, Resend und Neon unter dem Swiss-U.S. Data Privacy Framework zertifiziert sind ([dataprivacyframework.gov](https://www.dataprivacyframework.gov)). Andernfalls bleibt der Hinweis auf Standardvertragsklauseln massgebend.
- [ ] Auftragsverarbeitungsverträge (DPA) von Vercel, Resend und gegebenenfalls Neon in den jeweiligen Konten akzeptieren bzw. herunterladen.
- [ ] Wird Neon **nicht** verwendet: den Absatz zur Datenbank in `src/app/(site)/datenschutz/page.tsx` entfernen.
- [ ] Markenrecherche für «KOVALI» beim IGE ([swissreg.ch](https://www.swissreg.ch)), bevor Logo und Domain auf Drucksachen erscheinen.
- [ ] Zusammenarbeitsmodelle (Subunternehmen, Teilmandat) rechtlich prüfen lassen. Die Website erwähnt ausdrücklich, dass Personalverleih und Arbeitsvermittlung derzeit nicht angeboten werden.
- [ ] Die drei Insights-Artikel fachlich gegenlesen.
- [x] Porträtfoto für Startseite, Warum KOVALI, Für Unternehmen und Kontakt: freigestelltes Bild in `src/assets/ferhat-demir.webp` (Avatar: `ferhat-demir-avatar.webp`), eingebunden über `founder.portrait` in `src/content/company.ts`.

## 8. Abnahmetest nach Go-live

- [ ] `https://kovali.ch` leitet auf `https://www.kovali.ch` um, Schloss-Symbol im Browser.
- [ ] Alle Seiten in der Hauptnavigation und im Footer öffnen, auch auf dem Smartphone.
- [ ] Kontaktformular: leer absenden (Fehlermeldungen erscheinen, auch für das Unternehmen), dann vollständig ausfüllen, mit zwei Leistungen, Laufzeit, Pensum und Voraussetzungen. Die E-Mail mit allen Angaben kommt bei `info@kovali.ch` an, «Antworten» geht an die eingegebene Adresse, Spam-Ordner prüfen.
- [ ] Link von einer Leistungsseite («… anfragen») öffnet das Formular mit vorausgewählter Leistung.
- [ ] `/partner` und `/fachleute` leiten auf `/unternehmen` um.
- [ ] `/ueber-uns` und `/warum-wir` leiten auf `/warum-kovali` um, `/it-consulting` auf `/leistungen`.
- [ ] `https://www.kovali.ch/sitemap.xml` und `/robots.txt` sind erreichbar.
- [ ] Vorschau beim Teilen prüfen, z. B. mit dem [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
- [ ] Sicherheits-Header prüfen, z. B. mit [securityheaders.com](https://securityheaders.com).
- [ ] Lighthouse in Chrome (Performance, Barrierefreiheit, SEO) laufen lassen.
