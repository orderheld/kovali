import { describe, expect, it } from "vitest";
import { describeUserAgent } from "./user-agent";

describe("describeUserAgent", () => {
  it("names browser and system of common devices", () => {
    expect(describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15")).toBe("Safari auf macOS");
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0")).toBe("Edge auf Windows");
    expect(describeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1")).toBe("Chrome auf iPhone");
    expect(describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe("Firefox auf Linux");
  });

  it("falls back for unknown or missing values", () => {
    expect(describeUserAgent(null)).toBe("Unbekanntes Gerät");
    expect(describeUserAgent("curl/8.5.0")).toBe("Unbekanntes Gerät");
  });
});
