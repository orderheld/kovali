import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Ban, Check, Copy, Eye, FileDown, FilePlus, Pencil, Scale, Send, Undo2 } from "lucide-react";
import { ActionButton, ActionForm, TextField } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, LinkButton, Mono, Notice, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getContract, listChildren, loadContractContext, type ContractRow } from "@/lib/admin/contracts/data";
import { buildContractDocument, contractIssues } from "@/lib/admin/contracts/document";
import { getTemplate, templateName } from "@/lib/admin/contracts/templates";
import { parseId } from "@/lib/admin/forms";
import { formatDate, formatDateTime, todayIso } from "@/lib/admin/format";
import { contractStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { copyContract, endContract, markContract, signContract } from "../actions";
import { DocPreview } from "../doc-preview";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Vertrag" };

const steps = ["entwurf", "versendet", "unterzeichnet", "beendet"] as const;

function StatusSteps({ status }: { status: string }) {
  const current = steps.indexOf(status as (typeof steps)[number]);
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[0.8125rem]">
      {steps.map((s, i) => {
        const done = current >= 0 && i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden className={cn("h-px w-4", done || active ? "bg-blue" : "bg-line")} /> : null}
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1 ring-inset",
                active ? "bg-blue text-white ring-blue" : done ? "bg-blue/10 text-blue-700 ring-blue/20" : "text-slate ring-line",
              )}
            >
              {done ? <Check aria-hidden className="size-3" /> : null}
              {labelOf(contractStatuses, s)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusCard({ row, retentionMonths }: { row: ContractRow; retentionMonths: number | null }) {
  const id = row.id;
  const consent = row.template === "einwilligung";
  const signForm = (
    <ActionForm action={signContract.bind(null, id)} submitLabel={consent ? "Einwilligung erfassen" : "Als unterzeichnet erfassen"} className="space-y-3">
      <TextField
        name="date"
        type="date"
        label={consent ? "Erteilt am" : "Unterzeichnet am"}
        required
        defaultValue={todayIso()}
        max={todayIso()}
        hint={consent && retentionMonths ? `Gilt ab diesem Tag für höchstens ${retentionMonths} Monate.` : "Datum der letzten Unterschrift."}
      />
    </ActionForm>
  );
  const cancel = (
    <ActionButton
      action={markContract.bind(null, id, "storniert")}
      confirm={`Vertrag ${row.number} stornieren? Er bleibt mit seiner Nummer erhalten.`}
      variant="ghost"
      icon={<Ban aria-hidden className="size-4" />}
    >
      Stornieren
    </ActionButton>
  );
  return (
    <Card>
      <CardHeader title="Status" />
      <CardBody className="space-y-4">
        {row.status === "storniert" ? <Badge tone="red">Storniert</Badge> : <StatusSteps status={row.status} />}
        {row.status === "entwurf" ? (
          <>
            <p className="text-sm text-slate">Prüfe den Entwurf, lade das PDF herunter und sende es zur Unterschrift.</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton action={markContract.bind(null, id, "versendet")} icon={<Send aria-hidden className="size-4" />}>
                Als versendet markieren
              </ActionButton>
              {cancel}
            </div>
            <div className="border-t border-line pt-4">{signForm}</div>
          </>
        ) : null}
        {row.status === "versendet" ? (
          <>
            {signForm}
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <ActionButton action={markContract.bind(null, id, "entwurf")} variant="ghost" icon={<Undo2 aria-hidden className="size-4" />}>
                Zurück auf Entwurf
              </ActionButton>
              {cancel}
            </div>
          </>
        ) : null}
        {row.status === "unterzeichnet" ? (
          <>
            <p className="text-sm text-slate">
              {consent ? "Erteilt" : "Unterzeichnet"} am {formatDate(row.signedAt)}
              {row.validUntil ? `, gültig bis ${formatDate(row.validUntil)}` : ""}.
            </p>
            <details className="group border-t border-line pt-3">
              <summary className="cursor-pointer text-sm font-medium text-blue hover:underline">
                {consent ? "Widerruf oder Ablauf erfassen" : "Beendigung erfassen"}
              </summary>
              <ActionForm action={endContract.bind(null, id)} submitLabel={consent ? "Als widerrufen oder abgelaufen erfassen" : "Als beendet erfassen"} className="mt-3 space-y-3">
                <TextField
                  name="date"
                  type="date"
                  label={consent ? "Widerrufen oder abgelaufen am" : "Beendet per"}
                  required
                  defaultValue={row.validUntil && row.validUntil <= todayIso() ? row.validUntil : todayIso()}
                  hint={consent ? undefined : "Letzter Tag des Vertrags, z. B. nach einer Kündigung."}
                />
              </ActionForm>
            </details>
          </>
        ) : null}
        {row.status === "beendet" ? (
          <p className="text-sm text-slate">
            Unterzeichnet am {formatDate(row.signedAt)}, beendet per {formatDate(row.validUntil)}.
          </p>
        ) : null}
        {row.status === "storniert" ? (
          <div className="space-y-3">
            <p className="text-sm text-slate">Der Vertrag wurde storniert und gilt nicht.</p>
            {!row.signedAt ? (
              <ActionButton action={markContract.bind(null, id, "entwurf")} icon={<Undo2 aria-hidden className="size-4" />}>
                Wieder als Entwurf öffnen
              </ActionButton>
            ) : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default async function ContractPage({ params }: PageProps<"/admin/vertraege/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const row = await getContract(id);
  if (!row) notFound();

  const template = getTemplate(row.template);
  const [ctx, children] = await Promise.all([loadContractContext(row), row.template === "rahmenvertrag" ? listChildren(id) : Promise.resolve([])]);
  const doc = template ? buildContractDocument(row, ctx) : null;
  const issues = template && (row.status === "entwurf" || row.status === "versendet") ? contractIssues(row, ctx) : [];
  const owner = { type: "contract" as const, id };
  const label = (key: "company" | "contact" | "candidate" | "mandate", fallback: string) => template?.labels[key] ?? fallback;
  const retention = row.template === "einwilligung" ? Number((row.data as Record<string, unknown>).retentionMonths) || null : null;
  const pdfHref = `/admin/api/vertraege/${id}?format=pdf`;
  const docxHref = `/admin/api/vertraege/${id}?format=docx`;

  const details: { label: string; value: React.ReactNode; wide?: boolean }[] = [
    { label: "Vorlage", value: templateName(row.template) },
    { label: "Nummer", value: <Mono className="text-sm text-ink">{row.number}</Mono> },
  ];
  if (ctx.parent) {
    details.push({
      label: "Rahmenvertrag",
      value: (
        <Link href={`/admin/vertraege/${ctx.parent.id}`} className="text-blue hover:underline">
          {ctx.parent.number}
        </Link>
      ),
    });
  }
  if (ctx.company) {
    details.push({
      label: label("company", "Firma"),
      value: (
        <Link href={`/admin/firmen/${ctx.company.id}`} className="text-blue hover:underline">
          {ctx.company.legalName || ctx.company.name}
        </Link>
      ),
    });
  }
  if (ctx.contact) details.push({ label: label("contact", "Kontakt"), value: [ctx.contact.name, ctx.contact.role].filter(Boolean).join(", ") });
  if (ctx.candidate) {
    details.push({
      label: label("candidate", "Fachperson"),
      value: (
        <Link href={`/admin/kandidaten/${ctx.candidate.id}`} className="text-blue hover:underline">
          {ctx.candidate.firstName} {ctx.candidate.lastName}
        </Link>
      ),
    });
  }
  if (ctx.mandate) {
    details.push({
      label: label("mandate", "Mandat"),
      value: (
        <Link href={`/admin/mandate/${ctx.mandate.id}`} className="text-blue hover:underline">
          {ctx.mandate.ref} {ctx.mandate.title}
        </Link>
      ),
    });
  }
  if (template?.dates.validFrom || row.validFrom) details.push({ label: template?.dates.validFrom?.replace(/ \(optional\)$/, "") ?? "Gültig ab", value: formatDate(row.validFrom) });
  if (template?.dates.validUntil || row.validUntil) {
    details.push({ label: template?.dates.validUntil?.replace(/ \(optional\)$/, "") ?? "Gültig bis", value: row.validUntil ? formatDate(row.validUntil) : "offen" });
  }
  details.push({ label: row.template === "einwilligung" ? "Erteilt am" : "Unterzeichnet am", value: formatDate(row.signedAt) });
  details.push({ label: "Zuletzt geändert", value: formatDateTime(row.updatedAt) });
  if (row.notes) details.push({ label: "Interne Notizen", value: <span className="whitespace-pre-line">{row.notes}</span>, wide: true });

  return (
    <>
      <PageHeader
        title={row.title}
        crumbs={[{ label: "Verträge", href: "/admin/vertraege" }, { label: row.number }]}
        meta={
          <>
            <Badge tone={toneOf(contractStatuses, row.status)}>{labelOf(contractStatuses, row.status)}</Badge>
            <Badge>{templateName(row.template)}</Badge>
            <Mono>{row.number}</Mono>
          </>
        }
        actions={
          <>
            {doc ? (
              <>
                <LinkButton href={pdfHref} icon={FileDown} variant={row.status === "entwurf" ? "secondary" : "primary"}>
                  PDF
                </LinkButton>
                <LinkButton href={docxHref} icon={FileDown}>
                  Word
                </LinkButton>
              </>
            ) : null}
            {row.status === "entwurf" ? (
              <LinkButton href={`/admin/vertraege/${id}/bearbeiten`} variant="primary" icon={Pencil}>
                Bearbeiten
              </LinkButton>
            ) : (
              <ActionButton
                action={copyContract.bind(null, id)}
                size="md"
                confirm={`Vertrag ${row.number} als neuen Entwurf mit neuer Nummer kopieren?`}
                icon={<Copy aria-hidden className="size-4" />}
              >
                Als neuen Entwurf kopieren
              </ActionButton>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Notice tone="neutral" icon={Scale}>
            Vorlage, keine Rechtsberatung. Vor dem ersten Einsatz einmal von einer Anwältin oder einem Anwalt prüfen lassen.
          </Notice>
          {issues.length ? (
            <Notice tone="amber" icon={AlertTriangle} title="Vor dem Versand ergänzen">
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
              {row.status === "entwurf" ? (
                <p className="mt-2">
                  Fehlende Angaben bei Firmen und Personen ergänzen oder den{" "}
                  <Link href={`/admin/vertraege/${id}/bearbeiten`} className="font-medium underline">
                    Entwurf bearbeiten
                  </Link>
                  . Im Dokument stehen sie als «[bitte ergänzen]».
                </p>
              ) : null}
            </Notice>
          ) : null}
          <Card>
            <CardHeader
              title="Vorschau"
              description="So steht der Vertrag im PDF und im Word-Dokument."
              actions={
                doc ? (
                  <LinkButton href={`${pdfHref}&ansicht=1`} size="sm" icon={Eye} target="_blank">
                    PDF ansehen
                  </LinkButton>
                ) : null
              }
            />
            <div className="bg-mist/60 p-3 sm:p-6">
              {doc ? (
                <div className="mx-auto max-w-[48rem] rounded-sm bg-white px-5 py-7 shadow-[0_1px_3px_rgb(11_23_51/0.12)] ring-1 ring-line sm:px-12 sm:py-12">
                  <DocPreview doc={doc} />
                </div>
              ) : (
                <p className="text-sm text-slate">Die Vorlage «{row.template}» gibt es nicht mehr; der Vertrag kann nicht dargestellt werden.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <StatusCard row={row} retentionMonths={retention} />
          <Card>
            <CardHeader title="Eckdaten" />
            <CardBody>
              <DescriptionList columns={1} items={details} />
            </CardBody>
          </Card>
          {row.template === "rahmenvertrag" ? (
            <Card>
              <CardHeader
                title="Einzelaufträge"
                actions={
                  row.status !== "storniert" && row.status !== "beendet" ? (
                    <LinkButton href={`/admin/vertraege/neu?vorlage=einzelauftrag&rahmen=${id}`} size="sm" icon={FilePlus}>
                      Einzelauftrag erstellen
                    </LinkButton>
                  ) : null
                }
              />
              {children.length ? (
                <ul className="divide-y divide-line">
                  {children.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                      <Link href={`/admin/vertraege/${c.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-blue hover:underline">
                        {c.title}
                      </Link>
                      <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                      <span className="flex w-full flex-wrap gap-x-3 text-xs text-slate">
                        <Mono>{c.number}</Mono>
                        {c.validFrom ? (
                          <span>
                            {formatDate(c.validFrom)} – {c.validUntil ? formatDate(c.validUntil) : "offen"}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <CardBody>
                  <p className="text-sm text-slate">Noch keine Einzelaufträge unter diesem Rahmenvertrag.</p>
                </CardBody>
              )}
            </Card>
          ) : null}
          <DocumentsCard
            owner={owner}
            title="Unterzeichnete Fassung und Beilagen"
            defaultKind={row.template === "einwilligung" ? "einwilligung" : "vertrag"}
          />
          <ActivityFeed owner={owner} />
        </div>
      </div>
    </>
  );
}
