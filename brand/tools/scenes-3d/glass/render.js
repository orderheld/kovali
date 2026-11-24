// Usage: NODE_PATH=$(npm root -g) node render.js <view|x> <w> <h> <supersample> <out.png> [extra query]
// (view 'x' = take the view from the extra query string)
// Renders scene.html at w*ss x h*ss in headless Chromium (SwiftShader WebGL),
// then downsamples with PIL (Lanczos) and applies a sub-LSB dither (post.py).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [view = 'hero', w = '1280', h = '720', ss = '1', out = 'out.png', extra = ''] = process.argv.slice(2);
const PORT = process.env.PORT || 8810;
const RW = Math.round(+w * +ss), RH = Math.round(+h * +ss);

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const url = `http://localhost:${PORT}/glass/scene.html?w=${RW}&h=${RH}${view !== 'x' ? '&view=' + view : ''}${extra ? '&' + extra : ''}`;
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__done, null, { timeout: 30 * 60 * 1000, polling: 500 });
  const err = await page.evaluate(() => window.__err || '');
  if (err) { console.log('render error', err); }
  const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
  await browser.close();
  const raw = path.join(path.dirname(path.resolve(out)), '.raw_' + path.basename(out));
  fs.writeFileSync(raw, Buffer.from(data.split(',')[1], 'base64'));
  console.log(`rendered ${RW}x${RH} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  execFileSync('python3', [path.join(__dirname, 'post.py'), raw, path.resolve(out), w, h], { stdio: 'inherit' });
})();
