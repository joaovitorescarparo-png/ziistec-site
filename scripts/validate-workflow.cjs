// V3.2 M06–M10 browser validation: pinned workflow (pin, track, dwells, T12, T23) against the approved
// static build. Same runtime as validate-hero.cjs: MOTION_TEST_MODULES, MOTION_TEST_BROWSER,
// MOTION_REPORT_DIR, and serve-motion-validation.cjs (baseline :8770, candidate :8771).
// `--video` also records the 01 → 02 → 03 → 02 → 01 scroll at 1440×900 and 1280×720.
const dependency = name => require(process.env.MOTION_TEST_MODULES ? require('node:path').join(process.env.MOTION_TEST_MODULES, name) : name);
const { chromium } = dependency('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = process.env.MOTION_REPORT_DIR;
if (!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory');
fs.mkdirSync(out, { recursive: true });
const DWELL = [0.25, 1.375, 2.675, 3.625, 4.9, 5.825];
const PINNED = [[1440, 900], [1366, 768], [1280, 800], [1280, 720], [1024, 768]];
const report = { dwells: [], behaviour: [], scroll: [] };
const log = (list, entry) => { report[list].push(entry); console.log(list, JSON.stringify(entry)); };

const GEOMETRY = () => {
  const t = document.querySelector('[data-flow-track]');
  return { classes: document.documentElement.className, top: t.getBoundingClientRect().top + scrollY, track: t.offsetHeight, stage: t.children[0].offsetHeight, overflow: document.documentElement.scrollWidth > innerWidth };
};
// One frame: boxes relative to the frame and effective opacity of every element (carriers excluded).
const FRAME = ([k, pinned]) => {
  const t = document.querySelector('[data-flow-track]'), li = t.children[k], o = li.getBoundingClientRect();
  const eff = el => { let v = 1; for (let e = el; e && e !== t; e = e.parentElement) v *= +getComputedStyle(e).opacity; return v; };
  const layers = '.rail,.flow-count,.flow-num,.flow-step-title,.flow-step-desc,.flow-place,.flow-devices,.flow-foot>span:last-child';
  return {
    boxes: [...li.querySelectorAll('*')].filter(e => !e.closest('.mo-carrier,.mo-ghost,.mo-crumb')).map(e => { const r = e.getBoundingClientRect(); return [r.x - o.x, r.y - o.y, r.width, r.height, eff(e)]; }),
    others: pinned ? Math.max(0, ...[...t.children].filter((_, i) => i !== k).flatMap(f => [...f.querySelectorAll(layers)].map(eff))) : 0,
    carriers: Math.max(0, ...[...t.querySelectorAll('.mo-carrier')].map(eff)),
    inside: [...li.querySelectorAll('.flow-devices, .flow-copy, .rail, .flow-foot')].every(e => { const r = e.getBoundingClientRect(); return r.top >= o.top - 30 && r.bottom <= o.bottom + 0.5; })
  };
};
const STATE = () => {
  const t = document.querySelector('[data-flow-track]');
  const eff = el => { let v = 1; for (let e = el; e && e !== t; e = e.parentElement) v *= +getComputedStyle(e).opacity; return v; };
  const at = el => { const r = el.getBoundingClientRect(); return [+eff(el).toFixed(3), Math.round(r.x), Math.round(r.y)]; };
  return { devices: [...t.children].map(f => +eff(f.querySelector('.flow-devices')).toFixed(3)), carriers: [...t.querySelectorAll('.mo-carrier')].map(at), phone: at(t.children[2].querySelector('.fd-phone')), classes: [...t.children].map(f => f.className) };
};
async function open(browser, options, port = 8771, hash = '') {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/${hash}`);
  await page.waitForTimeout(1300);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { context, page, errors };
}
const go = (page, y) => page.evaluate(y => scrollTo(0, y), y);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.MOTION_TEST_BROWSER, headless: true });
  // 1. The six dwells reach the approved static frames (boxes and opacity), at every pinned class.
  for (const [width, height] of PINNED) {
    const pin = await open(browser, { viewport: { width, height } });
    const base = await open(browser, { viewport: { width, height } }, 8770);
    const g = await pin.page.evaluate(GEOMETRY), b = await base.page.evaluate(GEOMETRY);
    assert.ok(g.classes.includes('motion') && !g.overflow);
    assert.equal(g.stage, height, 'stage = 100svh');
    assert.equal(g.track, 7 * height, 'track = 700svh (100svh stage + 600svh scroll)');
    // Static frames are compared only where the approved composition is the same (frame = viewport).
    const comparable = b.stage === height;
    for (let k = 0; k < 6; k++) {
      await go(pin.page, g.top + DWELL[k] * height); await pin.page.waitForTimeout(300);
      const p = await pin.page.evaluate(FRAME, [k, true]);
      assert.equal(p.others, 0, `dwell ${k + 1}: other frames hidden`);
      assert.equal(p.carriers, 0, `dwell ${k + 1}: no carrier visible`);
      assert.ok(p.inside, `dwell ${k + 1}: composition inside the stage`);
      let box = null, opacity = null;
      if (comparable) {
        await go(base.page, b.top + k * height); await base.page.waitForTimeout(150);
        const s = await base.page.evaluate(FRAME, [k, false]);
        assert.equal(p.boxes.length, s.boxes.length);
        box = 0; opacity = 0;
        s.boxes.forEach((r, i) => { box = Math.max(box, ...r.slice(0, 4).map((v, j) => Math.abs(v - p.boxes[i][j]))); opacity = Math.max(opacity, Math.abs(r[4] - p.boxes[i][4])); });
        assert.ok(box < 0.05 && opacity < 0.001, `dwell ${k + 1}: ${box} px, ${opacity} opacity`);
      }
      log('dwells', { viewport: `${width}x${height}`, dwell: k + 1, comparedWithStatic: comparable, maxBoxDelta: box, maxOpacityDelta: opacity, elements: p.boxes.length });
    }
    assert.deepEqual(pin.errors, []);
    await pin.context.close(); await base.context.close();
  }
  // 2. Pin entry / sticky / exit and reverse scroll identity.
  for (const [width, height] of PINNED) {
    const { context, page, errors } = await open(browser, { viewport: { width, height } });
    const g = await page.evaluate(GEOMETRY), tops = [];
    for (const p of [-0.4, 0, 1, 3, 5.9, 6, 6.5]) { await go(page, g.top + p * height); await page.waitForTimeout(80); tops.push(+(await page.evaluate(() => document.querySelector('[data-flow-track]').children[0].getBoundingClientRect().top)).toFixed(1)); }
    assert.ok(tops[0] > 0 && tops.slice(1, 6).every(v => Math.abs(v) < 1) && tops[6] < -height * 0.4, JSON.stringify(tops));
    const forward = {}, back = {};
    for (const p of [0.8, 1.0, 1.9, 2.1, 2.3]) { await go(page, g.top + p * height); await page.waitForTimeout(220); forward[p] = await page.evaluate(STATE); }
    await go(page, g.top + 3.2 * height); await page.waitForTimeout(220);
    for (const p of [2.3, 2.1, 1.9, 1.0, 0.8]) { await go(page, g.top + p * height); await page.waitForTimeout(220); back[p] = await page.evaluate(STATE); }
    for (const p of Object.keys(forward)) assert.deepEqual(back[p], forward[p], `reverse at p = ${p}`);
    // No value ever reaches the technician phone (frame 03), including carriers at any T23 instant.
    for (const p of [1.6, 1.8, 2.0, 2.2, 2.4, 2.6]) { await go(page, g.top + p * height); await page.waitForTimeout(150); assert.equal(await page.evaluate(() => /R\$/.test([...document.querySelectorAll('[data-flow-track] .ph, [data-flow-track] .mo-carrier.ph-head')].map(e => e.textContent).join(' '))), false); }
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'entry/sticky/exit + reverse + no R$ on phone', viewport: `${width}x${height}`, tops });
    await context.close();
  }
  // 3. Resize mid-T23 equals a fresh load; anchors; fast-scroll cut.
  {
    const { context, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } });
    let g = await page.evaluate(GEOMETRY);
    await go(page, g.top + 2.05 * 900); await page.waitForTimeout(200);
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(500);
    g = await page.evaluate(GEOMETRY); await go(page, g.top + 2.05 * 720); await page.waitForTimeout(300);
    const resized = await page.evaluate(STATE);
    const fresh = await open(browser, { viewport: { width: 1280, height: 720 } });
    const f = await fresh.page.evaluate(GEOMETRY); await go(fresh.page, f.top + 2.05 * 720); await fresh.page.waitForTimeout(300);
    assert.deepEqual(resized, await fresh.page.evaluate(STATE));
    assert.deepEqual([...errors, ...fresh.errors], []);
    log('behaviour', { test: 'resize 1440x900 → 1280x720 mid-T23 = fresh load' });
    await context.close(); await fresh.context.close();
  }
  for (const hash of ['#planos', '#como-funciona']) {
    const { context, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } }, 8771, hash);
    const s = await page.evaluate(STATE);
    assert.deepEqual(errors, []);
    assert.equal(s.carriers.filter(c => c[0] > 0).length, 0);
    log('behaviour', { test: `anchor ${hash}`, devices: s.devices });
    await context.close();
  }
  {
    const { context, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } });
    const g = await page.evaluate(GEOMETRY);
    await go(page, g.top + 0.2 * 900); await page.waitForTimeout(200);
    await go(page, g.top + 2.05 * 900); await page.waitForTimeout(40);
    const during = await page.evaluate(STATE);
    await page.waitForTimeout(400);
    const after = await page.evaluate(STATE);
    assert.ok(during.carriers.every(c => c[0] === 0) && after.carriers.some(c => c[0] > 0));
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'fast scroll (> 3 H/s) cuts to the nearest dwell, then resumes', during: during.devices, after: after.devices });
    await context.close();
  }
  // 4. Reduced motion, touch / coarse pointer at ≥ 1024, tablet, no-JS: the approved static workflow.
  const STATIC = () => { const t = document.querySelector('[data-flow-track]'); return { classes: document.documentElement.className, page: document.documentElement.scrollHeight, track: t.offsetHeight, frames: [...t.children].map(f => f.offsetHeight), eligible: window.ziisMotion?.isPinEligible?.() ?? null }; };
  for (const [name, options] of [
    ['reduced motion 1440x900', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
    ['coarse pointer 1280x800', { viewport: { width: 1280, height: 800 }, hasTouch: true }],
    ['coarse pointer 1366x1024', { viewport: { width: 1366, height: 1024 }, hasTouch: true }],
    ['tablet 768x1024', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }],
    ['no-JS 1440x900', { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }],
    ['no-JS 1280x720', { viewport: { width: 1280, height: 720 }, javaScriptEnabled: false }]
  ]) {
    const c = await open(browser, options), b = await open(browser, options, 8770);
    const a = await c.page.evaluate(STATIC), s = await b.page.evaluate(STATIC);
    assert.deepEqual([a.page, a.track, a.frames], [s.page, s.track, s.frames], name);
    assert.ok(a.eligible !== true, `${name}: never pinned`);
    assert.deepEqual(c.errors, []);
    log('behaviour', { test: name, classes: a.classes, eligible: a.eligible, track: a.track });
    await c.context.close(); await b.context.close();
  }
  {
    const { context, page, errors } = await open(browser, { viewport: { width: 1280, height: 800 }, hasTouch: true });
    await page.evaluate(() => { window.entrances = 0; const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { if (this.classList.contains('flow-devices')) window.entrances++; return o.call(this, k, t); }; });
    const top = await page.evaluate(() => document.querySelector('[data-flow-track]').getBoundingClientRect().top + scrollY);
    for (let y = top - 800; y < top + 6 * 900; y += 300) { await go(page, y); await page.waitForTimeout(60); }
    const n = await page.evaluate(() => window.entrances);
    assert.ok(n >= 5);
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'coarse pointer: in-view fallback entrance per frame', entrances: n });
    await context.close();
  }
  // 5. Scroll performance through 01 → 03 and back: long tasks, frame pacing, motion-attributable CLS.
  for (const [width, height] of [[1440, 900], [1280, 720]]) for (const cpu of [1, 4]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => { window.audit = { long: [], shifts: [], frames: [] }; new PerformanceObserver(l => { for (const e of l.getEntries()) window.audit.long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.audit.shifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true }); });
    const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(2500);
    const top = await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; return document.querySelector('[data-flow-track]').getBoundingClientRect().top + scrollY; });
    await go(page, top - height); await page.waitForTimeout(600);
    const before = await page.evaluate(() => { const n = window.audit.shifts.length; window.audit.long = []; let last = performance.now(); const tick = t => { window.audit.frames.push(t - last); last = t; if (!window.audit.stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick); return n; });
    await page.mouse.move(width / 2, height / 2);
    const step = 60, wait = Math.round(step / (2 * height) * 1000);
    for (let y = 0; y < 4 * height; y += step) { await page.mouse.wheel(0, step); await page.waitForTimeout(wait); }
    for (let y = 0; y < 4 * height; y += step) { await page.mouse.wheel(0, -step); await page.waitForTimeout(wait); }
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => { window.audit.stop = true; return window.audit; });
    const frames = a.frames.slice(2).sort((x, y) => x - y), q = f => +frames[Math.min(frames.length - 1, Math.floor(f * frames.length))].toFixed(1);
    const cls = a.shifts.slice(before).reduce((s, v) => s + v, 0);
    assert.equal(cls, 0, 'motion-attributable CLS');
    assert.deepEqual(a.long, [], 'long tasks while scrolling the workflow');
    log('scroll', { viewport: `${width}x${height}`, cpu, frames: frames.length, p50: q(0.5), p95: q(0.95), max: +frames.at(-1).toFixed(1), over25ms: frames.filter(f => f > 25).length, longTasks: a.long.length, motionCLS: cls });
    await context.close();
  }
  // 6. Optional recordings.
  if (process.argv.includes('--video')) for (const [width, height] of [[1440, 900], [1280, 720]]) {
    const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: out, size: { width, height } } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(1500);
    const top = await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; return document.querySelector('[data-flow-track]').getBoundingClientRect().top + scrollY; });
    let y = Math.round(top - 0.6 * height);
    await go(page, y); await page.waitForTimeout(900); await page.mouse.move(width / 2, height / 2);
    const to = async (p, hold) => { const target = Math.round(top + p * height), dir = Math.sign(target - y); while (target !== y) { const d = dir * Math.min(18, Math.abs(target - y)); await page.mouse.wheel(0, d); y += d; await page.waitForTimeout(16); } await page.waitForTimeout(hold); };
    for (const [p, hold] of [[0.25, 900], [1.375, 900], [2.675, 1200], [1.375, 900], [0.25, 1200]]) await to(p, hold);
    const video = page.video(); await context.close();
    fs.renameSync(await video.path(), path.join(out, `workflow-${width}x${height}.webm`));
  }
  fs.writeFileSync(path.join(out, 'workflow-validation.json'), JSON.stringify(report, null, 1));
  await browser.close();
  console.log('workflow validation passed');
})().catch(error => { console.error(error); process.exit(1); });
