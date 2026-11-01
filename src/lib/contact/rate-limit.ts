import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Best-effort rate limiting per IP. The in-memory window applies per server
 * instance; with Neon configured, a database check adds a limit across instances.
 */
type Window = { ms: number; max: number };

const WINDOWS: Window[] = [
  { ms: 15 * 60 * 1000, max: 5 },
  { ms: 24 * 60 * 60 * 1000, max: 20 },
];

/**
 * All senders together. Far above the normal volume of a few requests a week, so it only takes
 * effect when many addresses send at once (a spam wave from many IPs).
 */
const GLOBAL_WINDOWS: Window[] = [
  { ms: 60 * 60 * 1000, max: 15 },
  { ms: 24 * 60 * 60 * 1000, max: 50 },
];
const GLOBAL_KEY = "*";

const hits = new Map<string, number[]>();

export function hashIp(ip: string): string {
  const salt = serverEnv.ipSalt ?? "kovali-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Returns true when the request is allowed and records it. */
export function takeToken(key: string, now = Date.now()): boolean {
  return take(key, WINDOWS, now);
}

/** Like takeToken, for all senders together. */
export function takeGlobalToken(now = Date.now()): boolean {
  return take(GLOBAL_KEY, GLOBAL_WINDOWS, now);
}

function take(key: string, windows: Window[], now: number): boolean {
  const longest = Math.max(...windows.map((w) => w.ms));
  const recent = (hits.get(key) ?? []).filter((t) => now - t < longest);
  const limited = windows.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max);
  if (!limited) recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded on long-running instances. Every window is at most a day long.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= 24 * 60 * 60 * 1000)) hits.delete(k);
    }
  }
  return !limited;
}

/** Client IP as set by Vercel's proxy. Falls back to a constant so limits still apply. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
