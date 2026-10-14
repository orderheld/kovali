import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, CircleAlert, CircleDashed, KeyRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton, Notice } from "@/components/admin/ui";
import { getAdminSession } from "@/lib/admin/auth/session";
import { adminConfigStatus, isAdminConfigured } from "@/lib/admin/env";
import { SetupGenerator } from "./setup-generator";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Einrichtung" };

export default async function SetupPage() {
  await connection();
  const configured = isAdminConfigured();
  const session = configured ? await getAdminSession() : null;

  if (configured && !session) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm text-center">
          <Logo className="mx-auto w-40" title="KOVALI" />
          <p className="mt-8 text-sm text-slate">Der Admin-Bereich ist eingerichtet.</p>
          <LinkButton href="/admin/login" variant="primary" className="mt-4">
            Zur Anmeldung
          </LinkButton>
        </div>
      </main>
    );
  }

  const status = adminConfigStatus();
  const set = (name: string) => status.some((item) => item.name === name && item.ok);
  const statusList = (
    <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-white">
      {status.map((item) => (
        <li key={item.name} className="flex items-center gap-3 px-4 py-3 text-sm">
          {item.ok ? (
            <CheckCircle2 aria-hidden className="size-5 text-emerald-600" />
          ) : item.required ? (
            <CircleAlert aria-hidden className="size-5 text-amber-600" />
          ) : (
            <CircleDashed aria-hidden className="size-5 text-slate" />
          )}
          <span className="flex-1 text-ink">{item.label}</span>
          <code className="font-mono text-xs text-slate">{item.name}</code>
          <span className="sr-only">{item.ok ? "gesetzt" : "fehlt"}</span>
        </li>
      ))}
    </ul>
  );

  if (configured) {
    // Logged in and set up: only what can still be added or changed. ADMIN_SECRET never changes.
    const twoFactor = set("ADMIN_TOTP_SECRET");
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <Logo className="w-36" title="KOVALI" />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Einrichtung</h1>
        <p className="mt-2 text-[0.9375rem] text-slate">
          Der Admin-Bereich ist eingerichtet. Die Zugangsdaten stehen als Umgebungsvariablen bei Vercel, nicht im (öffentlichen) Repository.
        </p>
        {statusList}

        {twoFactor ? null : (
          <>
            <Notice tone="blue" title="Zwei-Faktor-Code einrichten" className="mt-6">
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li>Unten den Code-Schlüssel erzeugen, mit der Authenticator-App scannen und einen Code prüfen.</li>
                <li>
                  In Vercel unter <strong>Settings → Environment Variables</strong> <code>ADMIN_TOTP_SECRET</code> für <em>Production</em> eintragen und als
                  <em> Sensitive</em> markieren.
                </li>
                <li>
                  Unter <strong>Deployments</strong> das letzte Deployment neu starten (Redeploy). Danach braucht die Anmeldung zusätzlich den Code aus der
                  App.
                </li>
              </ol>
            </Notice>
            <div className="mt-4">
              <SetupGenerator password={false} secret={false} totp />
            </div>
          </>
        )}

        <section className="mt-6 rounded-lg border border-line bg-white p-5 text-sm text-slate">
          <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
            <KeyRound aria-hidden className="size-4 text-blue" />
            Passwort ändern
          </h2>
          <p className="mt-2">
            Neuen Hash erzeugen, in Vercel <code className="text-ink">ADMIN_PASSWORD_HASH</code> damit ersetzen und das letzte Deployment neu starten
            (Redeploy). Danach gilt nur noch das neue Passwort; laufende Sitzungen beendest du unter{" "}
            <Link href="/admin/einstellungen" className="font-medium text-blue hover:underline">
              Einstellungen
            </Link>
            .
          </p>
          <details className="mt-3 rounded-md border border-line [&[open]>summary]:border-b [&[open]>summary]:border-line">
            <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-[0.8125rem] font-medium text-blue select-none hover:bg-mist [&::-webkit-details-marker]:hidden">
              Neuen Passwort-Hash erzeugen
            </summary>
            <div className="p-3">
              <SetupGenerator password secret={false} totp={false} />
            </div>
          </details>
          <p className="mt-3">
            Der geheime Schlüssel <code className="text-ink">ADMIN_SECRET</code> bleibt, wie er ist: Mit einem neuen liessen sich die gespeicherten Dokumente
            nicht mehr öffnen.
          </p>
        </section>

        <LinkButton href="/admin" variant="primary" className="mt-8">
          Zurück zum Admin
        </LinkButton>
      </main>
    );
  }

  const secretSet = set("ADMIN_SECRET");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <Logo className="w-36" title="KOVALI" />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Admin-Bereich einrichten</h1>
      <p className="mt-2 text-[0.9375rem] text-slate">
        Die Zugangsdaten stehen nicht im Code, sondern als Umgebungsvariablen bei Vercel. So kann niemand sie im (öffentlichen) Repository finden.
      </p>
      {statusList}

      <Notice tone="blue" title="So geht es" className="mt-6">
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>
            Datenbank: in Vercel unter <strong>Storage</strong> eine Neon-Datenbank in der Region Frankfurt erstellen und mit dem Projekt
            verbinden. <code>DATABASE_URL</code> wird dabei automatisch gesetzt.
          </li>
          <li>Unten die fehlenden Werte erzeugen: Passwort-Hash, Schlüssel und (empfohlen) Zwei-Faktor-Code.</li>
          <li>
            In Vercel unter <strong>Settings → Environment Variables</strong> jeden Wert für <em>Production</em> eintragen und als
            <em> Sensitive</em> markieren.
          </li>
          <li>Unter <strong>Deployments</strong> das letzte Deployment neu starten (Redeploy). Danach ist die Anmeldung aktiv.</li>
        </ol>
      </Notice>
      {secretSet ? (
        <p className="mt-3 text-sm text-slate">
          <code className="text-ink">ADMIN_SECRET</code> ist schon gesetzt und wird hier nicht mehr angeboten: Ein neuer Schlüssel macht gespeicherte Dokumente
          unlesbar.
        </p>
      ) : null}

      <div className="mt-6">
        <SetupGenerator password={!set("ADMIN_PASSWORD_HASH")} secret={!secretSet} totp={!set("ADMIN_TOTP_SECRET")} />
      </div>
    </main>
  );
}
