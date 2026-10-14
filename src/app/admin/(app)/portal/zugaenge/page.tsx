import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, EmptyState, Mono, Table, Td, Th } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { displayNo, formatDateTime } from "@/lib/admin/format";
import { accountStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { invitableCandidates } from "@/lib/portal/accounts";
import { listAccounts } from "@/lib/portal/admin";
import { portalEmailMode } from "@/lib/portal/email";
import { AccountActions, linkInfo } from "../account-parts";
import { InviteForm, InviteLinkHost } from "../client";
import { PortalHeader } from "../header";

/** Admin pages read the session and the database per request and may block. */
export const instant = false;

export const metadata: Metadata = { title: "Portal-Zugänge" };

export default async function PortalAccountsPage() {
  await requireAdmin();
  const [accounts, invitable] = await Promise.all([listAccounts(), invitableCandidates()]);
  const emailMode = portalEmailMode();
  const now = new Date();

  return (
    <>
      <PortalHeader active="zugaenge" accounts={accounts.length} />
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Zugang erstellen"
            description="Die E-Mail-Adresse der Person ist vorausgefüllt und kann geändert werden. Den Link schickst du selbst oder per E-Mail."
          />
          <CardBody>
            {/* Outside the condition: the link of the last invitable person stays when the form gives way to the note. */}
            <InviteLinkHost emailMode={emailMode}>
              {invitable.length ? (
                <InviteForm
                  emailMode={emailMode}
                  candidates={invitable.map((c) => ({ id: c.id, label: `${c.lastName} ${c.firstName} (${displayNo.candidate(c.id)})`, email: c.email }))}
                />
              ) : (
                <p className="text-sm text-slate">Alle aktuellen Kandidatinnen und Kandidaten haben schon einen Zugang.</p>
              )}
            </InviteLinkHost>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Zugänge" description="Gesperrte Zugänge können sich nicht anmelden; beim Sperren enden alle Sitzungen." />
          {accounts.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Person</Th>
                  <Th>Anmeldung</Th>
                  <Th>Status</Th>
                  <Th>Zuletzt angemeldet</Th>
                  <Th align="right">Aktionen</Th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const info = linkInfo(a, now);
                  return (
                    <tr key={a.id} className="hover:bg-mist/50">
                      <Td>
                        <Link href={`/admin/kandidaten/${a.candidateId}`} className="font-medium text-ink hover:text-blue hover:underline">
                          {a.firstName} {a.lastName}
                        </Link>
                        <div className="mt-0.5">
                          <Mono>{displayNo.candidate(a.candidateId)}</Mono>
                        </div>
                      </Td>
                      <Td>
                        <span className="whitespace-nowrap">{a.email}</span>
                        {info ? <div className="mt-0.5 text-xs text-slate">{info}</div> : null}
                      </Td>
                      <Td>
                        <Badge tone={toneOf(accountStatuses, a.status)}>{labelOf(accountStatuses, a.status)}</Badge>
                        {a.sessions ? <div className="mt-1 text-xs text-slate">{a.sessions === 1 ? "1 Sitzung aktiv" : `${a.sessions} Sitzungen aktiv`}</div> : null}
                      </Td>
                      <Td className="whitespace-nowrap">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "–"}</Td>
                      <Td align="right">
                        <AccountActions a={a} emailMode={emailMode} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={KeyRound} title="Noch keine Zugänge">
              Erstelle oben den ersten Zugang. Die Person legt mit dem Link ihr Passwort fest.
            </EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
