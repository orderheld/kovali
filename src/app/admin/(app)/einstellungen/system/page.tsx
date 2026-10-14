import type { Metadata } from "next";
import { Archive, CheckCircle2, CircleAlert, Database, GitCommitHorizontal } from "lucide-react";
import { count, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { Badge, Card, CardBody, CardHeader, DescriptionList, Mono, Notice, Table, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { migrations } from "@/lib/admin/db/migrations";
import {
  activities,
  assignments,
  auditLog,
  companies,
  contacts,
  contracts,
  documents,
  loginAttempts,
  mandates,
  sessions,
  settings,
  snippets,
} from "@/lib/admin/db/schema";
import { adminConfigStatus } from "@/lib/admin/env";
import { formatDateTime } from "@/lib/admin/format";
import { SettingsHeader } from "../tabs";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "System" };

const tables: { label: string; name: string; table: PgTable }[] = [
  { label: "Aufträge", name: "assignments", table: assignments },
  { label: "Vakanzen", name: "mandates", table: mandates },
  { label: "Verträge", name: "contracts", table: contracts },
  { label: "Textbausteine", name: "snippets", table: snippets },
  { label: "Firmen", name: "companies", table: companies },
  { label: "Kontakte", name: "contacts", table: contacts },
  { label: "Dokumente", name: "documents", table: documents },
  { label: "Verlauf", name: "activities", table: activities },
  { label: "Protokoll", name: "audit_log", table: auditLog },
  { label: "Admin-Sitzungen", name: "sessions", table: sessions },
  { label: "Anmeldeversuche", name: "login_attempts", table: loginAttempts },
  { label: "Einstellungen", name: "settings", table: settings },
];

/**
 * Data of the former candidate module. Migration 0004 keeps those tables when they held a
 * candidate; nothing reads or writes them any more. Null when they are gone.
 */
async function dormantCandidates(db: Awaited<ReturnType<typeof getDb>>): Promise<number | null> {
  const exists = await db.execute<{ present: boolean }>(sql`select to_regclass('candidates') is not null as present`);
  if (!exists.rows[0]?.present) return null;
  const rows = await db.execute<{ n: string }>(sql`select count(*) as n from candidates`);
  return Number(rows.rows[0]?.n ?? 0);
}

async function systemInfo() {
  const db = await getDb();
  const [applied, counts, version, size, stored, dormant] = await Promise.all([
    db.execute<{ id: string; applied_at: Date }>(sql`select id, applied_at from admin_migrations order by id`),
    Promise.all(tables.map(async (t) => ({ ...t, rows: (await db.select({ n: count() }).from(t.table))[0]?.n ?? 0 }))),
    db.execute<{ server_version: string }>(sql`show server_version`),
    db.execute<{ size: string }>(sql`select pg_size_pretty(pg_database_size(current_database())) as size`),
    db.select({ key: settings.key, updatedAt: settings.updatedAt }).from(settings).orderBy(settings.key),
    dormantCandidates(db),
  ]);
  return {
    applied: applied.rows,
    counts,
    postgres: version.rows[0]?.server_version.split(" ")[0] ?? "–",
    size: size.rows[0]?.size ?? "–",
    settings: stored,
    dormant,
  };
}

const settingLabels: Record<string, string> = {
  rechner_defaults: "Werte des früheren Lohnrechners (nicht mehr verwendet)",
  einkommen: "Ansätze für Einkommen und Kosten",
  admin_totp_last_step: "Zuletzt verwendeter Zwei-Faktor-Code (Schutz vor Wiederverwendung)",
};

export default async function SystemPage() {
  await requireAdmin();
  const info = await systemInfo();
  const appliedIds = new Set(info.applied.map((m) => m.id));
  const pending = migrations.filter((m) => !appliedIds.has(m.id));
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  const environment = process.env.VERCEL_ENV ?? "lokal";
  const config = adminConfigStatus();

  return (
    <>
      <SettingsHeader active="system" />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Version" />
          <CardBody>
            <DescriptionList
              items={[
                {
                  label: "Commit",
                  value: commit ? (
                    <span className="inline-flex items-center gap-1.5">
                      <GitCommitHorizontal aria-hidden className="size-4 text-slate" />
                      <Mono className="text-sm text-ink">{commit.slice(0, 7)}</Mono>
                    </span>
                  ) : (
                    "nicht bekannt (nur bei Vercel gesetzt)"
                  ),
                },
                { label: "Umgebung", value: environment === "production" ? "Produktion" : environment === "preview" ? "Vorschau" : environment },
                { label: "Node.js", value: process.version },
                { label: "Region", value: process.env.VERCEL_REGION ?? "–" },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Konfiguration" description="Nur ob ein Wert gesetzt ist, nie der Wert selbst." />
          <ul className="divide-y divide-line">
            {config.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block text-ink">{c.label}</span>
                  <Mono>{c.name}</Mono>
                </span>
                {c.ok ? (
                  <Badge tone="green">
                    <CheckCircle2 aria-hidden className="size-3.5" />
                    gesetzt
                  </Badge>
                ) : (
                  <Badge tone={c.required ? "red" : "amber"}>
                    <CircleAlert aria-hidden className="size-3.5" />
                    fehlt
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {info.dormant !== null ? (
        <Notice tone="neutral" icon={Archive} title="Alte Daten des Kandidatenmoduls" className="mt-6">
          Die Datenbank enthält noch {info.dormant === 1 ? "1 Kandidatenprofil" : `${info.dormant} Kandidatenprofile`} mit ihren Tabellen aus der früheren
          Version. Der Admin-Bereich verwendet sie nicht mehr. Sie bleiben unverändert, bis du entscheidest, was damit geschieht.
        </Notice>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Datenbank"
            description={`Postgres ${info.postgres} · ${info.size}`}
            actions={<Database aria-hidden className="size-4 text-blue" />}
          />
          <Table>
            <thead>
              <tr>
                <Th>Tabelle</Th>
                <Th align="right">Einträge</Th>
              </tr>
            </thead>
            <tbody>
              {info.counts.map((t) => (
                <tr key={t.name}>
                  <Td>
                    {t.label} <Mono className="ml-1">{t.name}</Mono>
                  </Td>
                  <Td align="right">{t.rows.toLocaleString("de-CH")}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title={`Migrationen (${info.applied.length} von ${migrations.length})`}
              description="Laufen automatisch beim ersten Datenbankzugriff nach einem Deployment."
            />
            <ul className="divide-y divide-line">
              {info.applied.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
                  <Mono className="text-[0.8125rem] text-ink">{m.id}</Mono>
                  <span className="text-[0.8125rem] text-slate tabular-nums">{formatDateTime(new Date(m.applied_at))}</span>
                </li>
              ))}
              {pending.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
                  <Mono className="text-[0.8125rem] text-ink">{m.id}</Mono>
                  <Badge tone="amber">ausstehend</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Gespeicherte Einstellungen" />
            {info.settings.length ? (
              <ul className="divide-y divide-line">
                {info.settings.map((s) => (
                  <li key={s.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
                    <span>
                      <span className="block text-ink">{settingLabels[s.key] ?? s.key}</span>
                      <Mono>{s.key}</Mono>
                    </span>
                    <span className="text-[0.8125rem] text-slate tabular-nums">{formatDateTime(s.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-slate">Keine. Alle Rechner verwenden die amtlichen Standardwerte.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
