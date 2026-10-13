"use server";

import { headers } from "next/headers";
import { site } from "@/config/site";
import { clientIp, hashIp, takeToken } from "@/lib/contact/rate-limit";
import { createReference } from "@/lib/contact/reference";
import { checkCv } from "@/lib/profile/cv";
import { sendProfileEmail } from "@/lib/profile/email";
import { profileFieldErrors, profileSchema } from "@/lib/profile/schema";
import type { ProfileField, ProfileState, ProfileValues } from "@/lib/profile/state";

/** Minimum time between page load and submit. Faster submissions are almost always bots. */
const MIN_FILL_MS = 3000;

const TEXT_FIELDS: Exclude<ProfileField, "cv">[] = [
  "name",
  "email",
  "phone",
  "focus",
  "availability",
  "engagement",
  "profileUrl",
  "message",
  "consent",
];

function readValues(formData: FormData): ProfileValues {
  const values: ProfileValues = {};
  for (const key of TEXT_FIELDS) {
    const v = formData.get(key);
    if (typeof v === "string") values[key] = v.slice(0, 4000);
  }
  return values;
}

function log(event: string, data: Record<string, unknown>) {
  // No personal data in logs: only the reference and technical status.
  console.info(JSON.stringify({ event, ...data }));
}

export async function submitProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const values = readValues(formData);
  const fallback = site.contact.email.value;

  // 1. Spam protection: honeypot field must stay empty.
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    log("profile.spam", { reason: "honeypot" });
    return { status: "success", reference: createReference() };
  }

  // 2. Spam protection: minimum fill time, measured in the browser (only sent with JavaScript).
  const elapsedRaw = formData.get("elapsedMs");
  const elapsed = typeof elapsedRaw === "string" && elapsedRaw !== "" ? Number(elapsedRaw) : Number.NaN;
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) {
    log("profile.spam", { reason: "too_fast" });
    return {
      status: "error",
      message: "Das Profil wurde sehr schnell gesendet. Bitte prüfen Sie Ihre Angaben und senden Sie es erneut.",
      values,
    };
  }

  // 3. Server-side validation of the text fields and the CV, reported together.
  const parsed = profileSchema.safeParse(Object.fromEntries(TEXT_FIELDS.map((k) => [k, formData.get(k) ?? undefined])));
  const cv = await checkCv(formData.get("cv"));
  if (!parsed.success || !cv.ok) {
    const errors = parsed.success ? {} : profileFieldErrors(parsed.error);
    if (!cv.ok) errors.cv = cv.error;
    return { status: "invalid", errors, values };
  }
  const input = parsed.data;

  // 4. Rate limiting per IP (hashed, never stored).
  if (!takeToken(hashIp(clientIp(await headers())))) {
    log("profile.rate_limited", {});
    return {
      status: "error",
      message: `Es wurden in kurzer Zeit zu viele Anfragen gesendet. Bitte versuchen Sie es später erneut oder senden Sie Ihr Profil an ${fallback}.`,
      values,
    };
  }

  // 5. Deliver by email with the CV attached. The website does not store the CV.
  const reference = createReference();
  const email = await sendProfileEmail(input, reference, cv.content);
  log("profile.received", {
    reference,
    focus: input.focus,
    email: email.ok ? "sent" : "failed",
    emailError: email.ok ? undefined : email.error,
  });

  if (!email.ok) {
    return {
      status: "error",
      message: `Ihr Profil konnte leider nicht zugestellt werden. Bitte senden Sie es direkt an ${fallback} und geben Sie die Referenz an.`,
      reference,
      values,
    };
  }

  return { status: "success", reference };
}
