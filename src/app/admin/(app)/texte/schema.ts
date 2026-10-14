import { z } from "zod";
import { f } from "@/lib/admin/forms";
import { multilineText } from "@/lib/admin/text-schema";

/** Server-side validation of the snippet form. */

/** Optional record id from a select field. */
const optId = () =>
  z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v)) : (v ?? null)),
    z.number({ error: "Ungültige Auswahl." }).int("Ungültige Auswahl.").positive("Ungültige Auswahl.").nullable(),
  );

/** Category: free text, inner spaces collapsed ("Bewerbung  GHR" and "Bewerbung GHR" are one). */
const category = () =>
  z.preprocess((v) => (typeof v === "string" ? v.replace(/\s+/g, " ") : v), f.optText(60));

export const snippetSchema = z.object({
  title: f.text(160, "Bitte einen Titel eingeben."),
  category: category(),
  companyId: optId(),
  body: multilineText(20_000, "Bitte den Text eingeben."),
  pinned: f.checkbox(),
});

export type SnippetInput = z.output<typeof snippetSchema>;
