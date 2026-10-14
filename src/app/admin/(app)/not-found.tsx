"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";

/** Lists a missing record can belong to, for the second link. */
const lists = [
  { prefix: "/admin/auftraege", label: "Zu den Aufträgen" },
  { prefix: "/admin/vakanzen", label: "Zu den Vakanzen" },
  { prefix: "/admin/vertraege", label: "Zu den Verträgen" },
  { prefix: "/admin/texte", label: "Zu den Textbausteinen" },
  { prefix: "/admin/firmen", label: "Zu den Firmen" },
  { prefix: "/admin/einstellungen", label: "Zu den Einstellungen" },
];

/**
 * Inside the admin area: a record that does not exist (any more) or an unknown address, shown
 * with the admin navigation instead of the public site's 404 page. A client component, because
 * only the address tells which list the record belongs to.
 */
export default function AdminNotFound() {
  const pathname = usePathname();
  const list = lists.find((l) => pathname.startsWith(`${l.prefix}/`));
  return (
    <div className="mx-auto max-w-md py-10 text-center sm:py-16">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-blue ring-1 ring-line">
        <SearchX aria-hidden className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-ink">Nicht gefunden</h1>
      <p className="mt-2 text-[0.9375rem] text-slate">
        Diesen Eintrag oder diese Seite gibt es nicht oder nicht mehr. Vielleicht wurde er gelöscht, oder in der Adresse steht eine falsche Nummer.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/admin" className={buttonClass("primary")}>
          Zur Übersicht
        </Link>
        {list ? (
          <Link href={list.prefix} className={buttonClass("secondary")}>
            {list.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
