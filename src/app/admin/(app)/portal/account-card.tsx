import Link from "next/link";
import { eq } from "drizzle-orm";
import { Badge, Card, CardBody, CardHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth/session";
import { getDb } from "@/lib/admin/db/client";
import { candidates } from "@/lib/admin/db/schema";
import { formatDateTime } from "@/lib/admin/format";
import { accountStatuses, labelOf, toneOf } from "@/lib/admin/options";
import { accountOfCandidate, candidatePortalItems } from "@/lib/portal/admin";
import { portalEmailMode } from "@/lib/portal/email";
import { AccountActions, linkInfo } from "./account-parts";
import { InviteForm } from "./client";

/**
 * The candidate's portal access, for the candidate detail page of the Kandidaten module:
 * status, open portal items and the same actions as on /admin/portal/zugaenge, or the form
 * to create the access. Async server component; checks the admin session itself.
 *
 *   import { PortalAccountCard } from "@/app/admin/(app)/portal/account-card";
 *   <PortalAccountCard candidateId={id} />
 */
export async function PortalAccountCard({ candidateId }: { candidateId: number }) {
  await requireAdmin();
  const db = await getDb();
  const [[candidate], account, items] = await Promise.all([
    db.select({ id: candidates.id, email: candidates.email, status: candidates.status }).from(candidates).where(eq(candidates.id, candidateId)).limit(1),
    accountOfCandidate(candidateId),
    candidatePortalItems(candidateId),
  ]);
  if (!candidate) return null;
  const emailMode = portalEmailMode();
  const open = items.changes + items.uploads + items.interest;

  return (
    <Card>
      <CardHeader
        title="Kandidatenportal"
        actions={account ? <Badge tone={toneOf(accountStatuses, account.status)}>{labelOf(accountStatuses, account.status)}</Badge> : <Badge>Kein Zugang</Badge>}
      />
      <CardBody className="space-y-4">
        {account ? (
          <>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[0.8125rem] text-slate">Anmeldung</dt>
                <dd className="[overflow-wrap:anywhere] text-ink">{account.email}</dd>
                {linkInfo(account, new Date()) ? <dd className="text-xs text-slate">{linkInfo(account, new Date())}</dd> : null}
              </div>
              <div>
                <dt className="text-[0.8125rem] text-slate">Zuletzt angemeldet</dt>
                <dd className="text-ink">{account.lastLoginAt ? formatDateTime(account.lastLoginAt) : "–"}</dd>
                {account.sessions ? <dd className="text-xs text-slate">{account.sessions === 1 ? "1 Sitzung aktiv" : `${account.sessions} Sitzungen aktiv`}</dd> : null}
              </div>
            </dl>
            {open ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Offen im Portal:{" "}
                {[
                  items.changes ? `${items.changes} ${items.changes === 1 ? "Änderung" : "Änderungen"}` : null,
                  items.uploads ? `${items.uploads} ${items.uploads === 1 ? "Dokument" : "Dokumente"}` : null,
                  items.interest ? `${items.interest}× Interesse` : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                .{" "}
                <Link href={items.changes ? "/admin/portal" : items.uploads ? "/admin/portal/dokumente" : "/admin/portal/interesse"} className="font-medium text-blue hover:underline">
                  Ansehen
                </Link>
              </p>
            ) : null}
            <AccountActions a={account} emailMode={emailMode} />
          </>
        ) : candidate.status === "archiviert" ? (
          <p className="text-sm text-slate">Archivierte Personen erhalten keinen Zugang.</p>
        ) : (
          <>
            <p className="text-sm text-slate">Mit einem Zugang pflegt die Person ihr Profil selbst und sieht Vakanzen, die du im Portal freigibst.</p>
            <InviteForm emailMode={emailMode} candidates={[]} fixed={{ id: candidate.id, label: "", email: candidate.email }} />
          </>
        )}
      </CardBody>
    </Card>
  );
}
