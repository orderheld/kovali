import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Best-effort rate limiting per IP. The in-memory window applies per server
 * instance; with Neon configured, a database check adds a limit across instances.
 */
const WINDOWS = [
  { ms: 15 * 60 * 1000, max: 5 },
  { ms: 24 * 60 * 60 * 1000, max: 20 },
];

const hits = new Map<string, number[]>();

export function hashIp(ip: string): string {
  const salt = serverEnv.ipSalt ?? "kovali-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Returns true when the request is allowed and records it. */
export function takeToken(key: string, now = Date.now()): boolean {
  const longest = Math.max(...WINDOWS.map((w) => w.ms));
  const recent = (hits.get(key) ?? []).filter((t) => now - t < longest);
  const limited = WINDOWS.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max);
  if (!limited) recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded on long-running instances.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= longest)) hits.delete(k);
    }
  }
  return !limited;
}

/** Client IP as set by Vercel's proxy. Falls back to a constant so limits still apply. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
