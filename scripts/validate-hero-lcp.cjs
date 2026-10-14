// V3.2 hero LCP closure: paired cold loads, approved baseline 0c6b4ff (:8770) vs candidate (:8771),
// same runtime as validate-hero.cjs (MOTION_TEST_MODULES, MOTION_TEST_BROWSER, MOTION_REPORT_DIR,
// serve-motion-validation.cjs). Desktop/tablet at CPU 1x and 390x844 (R4 mobile) at CPU 4x.
// `--runs N` sets the pairs per viewport (default 7); a pair is valid when both loads report an LCP
// and the candidate actually ran the hero entrance.
const dependency = name => require(process.env.MOTION_TEST_MODULES ? require('node:path').join(process.env.MOTION_TEST_MODULES, name) : name);
const { chromium } = dependency('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = process.env.MOTION_REPORT_DIR;
if (!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory');
fs.mkdirSync(out, { recursive: true });
const runs = Number(process.argv[process.argv.indexOf('--runs') + 1]) || 7;
const VIEWPORTS = [
  { name: '1440x900', viewport: { width: 1440, height: 900 }, cpu: 1 },
  { name: '1280x800', viewport: { width: 1280, height: 800 }, cpu: 1 },
  { name: '1280x720', viewport: { width: 1280, height: 720 }, cpu: 1 },
  { name: '1024x768', viewport: { width: 1024, height: 768 }, cpu: 1 },
  { name: '390x844', viewport: { width: 390, height: 844 }, cpu: 4, isMobile: true, hasTouch: true }
];
const INIT = () => {
  const e = window.lcpEvidence = { lcp: [], fcp: 0, titleFrame: null, heroCalls: 0, titleKeys: null, cls: 0 };
  new PerformanceObserver(l => { for (const x of l.getEntries()) e.lcp.push({ t: x.startTime, el: x.element?.className || x.element?.nodeName || '', size: x.size }); }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const x of l.getEntries()) if (x.name === 'first-contentful-paint') e.fcp = x.startTime; }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver(l => { for (const x of l.getEntries()) if (!x.hadRecentInput) e.cls += x.value; }).observe({ type: 'layout-shift', buffered: true });
  // The title's state in the first rendering frame where it exists: it must already be painted.
  const frame = t => {
    const title = document.querySelector('.mk-hero-title');
    if (title && !e.titleFrame) { const s = getComputedStyle(title); e.titleFrame = { t, opacity: +s.opacity, clipPath: s.clipPath, visibility: s.visibility, pending: document.documentElement.classList.contains('motion-pending') }; }
    if (!e.titleFrame) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keys, options) {
    if (this.closest?.('.mk-hero') && options?.duration > 1) e.heroCalls++;
    if (this.classList?.contains('mk-hero-title')) e.titleKeys = keys[0];
    return animate.call(this, keys, options);
  };
};
const stats = values => { const s = [...values].sort((a, b) => a - b); const q = f => s[Math.min(s.length - 1, Math.ceil(f * s.length) - 1)]; return { median: q(0.5), p75: q(0.75), worst: s.at(-1) }; };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.MOTION_TEST_BROWSER, headless: true });
  const report = { browser: browser.version(), runs, viewports: [] };
  async function load(v, port) {
    const context = await browser.newContext({ viewport: v.viewport, isMobile: !!v.isMobile, hasTouch: !!v.hasTouch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.addInitScript(INIT);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: v.cpu });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForTimeout(2600);
    const e = await page.evaluate(() => window.lcpEvidence);
    await context.close();
    const last = e.lcp.at(-1) || { t: 0, el: '' };
    const title = e.lcp.find(x => x.el.includes('mk-hero-title'));
    return { lcp: Math.round(last.t), element: last.el, titleFirstPaint: title ? Math.round(title.t) : null, fcp: Math.round(e.fcp), titleFrame: e.titleFrame, heroRan: e.heroCalls > 0, titleKeys: e.titleKeys, cls: +e.cls.toFixed(4) };
  }
  for (const v of VIEWPORTS) {
    const pairs = [];
    for (let attempt = 0; pairs.length < runs && attempt < runs * 3; attempt++) {
      // Alternate the order inside each pair so neither build always loads first.
      const order = attempt % 2 ? [8771, 8770] : [8770, 8771], result = {};
      for (const port of order) result[port === 8770 ? 'baseline' : 'candidate'] = await load(v, port);
      const { baseline, candidate } = result;
      const valid = baseline.lcp > 0 && candidate.lcp > 0 && candidate.heroRan;
      if (valid) pairs.push({ baseline, candidate, delta: candidate.lcp - baseline.lcp });
      console.log(v.name, valid ? 'pair' : 'invalid', baseline.lcp, candidate.lcp, candidate.element, candidate.heroRan);
    }
    assert.equal(pairs.length, runs, `${v.name}: ${runs} valid pairs`);
    const entry = {
      viewport: v.name, cpu: v.cpu, pairs: pairs.length,
      baseline: stats(pairs.map(p => p.baseline.lcp)), candidate: stats(pairs.map(p => p.candidate.lcp)), delta: stats(pairs.map(p => p.delta)),
      lcpElements: { baseline: [...new Set(pairs.map(p => p.baseline.element))], candidate: [...new Set(pairs.map(p => p.candidate.element))] },
      titleFirstPaint: { baseline: stats(pairs.map(p => p.baseline.titleFirstPaint ?? Infinity)), candidate: stats(pairs.map(p => p.candidate.titleFirstPaint ?? Infinity)) },
      heroRan: pairs.every(p => p.candidate.heroRan), samples: pairs
    };
    // The title never waits for a reveal: opaque, unclipped and visible in its first frame, animated
    // only from opacity 1 without a mask, and no causal LCP regression above 200 ms.
    for (const p of pairs) {
      const f = p.candidate.titleFrame;
      assert.ok(f && f.opacity === 1 && f.clipPath === 'none' && f.visibility === 'visible', `${v.name}: title hidden in its first frame ${JSON.stringify(f)}`);
      assert.ok(!p.candidate.titleKeys || (p.candidate.titleKeys.opacity === 1 && !p.candidate.titleKeys.clipPath), `${v.name}: title reveal keys ${JSON.stringify(p.candidate.titleKeys)}`);
    }
    assert.ok(entry.delta.median <= 200 && entry.delta.p75 <= 200, `${v.name}: LCP delta ${JSON.stringify(entry.delta)}`);
    report.viewports.push(entry);
    console.log(JSON.stringify({ ...entry, samples: undefined }));
  }
  fs.writeFileSync(path.join(out, 'hero-lcp.json'), JSON.stringify(report, null, 1));
  await browser.close();
  console.log('hero LCP validation passed');
})().catch(error => { console.error(error); process.exit(1); });
