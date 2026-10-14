/** Options of the profile form for specialists. Shared by the client form and the server validation. */

export const focusOptions = [
  { value: "business-analysis", label: "Business Analysis" },
  { value: "requirements-engineering", label: "Requirements Engineering" },
  { value: "application-management", label: "Application Management" },
  { value: "test-management", label: "Testmanagement" },
  { value: "test-engineering", label: "Test Engineering" },
  { value: "andere", label: "Anderer Schwerpunkt" },
] as const;

export const availabilityOptions = [
  { value: "sofort", label: "Sofort" },
  { value: "1-monat", label: "Innerhalb eines Monats" },
  { value: "1-3-monate", label: "In ein bis drei Monaten" },
  { value: "spaeter", label: "In mehr als drei Monaten" },
] as const;

/**
 * How a specialist works with KOVALI. KOVALI is the contract party and works with specialists
 * only through their own company (GmbH or AG) as its subcontractor: no employment, no staff
 * leasing, no sole proprietors (Ferhat Demir, 13.10.2026; spec addendum 3). Values sent by an
 * older version of the form ("selbstaendig", "anstellung", "offen") fail validation with the
 * normal field error, so the visitor simply chooses again.
 */
export const engagementOptions = [
  { value: "eigene-firma", label: "Über meine eigene GmbH oder AG" },
  { value: "firma-in-gruendung", label: "GmbH oder AG in Gründung" },
] as const;

/** Legend of the engagement choice; also the row label in the profile e-mail. */
export const ENGAGEMENT_LABEL = "Form der Zusammenarbeit";

/**
 * Largest accepted CV. Vercel accepts request bodies up to 4.5 MB, and the Server Action
 * limit in next.config.ts leaves room for the other fields and the multipart overhead.
 */
export const CV_MAX_BYTES = 4 * 1024 * 1024;
export const CV_MAX_LABEL = "4 MB";
