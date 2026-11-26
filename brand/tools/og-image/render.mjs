// Renders public/opengraph-image.jpg (1200 x 630): the K symbol on a calm light surface,
// in the look of design v3. No text, so a new brand name needs no new image.
//
// Run from the repository root:  node brand/tools/og-image/render.mjs
// Needs Playwright with Chromium (preinstalled in the cloud sessions; there run it with
// NODE_PATH=$(npm root -g)). Chromium writes the JPEG itself.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "../../..");
const source = readFileSync(resolve(root, "src/components/brand/logo-data.ts"), "utf8");
const objectText = source.slice(source.indexOf("export const logoDirections = ") + 30, source.indexOf("} as const satisfies"));
const directions = JSON.parse(`${objectText}}`);
const site = readFileSync(resolve(root, "src/config/site.ts"), "utf8");
const key = site.match(/logoDirection:\s*"([^"]+)"/)[1];
const { symbol, palettes } = directions[key];

const paths = symbol.paths.map((p) => `<path d="${p.d}" fill="${palettes.light[p.role]}"/>`).join("");
const html = `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;display:grid;place-items:center;background:linear-gradient(180deg,#ffffff 0%,#f5f5f7 100%)">
  <div style="width:208px;height:208px;border-radius:48px;background:#fff;display:grid;place-items:center;box-shadow:0 1px 2px rgb(0 0 0/.04),0 24px 64px -24px rgb(0 0 0/.22);border:1px solid #e5e5ea">
    <svg viewBox="0 0 ${symbol.width} ${symbol.height}" width="112" height="112">${paths}</svg>
  </div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: resolve(root, "public/opengraph-image.jpg"), type: "jpeg", quality: 90 });
await browser.close();
console.log("public/opengraph-image.jpg written");
