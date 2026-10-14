import type { Metadata } from "next";
import { FileDown } from "lucide-react";
import { Card, CardBody, CardHeader, DescriptionList, LinkButton, Notice, Table, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { todayIso } from "@/lib/admin/format";
import { kovaliParty } from "@/lib/admin/party";
import {
  AUTOMATED_DECISIONS_NOTE,
  BREACH_NOTE,
  CROSS_BORDER,
  DATA_CATEGORIES,
  DATA_SUBJECTS,
  PROCESSORS,
  PURPOSES,
  RECIPIENTS,
  RETENTION_RULES,
  SENSITIVE_DATA_NOTE,
  TOMS,
  privacyCounts,
} from "@/lib/admin/privacy";
import { PrivacyHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Verzeichnis der Bearbeitungstätigkeiten" };

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={`${number}. ${title}`} />
      <CardBody className="text-sm text-ink">{children}</CardBody>
    </Card>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-slate">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function ProcessingRecordPage() {
  await requireAdmin();
  const p = kovaliParty();
  const counts = await privacyCounts(todayIso());

  return (
    <>
      <PrivacyHeader
        active="verzeichnis"
        counts={{ aufbewahrung: counts.overdue, einwilligung: counts.noConsentOld + counts.submissionsAwaitingConsent }}
        actions={
          <LinkButton href="/admin/api/datenschutz/verzeichnis" icon={FileDown}>
            Als PDF
          </LinkButton>
        }
      />

      <Notice tone="blue" title="Freiwillig geführt (Art. 12 DSG)">
        Unternehmen mit weniger als 250 Mitarbeitenden sind von der Pflicht befreit, solange sie nicht umfangreich besonders schützenswerte Daten bearbeiten oder
        Profiling mit hohem Risiko betreiben (Art. 24 DSV). Das Verzeichnis dient als Nachweis gegenüber Betroffenen, Auftraggebern und dem EDÖB. Jährlich und bei
        jedem neuen Dienstleister prüfen; die Texte stehen in src/lib/admin/privacy.ts.
      </Notice>

      <div className="mt-6 space-y-4">
        <Section number={1} title="Verantwortlicher">
          <DescriptionList
            items={[
              { label: "Firma", value: `${p.name} (KOVALI)` },
              { label: "Rechtsform", value: p.legalForm },
              { label: "Inhaber", value: p.owner },
              { label: "Adresse", value: `${p.street}, ${p.postalCode} ${p.city}, ${p.country}` },
              { label: "Kontakt Datenschutz", value: p.email },
              { label: "UID", value: p.uid ?? "–" },
            ]}
          />
        </Section>
        <Section number={2} title="Zwecke der Bearbeitung">
          <List items={PURPOSES} />
        </Section>
        <Section number={3} title="Betroffene Personen">
          <List items={DATA_SUBJECTS} />
        </Section>
        <Section number={4} title="Kategorien von Personendaten">
          <List items={DATA_CATEGORIES} />
          <p className="mt-3 text-[0.8125rem] text-slate">{SENSITIVE_DATA_NOTE}</p>
        </Section>
        <Section number={5} title="Empfänger">
          <List items={RECIPIENTS} />
        </Section>
        <Card>
          <CardHeader title="6. Auftragsbearbeiter" />
          <Table>
            <thead>
              <tr>
                <Th>Anbieter</Th>
                <Th>Leistung</Th>
                <Th>Speicherort</Th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map((x) => (
                <tr key={x.name}>
                  <Td className="font-medium whitespace-nowrap">{x.name}</Td>
                  <Td className="min-w-64">{x.service}</Td>
                  <Td className="min-w-48">{x.location}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Section number={7} title="Bekanntgabe ins Ausland">
          <List items={[...CROSS_BORDER, ...PROCESSORS.map((x) => `${x.name}: ${x.transfer}`)]} />
        </Section>
        <Section number={8} title="Aufbewahrung und Löschung">
          <List items={RETENTION_RULES} />
        </Section>
        <Section number={9} title="Technische und organisatorische Massnahmen">
          <List items={TOMS} />
        </Section>
        <Section number={10} title="Automatisierte Entscheide und Profiling">
          <p>{AUTOMATED_DECISIONS_NOTE}</p>
        </Section>
        <Section number={11} title="Datensicherheitsverletzungen">
          <p>{BREACH_NOTE}</p>
        </Section>
      </div>
    </>
  );
}
