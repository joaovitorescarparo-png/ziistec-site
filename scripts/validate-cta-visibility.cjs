// Compare computed CTA visibility against the approved 14e1171 build, not a restated CSS rule.
// Serve that build at MOTION_CTA_BASE_URL (default :8772), current dist at :8771.
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require(process.env.MOTION_TEST_MODULES ? path.join(process.env.MOTION_TEST_MODULES, 'playwright') : 'playwright');
const out = process.env.MOTION_REPORT_DIR;
if (!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory');
const baseline = process.env.MOTION_CTA_BASE_URL || 'http://127.0.0.1:8772';
const candidate = 'http://127.0.0.1:8771';
const sizes = [[390, 844], [768, 1024], [1023, 768], [1024, 768]];
const visibility = () => ['.cta-rail', '.cta-rail-mo'].map(selector => {
  const el = document.querySelector(selector), s = getComputedStyle(el), r = el.getBoundingClientRect();
  return { selector, display: s.display, visible: s.display !== 'none' && s.visibility === 'visible' && +s.opacity > 0 && r.width > 0 && r.height > 0 };
});
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.MOTION_TEST_BROWSER, headless: true });
  const report = { browser: browser.version(), baseline, comparisons: [], mutations: [] };
  async function read(url, [width, height], mode, mutation) {
    const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: mode !== 'no-js', reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
    try {
      const page = await context.newPage();
      if (mutation) await page.route('**/styles.css', async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: await response.text() + mutation });
      });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.mk-cta').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1600);
      return await page.evaluate(visibility);
    } finally { await context.close(); }
  }
  try {
    for (const size of sizes) for (const mode of ['motion', 'no-js', 'reduced']) {
      const approved = await read(baseline, size, mode), current = await read(candidate, size, mode);
      assert.deepEqual(current, approved, `CTA visibility ${size} ${mode}`);
      report.comparisons.push({ viewport: size.join('x'), mode, approved, current });
    }
    for (const [size, css] of [[[390, 844], '.cta-rail-mo{display:none!important}'], [[1024, 768], '.cta-rail{display:none!important}']]) {
      const approved = await read(baseline, size, 'motion'), broken = await read(candidate, size, 'motion', css);
      assert.throws(() => assert.deepEqual(broken, approved), assert.AssertionError, 'Visibility mutation must be rejected');
      report.mutations.push({ viewport: size.join('x'), css, rejected: true });
    }
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'cta-visibility.json'), JSON.stringify(report, null, 2));
    console.log('CTA visibility: 12 comparisons passed; 2 mutations rejected');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
