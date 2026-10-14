import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LinkIcon } from "lucide-react";
import { Notice } from "@/components/admin/ui";
import { AuthCard } from "@/components/portal/auth-card";
import { PrivacySummary } from "@/components/portal/privacy-summary";
import { findLinkAccount } from "@/lib/portal/accounts";
import { InvitationForm } from "../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Einladung" };

export default async function InvitationPage({ searchParams }: PageProps<"/portal/einladung">) {
  await connection();
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;
  const account = token ? await findLinkAccount(token, "einladung") : null;

  if (!token || !account) {
    return (
      <AuthCard title="Link nicht gültig">
        <Notice tone="amber" icon={LinkIcon}>
          Dieser Einladungslink ist abgelaufen, wurde schon verwendet oder ist unvollständig. Bitte fragen Sie KOVALI nach einem neuen Link.
        </Notice>
        <p className="mt-5 text-sm text-slate">
          Haben Sie Ihr Passwort schon festgelegt?{" "}
          <Link href="/portal/login" className="font-medium text-blue hover:underline">
            Zur Anmeldung
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={`Willkommen, ${account.firstName}`}
      intro={
        <>
          Legen Sie Ihr Passwort für das Kandidatenportal fest. Ihr Login ist <strong className="font-medium [overflow-wrap:anywhere] text-ink">{account.email}</strong>.
        </>
      }
    >
      <InvitationForm token={token} email={account.email} privacy={<PrivacySummary />} />
    </AuthCard>
  );
}
