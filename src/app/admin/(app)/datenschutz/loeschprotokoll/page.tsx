import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Notice, Pagination } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listHref, pageNumber, param } from "@/lib/admin/data/query";
import { formatDateTime, todayIso } from "@/lib/admin/format";
import { privacyCounts } from "@/lib/admin/privacy";
import { auditActionLabels, auditObject, isAuditAction } from "../../einstellungen/audit-labels";
import { auditEntries } from "../../einstellungen/audit-data";
import { AuditText } from "../../einstellungen/audit-text";
import { PrivacyHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Löschprotokoll" };

export default async function DeletionLogPage({ searchParams }: PageProps<"/admin/datenschutz/loeschprotokoll">) {
  await requireAdmin();
  const page = pageNumber(param((await searchParams).seite));
  const [log, counts] = await Promise.all([auditEntries({ actions: ["delete", "anonymise"], page }), privacyCounts(todayIso())]);

  return (
    <>
      <PrivacyHeader active="loeschprotokoll" counts={{ aufbewahrung: counts.overdue, einwilligung: counts.noConsentOld + counts.submissionsAwaitingConsent }} />

      <Notice tone="blue" title="Nachweis ohne Personendaten">
        Das Protokoll zeigt, wann welcher Datensatz gelöscht oder anonymisiert wurde, nur mit Nummer (z. B. K-0042), nie mit Namen. So bleibt die Löschung belegbar,
        ohne die gelöschten Daten aufzubewahren.
      </Notice>

      <Card className="mt-6">
        <CardHeader title={`Löschungen und Anonymisierungen (${log.total})`} description="Neueste zuerst." />
        {log.rows.length ? (
          <>
            <ul className="divide-y divide-line">
              {log.rows.map((r) => {
                const meta = isAuditAction(r.action) ? auditActionLabels[r.action] : { label: r.action, tone: "neutral" as const };
                return (
                  <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-36 shrink-0 text-[0.8125rem] text-slate tabular-nums">{formatDateTime(r.at)}</span>
                    <span className="w-32 shrink-0">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </span>
                    <AuditText summary={r.summary} object={r.entity ? auditObject(r.entity, r.entityId) : null} />
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} pageCount={log.pageCount} hrefFor={(p) => listHref("/admin/datenschutz/loeschprotokoll", { seite: p > 1 ? p : null })} />
          </>
        ) : (
          <EmptyState icon={ShieldCheck} title="Noch nichts gelöscht">
            Sobald du einen Kandidaten, Kontakt oder ein Dokument löschst oder anonymisierst, erscheint der Eintrag hier.
          </EmptyState>
        )}
      </Card>
    </>
  );
}
