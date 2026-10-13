import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { secretBytes } from "./env";

/**
 * Cryptography for the admin area: keys derived from ADMIN_SECRET, AES-256-GCM for stored
 * documents and HMAC for pseudonymous IP hashes.
 *
 * Encrypted blobs have the layout: version (1 byte) | IV (12) | auth tag (16) | ciphertext.
 * Version 1 uses the key derived with the label "kovali-admin/files/v1".
 */

const BLOB_VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function deriveKey(label: string): Buffer {
  const secret = secretBytes();
  if (!secret) throw new Error("ADMIN_SECRET fehlt oder ist zu kurz.");
  return Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), label, 32));
}

let fileKey: Buffer | null = null;
let ipKey: Buffer | null = null;

function filesKeyV1(): Buffer {
  fileKey ??= deriveKey("kovali-admin/files/v1");
  return fileKey;
}

export function encryptBlob(plain: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", filesKeyV1(), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([BLOB_VERSION]), iv, cipher.getAuthTag(), data]);
}

export function decryptBlob(blob: Buffer): Buffer {
  if (blob.length < 1 + IV_BYTES + TAG_BYTES || blob[0] !== BLOB_VERSION) {
    throw new Error("Unbekanntes Format der verschlüsselten Datei.");
  }
  const iv = blob.subarray(1, 1 + IV_BYTES);
  const tag = blob.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", filesKeyV1(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(1 + IV_BYTES + TAG_BYTES)), decipher.final()]);
}

/** Encrypts a UTF-8 string (e.g. text extracted from a CV). */
export function encryptText(text: string): Buffer {
  return encryptBlob(Buffer.from(text, "utf8"));
}

export function decryptText(blob: Buffer): string {
  return decryptBlob(blob).toString("utf8");
}

/** Pseudonymous, keyed hash of an IP address. Not reversible without ADMIN_SECRET. */
export function hashIpAddress(ip: string): string {
  ipKey ??= deriveKey("kovali-admin/ip/v1");
  return createHmac("sha256", ipKey).update(ip).digest("base64url").slice(0, 22);
}

export function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
