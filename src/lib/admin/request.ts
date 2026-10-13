import "server-only";
import { headers } from "next/headers";
import { hashIpAddress } from "./crypto";

/** Client IP as reported by Vercel's proxy (first x-forwarded-for entry). */
export async function requestIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
}

/** Keyed hash of the client IP; the address itself is never stored. */
export async function requestIpHash(): Promise<string> {
  return hashIpAddress(await requestIp());
}

export async function requestUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}
