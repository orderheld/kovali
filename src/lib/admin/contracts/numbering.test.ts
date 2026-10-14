import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrations } from "../db/migrations";
import * as schema from "../db/schema";
import { formatContractNumber, insertContractWithNumber, isUniqueViolation, nextContractNumber, parseContractNumber } from "./numbering";

describe("contract numbers", () => {
  it("formats and parses V-YYYY-NNNN", () => {
    expect(formatContractNumber(2026, 1)).toBe("V-2026-0001");
    expect(formatContractNumber(2026, 12345)).toBe("V-2026-12345");
    expect(parseContractNumber("V-2026-0042")).toEqual({ year: 2026, seq: 42 });
    expect(parseContractNumber(" V-2027-10001 ")).toEqual({ year: 2027, seq: 10001 });
    expect(parseContractNumber("V-2026-0000")).toBeNull();
    expect(parseContractNumber("V-26-0001")).toBeNull();
    expect(parseContractNumber("M-0042")).toBeNull();
    expect(parseContractNumber(null)).toBeNull();
  });

  it("continues the sequence of the year and ignores other years", () => {
    expect(nextContractNumber(2026, [])).toBe("V-2026-0001");
    expect(nextContractNumber(2026, ["V-2026-0001", "V-2026-0009", "V-2025-0150", "Muster"])).toBe("V-2026-0010");
    expect(nextContractNumber(2027, ["V-2026-0009"])).toBe("V-2027-0001");
    expect(nextContractNumber(2026, ["V-2026-9999"])).toBe("V-2026-10000");
  });

  it("recognises unique violations, also wrapped by Drizzle", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ message: "failed", cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

const dbUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!dbUrl)("contract numbers in the database", () => {
  const pool = new Pool({ connectionString: dbUrl, max: 8 });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    await pool.query("drop schema public cascade; create schema public;");
    for (const m of migrations) await pool.query(m.sql);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("gives concurrent inserts distinct consecutive numbers", async () => {
    const values = { template: "nda", title: "Test", data: {} };
    const rows = await Promise.all(Array.from({ length: 6 }, () => insertContractWithNumber(db, values, 2026)));
    expect(rows.map((r) => r.number).sort()).toEqual(["V-2026-0001", "V-2026-0002", "V-2026-0003", "V-2026-0004", "V-2026-0005", "V-2026-0006"]);
    const next = await insertContractWithNumber(db, values, 2027);
    expect(next.number).toBe("V-2027-0001");
  });
});
