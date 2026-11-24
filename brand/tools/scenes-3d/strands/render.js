// Usage: [GRAIN=0] NODE_PATH=$(npm root -g) node render.js <view> <w> <h> <out.png> [scale=2] [extraQuery]
// Renders scene.html at scale x target size in headless Chromium (SwiftShader),
// then downsamples with PIL (LANCZOS) and adds a very fine film grain (post.py).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [view = 'hero', w = '2560', h = '1440', out = 'hero.png', scale = '2', extra = ''] = process.argv.slice(2);
const GRAIN = process.env.GRAIN || '1';
const PORT = process.env.PORT || 8810;
const dir = __dirname;

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  const url = `http://localhost:${PORT}/strands/scene.html?view=${view}&w=${w}&h=${h}&scale=${scale}${extra ? '&' + extra : ''}`;
  console.log('url', url);
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 90000 });
  const dataUrl = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  const raw = path.join(dir, `_raw_${view}_${w}x${h}.png`);
  fs.writeFileSync(raw, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await browser.close();
  console.log('rendered in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  execFileSync('python3', [path.join(dir, 'post.py'), raw, path.resolve(dir, out), w, h, GRAIN], { stdio: 'inherit' });
  fs.unlinkSync(raw);
})();
