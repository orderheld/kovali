/**
 * Result of creating or renewing a portal link. The link is shown once in the browser and is
 * not stored anywhere in plain text; the token travels back only for "Per E-Mail senden",
 * where the server checks it against the stored hash.
 */
export type LinkState =
  | { status: "idle" }
  | { status: "error"; message: string; errors?: Record<string, string> }
  | {
      status: "success";
      message: string;
      link: { accountId: number; candidateId: number; url: string; token: string; email: string; expiresAt: string; kind: "einladung" | "neu" };
    };

export const linkIdle: LinkState = { status: "idle" };
