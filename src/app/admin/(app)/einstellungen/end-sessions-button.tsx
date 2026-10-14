"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";

/**
 * Ends all sessions after a confirmation and then loads the login page fresh, so no admin page
 * stays in the browser's memory (same as the logout button in the shell).
 */
export function EndSessionsButton({ action, count }: { action: () => Promise<void>; count: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass("danger", "md")}
      onClick={() => {
        const others = count > 1 ? ` und ${count - 1} ${count - 1 === 1 ? "weitere Sitzung" : "weitere Sitzungen"}` : "";
        if (!window.confirm(`Alle Sitzungen beenden?\n\nDu wirst auf diesem Gerät${others} abgemeldet und musst dich neu anmelden.`)) return;
        start(async () => {
          await action();
          window.location.replace("/admin/login");
        });
      }}
    >
      {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <LogOut aria-hidden className="size-4" />}
      Alle Sitzungen beenden
    </button>
  );
}
