import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_TOKEN_AGE_MS, MIN_FILL_MS, checkFormToken, issueFormToken } from "@/lib/contact/form-token";
import { SPAM_SCORE, checkSpam } from "@/lib/contact/spam";

/**
 * Spam protection of the contact form: the signed form token, the content check and the
 * Server Action that applies them. E-mail and request headers are stubbed; everything else is
 * the real code. All names, addresses and texts are fictional.
 */

const mocks = vi.hoisted(() => ({
  sendContactEmail: vi.fn(async () => ({ ok: true as const, id: "test-id" })),
  ip: { current: "203.0.113.1" },
}));
vi.mock("@/lib/contact/email", () => ({ sendContactEmail: mocks.sendContactEmail }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": mocks.ip.current }) }));
const { sendContactEmail } = mocks;

const request = {
  name: "Anna Muster",
  company: "Beispiel Consulting AG",
  texts: ["Business Analysis für die Ablösung einer Fachapplikation in einem laufenden Kundenmandat.", undefined, undefined, undefined],
};

describe("content check (spam.ts)", () => {
  it("lets ordinary requests through, in German, French and English, with a link or two", () => {
    expect(checkSpam(request).spam).toBe(false);
    expect(
      checkSpam({
        name: "Luc Exemple",
        company: "Exemple SA",
        texts: ["Nous cherchons un Business Analyst pour un projet de migration, 80 %, dès janvier.", "IREB, Jira", undefined, "Lausanne"],
      }).spam,
    ).toBe(false);
    expect(
      checkSpam({
        name: "John Example",
        company: "Example Digital Ltd",
        texts: [
          "We need a test manager for a core banking upgrade. Job ad: https://example.com/jobs/123, profile: https://example.com/profile.pdf",
          "ISTQB, crypto custody experience is a plus",
          "Outsourcing partner of a Swiss bank.",
          undefined,
        ],
      }).spam,
    ).toBe(false);
    expect(checkSpam({ ...request, name: "Fiona MacKenzie-McLeod", company: "SwissTestLab GmbH" }).spam).toBe(false);
  });

  it("stops link lists, link markup and links in the name", () => {
    const links = "https://a.example https://b.example www.c.example http://d.example";
    expect(checkSpam({ ...request, texts: [`Gute Angebote: ${links}`] })).toMatchObject({ spam: true, reasons: ["links"] });
    expect(checkSpam({ ...request, texts: ["Hier klicken [url=https://example.com]Angebot[/url] jetzt"] }).spam).toBe(true);
    expect(checkSpam({ ...request, texts: ['Hier <a href="https://example.com">klicken</a>'] }).spam).toBe(true);
    expect(checkSpam({ ...request, name: "www.example.com" }).spam).toBe(true);
  });

  it("counts https://www. as one link", () => {
    expect(checkSpam({ ...request, texts: ["Profil: https://www.example.com/profil"] }).reasons).not.toContain("links");
  });

  it("stops text in Cyrillic or Chinese script", () => {
    expect(checkSpam({ ...request, texts: ["Здравствуйте, предлагаем продвижение вашего сайта в поисковых системах."] }).spam).toBe(true);
    expect(checkSpam({ ...request, texts: ["您好，我们提供网站推广服务，价格优惠，欢迎联系我们。"] }).spam).toBe(true);
    // A name in Cyrillic in an otherwise German request is fine.
    expect(checkSpam({ ...request, name: "Олена Приклад" }).spam).toBe(false);
  });

  it("stops typical sales pitches", () => {
    const seo = checkSpam({
      name: "Mark Example",
      company: "Rank Agency",
      texts: ["Dear Sir, we are a leading SEO agency. We can get your website on the first page of Google with backlinks."],
    });
    expect(seo.spam).toBe(true);
    expect(seo.reasons).toEqual(expect.arrayContaining(["seo", "ranking"]));
    expect(
      checkSpam({
        name: "Raj Example",
        company: "Example Tech",
        texts: [
          "Dear business owner, I was checking your website and noticed it is not ranking on Google. We offer affordable SEO services with a free audit.",
        ],
      }).spam,
    ).toBe(true);
    expect(
      checkSpam({
        name: "Max Beispiel",
        company: "Beispiel Marketing",
        texts: ["Wir haben Ihre Website analysiert. Gerne erstellen wir eine kostenlose SEO-Analyse, Suchmaschinenoptimierung zu fairen Preisen."],
      }).spam,
    ).toBe(true);
    expect(checkSpam({ ...request, texts: ["Cheap viagra and cialis without prescription."] }).spam).toBe(true);
    expect(checkSpam({ ...request, texts: ["Payday loans with no credit check, approved in 2 hours."] }).spam).toBe(true);
  });

  it("lets requests through that only resemble spam", () => {
    const passes = (input: Partial<typeof request>) => expect(checkSpam({ ...request, ...input }).spam).toBe(false);
    // A client in the gambling business, a formal greeting, a leading firm with two links.
    passes({ company: "Grand Casino Beispiel AG", texts: ["Wir suchen einen Business Analyst für unser Casino-Managementsystem."] });
    passes({
      name: "Paul Example",
      company: "Example Advisory AG",
      texts: [
        "Dear Sir or Madam, we are a leading consultancy and look for a Requirements Engineer. Details: https://example.com/job and https://example.com/team",
      ],
    });
    // Several job ads with real text in between.
    passes({
      texts: [
        "Wir haben aktuell vier passende Mandate und würden gerne über eine Zusammenarbeit sprechen. Die Ausschreibungen: https://example.com/a für die Ablösung der Fachapplikation, https://example.com/b für das Testmanagement, https://example.com/c für Requirements Engineering im Zahlungsverkehr und https://example.com/d für die Prozessanalyse im Kundenservice.",
      ],
    });
    // A placeholder from a copied ad, a Markdown link, a Cyrillic name with a short German text.
    passes({ texts: ["Die Ausschreibung finden Sie unter [Link]. Start im Januar."] });
    passes({ texts: ["Profil: [Stelle](https://example.com/stelle)"] });
    passes({ name: "Олена Приклад", texts: ["Kurze Anfrage: BA, 80 %."] });
    // Opt-out and offshore as part of a real project, a CamelCase company.
    passes({ texts: ["Wir bauen einen Opt-out-Prozess für Newsletter und arbeiten mit einem Offshore-Team in Indien."] });
    passes({ company: "SwissQualityTestCenter GmbH" });
  });

  it("stops bots that put the same text everywhere or random names", () => {
    expect(checkSpam({ name: "Testanfrage Nummer eins", company: "x", texts: ["Testanfrage Nummer eins", "Testanfrage Nummer eins"] }).spam).toBe(true);
    expect(checkSpam({ ...request, name: "jJxkqQbWvLz", texts: [...request.texts, "https://example.com"] }).spam).toBe(false);
    expect(
      checkSpam({ ...request, name: "jJxkqQbWvLz", texts: ["Kurz: https://a.example https://b.example https://c.example"] }).score,
    ).toBeGreaterThanOrEqual(SPAM_SCORE);
    // A short text equal to the name may be a signature.
    expect(checkSpam({ ...request, texts: [...request.texts, "Anna Muster"] }).spam).toBe(false);
  });
});

describe("form token (form-token.ts)", () => {
  const now = Date.UTC(2026, 10, 1, 10, 0, 0);

  it("accepts a token after the minimum fill time and within a day", () => {
    const token = issueFormToken(now);
    expect(checkFormToken(token, now + MIN_FILL_MS)).toMatchObject({ ok: true });
    expect(checkFormToken(token, now + MAX_TOKEN_AGE_MS)).toMatchObject({ ok: true });
  });

  it("refuses a missing, forged or changed token", () => {
    expect(checkFormToken(null, now)).toEqual({ ok: false, reason: "missing" });
    expect(checkFormToken("", now)).toEqual({ ok: false, reason: "missing" });
    expect(checkFormToken("v1.abc.def", now)).toEqual({ ok: false, reason: "invalid" });
    const token = issueFormToken(now);
    const [version, , nonce, signature] = token.split(".");
    // An earlier time with the old signature, to get past the fill time.
    const backdated = [version, (now - 60_000).toString(36), nonce, signature].join(".");
    expect(checkFormToken(backdated, now + MIN_FILL_MS)).toEqual({ ok: false, reason: "invalid" });
    expect(checkFormToken(`${token}x`, now + MIN_FILL_MS)).toEqual({ ok: false, reason: "invalid" });
  });

  it("refuses a request sent too fast, an old token and one from the future", () => {
    const token = issueFormToken(now);
    expect(checkFormToken(token, now + MIN_FILL_MS - 1)).toEqual({ ok: false, reason: "too_fast" });
    expect(checkFormToken(token, now + MAX_TOKEN_AGE_MS + 1)).toEqual({ ok: false, reason: "expired" });
    expect(checkFormToken(issueFormToken(now + 10 * 60_000), now)).toEqual({ ok: false, reason: "invalid" });
  });

  it("gives every token its own random part", () => {
    expect(issueFormToken(now)).not.toBe(issueFormToken(now));
  });
});

describe("contact action with spam protection", () => {
  let submitContact: typeof import("@/app/(site)/kontakt/actions").submitContact;
  let ipCounter = 0;
  const idle = { status: "idle" } as const;

  beforeEach(async () => {
    vi.resetModules();
    sendContactEmail.mockClear();
    // A fresh IP per test, so the in-memory rate limit of earlier tests does not apply.
    mocks.ip.current = `203.0.113.${++ipCounter}`;
    ({ submitContact } = await import("@/app/(site)/kontakt/actions"));
  });

  async function tokenFrom(secondsAgo: number) {
    const { issueFormToken: issue } = await import("@/lib/contact/form-token");
    return issue(Date.now() - secondsAgo * 1000);
  }

  function form(fields: Record<string, string> = {}) {
    const data = new FormData();
    const all: Record<string, string> = {
      requestType: "contracting",
      projectDescription: "Business Analysis für die Ablösung einer Fachapplikation in einem laufenden Mandat.",
      company: "Beispiel Consulting AG",
      name: "Anna Muster",
      email: "anna.muster@example.com",
      consent: "on",
      website: "",
      ...fields,
    };
    for (const [key, value] of Object.entries(all)) data.set(key, value);
    return data;
  }

  it("delivers a request with a valid token", async () => {
    const state = await submitContact(idle, form({ formToken: await tokenFrom(30) }));
    expect(state.status).toBe("success");
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it("refuses a request without token (a bot or a browser without JavaScript) and keeps the values", async () => {
    const state = await submitContact(idle, form());
    expect(state).toMatchObject({ status: "error", newToken: true, values: { name: "Anna Muster" } });
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("refuses a request sent right after the first click, without a new token", async () => {
    const state = await submitContact(idle, form({ formToken: await tokenFrom(1) }));
    expect(state.status).toBe("error");
    expect(state.status === "error" && state.newToken).toBeFalsy();
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("answers a filled hidden field with success and sends nothing", async () => {
    const state = await submitContact(idle, form({ formToken: await tokenFrom(30), website: "https://example.com" }));
    expect(state.status).toBe("success");
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("refuses spam content with the e-mail address as a way out", async () => {
    const state = await submitContact(
      idle,
      form({
        formToken: await tokenFrom(30),
        projectDescription: "Dear Sir, we are a leading SEO agency. Get on the first page of Google with our backlinks.",
      }),
    );
    expect(state.status).toBe("error");
    expect(state.status === "error" && state.message).toContain("info@kovali.ch");
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it("sends a request only once when the same token comes twice", async () => {
    const formToken = await tokenFrom(30);
    const first = await submitContact(idle, form({ formToken }));
    const second = await submitContact(idle, form({ formToken }));
    expect(first.status).toBe("success");
    expect(second).toEqual(first);
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it("sends a request only once when the same token comes twice at the same time", async () => {
    const formToken = await tokenFrom(30);
    const [first, second] = await Promise.all([submitContact(idle, form({ formToken })), submitContact(idle, form({ formToken }))]);
    expect(first.status).toBe("success");
    expect(second).toEqual(first);
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it("keeps the token usable after a refused request, so a corrected one goes through", async () => {
    const formToken = await tokenFrom(30);
    const invalid = await submitContact(idle, form({ formToken, email: "" }));
    expect(invalid.status).toBe("invalid");
    const corrected = await submitContact(idle, form({ formToken }));
    expect(corrected.status).toBe("success");
    expect(sendContactEmail).toHaveBeenCalledTimes(1);
  });

  it("stops a wave from many addresses with the overall limit", async () => {
    const results = [];
    for (let i = 0; i < 16; i++) {
      mocks.ip.current = `198.51.100.${i}`;
      results.push((await submitContact(idle, form({ formToken: await tokenFrom(30) }))).status);
    }
    expect(results.filter((s) => s === "success")).toHaveLength(15);
    expect(results.at(-1)).toBe("error");
  });

  it("does not let one sender or refused spam use up the overall limit", async () => {
    // One address at its own limit.
    const own = [];
    for (let i = 0; i < 6; i++) own.push((await submitContact(idle, form({ formToken: await tokenFrom(30) }))).status);
    expect(own).toEqual(["success", "success", "success", "success", "success", "error"]);
    // Refused spam from many addresses.
    for (let i = 0; i < 30; i++) {
      mocks.ip.current = `198.51.100.${i}`;
      const state = await submitContact(idle, form({ formToken: await tokenFrom(30), projectDescription: "Buy backlinks for SEO: https://example.com/a https://example.com/b https://example.com/c https://example.com/d" }));
      expect(state.status).toBe("error");
    }
    // Another sender still gets through.
    mocks.ip.current = "192.0.2.10";
    expect((await submitContact(idle, form({ formToken: await tokenFrom(30) }))).status).toBe("success");
    expect(sendContactEmail).toHaveBeenCalledTimes(6);
  });
});
