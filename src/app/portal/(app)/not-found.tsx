import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";

/**
 * Inside the portal: missing pages, vacancies that are closed or not shared with this person
 * and other people's records all look the same, so nothing can be probed.
 */
export default function PortalNotFound() {
  return (
    <div className="mx-auto max-w-md py-10 text-center sm:py-16">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-blue ring-1 ring-line">
        <SearchX aria-hidden className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-ink">Nicht gefunden</h1>
      <p className="mt-2 text-[0.9375rem] text-slate">
        Diese Seite gibt es nicht oder nicht mehr. Eine Vakanz verschwindet zum Beispiel, sobald das Projektmandat besetzt ist.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/portal" className={buttonClass("primary")}>
          Zur Übersicht
        </Link>
        <Link href="/portal/vakanzen" className={buttonClass("secondary")}>
          Vakanzen
        </Link>
      </div>
    </div>
  );
}
