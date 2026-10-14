import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader } from "@/components/admin/ui";
import { defaultAssignmentStatus } from "@/lib/admin/assignment-period";
import { requireAdmin } from "@/lib/admin/auth/session";
import { assignmentsOfVacancy, vacancyPrefill } from "@/lib/admin/data/assignments";
import { companyOptions, contactOptions } from "@/lib/admin/data/companies";
import { loadEarningsSettings } from "@/lib/admin/data/earnings";
import { mandateOptions } from "@/lib/admin/data/lookups";
import { param } from "@/lib/admin/data/query";
import { parseId } from "@/lib/admin/forms";
import { displayNo, todayIso } from "@/lib/admin/format";
import { parseDecimal } from "@/lib/admin/payroll";
import { createAssignment } from "../actions";
import { AssignmentForm, type AssignmentValues } from "../assignment-form";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Neuer Auftrag" };

/**
 * Prefill: ?vakanz=<id> takes title, company, contact, end client, rate, workload, period and
 * place from the vacancy; ?firma=<id> sets the company; ?satz=&einheit=&pensum=&modell=&basis=
 * come from the Rechner.
 */
export default async function NewAssignmentPage({ searchParams }: PageProps<"/admin/auftraege/neu">) {
  await requireAdmin();
  const sp = await searchParams;
  const vacancyId = parseId(param(sp.vakanz));
  const companyId = parseId(param(sp.firma));

  const [companies, contacts, vacancies, { settings }, prefill, existing] = await Promise.all([
    companyOptions(),
    contactOptions(),
    mandateOptions(),
    loadEarningsSettings(),
    vacancyId ? vacancyPrefill(vacancyId) : null,
    vacancyId ? assignmentsOfVacancy(vacancyId) : [],
  ]);

  const values: AssignmentValues = { ...(prefill ?? {}) };
  if (!prefill && companyId && companies.some((c) => c.value === companyId)) values.companyId = companyId;
  const rate = parseDecimal(param(sp.satz) ?? "");
  if (!prefill && Number.isFinite(rate) && rate > 0 && rate < 100_000) {
    values.rateAmount = rate;
    values.rateUnit = param(sp.einheit) === "tag" ? "tag" : "stunde";
  }
  const workload = Number(param(sp.pensum));
  if (!prefill && Number.isInteger(workload) && workload >= 1 && workload <= 100) values.workload = workload;
  const model = param(sp.modell);
  if (model === "lohn" || model === "rechnung") values.billing = model;
  const basis = param(sp.basis);
  if (basis === "kostensatz" || basis === "brutto") values.rateBasis = basis;
  // A follow-up from a Zusage often starts later: then it is planned, not yet running.
  values.status = defaultAssignmentStatus(values.startDate, todayIso());

  return (
    <>
      <PageHeader
        title="Neuer Auftrag"
        description={prefill ? `Aus Vakanz ${displayNo.mandate(prefill.mandateId)} übernommen. Prüfe vor allem Satz, Abrechnung und Zeitraum.` : "Ein Einsatz mit Satz, Abrechnung und Zeitraum."}
        crumbs={[{ label: "Aufträge", href: "/admin/auftraege" }, { label: "Neu" }]}
      />
      <div className="max-w-4xl space-y-6">
        {vacancyId && !prefill ? (
          <Notice tone="amber" title="Vakanz nicht gefunden">
            Die Vakanz {displayNo.mandate(vacancyId)} gibt es nicht mehr. Du kannst den Auftrag trotzdem erfassen.
          </Notice>
        ) : null}
        {existing.length ? (
          <Notice tone="amber" title="Zu dieser Vakanz gibt es schon einen Auftrag">
            {existing.map((a, i) => (
              <span key={a.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/admin/auftraege/${a.id}`} className="font-medium underline underline-offset-2">
                  {displayNo.assignment(a.id)} {a.title}
                </Link>
              </span>
            ))}
            . Erfasse nur dann einen weiteren, wenn es ein zweiter Einsatz ist.
          </Notice>
        ) : null}
        <AssignmentForm
          action={createAssignment}
          values={values}
          companies={companies}
          contacts={contacts}
          vacancies={vacancies}
          settings={settings}
          cancelHref={prefill ? `/admin/vakanzen/${prefill.mandateId}` : values.companyId ? `/admin/firmen/${values.companyId}` : "/admin/auftraege"}
          submitLabel="Auftrag erfassen"
        />
      </div>
    </>
  );
}
