"use server";

import { headers } from "next/headers";
import { site } from "@/config/site";
import { checkAttachment } from "@/lib/contact/attachment";
import { sendContactEmail } from "@/lib/contact/email";
import { clientIp, hashIp, takeToken } from "@/lib/contact/rate-limit";
import { createReference } from "@/lib/contact/reference";
import { contactSchema, fieldErrors, storageCopy } from "@/lib/contact/schema";
import type { ContactErrorField, ContactState, ContactTextField, ContactValues } from "@/lib/contact/state";
import { isStorageConfigured, recentRequestCount, storeContactRequest } from "@/lib/contact/store";

/** Minimum time between page load and submit. Faster submissions are almost always bots. */
const MIN_FILL_MS = 3000;
const DB_HOURLY_LIMIT = 5;

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

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const values = readValues(formData);
  const fallback = site.contact.email.value;

  // 1. Spam protection: honeypot field must stay empty.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    log("contact.spam", { reason: "honeypot" });
    return { status: "success", reference: createReference() };
  }

  // 2. Spam protection: minimum fill time, measured in the browser (only sent with JavaScript).
  const elapsedRaw = formData.get("elapsedMs");
  const elapsed = typeof elapsedRaw === "string" && elapsedRaw !== "" ? Number(elapsedRaw) : Number.NaN;
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) {
    log("contact.spam", { reason: "too_fast" });
    return {
      status: "error",
      message: "Die Anfrage wurde sehr schnell gesendet. Bitte prüfen Sie Ihre Angaben und senden Sie sie erneut.",
      values,
    };
  }

  // 3. Server-side validation of the text fields and the optional file, reported together.
  const parsed = contactSchema.safeParse({ ...Object.fromEntries(formData), services: formData.getAll("services") });
  const file = await checkAttachment(formData.get("attachment"));
  if (!parsed.success || !file.ok) {
    const errors: Partial<Record<ContactErrorField, string>> = parsed.success ? {} : fieldErrors(parsed.error);
    if (!file.ok) errors.attachment = file.error;
    return { status: "invalid", errors, values };
  }
  const input = parsed.data;

  // 4. Rate limiting per IP (hashed, never stored in plain text).
  const ipHash = hashIp(clientIp(await headers()));
  let limited = !takeToken(ipHash);
  if (!limited && isStorageConfigured()) {
    try {
      limited = (await recentRequestCount(ipHash)) >= DB_HOURLY_LIMIT;
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

  // 5. Deliver by email first, then store (optional). Each step is logged with the reference.
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

  return { status: "success", reference };
}
