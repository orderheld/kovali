import "server-only";
import { Resend } from "resend";
import { escapeHtml, type EmailResult } from "@/lib/contact/email";
import { labelOf } from "@/lib/contact/options";
import { serverEnv } from "@/lib/env";
import { availabilityOptions, engagementOptions, focusOptions } from "./options";
import type { ProfileInput } from "./schema";

function rows(input: ProfileInput, reference: string): [string, string][] {
  return [
    ["Referenz", reference],
    ["Schwerpunkt", labelOf(focusOptions, input.focus)],
    ["Name", input.name],
    ["E-Mail", input.email],
    ["Telefon", input.phone ?? "–"],
    ["Verfügbar", input.availability ? labelOf(availabilityOptions, input.availability) : "–"],
    ["Zusammenarbeit", input.engagement ? labelOf(engagementOptions, input.engagement) : "–"],
    ["Profil-Link", input.profileUrl ?? "–"],
  ];
}

function renderText(input: ProfileInput, reference: string): string {
  return [
    "Neues Profil über kovali.ch",
    "",
    ...rows(input, reference).map(([k, v]) => `${k}: ${v}`),
    "",
    "Nachricht:",
    input.message ?? "–",
    "",
    "Lebenslauf: im Anhang (PDF)",
    "Einwilligung Datenschutz: bestätigt (Aufbewahrung höchstens sechs Monate, Weitergabe nur mit Zustimmung)",
  ].join("\n");
}

function renderHtml(input: ProfileInput, reference: string): string {
  const table = rows(input, reference)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#4A5878;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;color:#0B1733">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;max-width:640px">
<p style="margin:0 0 16px;font-size:16px;color:#0B1733"><strong>Neues Profil über kovali.ch</strong></p>
<table style="border-collapse:collapse;font-size:14px">${table}</table>
<h2 style="font-size:15px;margin:24px 0 8px;color:#0B1733">Nachricht</h2><p style="margin:0;white-space:pre-wrap;color:#0B1733;line-height:1.55">${escapeHtml(input.message ?? "–")}</p>
<p style="margin:24px 0 0;color:#4A5878;font-size:12px">Lebenslauf im Anhang. Einwilligung Datenschutz: bestätigt (Aufbewahrung höchstens sechs Monate, Weitergabe an Auftraggeber nur mit Zustimmung). Antworten gehen direkt an ${escapeHtml(input.email)}.</p>
</div>`;
}

/** Sends the profile with the CV attached. The CV is never stored by the website. */
export async function sendProfileEmail(input: ProfileInput, reference: string, cv: Buffer): Promise<EmailResult> {
  const subject = `Profil ${labelOf(focusOptions, input.focus)}: ${input.name} (${reference})`;

  if (serverEnv.dryRun) {
    console.info(`[profile] dry run, email not sent (${reference}, CV ${cv.length} bytes)`);
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
        text: renderText(input, reference),
        html: renderHtml(input, reference),
        attachments: [{ filename: `Lebenslauf-${reference}.pdf`, content: cv }],
        tags: [{ name: "source", value: "website_profile" }],
      },
      { idempotencyKey: `profile/${reference}` },
    );
    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}
