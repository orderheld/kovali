"use client";

import { useSearchParams } from "next/navigation";
import { requestTypes, serviceChoices } from "@/lib/contact/options";
import { ContactForm } from "./contact-form";

/** Reads ?leistung= and ?anfrage= in the browser, so the page itself stays static. */
export function PreselectedContactForm({ fallbackEmail, testMode }: { fallbackEmail: string; testMode?: boolean }) {
  const params = useSearchParams();
  const leistung = params.get("leistung") ?? "";
  const anfrage = params.get("anfrage") ?? "";

  const service = serviceChoices.some((o) => o.value === leistung) ? leistung : undefined;
  const requestType = requestTypes.some((o) => o.value === anfrage) ? anfrage : undefined;

  return (
    <ContactForm
      key={`${requestType}|${service}`}
      defaults={{ requestType, services: service ? [service] : undefined }}
      fallbackEmail={fallbackEmail}
      testMode={testMode}
    />
  );
}
