import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LinkIcon } from "lucide-react";
import { Notice } from "@/components/admin/ui";
import { AuthCard } from "@/components/portal/auth-card";
import { findLinkAccount } from "@/lib/portal/accounts";
import { NewPasswordForm, ResetRequestForm } from "../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Passwort" };

export default async function PasswordPage({ searchParams }: PageProps<"/portal/passwort">) {
  await connection();
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : undefined;

  if (!token) {
    return (
      <AuthCard
        title="Passwort vergessen"
        intro="Geben Sie die E-Mail-Adresse Ihres Zugangs ein. Sie erhalten einen Link, mit dem Sie ein neues Passwort festlegen."
      >
        <ResetRequestForm />
        <p className="mt-6 border-t border-line pt-4 text-sm text-slate">
          <Link href="/portal/login" className="font-medium text-blue hover:underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </AuthCard>
    );
  }

  const account = await findLinkAccount(token, "reset");
  if (!account) {
    return (
      <AuthCard title="Link nicht gültig">
        <Notice tone="amber" icon={LinkIcon}>
          Dieser Link ist abgelaufen, wurde schon verwendet oder ist unvollständig. Links für ein neues Passwort sind eine Stunde gültig.
        </Notice>
        <p className="mt-5 text-sm">
          <Link href="/portal/passwort" className="font-medium text-blue hover:underline">
            Neuen Link anfordern
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Neues Passwort festlegen" intro="Danach sind Sie auf allen anderen Geräten abgemeldet.">
      <NewPasswordForm token={token} email={account.email} />
    </AuthCard>
  );
}
