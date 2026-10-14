import { describe, expect, it } from "vitest";
import { safePortalTarget, invitationLink, originFrom, resetLink } from "./links";
import { hashPassword, newPasswordSchema, parseScryptHash, passwordPairSchema, PASSWORD_MIN, verifyPassword } from "./password";
import { createLinkToken, INVITATION_TTL_MS, isTokenShape, linkUsable, RESET_TTL_MS, resetRecentlyRequested, tokenHash } from "./tokens";

describe("password hashing", () => {
  it("hashes with scrypt, a random salt and stored parameters", async () => {
    const a = await hashPassword("Korrekt-Pferd-42");
    const b = await hashPassword("Korrekt-Pferd-42");
    expect(a).toMatch(/^scrypt:32768:8:3:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    const parsed = parseScryptHash(a);
    expect(parsed?.salt.length).toBe(16);
    expect(parsed?.hash.length).toBe(32);
  });

  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("Bergwanderung 2026");
    expect(await verifyPassword("Bergwanderung 2026", stored)).toBe(true);
    expect(await verifyPassword("bergwanderung 2026", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
    expect(await verifyPassword("x".repeat(201), stored)).toBe(false);
  });

  it("treats composed and decomposed umlauts as the same password", async () => {
    const stored = await hashPassword("Grüezi-mitenand");
    expect(await verifyPassword("Grüezi-mitenand", stored)).toBe(true);
  });

  it("rejects damaged or foreign hashes without throwing", async () => {
    expect(await verifyPassword("irgendwas-langes", null)).toBe(false);
    expect(await verifyPassword("irgendwas-langes", "pbkdf2-sha256:600000:abc:def")).toBe(false);
    expect(parseScryptHash("scrypt:1048576:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")).toBeNull();
    expect(parseScryptHash("scrypt:32768:8:3:short:short")).toBeNull();
  });

  it("refuses to hash passwords that are too short", async () => {
    await expect(hashPassword("kurz")).rejects.toThrow();
  });

  it("requires at least 10 characters and matching repetition", () => {
    expect(PASSWORD_MIN).toBe(10);
    expect(newPasswordSchema.safeParse("123456789").success).toBe(false);
    expect(newPasswordSchema.safeParse("aaaaaaaaaaaa").success).toBe(false);
    expect(newPasswordSchema.safeParse("Sonnenblume7").success).toBe(true);
    const mismatch = passwordPairSchema.safeParse({ password: "Sonnenblume7", passwordRepeat: "Sonnenblume8" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toEqual(["passwordRepeat"]);
    expect(passwordPairSchema.safeParse({ password: "Sonnenblume7", passwordRepeat: "Sonnenblume7" }).success).toBe(true);
  });
});

describe("one-time links", () => {
  const now = new Date("2026-10-13T12:00:00Z");

  it("creates 32 random bytes and stores only their SHA-256", () => {
    const a = createLinkToken("einladung", now);
    const b = createLinkToken("einladung", now);
    expect(isTokenShape(a.token)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(tokenHash(a.token));
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).not.toContain(a.token);
  });

  it("is valid 7 days for invitations and 1 hour for resets", () => {
    expect(createLinkToken("einladung", now).expiresAt.getTime() - now.getTime()).toBe(INVITATION_TTL_MS);
    expect(createLinkToken("reset", now).expiresAt.getTime() - now.getTime()).toBe(RESET_TTL_MS);
    expect(INVITATION_TTL_MS).toBe(7 * 24 * 3600 * 1000);
    expect(RESET_TTL_MS).toBe(3600 * 1000);
  });

  it("only accepts well-formed tokens", () => {
    expect(isTokenShape("a".repeat(43))).toBe(true);
    expect(isTokenShape("a".repeat(42))).toBe(false);
    expect(isTokenShape(`${"a".repeat(42)}'`)).toBe(false);
    expect(isTokenShape(undefined)).toBe(false);
  });

  it("decides by status and expiry whether a link can be used", () => {
    const valid = { tokenHash: "x", tokenExpiresAt: new Date(now.getTime() + 1000) };
    expect(linkUsable({ ...valid, status: "eingeladen" }, "einladung", now)).toBe(true);
    expect(linkUsable({ ...valid, status: "aktiv" }, "einladung", now)).toBe(true);
    expect(linkUsable({ ...valid, status: "gesperrt" }, "einladung", now)).toBe(false);
    expect(linkUsable({ ...valid, status: "aktiv" }, "reset", now)).toBe(true);
    // A reset link must not activate an invited account without the privacy notice.
    expect(linkUsable({ ...valid, status: "eingeladen" }, "reset", now)).toBe(false);
    expect(linkUsable({ ...valid, status: "gesperrt" }, "reset", now)).toBe(false);
    expect(linkUsable({ status: "aktiv", tokenHash: "x", tokenExpiresAt: new Date(now.getTime() - 1) }, "reset", now)).toBe(false);
    expect(linkUsable({ status: "aktiv", tokenHash: null, tokenExpiresAt: valid.tokenExpiresAt }, "reset", now)).toBe(false);
  });

  it("throttles repeated reset requests but not after an invitation", () => {
    expect(resetRecentlyRequested(new Date(now.getTime() + RESET_TTL_MS - 60_000), now)).toBe(true);
    expect(resetRecentlyRequested(new Date(now.getTime() + RESET_TTL_MS - 6 * 60_000), now)).toBe(false);
    expect(resetRecentlyRequested(new Date(now.getTime() + INVITATION_TTL_MS - 60_000), now)).toBe(false);
    expect(resetRecentlyRequested(null, now)).toBe(false);
  });
});

describe("portal links", () => {
  it("only redirects to portal pages after the login", () => {
    expect(safePortalTarget("/portal/vakanzen/12")).toBe("/portal/vakanzen/12");
    expect(safePortalTarget("/portal")).toBe("/portal");
    expect(safePortalTarget("https://evil.example/portal")).toBe("/portal");
    expect(safePortalTarget("//evil.example")).toBe("/portal");
    expect(safePortalTarget("/portal/../admin")).toBe("/portal");
    expect(safePortalTarget("/admin")).toBe("/portal");
    expect(safePortalTarget("/portal/login")).toBe("/portal");
    expect(safePortalTarget("/portal/api/dokumente/1")).toBe("/portal");
    expect(safePortalTarget(undefined)).toBe("/portal");
  });

  it("builds links from a checked origin", () => {
    expect(originFrom("localhost:3304", null)).toBe("http://localhost:3304");
    expect(originFrom("www.kovali.ch", "https")).toBe("https://www.kovali.ch");
    expect(originFrom("evil.example/path", "https")).toBeNull();
    expect(originFrom("www.kovali.ch", "javascript")).toBe("https://www.kovali.ch");
    expect(invitationLink("https://www.kovali.ch/", "abc")).toBe("https://www.kovali.ch/portal/einladung?token=abc");
    expect(resetLink("https://www.kovali.ch", "abc")).toBe("https://www.kovali.ch/portal/passwort?token=abc");
  });
});
