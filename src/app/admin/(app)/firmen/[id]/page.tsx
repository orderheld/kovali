import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Briefcase, FileSignature, Mail, Pencil, Phone, Pin, Plus, Telescope, TextQuote, UserRound } from "lucide-react";
import { CopyButton } from "@/components/admin/copy-button";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, LinkButton, Mono, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { contractExpiry, expiryLabel, expiryTone } from "@/lib/admin/contracts/expiry";
import { companyRecords, getCompany, listContacts } from "@/lib/admin/data/companies";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate, todayIso } from "@/lib/admin/format";
import { assignmentStatuses, companyKinds, companyStatuses, contractKinds, contractStatuses, labelOf, mandateStatuses, salutations, toneOf } from "@/lib/admin/options";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { deleteContact } from "../actions";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/firmen/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.company(id) : "Firma" };
}

/** A card listing linked records, with a button to add one prefilled with this company. */
function RecordsCard({
  title,
  count,
  addHref,
  addLabel,
  empty,
  children,
}: {
  title: string;
  count: number;
  addHref: string;
  addLabel: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={count ? `${title} (${count})` : title}
        actions={
          <LinkButton href={addHref} size="sm" icon={Plus}>
            {addLabel}
          </LinkButton>
        }
      />
      {count ? (
        <ul className="divide-y divide-line">{children}</ul>
      ) : (
        <CardBody>
          <p className="text-sm text-slate">{empty}</p>
        </CardBody>
      )}
    </Card>
  );
}

function RecordRow({ href, title, icon: Icon, meta, badges }: { href: string; title: string; icon: LucideIcon; meta: React.ReactNode; badges: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 px-5 py-3 text-sm">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-slate" />
      <span className="min-w-0 flex-1 basis-56">
        <Link href={href} className="font-medium text-ink hover:text-blue hover:underline">
          {title}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate">{meta}</span>
      </span>
      <span className="flex flex-wrap items-center gap-1.5">{badges}</span>
    </li>
  );
}

function period(from: string | null, until: string | null): string | null {
  if (!from && !until) return null;
  return `${from ? formatDate(from) : "offen"} – ${until ? formatDate(until) : "offen"}`;
}

export default async function CompanyPage({ params }: PageProps<"/admin/firmen/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const company = await getCompany(id);
  if (!company) notFound();

  const [people, records] = await Promise.all([listContacts(id), companyRecords(id)]);
  const today = todayIso();
  const owner = { type: "company" as const, id };
  const address = [company.street, [company.postalCode, company.city].filter(Boolean).join(" "), company.country !== "Schweiz" ? company.country : null]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={company.name}
        crumbs={[{ label: "Firmen", href: "/admin/firmen" }, { label: displayNo.company(id) }]}
        meta={
          <>
            <Badge tone={toneOf(companyKinds, company.kind)}>{labelOf(companyKinds, company.kind)}</Badge>
            <Badge tone={toneOf(companyStatuses, company.status)}>{labelOf(companyStatuses, company.status)}</Badge>
            <Mono>{displayNo.company(id)}</Mono>
          </>
        }
        actions={
          <LinkButton href={`/admin/firmen/${id}/bearbeiten`} variant="primary" icon={Pencil}>
            Bearbeiten
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Stammdaten" />
            <CardBody>
              <DescriptionList
                columns={3}
                items={[
                  { label: "Rechtlicher Name", value: company.legalName ?? "–" },
                  { label: "Rechtsform", value: company.legalForm ?? "–" },
                  { label: "UID", value: company.uid ?? "–" },
                  { label: "Adresse", value: address || "–" },
                  {
                    label: "E-Mail",
                    value: company.email ? (
                      <a className="text-blue hover:underline" href={`mailto:${company.email}`}>
                        {company.email}
                      </a>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Telefon", value: company.phone ?? "–" },
                  {
                    label: "Website",
                    value: company.website ? (
                      <a className="text-blue hover:underline" href={company.website} target="_blank" rel="noopener noreferrer">
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "–"
                    ),
                  },
                  { label: "Branche", value: company.industry ?? "–" },
                  { label: "Notizen", value: company.notes ? <span className="whitespace-pre-line">{company.notes}</span> : "–", wide: true },
                ]}
              />
            </CardBody>
          </Card>

          <RecordsCard
            title="Aufträge"
            count={records.assignments.length}
            addHref={`/admin/auftraege/neu?firma=${id}`}
            addLabel="Auftrag erfassen"
            empty="Noch keine Aufträge über diese Firma."
          >
            {records.assignments.map((a) => (
              <RecordRow
                key={a.id}
                href={`/admin/auftraege/${a.id}`}
                title={a.title}
                icon={Briefcase}
                meta={
                  <>
                    <Mono>{displayNo.assignment(a.id)}</Mono>
                    {a.endClient ? <span>Endkunde {a.endClient}</span> : null}
                    {period(a.startDate, a.endDate) ? <span>{period(a.startDate, a.endDate)}</span> : null}
                  </>
                }
                badges={<Badge tone={toneOf(assignmentStatuses, a.status)}>{labelOf(assignmentStatuses, a.status)}</Badge>}
              />
            ))}
          </RecordsCard>

          <RecordsCard
            title="Vakanzen"
            count={records.vacancies.length}
            addHref={`/admin/vakanzen/neu?firma=${id}`}
            addLabel="Vakanz erfassen"
            empty="Noch keine Vakanzen von dieser Firma."
          >
            {records.vacancies.map((m) => (
              <RecordRow
                key={m.id}
                href={`/admin/vakanzen/${m.id}`}
                title={m.title}
                icon={Telescope}
                meta={
                  <>
                    <Mono>{m.reference ?? displayNo.mandate(m.id)}</Mono>
                    {m.endClient ? <span>Endkunde {m.endClient}</span> : null}
                    {m.appliedAt ? <span>beworben am {formatDate(m.appliedAt)}</span> : null}
                    {m.nextStep ? (
                      <span>
                        Nächster Schritt: {m.nextStep}
                        {m.nextStepAt ? ` (${formatDate(m.nextStepAt)})` : ""}
                      </span>
                    ) : null}
                  </>
                }
                badges={<Badge tone={toneOf(mandateStatuses, m.status)}>{labelOf(mandateStatuses, m.status)}</Badge>}
              />
            ))}
          </RecordsCard>

          <RecordsCard
            title="Verträge"
            count={records.contracts.length}
            addHref={`/admin/vertraege/neu?firma=${id}`}
            addLabel="Vertrag ablegen"
            empty="Noch keine Verträge mit dieser Firma abgelegt."
          >
            {records.contracts.map((c) => {
              const expiry = contractExpiry(c, today);
              return (
                <RecordRow
                  key={c.id}
                  href={`/admin/vertraege/${c.id}`}
                  title={c.title}
                  icon={FileSignature}
                  meta={
                    <>
                      <Mono>{c.number}</Mono>
                      <span>{labelOf(contractKinds, c.kind)}</span>
                      {period(c.validFrom, c.validUntil) ? <span>{period(c.validFrom, c.validUntil)}</span> : null}
                    </>
                  }
                  badges={
                    <>
                      {expiry ? <Badge tone={expiryTone(expiry)}>{expiryLabel(expiry)}</Badge> : null}
                      <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                    </>
                  }
                />
              );
            })}
          </RecordsCard>

          <RecordsCard
            title="Textbausteine"
            count={records.snippets.length}
            addHref={`/admin/texte/neu?firma=${id}`}
            addLabel="Textbaustein"
            empty="Noch keine Texte für diese Firma, z. B. dein Kurzprofil für Bewerbungen über ihr Portal."
          >
            {records.snippets.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <TextQuote aria-hidden className="mt-0.5 size-4 shrink-0 text-slate" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/texte/${t.id}`} className="font-medium text-ink hover:text-blue hover:underline">
                      {t.title}
                    </Link>
                    {t.pinned ? (
                      <span title="Angeheftet" className="text-blue">
                        <Pin aria-hidden className="size-3.5" />
                        <span className="sr-only">Angeheftet</span>
                      </span>
                    ) : null}
                    {t.category ? <Badge>{t.category}</Badge> : null}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[0.8125rem] whitespace-pre-line text-slate">{t.body}</p>
                </div>
                <CopyButton value={t.body} label={`«${t.title}» kopieren`} iconOnly />
              </li>
            ))}
          </RecordsCard>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Kontakte"
              actions={
                <LinkButton href={`/admin/firmen/${id}/kontakt/neu`} size="sm" icon={Plus}>
                  Kontakt
                </LinkButton>
              }
            />
            {people.length ? (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-blue">
                      <UserRound aria-hidden className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {[p.salutation ? labelOf(salutations, p.salutation) : null, p.firstName, p.lastName].filter(Boolean).join(" ")}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-xs text-slate">
                        {p.role ? <span>{p.role}</span> : null}
                        {p.isSignatory ? <Badge tone="blue">Zeichnungsberechtigt</Badge> : null}
                      </p>
                      <p className="mt-1 flex flex-col gap-0.5 text-[0.8125rem]">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="inline-flex min-w-0 items-center gap-1 text-blue hover:underline">
                            <Mail aria-hidden className="size-3.5 shrink-0" />
                            <span className="truncate">{p.email}</span>
                          </a>
                        ) : null}
                        {p.phone ? (
                          <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-blue hover:underline">
                            <Phone aria-hidden className="size-3.5 shrink-0" />
                            {p.phone}
                          </a>
                        ) : null}
                      </p>
                      {p.notes ? <p className="mt-1 text-xs whitespace-pre-line text-slate">{p.notes}</p> : null}
                      <span className="mt-2 flex gap-1.5">
                        <LinkButton href={`/admin/firmen/${id}/kontakt/${p.id}`} size="sm" variant="ghost">
                          Bearbeiten
                        </LinkButton>
                        <ActionButton
                          action={deleteContact.bind(null, id, p.id)}
                          confirm={`Kontakt «${[p.firstName, p.lastName].filter(Boolean).join(" ")}» löschen?`}
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                        >
                          Löschen
                        </ActionButton>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-slate">Noch keine Ansprechpersonen. Erfasse z. B. deine Recruiterin oder deinen Account Manager; sie stehen dann bei Vakanzen, Aufträgen und Verträgen zur Auswahl.</p>
              </CardBody>
            )}
          </Card>
          <ActivityFeed owner={owner} />
          <DocumentsCard owner={owner} defaultKind="korrespondenz" description="Unterlagen der Firma, die zu keinem Vertrag oder Auftrag gehören. Verschlüsselt gespeichert." />
        </div>
      </div>
    </>
  );
}
