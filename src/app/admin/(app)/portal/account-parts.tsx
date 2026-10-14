import { Lock, LockOpen, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/form";
import { displayNo, formatDateTime } from "@/lib/admin/format";
import type { PortalAccountRow } from "@/lib/portal/admin";
import type { PortalEmailMode } from "@/lib/portal/email";
import { deletePortalAccount, lockPortalAccount, unlockPortalAccount } from "./actions";
import { RenewLinkButton } from "./client";

/** Parts shared by the Zugänge tab and the account card on the candidate page (server components). */

export function linkInfo(a: Pick<PortalAccountRow, "hasToken" | "tokenExpiresAt" | "status">, now: Date): string | null {
  if (!a.hasToken || !a.tokenExpiresAt) return a.status === "eingeladen" ? "Kein gültiger Link" : null;
  return a.tokenExpiresAt > now ? `Link gültig bis ${formatDateTime(a.tokenExpiresAt)}` : "Link abgelaufen";
}

export function AccountActions({ a, emailMode }: { a: PortalAccountRow; emailMode: PortalEmailMode }) {
  const no = displayNo.candidate(a.candidateId);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {a.status !== "gesperrt" ? <RenewLinkButton accountId={a.id} emailMode={emailMode} active={a.status === "aktiv"} /> : null}
      {a.status === "gesperrt" ? (
        <ActionButton action={unlockPortalAccount.bind(null, a.id)} icon={<LockOpen aria-hidden className="size-4" />}>
          Entsperren
        </ActionButton>
      ) : (
        <ActionButton
          action={lockPortalAccount.bind(null, a.id)}
          confirm={`Zugang von ${no} sperren? Alle Sitzungen enden sofort.`}
          icon={<Lock aria-hidden className="size-4" />}
        >
          Sperren
        </ActionButton>
      )}
      <ActionButton
        action={deletePortalAccount.bind(null, a.id)}
        confirm={`Zugang von ${no} löschen? Profil, Dokumente und Antworten bleiben erhalten; für einen neuen Zugang braucht es eine neue Einladung.`}
        variant="ghost"
        icon={<Trash2 aria-hidden className="size-4" />}
        className="text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        Löschen
      </ActionButton>
    </div>
  );
}
