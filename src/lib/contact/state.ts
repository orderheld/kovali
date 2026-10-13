/** Form state shared by the Server Action and the client form (no runtime dependencies). */

export type ContactField =
  | "name"
  | "company"
  | "email"
  | "phone"
  | "requestType"
  | "service"
  | "projectDescription"
  | "start"
  | "workMode"
  | "location"
  | "message"
  | "consent";

/** Fields that can carry an error: the text fields plus the optional file. */
export type ContactErrorField = ContactField | "attachment";

/** Raw text values, sent back on errors so the form keeps what the user typed. */
export type ContactValues = Partial<Record<ContactField, string>>;

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: Partial<Record<ContactErrorField, string>>; values: ContactValues }
  | { status: "error"; message: string; reference?: string; values: ContactValues }
  | { status: "success"; reference: string };

export const initialContactState: ContactState = { status: "idle" };
