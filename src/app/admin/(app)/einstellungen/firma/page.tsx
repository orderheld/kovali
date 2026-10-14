import type { Metadata } from "next";
import { Building2, FileCode2 } from "lucide-react";
import { site } from "@/config/site";
import { Badge, Card, CardBody, CardHeader, DescriptionList, Notice } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { kovaliParty, partyLine } from "@/lib/admin/party";
import { VAT_THRESHOLD } from "@/lib/admin/payroll";
import { formatChf } from "@/lib/admin/format";
import { SettingsHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Firma" };

/** Shows a value from site.ts with its confirmation state ("offen" until Ferhat confirmed it). */
function Checked({ value, confirmed, empty = "–" }: { value: string | null; confirmed: boolean; empty?: string }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{value ?? empty}</span>
      {confirmed ? null : <Badge tone="amber">zu bestätigen</Badge>}
    </span>
  );
}

export default async function CompanySettingsPage() {
  await requireAdmin();
  const p = kovaliParty();
  const legal = site.legal;

  return (
    <>
      <SettingsHeader active="firma" />

      <Notice tone="blue" icon={FileCode2} title="Änderung in src/config/site.ts, z. B. beim Wechsel zur GmbH">
        Die Firmendaten stehen bewusst im Code und nicht in der Datenbank: Website, Impressum, Datenschutzerklärung, Verträge, Dossiers, Auskünfte und das Verzeichnis
        lesen alle dieselbe Quelle. Nach einer Änderung und dem nächsten Deployment tragen neue Dokumente die neuen Angaben; bereits erstellte Verträge bleiben
        unverändert.
      </Notice>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="KOVALI als Vertragspartei" description={partyLine(p)} />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Firma (wie im Handelsregister)", value: <Checked value={p.name} confirmed={legal.entityName.confirmed} /> },
                { label: "Rechtsform", value: p.legalForm },
                { label: "Inhaber", value: p.owner },
                { label: "Unterzeichnet durch", value: `${p.signatory.name}, ${p.signatory.title}` },
                { label: "Adresse", value: `${p.street}, ${p.postalCode} ${p.city}, ${p.country}`, wide: true },
                { label: "E-Mail", value: <Checked value={p.email} confirmed={site.contact.email.confirmed} /> },
                { label: "UID", value: <Checked value={p.uid} confirmed={legal.uid.confirmed} empty="keine" /> },
                { label: "MWST-Nummer", value: <Checked value={p.vatNumber} confirmed={legal.vatNumber.confirmed} empty="nicht registriert" /> },
                { label: "Handelsregister", value: <Checked value={p.commercialRegister} confirmed={legal.commercialRegister.confirmed} empty="kein Eintrag" /> },
              ]}
            />
          </CardBody>
        </Card>

        <Card as="div" className="h-fit">
          <CardHeader title="Wo die Angaben erscheinen" />
          <CardBody>
            <ul className="space-y-2 text-sm text-ink">
              <li className="flex gap-2">
                <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
                Kopf und Unterschrift von Verträgen und Dossiers
              </li>
              <li className="flex gap-2">
                <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
                Auskünfte und Verzeichnis unter Datenschutz
              </li>
              <li className="flex gap-2">
                <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
                Impressum und Datenschutzerklärung der Website
              </li>
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-[0.8125rem] text-slate">
              {p.vatNumber
                ? "KOVALI ist MWST-pflichtig: Rechnungen an Auftraggeber enthalten 8.1 % MWST, die Vorsteuer auf Rechnungen von Subunternehmen ist abziehbar."
                : `Ohne MWST-Nummer rechnet der Margenrechner die MWST von Subunternehmen als Kosten. Die Pflicht beginnt ab ${formatChf(VAT_THRESHOLD, { round: true })} Umsatz pro Jahr.`}
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
