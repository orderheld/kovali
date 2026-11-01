"use server";

import { headers } from "next/headers";
import { site } from "@/config/site";
import { checkAttachment } from "@/lib/contact/attachment";
import { sendContactEmail } from "@/lib/contact/email";
import { checkFormToken, claimToken, issueFormToken } from "@/lib/contact/form-token";
import { clientIp, globalLimitReached, hashIp, recordDelivery, takeToken } from "@/lib/contact/rate-limit";
import { createReference } from "@/lib/contact/reference";
import { contactSchema, fieldErrors, storageCopy } from "@/lib/contact/schema";
import { checkSpam } from "@/lib/contact/spam";
import type { ContactErrorField, ContactState, ContactTextField, ContactValues } from "@/lib/contact/state";
import { isStorageConfigured, recentRequestCount, recentSenderCount, storeContactRequest } from "@/lib/contact/store";

/** Per hour, across all server instances: stored requests per sender, and different senders. */
const DB_HOURLY_LIMIT = 5;
const DB_SENDERS_HOURLY_LIMIT = 20;

const TEXT_FIELDS: ContactTextField[] = [
  "name",
  "company",
  "email",
  "phone",
  "requestType",
  "projectDescription",
  "start",
  "duration",
  "workload",
  "workMode",
  "location",
  "requirements",
  "message",
  "consent",
];

/** Checked services: a checkbox group sends one entry per checked box. */
function readServices(formData: FormData): string[] {
  return formData
    .getAll("services")
    .filter((v): v is string => typeof v === "string")
    .slice(0, 10)
    .map((v) => v.slice(0, 60));
}

function readValues(formData: FormData): ContactValues {
  const values: ContactValues = { services: readServices(formData) };
  for (const key of TEXT_FIELDS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v.slice(0, 6000);
  }
  return values;
}

function log(event: string, data: Record<string, unknown>) {
  // No personal data in logs: only the reference and technical status.
  console.info(JSON.stringify({ event, ...data }));
}

/**
 * Spam token for the contact form (lib/contact/form-token.ts). The form asks for it at the first
 * click or key press and sends it with the request, so the server can measure the fill time.
 */
export async function requestFormToken(): Promise<string> {
  return issueFormToken();
}

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = readValues(formData);
  const fallback = site.contact.email.value;

  // 1. Spam protection: hidden field, people never see it. Bots that fill it get a success
  //    message, so they do not try again.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    log("contact.spam", { reason: "honeypot" });
    return { status: "success", reference: createReference() };
  }

  // 2. Spam protection: signed form token. Without it the request did not come from the form in
  //    a browser; with it the server measures the fill time itself.
  const token = checkFormToken(formData.get("formToken"));
  if (!token.ok) {
    log("contact.spam", { reason: `token_${token.reason}` });
    if (token.reason === "too_fast") {
      return {
        status: "error",
        message: "Die Anfrage wurde sehr schnell gesendet. Bitte prüfen Sie Ihre Angaben und senden Sie sie erneut.",
        values,
      };
    }
    return {
      status: "error",
      message:
        token.reason === "expired"
          ? "Die Seite war längere Zeit geöffnet. Bitte senden Sie die Anfrage noch einmal."
          : `Die Anfrage konnte nicht geprüft werden. Bitte senden Sie sie noch einmal. Klappt es wieder nicht, laden Sie die Seite neu oder schreiben Sie direkt an ${fallback}.`,
      values,
      newToken: true,
    };
  }
  // The same request sent twice, for example after a dropped connection: no second e-mail, the
  // visitor sees the first reference. The token is reserved while this request runs.
  const claim = await claimToken(token.nonce);
  if ("earlier" in claim) {
    log("contact.duplicate", { reference: claim.earlier });
    return { status: "success", reference: claim.earlier };
  }
  let delivered: string | undefined;
  try {
    const state = await validateAndDeliver(formData, values, fallback);
    if (state.status === "success") delivered = state.reference;
    return state;
  } finally {
    claim.release(delivered);
  }
}

async function validateAndDeliver(formData: FormData, values: ContactValues, fallback: string): Promise<ContactState> {
  // 3. Server-side validation of the text fields and the optional file, reported together.
  const parsed = contactSchema.safeParse({ ...Object.fromEntries(formData), services: formData.getAll("services") });
  const file = await checkAttachment(formData.get("attachment"));
  if (!parsed.success || !file.ok) {
    const errors: Partial<Record<ContactErrorField, string>> = parsed.success ? {} : fieldErrors(parsed.error);
    if (!file.ok) errors.attachment = file.error;
    return { status: "invalid", errors, values };
  }
  const input = parsed.data;

  // 4. Spam protection: content. Not delivered, the visitor is asked to write by e-mail instead,
  //    so a false alarm does not lose a request.
  const spam = checkSpam({
    name: input.name,
    company: input.company,
    texts: [input.projectDescription, input.requirements, input.message, input.location],
  });
  if (spam.spam) {
    log("contact.spam", { reason: "content", score: spam.score, signals: spam.reasons });
    return {
      status: "error",
      message: `Ihre Anfrage enthält Merkmale, die oft in Spam vorkommen, zum Beispiel mehrere Links. Sie wurde deshalb nicht gesendet. Bitte schreiben Sie direkt an ${fallback}.`,
      values,
    };
  }

  // 5. Rate limiting per IP (hashed, never stored in plain text), and an overall limit on the
  //    number of different senders (a spam wave from many IPs).
  const ipHash = hashIp(clientIp(await headers()));
  let limited = !takeToken(ipHash) || globalLimitReached();
  if (!limited && isStorageConfigured()) {
    try {
      const [fromSender, senders] = await Promise.all([recentRequestCount(ipHash), recentSenderCount()]);
      limited = fromSender >= DB_HOURLY_LIMIT || senders >= DB_SENDERS_HOURLY_LIMIT;
    } catch (err) {
      log("contact.ratelimit_db_error", { error: err instanceof Error ? err.message : "unknown" });
    }
  }
  if (limited) {
    log("contact.rate_limited", {});
    return {
      status: "error",
      message: `Es wurden in kurzer Zeit zu viele Anfragen gesendet. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an ${fallback}.`,
      values,
    };
  }

  // 6. Deliver by email first, then store (optional). Each step is logged with the reference.
  // The attachment only travels with the e-mail; the database keeps the text fields (see storageCopy).
  const reference = createReference();
  const email = await sendContactEmail(input, reference, file.attachment);

  let storage: "disabled" | "stored" | "failed" = "disabled";
  if (isStorageConfigured()) {
    try {
      await storeContactRequest(storageCopy(input), reference, ipHash, email);
      storage = "stored";
    } catch (err) {
      storage = "failed";
      log("contact.store_error", { reference, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  log("contact.received", {
    reference,
    requestType: input.requestType,
    attachment: file.attachment?.kind ?? "none",
    email: email.ok ? "sent" : "failed",
    emailError: email.ok ? undefined : email.error,
    storage,
  });

  if (!email.ok) {
    return {
      status: "error",
      message: `Ihre Anfrage konnte leider nicht zugestellt werden. Bitte senden Sie sie direkt an ${fallback} und geben Sie die Referenz an.`,
      reference,
      values,
    };
  }

  recordDelivery(ipHash);
  return { status: "success", reference };
}
