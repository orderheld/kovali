import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import type { Attachment } from "./attachment";
import { labelOf, requestTypes, serviceOptions, startOptions, workModes } from "./options";
import type { ContactInput } from "./schema";

export type EmailResult = { ok: true; id: string | null } | { ok: false; error: string };

const attachmentLabel = { pdf: "Anforderungsprofil (PDF) im Anhang", docx: "Anforderungsprofil (Word) im Anhang" };

function rows(input: ContactInput, reference: string, attachment?: Attachment): [string, string][] {
  return [
    ["Referenz", reference],
    ["Art der Anfrage", labelOf(requestTypes, input.requestType)],
    ["Gewünschte Leistung", input.service ? labelOf(serviceOptions, input.service) : "–"],
    ["Name", input.name],
    ["Unternehmen", input.company ?? "–"],
    ["E-Mail", input.email],
    ["Telefon", input.phone ?? "–"],
    ["Gewünschter Start", input.start ? labelOf(startOptions, input.start) : "–"],
    ["Arbeitsmodell", input.workMode ? labelOf(workModes, input.workMode) : "–"],
    ["Einsatzort", input.location ?? "–"],
    ["Anhang", attachment ? attachmentLabel[attachment.kind] : "–"],
  ];
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderText(input: ContactInput, reference: string, attachment?: Attachment): string {
  const head = rows(input, reference, attachment)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return [
    "Neue Anfrage über kovali.ch",
    "",
    head,
    "",
    "Beschreibung:",
    input.projectDescription,
    "",
    "Nachricht:",
    input.message ?? "–",
    "",
    "Einwilligung Datenschutz: bestätigt",
  ].join("\n");
}

export function renderHtml(input: ContactInput, reference: string, attachment?: Attachment): string {
  const table = rows(input, reference, attachment)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#4A5878;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;color:#0B1733">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  const block = (title: string, text: string) =>
    `<h2 style="font-size:15px;margin:24px 0 8px;color:#0B1733">${escapeHtml(title)}</h2><p style="margin:0;white-space:pre-wrap;color:#0B1733;line-height:1.55">${escapeHtml(text)}</p>`;
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;max-width:640px">
<p style="margin:0 0 16px;font-size:16px;color:#0B1733"><strong>Neue Anfrage über kovali.ch</strong></p>
<table style="border-collapse:collapse;font-size:14px">${table}</table>
${block("Beschreibung", input.projectDescription)}
${block("Nachricht", input.message ?? "–")}
<p style="margin:24px 0 0;color:#4A5878;font-size:12px">Einwilligung Datenschutz: bestätigt. Antworten gehen direkt an ${escapeHtml(input.email)}.</p>
</div>`;
}

export async function sendContactEmail(
  input: ContactInput,
  reference: string,
  attachment?: Attachment,
): Promise<EmailResult> {
  const subject = `Anfrage ${labelOf(requestTypes, input.requestType)}: ${input.company ?? input.name} (${reference})`;

  if (serverEnv.dryRun) {
    // The full text is only printed locally; deployed dry runs log the reference only.
    const body = process.env.NODE_ENV === "development" ? `\n${subject}\n${renderText(input, reference, attachment)}` : "";
    const file = attachment ? `, ${attachment.kind} ${attachment.content.length} bytes` : "";
    console.info(`[contact] dry run, email not sent (${reference}${file})${body}`);
    return { ok: true, id: null };
  }
  if (!serverEnv.resendApiKey || !serverEnv.contactTo || !serverEnv.contactFrom) {
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const resend = new Resend(serverEnv.resendApiKey);
    const { data, error } = await resend.emails.send(
      {
        from: serverEnv.contactFrom,
        to: serverEnv.contactTo,
        replyTo: input.email,
        subject,
        text: renderText(input, reference, attachment),
        html: renderHtml(input, reference, attachment),
        attachments: attachment
          ? [{ filename: `Anforderungsprofil-${reference}.${attachment.kind}`, content: attachment.content }]
          : undefined,
        tags: [{ name: "source", value: "website_contact" }],
      },
      { idempotencyKey: `contact/${reference}` },
    );
    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}
