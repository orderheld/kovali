"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/admin/format";
import { kovaliParty } from "@/lib/admin/party";

/**
 * Printing the calculator: the navigation, top bar and inputs are hidden and only the
 * summary (PrintSheet) is shown. The shell is shared, so it is hidden from here with
 * selectors instead of classes.
 */
export function PrintStyles() {
  return (
    <style>{`
@media print {
  @page { size: A4; margin: 14mm 14mm 16mm; }
  html, body { background: #fff !important; }
  aside, header:has(+ main#admin-inhalt), a[href="#admin-inhalt"] { display: none !important; }
  main#admin-inhalt { padding: 0 !important; max-width: none !important; }
}
`}</style>
  );
}

export function PrintButton({ label = "Drucken" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "md")}>
      <Printer aria-hidden className="size-4" />
      {label}
    </button>
  );
}

/** Print-only page with a title, the KOVALI sender line and the given tables. */
export function PrintSheet({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const p = kovaliParty();
  return (
    <div className="hidden text-[11pt] text-black print:block">
      <div className="mb-6 flex items-end justify-between border-b border-black/20 pb-3">
        <div>
          <p className="text-xs tracking-wide uppercase">KOVALI · Interne Berechnung</p>
          <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm">{subtitle}</p> : null}
        </div>
        {/* The time is rendered on the server and again in the browser; a minute may differ. */}
        <p className="text-right text-xs" suppressHydrationWarning>
          {p.name}
          <br />
          {formatDateTime(new Date())}
        </p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

/** Two-column table for the print sheet. */
export function PrintTable({ caption, rows, columns }: { caption: string; rows: (string | number)[][]; columns?: string[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="mb-1 text-left text-sm font-semibold">{caption}</caption>
      {columns ? (
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col" className={`border-b border-black/30 py-1 font-semibold ${i ? "text-right" : "text-left"}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
      ) : null}
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((cell, j) => (
              <td key={j} className={`border-b border-black/10 py-1 ${j ? "text-right tabular-nums" : ""}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
