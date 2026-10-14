import type { Metadata } from "next";
import { History } from "lucide-react";
import { Badge, buttonClass, Card, CardHeader, EmptyState, LinkButton, Mono, Pagination } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { listHref, pageNumber, param } from "@/lib/admin/data/query";
import { formatDateTime } from "@/lib/admin/format";
import { auditEntries } from "../audit-data";
import { auditActionMeta, auditActionOptions, auditObject, isAuditAction } from "../audit-labels";
import { AuditText } from "../audit-text";
import { SettingsHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Protokoll" };

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/einstellungen/audit">) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = param(sp.aktion);
  const action = isAuditAction(raw) ? raw : undefined;
  const page = pageNumber(param(sp.seite));
  const log = await auditEntries({ actions: action ? [action] : undefined, page });

  return (
    <>
      <SettingsHeader active="audit" />

      <Card>
        <CardHeader
          title={`Protokoll (${log.total})`}
          description="Jede Anmeldung, Änderung und jeder Dokumentabruf. Nur Nummern, keine Namen; die IP-Adresse nur als Hash."
          actions={
            <form action="/admin/einstellungen/audit" className="flex flex-wrap items-center gap-2">
              <label htmlFor="audit-aktion" className="sr-only">
                Aktion
              </label>
              <select
                id="audit-aktion"
                name="aktion"
                defaultValue={action ?? ""}
                className="h-9 rounded-md border border-line bg-white px-3 text-sm text-ink focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none"
              >
                <option value="">Alle Aktionen</option>
                {auditActionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button type="submit" className={buttonClass("secondary", "sm", "h-9")}>
                Filtern
              </button>
              {action ? (
                <LinkButton href="/admin/einstellungen/audit" size="sm" variant="ghost" className="h-9">
                  Zurücksetzen
                </LinkButton>
              ) : null}
            </form>
          }
        />
        {log.rows.length ? (
          <>
            <ul className="divide-y divide-line">
              {log.rows.map((r) => {
                const meta = auditActionMeta(r.action);
                return (
                  <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <span className="w-36 shrink-0 text-[0.8125rem] text-slate tabular-nums">{formatDateTime(r.at)}</span>
                    <span className="w-48 shrink-0">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </span>
                    <AuditText summary={r.summary} object={r.entity ? auditObject(r.entity, r.entityId) : null} />
                    {r.ipHash ? (
                      <Mono className="shrink-0">
                        <span className="sr-only">IP-Hash </span>
                        {r.ipHash.slice(0, 8)}
                      </Mono>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <Pagination page={page} pageCount={log.pageCount} hrefFor={(p) => listHref("/admin/einstellungen/audit", { aktion: action, seite: p })} />
          </>
        ) : (
          <EmptyState icon={History} title={action ? "Keine Einträge für diese Aktion" : "Noch keine Einträge"} />
        )}
      </Card>
    </>
  );
}
