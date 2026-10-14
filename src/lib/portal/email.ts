import "server-only";
import { Resend } from "resend";
import { site } from "@/config/site";
import { formatDateTime } from "@/lib/admin/format";
import { serverEnv } from "@/lib/env";

/**
 * E-mails of the candidate portal (invitation, password reset), sent with Resend like the
 * website's contact form (RESEND_API_KEY, CONTACT_FROM_EMAIL). With CONTACT_DRY_RUN=true
 * nothing is sent; links are only printed in local development, never in deployed logs.
 */

export type PortalEmailMode = "send" | "dry-run" | "off";

export function portalEmailMode(): PortalEmailMode {
  if (serverEnv.dryRun) return "dry-run";
  return serverEnv.resendApiKey && serverEnv.contactFrom ? "send" : "off";
}

export type PortalEmailResult = { ok: true; dryRun: boolean } | { ok: false; error: string };

interface PortalEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** For logs, without personal data, e.g. "Einladung K-0042". */
  label: string;
  idempotencyKey: string;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

async function send(mail: PortalEmail): Promise<PortalEmailResult> {
  const mode = portalEmailMode();
  if (mode === "dry-run") {
    const body = process.env.NODE_ENV === "development" ? `\n${mail.subject}\n${mail.text}` : "";
    console.info(`[portal] dry run, e-mail not sent (${mail.label})${body}`);
    return { ok: true, dryRun: true };
  }
  if (mode === "off") return { ok: false, error: "email_not_configured" };
  try {
    const resend = new Resend(serverEnv.resendApiKey);
    const { error } = await resend.emails.send(
      {
        from: serverEnv.contactFrom!,
        to: mail.to,
        replyTo: site.contact.email.value,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        tags: [{ name: "source", value: "candidate_portal" }],
      },
      { idempotencyKey: mail.idempotencyKey },
    );
    if (error) return { ok: false, error: `${error.name}: ${error.message}` };
    return { ok: true, dryRun: false };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

function layout(paragraphs: string[], link: { href: string; label: string }, footer: string): string {
  const p = paragraphs.map((t) => `<p style="margin:0 0 14px;line-height:1.6;color:#0B1733">${escapeHtml(t)}</p>`).join("");
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;max-width:560px">
<p style="margin:0 0 20px;font-size:13px;letter-spacing:.12em;color:#145BCE;font-weight:600">KOVALI KANDIDATENPORTAL</p>
${p}
<p style="margin:22px 0"><a href="${escapeHtml(link.href)}" style="display:inline-block;background:#145BCE;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${escapeHtml(link.label)}</a></p>
<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#4A5878">Falls die Schaltfläche nicht funktioniert, kopieren Sie diese Adresse in Ihren Browser:<br><span style="word-break:break-all">${escapeHtml(link.href)}</span></p>
<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#4A5878">${escapeHtml(footer)}</p>
</div>`;
}

const signature = `${site.contact.person}, ${site.brand}`;

export function sendInvitationEmail(input: { to: string; firstName: string; link: string; expiresAt: Date; label: string }) {
  const paragraphs = [
    `Guten Tag ${input.firstName}`,
    `${site.contact.person} hat für Sie einen Zugang zum Kandidatenportal von ${site.brand} eingerichtet. Dort sehen Sie Projektmandate, die zu Ihnen passen, und halten Ihr Profil selbst aktuell.`,
    `Mit dem folgenden Link legen Sie Ihr Passwort fest. Er ist bis ${formatDateTime(input.expiresAt)} gültig und funktioniert nur einmal.`,
  ];
  const footer = `Sie erhalten diese E-Mail, weil ${site.brand} mit Ihnen über Projektmandate in Kontakt steht. Falls Sie keinen Zugang wünschen, ignorieren Sie diese E-Mail einfach. ${signature}`;
  return send({
    to: input.to,
    subject: `Ihr Zugang zum ${site.brand} Kandidatenportal`,
    text: [...paragraphs, "", input.link, "", footer].join("\n\n"),
    html: layout(paragraphs, { href: input.link, label: "Passwort festlegen" }, footer),
    label: input.label,
    idempotencyKey: `portal-invite/${input.link.slice(-43)}`,
  });
}

export function sendResetEmail(input: { to: string; firstName: string; link: string; label: string }) {
  const paragraphs = [
    `Guten Tag ${input.firstName}`,
    `Sie haben ein neues Passwort für das Kandidatenportal von ${site.brand} angefordert. Mit dem folgenden Link legen Sie es fest. Der Link ist eine Stunde gültig und funktioniert nur einmal.`,
  ];
  const footer = `Falls Sie das nicht waren, ignorieren Sie diese E-Mail; Ihr bisheriges Passwort bleibt gültig. ${signature}`;
  return send({
    to: input.to,
    subject: `Neues Passwort für das ${site.brand} Kandidatenportal`,
    text: [...paragraphs, "", input.link, "", footer].join("\n\n"),
    html: layout(paragraphs, { href: input.link, label: "Neues Passwort festlegen" }, footer),
    label: input.label,
    idempotencyKey: `portal-reset/${input.link.slice(-43)}`,
  });
}
