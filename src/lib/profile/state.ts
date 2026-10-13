/** Form state shared by the profile Server Action and the client form (no runtime dependencies). */

export type ProfileField =
  | "name"
  | "email"
  | "phone"
  | "focus"
  | "availability"
  | "engagement"
  | "profileUrl"
  | "cv"
  | "message"
  | "consent";

/** Raw text values, sent back on errors so the form keeps what the user typed (never the file). */
export type ProfileValues = Partial<Record<Exclude<ProfileField, "cv">, string>>;

export type ProfileState =
  | { status: "idle" }
  | { status: "invalid"; errors: Partial<Record<ProfileField, string>>; values: ProfileValues }
  | { status: "error"; message: string; reference?: string; values: ProfileValues }
  | { status: "success"; reference: string };

export const initialProfileState: ProfileState = { status: "idle" };
