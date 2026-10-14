"use client";

import Link from "next/link";
import { useLayoutEffect, useState, useTransition } from "react";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/forms";

/**
 * "Vormerken" in the matching list. When the server refuses because the candidate has no own
 * firm, the message links to the candidate, where the firm is linked.
 */
export function ReserveButton({
  action,
  candidateHref,
  firmError,
}: {
  action: () => Promise<ActionState>;
  candidateHref: string;
  firmError: string;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ActionState | null>(null);
  // A message from an earlier visit must not reappear when the hidden page is shown again.
  useLayoutEffect(() => () => setMessage(null), []);
  return (
    <span className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        disabled={pending}
        className={buttonClass("secondary", "sm")}
        onClick={() =>
          start(async () => {
            setMessage(await action());
          })
        }
      >
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <BookmarkPlus aria-hidden className="size-4" />}
        Vormerken
      </button>
      {message?.status === "error" && message.message ? (
        <span role="alert" className="max-w-xs text-[0.8125rem] text-red-700 sm:text-right">
          {message.message}{" "}
          {message.message === firmError ? (
            <Link href={candidateHref} className="font-medium underline">
              Zum Kandidaten
            </Link>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
