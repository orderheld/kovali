"use server";

import { headers } from "next/headers";
import { site } from "@/config/site";
import { sendContactEmail } from "@/lib/contact/email";
import { clientIp, hashIp, takeToken } from "@/lib/contact/rate-limit";
import { createReference } from "@/lib/contact/reference";
import { contactSchema, fieldErrors } from "@/lib/contact/schema";
import type { ContactField, ContactState, ContactValues } from "@/lib/contact/state";
import { isStorageConfigured, recentRequestCount, storeContactRequest } from "@/lib/contact/store";

/** Minimum time between page load and submit. Faster submissions are almost always bots. */
const MIN_FILL_MS = 3000;
const DB_HOURLY_LIMIT = 5;

const TEXT_FIELDS: ContactField[] = [
  "name",
  "company",
  "email",
  "phone",
  "requestType",
  "service",
  "projectDescription",
  "start",
  "workMode",
  "location",
  "message",
  "consent",
];

function readValues(formData: FormData): ContactValues {
  const values: ContactValues = {};
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

  // 2. Spam protection: minimum fill time (only when JavaScript set the timestamp).
  const startedAt = Number(formData.get("startedAt"));
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    log("contact.spam", { reason: "too_fast" });
    return {
      status: "error",
      message: "Die Anfrage wurde sehr schnell gesendet. Bitte prüfen Sie Ihre Angaben und senden Sie sie erneut.",
      values,
    };
  }

  // 3. Server-side validation.
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "invalid", errors: fieldErrors(parsed.error), values };
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
  const reference = createReference();
  const email = await sendContactEmail(input, reference);

  let storage: "disabled" | "stored" | "failed" = "disabled";
  if (isStorageConfigured()) {
    try {
      await storeContactRequest(input, reference, ipHash, email);
      storage = "stored";
    } catch (err) {
      storage = "failed";
      log("contact.store_error", { reference, error: err instanceof Error ? err.message : "unknown" });
    }
  }

  log("contact.received", {
    reference,
    requestType: input.requestType,
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
