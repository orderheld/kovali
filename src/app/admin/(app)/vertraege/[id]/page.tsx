import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarClock, FilePlus, FileWarning, Flag, Mail, Pencil, Phone, Send, Undo2 } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { ActionButton, ActionForm, TextField } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, LinkButton, Mono, Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { countContractDocuments, getContractDetail, listChildContracts, type ContractDetail } from "@/lib/admin/contracts/data";
import { contractExpiry, expiryLabel, expiryTone } from "@/lib/admin/contracts/expiry";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate, formatDateTime, fullName, todayIso } from "@/lib/admin/format";
import { assignmentStatuses, contractKinds, contractStatuses, labelOf, mandateStatuses, toneOf } from "@/lib/admin/options";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { setContractStatus, signContract } from "../actions";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vertrag" };

const linkClass = "text-blue hover:underline";

function SignForm({ id }: { id: number }) {
  const today = todayIso();
  return (
    <ActionForm action={signContract.bind(null, id)} submitLabel="Als unterzeichnet erfassen" className="space-y-3">
      <TextField name="signedAt" type="date" label="Unterzeichnet am" required defaultValue={today} max={today} hint="Datum der letzten Unterschrift." />
    </ActionForm>
  );
}

function StatusCard({ contract, files }: { contract: ContractDetail; files: number }) {
  const { id, status } = contract;
  const cancel = (
    <ActionButton
      action={setContractStatus.bind(null, id, "storniert")}
      confirm={`Vertrag ${contract.number} als hinfällig markieren? Er bleibt mit Nummer und Dateien abgelegt.`}
      variant="ghost"
      icon={<Ban aria-hidden className="size-4" />}
    >
      Hinfällig
    </ActionButton>
  );
  return (
    <Card>
      <CardHeader title="Status" actions={<Badge tone={toneOf(contractStatuses, status)}>{labelOf(contractStatuses, status)}</Badge>} />
      <CardBody className="space-y-4">
        {status === "entwurf" ? (
          <>
            <p className="text-sm text-slate">Du prüfst den Vertrag noch. Hast du ihn unterschrieben verschickt, markiere ihn als «Zur Unterschrift».</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={setContractStatus.bind(null, id, "versendet")} icon={<Send aria-hidden className="size-4" />}>
                Zur Unterschrift
              </ActionButton>
              {cancel}
            </div>
            <div className="border-t border-line pt-4">
              <SignForm id={id} />
            </div>
          </>
        ) : null}
        {status === "versendet" ? (
          <>
            <p className="text-sm text-slate">Der Vertrag wartet auf die letzte Unterschrift. Sobald er zurück ist, hier erfassen und die Datei unten ablegen.</p>
            <SignForm id={id} />
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <ActionButton action={setContractStatus.bind(null, id, "entwurf")} variant="ghost" icon={<Undo2 aria-hidden className="size-4" />}>
                Zurück in Prüfung
              </ActionButton>
              {cancel}
            </div>
          </>
        ) : null}
        {status === "unterzeichnet" ? (
          <>
            <p className="text-sm text-slate">
              {contract.signedAt ? `Unterzeichnet am ${formatDate(contract.signedAt)}` : "Unterzeichnet"}
              {contract.validUntil ? `, gültig bis ${formatDate(contract.validUntil)}.` : ", unbefristet."}
            </p>
            {!files ? (
              <Notice tone="amber" icon={FileWarning}>
                Die unterzeichnete Fassung fehlt noch. Lade sie unter «Dateien» hoch.
              </Notice>
            ) : null}
            <ActionButton
              action={setContractStatus.bind(null, id, "beendet")}
              confirm={`Vertrag ${contract.number} als beendet markieren?`}
              icon={<Flag aria-hidden className="size-4" />}
            >
              Als beendet markieren
            </ActionButton>
          </>
        ) : null}
        {status === "beendet" ? (
          <p className="text-sm text-slate">
            Der Vertrag ist beendet{contract.validUntil ? ` (gültig bis ${formatDate(contract.validUntil)})` : ""}. Eine Verlängerung legst du als neuen Vertrag ab.
          </p>
        ) : null}
        {status === "storniert" ? (
          <>
            <p className="text-sm text-slate">Der Vertrag ist hinfällig und gilt nicht.</p>
            <ActionButton action={setContractStatus.bind(null, id, "entwurf")} icon={<Undo2 aria-hidden className="size-4" />}>
              Wieder in Prüfung
            </ActionButton>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default async function ContractPage({ params }: PageProps<"/admin/vertraege/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const contract = await getContractDetail(id);
  if (!contract) notFound();
  const [children, files] = await Promise.all([listChildContracts(id), countContractDocuments(id)]);
  const today = todayIso();
  const expiry = contractExpiry(contract, today);
  const isFramework = contract.template === "rahmenvertrag";
  const owner = { type: "contract" as const, id };
  // Contracts generated from the former templates kept their entries in `data`; the text itself
  // was rendered on request and is not stored. Shown read-only until the signed file is filed.
  const legacyData = Object.entries(contract.data ?? {}).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)] as const);

  const details: { label: string; value: React.ReactNode; wide?: boolean }[] = [
    { label: "Art", value: labelOf(contractKinds, contract.template) },
    {
      label: "Nummer",
      value: (
        <span className="inline-flex items-center gap-2">
          <Mono className="text-sm text-ink">{contract.number}</Mono>
          <CopyButton value={contract.number} label="Vertragsnummer kopieren" iconOnly variant="ghost" className="h-6 w-6" />
        </span>
      ),
    },
    {
      label: "Firma",
      value: contract.company ? (
        <>
          <Link href={`/admin/firmen/${contract.company.id}`} className={linkClass}>
            {contract.company.name}
          </Link>
          {contract.company.legalName && contract.company.legalName !== contract.company.name ? (
            <span className="block text-xs text-slate">{contract.company.legalName}</span>
          ) : null}
        </>
      ) : (
        "–"
      ),
    },
    {
      label: "Kontakt",
      value: contract.contact ? (
        <>
          {fullName(contract.contact)}
          {contract.contact.role ? <span className="text-slate">, {contract.contact.role}</span> : null}
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-[0.8125rem]">
            {contract.contact.email ? (
              <a href={`mailto:${contract.contact.email}`} className={`inline-flex items-center gap-1 ${linkClass}`}>
                <Mail aria-hidden className="size-3.5" />
                {contract.contact.email}
              </a>
            ) : null}
            {contract.contact.phone ? (
              <a href={`tel:${contract.contact.phone.replace(/\s/g, "")}`} className={`inline-flex items-center gap-1 ${linkClass}`}>
                <Phone aria-hidden className="size-3.5" />
                {contract.contact.phone}
              </a>
            ) : null}
          </span>
        </>
      ) : (
        "–"
      ),
    },
    {
      label: "Auftrag",
      value: contract.assignment ? (
        <>
          <Link href={`/admin/auftraege/${contract.assignment.id}`} className={linkClass}>
            {displayNo.assignment(contract.assignment.id)} {contract.assignment.title}
          </Link>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate">
            <Badge tone={toneOf(assignmentStatuses, contract.assignment.status)}>{labelOf(assignmentStatuses, contract.assignment.status)}</Badge>
            {contract.assignment.endClient ? `Endkunde ${contract.assignment.endClient}` : null}
          </span>
        </>
      ) : (
        "–"
      ),
    },
  ];
  if (!isFramework || contract.parent) {
    details.push({
      label: "Rahmenvertrag",
      value: contract.parent ? (
        <Link href={`/admin/vertraege/${contract.parent.id}`} className={linkClass}>
          {contract.parent.number} {contract.parent.title}
        </Link>
      ) : (
        "–"
      ),
    });
  }
  if (contract.mandate) {
    details.push({
      label: "Vakanz",
      value: (
        <>
          <Link href={`/admin/vakanzen/${contract.mandate.id}`} className={linkClass}>
            {displayNo.mandate(contract.mandate.id)} {contract.mandate.title}
          </Link>{" "}
          <Badge tone={toneOf(mandateStatuses, contract.mandate.status)}>{labelOf(mandateStatuses, contract.mandate.status)}</Badge>
        </>
      ),
    });
  }
  details.push(
    { label: "Gültig ab", value: formatDate(contract.validFrom) },
    {
      label: "Gültig bis",
      value: (
        <>
          {contract.validUntil ? formatDate(contract.validUntil) : "unbefristet"}
          {expiry ? (
            <Badge tone={expiryTone(expiry)} className="ml-2">
              {expiryLabel(expiry)}
            </Badge>
          ) : null}
        </>
      ),
    },
    { label: "Unterzeichnet am", value: formatDate(contract.signedAt) },
    { label: "Kündigungsfrist", value: contract.noticePeriod ?? "–" },
    { label: "Notizen", value: contract.notes ? <span className="whitespace-pre-line">{contract.notes}</span> : "–", wide: true },
  );

  return (
    <>
      <PageHeader
        title={contract.title}
        crumbs={[{ label: "Verträge", href: "/admin/vertraege" }, { label: contract.number }]}
        meta={
          <>
            <Badge tone={toneOf(contractStatuses, contract.status)}>{labelOf(contractStatuses, contract.status)}</Badge>
            <Badge>{labelOf(contractKinds, contract.template)}</Badge>
            <Mono>{contract.number}</Mono>
            {expiry ? <Badge tone={expiryTone(expiry)}>{expiryLabel(expiry)}</Badge> : null}
          </>
        }
        actions={
          <LinkButton href={`/admin/vertraege/${id}/bearbeiten`} variant="primary" icon={Pencil}>
            Bearbeiten
          </LinkButton>
        }
      />

      {expiry?.state === "ending" ? (
        <Notice tone={expiryTone(expiry)} icon={CalendarClock} className="mb-6">
          Der Vertrag {expiryLabel(expiry)} ({formatDate(contract.validUntil)}).
          {contract.noticePeriod ? ` Kündigungsfrist: ${contract.noticePeriod}.` : " Prüfe, ob er verlängert wird."}
        </Notice>
      ) : expiry?.state === "expired" ? (
        <Notice tone="neutral" icon={CalendarClock} className="mb-6">
          Die Laufzeit ist am {formatDate(contract.validUntil)} abgelaufen. Wenn der Vertrag nicht verlängert wurde, markiere ihn als beendet.
        </Notice>
      ) : null}
      {legacyData.length && !files ? (
        <Notice tone="amber" icon={FileWarning} title="Mit der früheren Vorlage erstellt" className="mb-6">
          <p>Die Datei ist nicht abgelegt. Lade die unterschriebene Fassung unter «Dateien» hoch.</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium select-none">Angaben aus der Vorlage ({legacyData.length})</summary>
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              {legacyData.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-amber-900/80">{key}</dt>
                  <dd className="break-words whitespace-pre-line">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Eckdaten" description={`Zuletzt geändert ${formatDateTime(contract.updatedAt)}`} />
            <CardBody>
              <DescriptionList items={details} />
            </CardBody>
          </Card>
          <DocumentsCard
            owner={owner}
            title="Dateien"
            defaultKind="vertrag"
            description="Unterzeichnete Fassung, Entwürfe und Beilagen. Verschlüsselt gespeichert, jeder Abruf wird protokolliert."
          />
          {isFramework || children.length ? (
            <Card>
              <CardHeader
                title="Einzelaufträge unter diesem Vertrag"
                actions={
                  isFramework && contract.status !== "storniert" ? (
                    <LinkButton href={`/admin/vertraege/neu?rahmen=${id}`} size="sm" icon={FilePlus}>
                      Einzelauftrag ablegen
                    </LinkButton>
                  ) : null
                }
              />
              {children.length ? (
                <ul className="divide-y divide-line">
                  {children.map((c) => {
                    const childExpiry = contractExpiry(c, today);
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                        <Link href={`/admin/vertraege/${c.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-blue hover:underline">
                          {c.title}
                        </Link>
                        {childExpiry ? <Badge tone={expiryTone(childExpiry)}>{expiryLabel(childExpiry)}</Badge> : null}
                        <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                        <span className="flex w-full flex-wrap gap-x-3 text-xs text-slate">
                          <Mono>{c.number}</Mono>
                          <span>{labelOf(contractKinds, c.kind)}</span>
                          {c.validFrom || c.validUntil ? (
                            <span>
                              {formatDate(c.validFrom)} – {c.validUntil ? formatDate(c.validUntil) : "offen"}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <CardBody>
                  <p className="text-sm text-slate">Noch keine Einzelaufträge unter diesem Rahmenvertrag abgelegt.</p>
                </CardBody>
              )}
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <StatusCard contract={contract} files={files} />
          <ActivityFeed owner={owner} />
        </div>
      </div>
    </>
  );
}
