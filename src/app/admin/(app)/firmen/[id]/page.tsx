import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Briefcase, FileSignature, Mail, Pencil, Phone, Plus, UserRound } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { Badge, Card, CardBody, CardHeader, DescriptionList, EmptyState, LinkButton, Mono, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getCompany, listContacts } from "@/lib/admin/data/companies";
import { getDb } from "@/lib/admin/db/client";
import { contracts, mandates } from "@/lib/admin/db/schema";
import { parseId } from "@/lib/admin/forms";
import { displayNo, formatDate } from "@/lib/admin/format";
import { companyKinds, companyStatuses, contractStatuses, labelOf, mandateStatuses, salutations, toneOf } from "@/lib/admin/options";
import { ActivityFeed } from "../../_shared/activity-feed";
import { DocumentsCard } from "../../_shared/documents-card";
import { deleteContact } from "../actions";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/admin/firmen/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  return { title: id ? displayNo.company(id) : "Firma" };
}

export default async function CompanyPage({ params }: PageProps<"/admin/firmen/[id]">) {
  await requireAdmin();
  const id = parseId((await params).id);
  if (!id) notFound();
  const company = await getCompany(id);
  if (!company) notFound();

  const db = await getDb();
  const [people, companyMandates, companyContracts] = await Promise.all([
    listContacts(id),
    db
      .select({ id: mandates.id, title: mandates.title, status: mandates.status, startDate: mandates.startDate, reference: mandates.reference })
      .from(mandates)
      .where(eq(mandates.companyId, id))
      .orderBy(desc(mandates.createdAt))
      .limit(50),
    db
      .select({ id: contracts.id, number: contracts.number, title: contracts.title, status: contracts.status, validFrom: contracts.validFrom })
      .from(contracts)
      .where(eq(contracts.companyId, id))
      .orderBy(desc(contracts.createdAt))
      .limit(50),
  ]);
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
          <>
            <LinkButton href={`/admin/mandate/neu?firma=${id}`} icon={Briefcase}>
              Mandat erfassen
            </LinkButton>
            <LinkButton href={`/admin/vertraege/neu?firma=${id}`} icon={FileSignature}>
              Vertrag erstellen
            </LinkButton>
            <LinkButton href={`/admin/firmen/${id}/bearbeiten`} variant="primary" icon={Pencil}>
              Bearbeiten
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-6">
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
                  { label: "E-Mail", value: company.email ? <a className="text-blue hover:underline" href={`mailto:${company.email}`}>{company.email}</a> : "–" },
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

          <Card>
            <CardHeader
              title="Kontakte"
              actions={
                <LinkButton href={`/admin/firmen/${id}/kontakt/neu`} size="sm" icon={Plus}>
                  Kontakt hinzufügen
                </LinkButton>
              }
            />
            {people.length ? (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-blue">
                      <UserRound aria-hidden className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {[p.salutation ? labelOf(salutations, p.salutation) : null, p.firstName, p.lastName].filter(Boolean).join(" ")}
                        {p.isSignatory ? (
                          <Badge tone="blue" className="ml-2">
                            Zeichnungsberechtigt
                          </Badge>
                        ) : null}
                      </p>
                      {p.role ? <p className="text-xs text-slate">{p.role}</p> : null}
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem]">
                        {p.email ? (
                          <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-blue hover:underline">
                            <Mail aria-hidden className="size-3.5" />
                            {p.email}
                          </a>
                        ) : null}
                        {p.phone ? (
                          <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-blue hover:underline">
                            <Phone aria-hidden className="size-3.5" />
                            {p.phone}
                          </a>
                        ) : null}
                      </p>
                      {p.notes ? <p className="mt-1 text-xs whitespace-pre-line text-slate">{p.notes}</p> : null}
                    </div>
                    <span className="flex gap-1.5">
                      <LinkButton href={`/admin/firmen/${id}/kontakt/${p.id}`} size="sm" variant="ghost">
                        Bearbeiten
                      </LinkButton>
                      <ActionButton
                        action={deleteContact.bind(null, id, p.id)}
                        confirm={`Kontakt «${[p.firstName, p.lastName].filter(Boolean).join(" ")}» löschen?`}
                        variant="danger"
                      >
                        Löschen
                      </ActionButton>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={UserRound} title="Noch keine Kontakte">
                Ansprechpersonen erscheinen in Mandaten und Verträgen zur Auswahl.
              </EmptyState>
            )}
          </Card>

          <Card>
            <CardHeader title="Mandate" description="Anfragen und Ausschreibungen dieser Firma." />
            {companyMandates.length ? (
              <ul className="divide-y divide-line">
                {companyMandates.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <Link href={`/admin/mandate/${m.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-blue hover:underline">
                      {m.title}
                    </Link>
                    <Mono>{m.reference ?? displayNo.mandate(m.id)}</Mono>
                    <span className="text-xs text-slate">Start {formatDate(m.startDate)}</span>
                    <Badge tone={toneOf(mandateStatuses, m.status)}>{labelOf(mandateStatuses, m.status)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-slate">Noch keine Mandate.</p>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Verträge" />
            {companyContracts.length ? (
              <ul className="divide-y divide-line">
                {companyContracts.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <Link href={`/admin/vertraege/${c.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-blue hover:underline">
                      {c.title}
                    </Link>
                    <Mono>{c.number}</Mono>
                    <span className="text-xs text-slate">ab {formatDate(c.validFrom)}</span>
                    <Badge tone={toneOf(contractStatuses, c.status)}>{labelOf(contractStatuses, c.status)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-sm text-slate">Noch keine Verträge.</p>
              </CardBody>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <ActivityFeed owner={owner} />
          <DocumentsCard owner={owner} defaultKind="vertrag" />
        </div>
      </div>
    </>
  );
}
