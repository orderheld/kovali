import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Laptop, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, DescriptionList, LinkButton, Notice } from "@/components/admin/ui";
import { activeAdminSessions, requireAdmin } from "@/lib/admin/auth/session";
import { adminEnv } from "@/lib/admin/env";
import { formatDateTime } from "@/lib/admin/format";
import { endAllSessions } from "./actions";
import { auditCountLastDays, lastAudit } from "./audit-data";
import { EndSessionsButton } from "./end-sessions-button";
import { SettingsHeader } from "./tabs";
import { describeUserAgent } from "./user-agent";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Einstellungen" };

const FAILED_LOGIN_DAYS = 30;

export default async function SecurityPage() {
  const session = await requireAdmin();
  const [sessions, failed, lastLogin] = await Promise.all([activeAdminSessions(), auditCountLastDays("login_failed", FAILED_LOGIN_DAYS), lastAudit("login")]);
  const totp = Boolean(adminEnv.totpSecret);
  // Newest activity first; the query sorts the other way round.
  const list = [...sessions].sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

  return (
    <>
      <SettingsHeader active="sicherheit" />

      {totp ? null : (
        <Notice tone="amber" icon={ShieldAlert} title="Zwei-Faktor-Code ist nicht eingerichtet" className="mb-6">
          Mit dem Passwort allein kommt jeder in den Admin-Bereich, der es kennt. Richte den Code einer Authenticator-App ein (ADMIN_TOTP_SECRET bei Vercel).{" "}
          <Link href="/admin/einrichtung" className="font-medium underline underline-offset-2">
            Zur Einrichtung
          </Link>
        </Notice>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Anmeldung" />
          <CardBody>
            <DescriptionList
              columns={1}
              items={[
                {
                  label: "Zwei-Faktor-Code (TOTP)",
                  value: totp ? (
                    <Badge tone="green">
                      <ShieldCheck aria-hidden className="size-3.5" />
                      aktiv
                    </Badge>
                  ) : (
                    <Badge tone="amber">nicht eingerichtet</Badge>
                  ),
                },
                {
                  label: "Passwort",
                  value: "Als Hash in ADMIN_PASSWORD_HASH gespeichert, nie im Klartext. Zum Ändern auf der Einrichtungsseite einen neuen Hash erzeugen, bei Vercel ersetzen und danach alle Sitzungen beenden.",
                },
                { label: "Letzte Anmeldung", value: lastLogin ? formatDateTime(lastLogin.at) : "–" },
                {
                  label: `Fehlgeschlagene Anmeldungen (${FAILED_LOGIN_DAYS} Tage)`,
                  value: failed ? <Badge tone={failed >= 5 ? "red" : "amber"}>{failed}</Badge> : "keine",
                },
              ]}
            />
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <LinkButton href="/admin/einrichtung" size="sm" icon={KeyRound}>
                Einrichtung öffnen
              </LinkButton>
              <LinkButton href="/admin/einstellungen/audit?aktion=login_failed" size="sm" variant="ghost">
                Fehlversuche ansehen
              </LinkButton>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Schutz der Sitzungen" />
          <CardBody>
            <ul className="space-y-2 text-sm text-ink">
              <li>Eine Sitzung endet nach 12 Stunden oder nach 4 Stunden ohne Aktivität.</li>
              <li>Nach 5 Fehlversuchen von derselben Adresse ist die Anmeldung 15 Minuten gesperrt.</li>
              <li>Das Cookie ist HttpOnly, Secure und SameSite; die Datenbank kennt nur seinen Hash.</li>
              <li>Jede Anmeldung, Änderung und jeder Export steht im Audit-Log, ohne Namen.</li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title={`Aktive Sitzungen (${list.length})`}
          description="Geräte, auf denen du gerade angemeldet bist. Unbekanntes Gerät? Alle Sitzungen beenden und das Passwort ändern."
          actions={<EndSessionsButton action={endAllSessions} count={list.length} />}
        />
        <ul className="divide-y divide-line">
          {list.map((s) => {
            const device = describeUserAgent(s.userAgent);
            const Icon = /iPhone|Android/.test(device) ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-start gap-3 px-5 py-3">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-slate" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {device}
                    {s.id === session.id ? <Badge tone="blue">Diese Sitzung</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-slate">
                    Angemeldet {formatDateTime(s.createdAt)} · zuletzt aktiv {formatDateTime(s.lastSeenAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
