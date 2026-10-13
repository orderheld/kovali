/** Options of the profile form for specialists. Shared by the client form and the server validation. */

export const focusOptions = [
  { value: "business-analysis", label: "Business Analysis" },
  { value: "requirements-engineering", label: "Requirements Engineering" },
  { value: "application-management", label: "Application Management" },
  { value: "test-management", label: "Test Management" },
  { value: "test-engineering", label: "Test Engineering" },
  { value: "andere", label: "Anderer Schwerpunkt" },
] as const;

export const availabilityOptions = [
  { value: "sofort", label: "Sofort" },
  { value: "1-monat", label: "Innerhalb eines Monats" },
  { value: "1-3-monate", label: "In ein bis drei Monaten" },
  { value: "spaeter", label: "In mehr als drei Monaten" },
] as const;

export const engagementOptions = [
  { value: "selbstaendig", label: "Selbständig als Subunternehmen" },
  { value: "anstellung", label: "Anstellung" },
  { value: "offen", label: "Offen" },
] as const;

/**
 * Largest accepted CV. Vercel accepts request bodies up to 4.5 MB, and the Server Action
 * limit in next.config.ts leaves room for the other fields and the multipart overhead.
 */
export const CV_MAX_BYTES = 4 * 1024 * 1024;
export const CV_MAX_LABEL = "4 MB";
