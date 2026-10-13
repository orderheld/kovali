import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LinkButton, Notice } from "@/components/admin/ui";
import { getAdminSession } from "@/lib/admin/auth/session";
import { adminConfigStatus, isAdminConfigured } from "@/lib/admin/env";
import { SetupGenerator } from "./setup-generator";

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
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <Logo className="w-36" title="KOVALI" />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink">Admin-Bereich einrichten</h1>
      <p className="mt-2 text-[0.9375rem] text-slate">
        Die Zugangsdaten stehen nicht im Code, sondern als Umgebungsvariablen bei Vercel. So kann niemand sie im (öffentlichen) Repository finden.
      </p>

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

      <Notice tone="blue" title="So geht es" className="mt-6">
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>
            Datenbank: in Vercel unter <strong>Storage</strong> eine Neon-Datenbank in der Region Frankfurt erstellen und mit dem Projekt
            verbinden. <code>DATABASE_URL</code> wird dabei automatisch gesetzt.
          </li>
          <li>Unten Passwort-Hash, Schlüssel und (empfohlen) Zwei-Faktor-Code erzeugen.</li>
          <li>
            In Vercel unter <strong>Settings → Environment Variables</strong> jeden Wert für <em>Production</em> eintragen und als
            <em> Sensitive</em> markieren.
          </li>
          <li>Unter <strong>Deployments</strong> das letzte Deployment neu starten (Redeploy). Danach ist die Anmeldung aktiv.</li>
        </ol>
      </Notice>

      <div className="mt-6">
        <SetupGenerator />
      </div>

      {configured ? (
        <LinkButton href="/admin" variant="primary" className="mt-8">
          Zurück zum Admin
        </LinkButton>
      ) : null}
    </main>
  );
}
