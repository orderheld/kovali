/**
 * Pre-launch check: lists all company and contact data in src/config/site.ts that
 * still has to be confirmed, and the environment variables needed in production.
 * Run with: npm run check:launch
 */
import { site, unconfirmedFields } from "../src/config/site.ts";

const open = unconfirmedFields();
let problems = 0;

console.log(`\nKOVALI launch check\n`);

if (open.length) {
  console.log("Noch zu bestätigen (src/config/site.ts):");
  for (const f of open) {
    console.log(`  - ${f.field}: ${f.value === null ? "(leer)" : String(f.value)}${f.note ? `  -> ${f.note}` : ""}`);
  }
  problems += open.length;
} else {
  console.log("Alle Firmen- und Kontaktangaben sind bestätigt.");
}

const required = ["NEXT_PUBLIC_SITE_URL", "RESEND_API_KEY", "CONTACT_TO_EMAIL", "CONTACT_FROM_EMAIL", "CONTACT_IP_SALT"];
const missing = required.filter((k) => !process.env[k]);
console.log("");
if (missing.length) {
  console.log("Umgebungsvariablen in dieser Umgebung nicht gesetzt (in Vercel prüfen):");
  for (const k of missing) console.log(`  - ${k}`);
} else {
  console.log("Alle Pflicht-Umgebungsvariablen sind gesetzt.");
}
if (process.env.CONTACT_DRY_RUN === "true") {
  console.log("  - CONTACT_DRY_RUN=true: Anfragen werden nicht versendet.");
  problems += 1;
}

console.log(`\nDomain: ${site.url.value}\n`);
process.exitCode = problems ? 1 : 0;
