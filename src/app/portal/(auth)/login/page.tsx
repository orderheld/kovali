import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Notice } from "@/components/admin/ui";
import { AuthCard } from "@/components/portal/auth-card";
import { isAdminConfigured } from "@/lib/admin/env";
import { safePortalTarget } from "@/lib/portal/links";
import { getCandidateSession } from "@/lib/portal/session";
import { LoginForm } from "../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Anmelden" };

export default async function PortalLoginPage({ searchParams }: PageProps<"/portal/login">) {
  await connection();
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safePortalTarget(sp.next) : undefined;
  if (await getCandidateSession()) redirect(next ?? "/portal");

  return (
    <AuthCard
      title="Anmelden"
      intro="Für Fachleute, die mit KOVALI zusammenarbeiten. Den Zugang erhalten Sie per Einladung von KOVALI."
    >
      {sp.abgemeldet === "1" ? (
        <Notice tone="green" icon={CheckCircle2} className="mb-5">
          Sie sind abgemeldet.
        </Notice>
      ) : null}
      {isAdminConfigured() ? (
        <LoginForm next={next && next !== "/portal" ? next : undefined} />
      ) : (
        <Notice tone="amber">Das Kandidatenportal ist noch nicht eingerichtet.</Notice>
      )}
      <p className="mt-6 border-t border-line pt-4 text-sm text-slate">
        Probleme bei der Anmeldung? Schreiben Sie an{" "}
        <a href="mailto:info@kovali.ch" className="font-medium text-blue hover:underline">
          info@kovali.ch
        </a>
        .
      </p>
    </AuthCard>
  );
}
