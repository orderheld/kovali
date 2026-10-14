/** URLs of the candidate portal. Pure functions, shared by pages, actions and tests. */

/** Only relative portal paths are accepted as target after the login (no open redirect). */
export function safePortalTarget(value: unknown): string {
  if (typeof value !== "string") return "/portal";
  if (!/^\/portal(\/[A-Za-z0-9\-._~%/?=&]*)?$/.test(value) || value.startsWith("//") || value.includes("..")) return "/portal";
  if (/^\/portal\/(login|einladung|passwort|api)(\/|\?|$)/.test(value)) return "/portal";
  return value;
}

/** Origin from request headers, or null when they look odd (then the configured site URL is used). */
export function originFrom(host: string | null | undefined, proto: string | null | undefined): string | null {
  const h = host?.split(",")[0]?.trim();
  if (!h || !/^[a-z0-9.-]+(:\d{1,5})?$/i.test(h)) return null;
  const p = proto?.split(",")[0]?.trim().toLowerCase();
  const scheme = p === "http" || p === "https" ? p : /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) ? "http" : "https";
  return `${scheme}://${h}`;
}

export function invitationLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/portal/einladung?token=${encodeURIComponent(token)}`;
}

export function resetLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/portal/passwort?token=${encodeURIComponent(token)}`;
}
