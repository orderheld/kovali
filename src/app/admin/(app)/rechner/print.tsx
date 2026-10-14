"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";

/**
 * Printing the calculator: the navigation, top bar and inputs are hidden and only the result
 * is printed. The shell is shared, so it is hidden from here with selectors instead of classes.
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
    <button type="button" onClick={() => window.print()} className={buttonClass("secondary", "sm")}>
      <Printer aria-hidden className="size-4" />
      {label}
    </button>
  );
}
