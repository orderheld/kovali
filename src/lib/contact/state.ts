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

/** Raw text values, sent back on errors so the form keeps what the user typed. */
export type ContactValues = Partial<Record<ContactField, string>>;

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: Partial<Record<ContactField, string>>; values: ContactValues }
  | { status: "error"; message: string; reference?: string; values: ContactValues }
  | { status: "success"; reference: string };

export const initialContactState: ContactState = { status: "idle" };
