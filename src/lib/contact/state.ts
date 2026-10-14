/** Form state shared by the Server Action and the client form (no runtime dependencies). */

export type ContactField =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "requestType"
  | "services"
  | "projectDescription"
  | "start"
  | "duration"
  | "workload"
  | "workMode"
  | "location"
  | "requirements"
  | "message"
  | "consent";

/** Fields that can carry an error: the form fields plus the optional file. */
export type ContactErrorField = ContactField | "attachment";

/** Fields with one text value. "services" is a multi-select and keeps a list. */
export type ContactTextField = Exclude<ContactField, "services">;

/** Raw values, sent back on errors so the form keeps what the user entered. */
export type ContactValues = Partial<Record<ContactTextField, string>> & { services?: string[] };

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: Partial<Record<ContactErrorField, string>>; values: ContactValues }
  | { status: "error"; message: string; reference?: string; values: ContactValues }
  | { status: "success"; reference: string };

export const initialContactState: ContactState = { status: "idle" };
