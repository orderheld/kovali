import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-friendly reference shown to the sender and stored with the request, e.g. KOV-20261013-7KQ4. */
export function createReference(now = new Date()): string {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(now).replaceAll("-", "");
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `KOV-${day}-${suffix}`;
}
