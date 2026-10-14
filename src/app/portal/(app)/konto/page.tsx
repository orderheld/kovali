import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PortalLogoutButton } from "@/components/portal/shell";
import { PrivacySummary } from "@/components/portal/privacy-summary";
import { Facts, PortalHeading } from "@/components/portal/ui";
import { formatDateTime } from "@/lib/admin/format";
import { requireCandidate } from "@/lib/portal/session";
import { logout, logoutEverywhere } from "../actions";
import { PasswordChangeForm } from "../forms";

/** Portal pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Konto" };

function Panel({ id, title, description, children }: { id: string; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(11_23_51/0.04)] sm:p-6">
      <h2 id={id} className="text-base font-semibold text-ink">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-slate">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const session = await requireCandidate();

  return (
    <div className="mx-auto max-w-3xl">
      <PortalHeading title="Konto" description="Anmeldung, Passwort und Datenschutz." />
      <div className="space-y-4 sm:space-y-5">
        <Panel id="zugang" title="Zugang">
          <Facts
            items={[
              { label: "E-Mail-Adresse für die Anmeldung", value: session.email },
              { label: "Letzte Anmeldung", value: session.lastLoginAt ? formatDateTime(session.lastLoginAt) : null },
            ]}
          />
          <p className="mt-3 text-[0.8125rem] text-slate">
            Die E-Mail-Adresse für die Anmeldung ändert KOVALI auf Ihren Wunsch. Melden Sie dies unter{" "}
            <Link href="/portal/stammdaten" className="font-medium text-blue hover:underline">
              Stammdaten
            </Link>
            .
          </p>
        </Panel>

        <Panel id="passwort" title="Passwort ändern" description="Nach der Änderung werden Sie auf allen anderen Geräten abgemeldet.">
          <PasswordChangeForm />
        </Panel>

        <Panel id="geraete" title="Abmelden" description="Haben Sie sich auf einem fremden Gerät angemeldet? Dann melden Sie sich überall ab.">
          <div className="flex flex-wrap gap-2">
            <PortalLogoutButton
              logout={logout}
              label="Abmelden"
              className="h-10 border border-line bg-white px-4 font-medium text-ink shadow-[0_1px_0_rgb(11_23_51/0.04)] hover:bg-mist"
            />
            <PortalLogoutButton
              logout={logoutEverywhere}
              label="Auf allen Geräten abmelden"
              target="/portal/login?abgemeldet=1"
              className="h-10 border border-red-200 bg-white px-4 font-medium text-red-700 hover:bg-red-50 hover:text-red-800"
            />
          </div>
        </Panel>

        <Panel id="datenschutz" title="Datenschutz" description="Was KOVALI über Sie speichert und wozu.">
          <PrivacySummary compact />
          <div className="mt-5 rounded-lg border border-line bg-mist/60 px-4 py-3 text-sm text-ink">
            <p className="font-medium">Daten löschen lassen</p>
            <p className="mt-1 text-slate">
              Sie können jederzeit verlangen, dass KOVALI Ihre Daten und Ihren Zugang löscht, soweit keine gesetzliche Aufbewahrungspflicht besteht. Bereits erteilte
              Einwilligungen für einzelne Vakanzen können Sie direkt bei der Vakanz zurückziehen.
            </p>
            <Link
              href="/portal/stammdaten?nachricht=loeschung"
              className="mt-2 inline-flex items-center gap-1 font-medium text-blue underline-offset-2 hover:underline"
            >
              Löschung beantragen <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
