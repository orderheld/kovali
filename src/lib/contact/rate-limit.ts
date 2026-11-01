import "server-only";
import { createHash } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Best-effort rate limiting per IP. The in-memory window applies per server
 * instance; with Neon configured, a database check adds a limit across instances.
 */
type Window = { ms: number; max: number };

const DAY_MS = 24 * 60 * 60 * 1000;

const WINDOWS: Window[] = [
  { ms: 15 * 60 * 1000, max: 5 },
  { ms: DAY_MS, max: 20 },
];

/**
 * All senders together, counted as different senders (IP hashes) with a delivered request.
 * One sender can never reach it alone; it only takes effect when many addresses send at once
 * (a spam wave from many IPs). Normal volume is a few requests a week.
 */
const GLOBAL_WINDOWS: Window[] = [
  { ms: 60 * 60 * 1000, max: 15 },
  { ms: DAY_MS, max: 50 },
];

const hits = new Map<string, number[]>();
let delivered: { at: number; key: string }[] = [];

export function hashIp(ip: string): string {
  const salt = serverEnv.ipSalt ?? "kovali-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Returns true when the request is allowed and records it. */
export function takeToken(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < DAY_MS);
  const limited = WINDOWS.some((w) => recent.filter((t) => now - t < w.ms).length >= w.max);
  if (!limited) recent.push(now);
  hits.set(key, recent);

  // Keep memory bounded on long-running instances.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= DAY_MS)) hits.delete(k);
    }
  }
  return !limited;
}

/** True when too many different senders delivered a request recently. Records nothing. */
export function globalLimitReached(now = Date.now()): boolean {
  delivered = delivered.filter((d) => now - d.at < DAY_MS);
  return GLOBAL_WINDOWS.some((w) => new Set(delivered.filter((d) => now - d.at < w.ms).map((d) => d.key)).size >= w.max);
}

/** Records a delivered request for the overall limit. */
export function recordDelivery(key: string, now = Date.now()): void {
  delivered.push({ at: now, key });
}

/** Client IP as set by Vercel's proxy. Falls back to a constant so limits still apply. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
