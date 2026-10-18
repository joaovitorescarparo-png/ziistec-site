// V3.2 M18–M21 browser validation: secondary reveals, FAQ, final CTA and microinteractions, plus the
// complete-homepage performance pass. Same runtime as validate-scenes.cjs: MOTION_TEST_MODULES,
// MOTION_TEST_BROWSER, MOTION_REPORT_DIR, and serve-motion-validation.cjs (baseline :8770, candidate
// :8771). `--previous <port>` compares the full-page scroll against an earlier build served there.
const dependency = name => require(process.env.MOTION_TEST_MODULES ? require('node:path').join(process.env.MOTION_TEST_MODULES, name) : name);
const { chromium } = dependency('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = process.env.MOTION_REPORT_DIR;
if (!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory');
fs.mkdirSync(out, { recursive: true });
const perfOnly = process.argv.includes('--performance-only');
const previous = process.argv.includes('--previous') ? +process.argv[process.argv.indexOf('--previous') + 1] : 0;
const SIZES = [[1440, 900], [1280, 720], [768, 1024], [390, 844]];
const SECTIONS = '.mk-problem,.mk-results,.mk-audience,.mk-growth,.mk-testimonials,.mk-pricing,.mk-faq,.mk-cta';
const report = { reveals: [], behaviour: [], keyboard: [], scroll: [] };
const log = (list, entry) => { report[list].push(entry); console.log(list, JSON.stringify(entry)); };

// Counts every secondary play per target (holds excluded), every observer and its live targets, and
// pending requestAnimationFrame callbacks, before the page runs.
const INSTRUMENT = SECTIONS => {
  const a = window.secAudit = { plays: {}, holds: 0, observers: 0, live: 0, maxLive: 0, pending: 0, maxPending: 0 };
  const ids = new WeakMap(), id = el => ids.get(el) ?? (ids.set(el, ids.n = (ids.n || 0) + 1), ids.n);
  const key = (el, o) => `${id(el)}:${el.className.baseVal ?? el.className}${o?.pseudoElement || ''}@${el.closest('section')?.className}`;
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keys, o) {
    if (this.closest?.(SECTIONS)) { if (o?.duration === 1) a.holds++; else if (o?.duration > 1) { const k = key(this, o); a.plays[k] = (a.plays[k] || 0) + 1; } }
    return animate.call(this, keys, o);
  };
  const IO = window.IntersectionObserver;
  window.IntersectionObserver = class extends IO {
    // `live` counts the targets of the M18 observer; `liveAll` every observer (scenes, workflow fallback).
    constructor(cb, o) { super(cb, o); this.t = new Set(); this.sec = o?.rootMargin === '0px 0px -15% 0px'; a.observers++; if (this.sec) a.sectionObservers = (a.sectionObservers || 0) + 1; }
    count(d) { a.liveAll = (a.liveAll || 0) + d; if (this.sec) { a.live += d; a.maxLive = Math.max(a.maxLive, a.live); } }
    observe(t) { if (!this.t.has(t)) { this.t.add(t); this.count(1); } return super.observe(t); }
    unobserve(t) { if (this.t.delete(t)) this.count(-1); return super.unobserve(t); }
    disconnect() { this.count(-this.t.size); this.t.clear(); return super.disconnect(); }
  };
  const raf = window.requestAnimationFrame.bind(window);
  a.raf = raf;
  window.requestAnimationFrame = cb => { a.pending++; a.maxPending = Math.max(a.maxPending, a.pending); return raf(t => { a.pending--; cb(t); }); };
};
// Every element of the secondary sections that is not at its static final state; `band` limits the
// check to what is on screen above the 85% line (the only place a held block must never be).
const RESIDUE = ([SECTIONS, band]) => {
  const bad = [];
  for (const el of document.querySelectorAll(SECTIONS.split(',').map(s => `${s} *`).join(','))) {
    const r = el.getBoundingClientRect();
    if (band && (r.bottom <= 0 || r.top >= innerHeight * 0.85 || !r.height)) continue;
    const s = getComputedStyle(el), b = getComputedStyle(el, '::before');
    if (+s.opacity < 1 || s.translate !== 'none' || s.scale !== 'none' || s.clipPath !== 'none' || (b.content !== 'none' && b.scale !== 'none')) bad.push(el.className.baseVal ?? el.className);
  }
  for (const i of document.querySelectorAll('.cta-rail .rail-stop i')) { const r = i.getBoundingClientRect(); if (getComputedStyle(i).borderTopWidth !== '0px' && !(band && (r.bottom <= 0 || r.top >= innerHeight * 0.85 || !r.height))) bad.push('rail-stop-not-done'); }
  return bad;
};
const go = (page, y) => page.evaluate(y => scrollTo(0, y), y);
const options = ([width, height], extra = {}) => ({ viewport: { width, height }, hasTouch: width < 1024, isMobile: width < 640, deviceScaleFactor: 1, ...extra });
async function open(browser, opts, url = '/', init) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(INSTRUMENT, SECTIONS);
  if (init) await page.addInitScript(init);
  await page.goto(`http://127.0.0.1:8771${url}`);
  await page.waitForTimeout(1600);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { context, page, errors };
}
const audit = page => page.evaluate(() => { const { raf, ...a } = window.secAudit; return a; });
const residue = (page, band = false) => page.evaluate(RESIDUE, [SECTIONS, band]);
// A natural read: about 1000 px/s in 60 px wheel steps.
async function read(page, to, dir = 1) {
  const height = page.viewportSize().height;
  await page.mouse.move(page.viewportSize().width / 2, height / 2);
  for (let y = await page.evaluate(() => scrollY); dir > 0 ? y < to : y > to; y += 60 * dir) { await page.mouse.wheel(0, 60 * dir); await page.waitForTimeout(40); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.MOTION_TEST_BROWSER, headless: true });
  report.browser = browser.version();
  // 1. Once, never replayed, nothing left hidden: a full read down, up and down again per viewport.
  if (!perfOnly) await behaviour(browser);
  await performance(browser);
  fs.writeFileSync(path.join(out, perfOnly ? 'sections-performance.json' : 'sections-validation.json'), JSON.stringify(report, null, 1));
  await browser.close();
  console.log(perfOnly ? 'sections performance passed' : 'sections validation passed');
})().catch(error => { console.error(error); process.exit(1); });

async function behaviour(browser) {
  for (const size of SIZES) {
    const { context, page, errors } = await open(browser, options(size));
    const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await read(page, H); await page.waitForTimeout(1500);
    const first = await audit(page);
    assert.deepEqual(await residue(page), [], `${size}: hidden content after a full read`);
    await read(page, 0, -1); await page.waitForTimeout(400); await read(page, H); await page.waitForTimeout(800);
    const second = await audit(page);
    assert.deepEqual(second.plays, first.plays, `${size}: a secondary reveal replayed`);
    assert.ok(Object.values(first.plays).every(n => n === 1), `${size}: each target plays once`);
    const groups = new Set(Object.keys(first.plays).map(k => k.split('@')[1]));
    assert.equal(groups.size, 7, `${size}: Problem, Results, Audience, Growth, Testimonials, Pricing and CTA reveal`);
    const rail = Object.keys(first.plays).some(k => k.includes('rail-fill'));
    assert.equal(rail, size[0] >= 1024, `${size}: the rail plays only where the static layout shows it`);
    assert.equal(second.live, 0, `${size}: no section left observed`);
    assert.equal(second.sectionObservers, 1, `${size}: one shared section observer`);
    assert.deepEqual(errors, []);
    log('reveals', { viewport: size.join('x'), targets: Object.keys(first.plays).length, holds: first.holds, plays: Object.values(first.plays).reduce((s, n) => s + n, 0), replays: 0, rail, sectionObservers: second.sectionObservers, observedAtEnd: second.live, allObservedAtEnd: second.liveAll, residue: 0 });
    await context.close();
  }
  // 2. Fast scroll, reload mid-page, anchors, breakpoint change: nothing on screen is ever held.
  for (const size of [[1440, 900], [390, 844]]) {
    const name = size.join('x');
    {
      const { context, page } = await open(browser, options(size));
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const tops = await page.evaluate(S => [...document.querySelectorAll(S)].map(s => s.getBoundingClientRect().top + scrollY), SECTIONS);
      for (const y of [...tops.map(t => t - 200), H, 0, Math.round(H / 2), H]) { await go(page, y); await page.waitForTimeout(1300); assert.deepEqual(await residue(page, true), [], `${name}: fast scroll to ${y} left content hidden on screen`); }
      log('behaviour', { test: `${name}: fast scroll / jumps`, jumps: tops.length + 4, hiddenOnScreen: 0 });
      await context.close();
    }
    for (const section of SECTIONS.split(',')) {
      // Reload with the section on screen: final at once, never blinks out after fonts settle.
      const { context, page } = await open(browser, options(size));
      const y = await page.evaluate(S => document.querySelector(S).getBoundingClientRect().top + scrollY - innerHeight * 0.3, section);
      await go(page, y); await page.waitForTimeout(200);
      await page.reload(); await page.waitForTimeout(200);
      await page.evaluate(([S]) => { window.minOp = 1; const tick = () => { for (const el of document.querySelectorAll(`${S} *`)) { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.height) window.minOp = Math.min(window.minOp, +getComputedStyle(el).opacity); } if (performance.now() < 4000) requestAnimationFrame(tick); }; tick(); }, [SECTIONS]);
      await page.waitForTimeout(1800);
      const minOp = await page.evaluate(() => window.minOp);
      assert.deepEqual(await residue(page, true), [], `${name}: reload at ${section} left content hidden`);
      assert.equal(minOp, 1, `${name}: reload at ${section}: on-screen content blinked (${minOp})`);
      await context.close();
    }
    log('behaviour', { test: `${name}: reload in each of 8 sections`, minOnScreenOpacity: 1, hiddenOnScreen: 0 });
    for (const hash of ['#planos', '#duvidas', '#para-quem']) {
      const { context, page } = await open(browser, options(size), `/${hash}`);
      await page.waitForTimeout(600);
      assert.deepEqual(await residue(page, true), [], `${name}: anchor ${hash} left content hidden`);
      await context.close();
    }
    {
      // In-page anchor jump from the top (header link) to Pricing.
      const { context, page } = await open(browser, options(size));
      await page.evaluate(() => document.querySelector('a[href="#planos"]').click()); await page.waitForTimeout(1200);
      assert.deepEqual(await residue(page, true), [], `${name}: in-page anchor left content hidden`);
      await context.close();
    }
    log('behaviour', { test: `${name}: anchors #planos #duvidas #para-quem + in-page jump`, hiddenOnScreen: 0 });
  }
  {
    // Breakpoint change mid-page (holds pending), both ways, then a full read: nothing left hidden.
    const { context, page } = await open(browser, options([1440, 900]));
    await go(page, await page.evaluate(() => document.querySelector('.mk-results').getBoundingClientRect().top + scrollY - 400)); await page.waitForTimeout(800);
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1300);
    assert.deepEqual(await residue(page, true), [], 'breakpoint 1440 → 390: content hidden on screen');
    await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(1300);
    assert.deepEqual(await residue(page, true), [], 'breakpoint 390 → 1440: content hidden on screen');
    await read(page, await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)); await page.waitForTimeout(1500);
    const a = await audit(page);
    assert.deepEqual(await residue(page), [], 'breakpoint: start state survived');
    assert.ok(Object.values(a.plays).every(n => n === 1), 'breakpoint: replay');
    log('behaviour', { test: 'breakpoint 1440 → 390 → 1440 mid-page', residue: 0, replays: 0 });
    await context.close();
  }
  // 3. Reduced motion, from the start and switched on during a reveal; no-JS; JS failures.
  for (const size of [[1440, 900], [390, 844]]) {
    const { context, page } = await open(browser, options(size, { reducedMotion: 'reduce' }));
    await read(page, await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)); await page.waitForTimeout(400);
    const a = await audit(page);
    assert.deepEqual([Object.keys(a.plays).length, a.holds], [0, 0], `${size}: reduced motion plays nothing`);
    assert.deepEqual(await residue(page), [], `${size}: reduced motion residue`);
    log('behaviour', { test: `${size.join('x')}: reduced motion`, plays: 0, holds: 0, residue: 0 });
    await context.close();
  }
  {
    const { context, page } = await open(browser, options([1440, 900]));
    const y = await page.evaluate(() => document.querySelector('.plan').getBoundingClientRect().top + scrollY - innerHeight * 0.7);
    await read(page, y); await page.waitForTimeout(120);
    const running = await page.evaluate(S => document.getAnimations().filter(a => a.playState === 'running' && a.effect.target.closest(S)).length, SECTIONS);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(100);
    const after = await page.evaluate(S => ({ anims: document.getAnimations().filter(a => a.effect.target.closest(S)).length, motion: document.documentElement.classList.contains('motion') }), SECTIONS);
    assert.ok(running > 0, 'a reveal was running when reduced motion switched on');
    assert.deepEqual(after, { anims: 0, motion: false }, 'reduced switch: every reveal and hold cancelled');
    assert.deepEqual(await residue(page), [], 'reduced switch: start state survived');
    log('behaviour', { test: 'reduced motion switched on during the Pricing reveal', runningBefore: running, after: after.anims, residue: 0 });
    await context.close();
  }
  for (const size of [[1440, 900], [390, 844]]) {
    const { context, page } = await open(browser, options(size, { javaScriptEnabled: false }));
    await go(page, 99999);
    assert.deepEqual(await residue(page), [], `${size}: no-JS residue`);
    assert.equal(await page.evaluate(() => document.documentElement.className), '', `${size}: no-JS has no motion class`);
    log('behaviour', { test: `${size.join('x')}: no-JS`, residue: 0 });
    await context.close();
  }
  {
    // motion.js never arrives: the boot failsafe returns the page to static.
    const context = await browser.newContext(options([1440, 900]));
    const page = await context.newPage();
    await page.route('**/motion.js', r => r.abort());
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(1800);
    await go(page, 99999); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('motion')), false, 'failsafe removes html.motion');
    assert.deepEqual(await residue(page), [], 'failsafe residue');
    log('behaviour', { test: 'motion.js blocked → boot failsafe', residue: 0 });
    await context.close();
  }
  {
    // A JS error inside a reveal (Results and the CTA title throw when they play): never left hidden.
    const init = () => { const animate = Element.prototype.animate; Element.prototype.animate = function (k, o) { if (o?.duration > 1 && this.matches?.('.results-item, .cta-title')) throw new Error('injected reveal failure'); return animate.call(this, k, o); }; };
    const { context, page, errors } = await open(browser, options([1440, 900]), '/', init);
    await read(page, await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)); await page.waitForTimeout(1500);
    assert.ok(errors.some(e => e.includes('injected')), 'the injected failure happened');
    assert.deepEqual(await residue(page), [], 'JS error during a reveal left content hidden');
    log('behaviour', { test: 'JS error thrown inside the Results and CTA reveals', errors: errors.length, residue: 0 });
    await context.close();
  }
  // 4. Keyboard: Tab through nav, hero, pricing, FAQ, CTA and footer; every stop is visible, on screen
  // and shows a ring; Enter/Space toggle <summary>; the mobile menu keeps its focus handling.
  for (const size of [[1440, 900], [390, 844]]) {
    const { context, page } = await open(browser, options(size));
    const stops = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab'); await page.waitForTimeout(650);
      const s = await page.evaluate(() => {
        const el = document.activeElement, r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
        const ring = (cs.outlineStyle !== 'none' && cs.outlineColor !== 'rgba(0, 0, 0, 0)' && cs.outlineWidth !== '0px') || cs.boxShadow !== 'none';
        return { el: el.dataset.cta || el.className || el.tagName, fv: el.matches(':focus-visible'), ring, op: +op.toFixed(2), onScreen: r.bottom > 0 && r.top < innerHeight, body: el === document.body };
      });
      if (s.body) break;
      stops.push(s);
      assert.ok(s.fv && s.ring && s.op === 1 && s.onScreen, `${size}: focus stop ${JSON.stringify(s)}`);
    }
    const names = stops.map(s => s.el);
    for (const need of ['header-contact', 'hero-contact', 'pricing-essential', 'pricing-professional', 'pricing-team', 'faq-q', 'final-contact']) assert.ok(names.includes(need) || size[0] < 640 && need === 'header-contact', `${size}: Tab reaches ${need}`);
    // Enter and Space on a summary, several open at once.
    await page.evaluate(() => document.querySelectorAll('.faq-q')[2].focus());
    await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll('.faq-q')[3].focus());
    await page.keyboard.press(' '); await page.waitForTimeout(300);
    const open2 = await page.evaluate(() => [...document.querySelectorAll('details.faq-item')].map(d => +d.open).join(''));
    assert.equal(open2, '101100', `${size}: Enter/Space on <summary>, several open`);
    await page.keyboard.press(' '); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => document.querySelectorAll('details.faq-item')[3].open), false, `${size}: Space closes`);
    log('keyboard', { viewport: size.join('x'), stops: stops.length, allVisibleWithRing: true, order: names.join(' > '), summaryEnterSpace: open2 });
    await context.close();
  }
  for (const size of [[390, 844], [768, 1024]]) {
    // Same focus sequence as the approved static build (:8770): open, Tab, Escape → focus on the button.
    const seq = async port => {
      const context = await browser.newContext(options(size));
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`); await page.waitForTimeout(1600);
      await page.focus('.mk-menu'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      const panel = size[0] < 640 ? '.mk-nav' : '.mk-nav-links';
      const r = [await page.getAttribute('.mk-menu', 'aria-expanded'), await page.evaluate(p => getComputedStyle(document.querySelector(p)).opacity, panel)];
      for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); r.push(await page.evaluate(() => document.activeElement.textContent.trim().slice(0, 24))); }
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      r.push(await page.evaluate(() => document.activeElement.className), await page.getAttribute('.mk-menu', 'aria-expanded'), await page.evaluate(p => getComputedStyle(document.querySelector(p)).display, panel));
      await context.close();
      return r;
    };
    const [base, cand] = [await seq(8770), await seq(8771)];
    assert.deepEqual(cand, base, `${size}: mobile menu focus handling changed`);
    log('keyboard', { viewport: size.join('x'), menu: cand });
  }
}

async function performance(browser) {
  // 5. Complete homepage scroll, Hero → Footer, at 1440×900 and 390×844, CPU 1× and 4×.
  for (const [width, height, cpu] of [[1440, 900, 1], [1440, 900, 4], [390, 844, 1], [390, 844, 4]]) {
    for (const port of previous ? [8771, previous] : [8771]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      await page.addInitScript(INSTRUMENT, SECTIONS);
      await page.addInitScript(() => { Object.assign(window.secAudit, { long: [], shifts: [], frames: [] }); new PerformanceObserver(l => { for (const e of l.getEntries()) window.secAudit.long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.secAudit.shifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true }); });
      const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      await page.goto(`http://127.0.0.1:${port}/`); await page.waitForTimeout(3000);
      const before = await page.evaluate(() => { const a = window.secAudit, n = a.shifts.length; a.long = []; a.maxPending = a.pending; let last = performance.now(); const tick = t => { a.frames.push(t - last); last = t; if (!a.stop) a.raf(tick); }; a.raf(tick); return n; });
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await page.mouse.move(width / 2, height / 2);
      for (let y = 0; y < H; y += 80) { await page.mouse.wheel(0, 80); await page.waitForTimeout(40); }
      await page.waitForTimeout(2000);
      const a = await page.evaluate(() => { window.secAudit.stop = true; const { raf, ...a } = window.secAudit; return a; });
      const frames = a.frames.slice(2).sort((x, y) => x - y), q = f => +frames[Math.min(frames.length - 1, Math.floor(f * frames.length))].toFixed(1);
      const cls = +a.shifts.slice(before).reduce((s, v) => s + v, 0).toFixed(4);
      const entry = { build: port === 8771 ? 'candidate' : 'previous', viewport: `${width}x${height}`, cpu, frames: frames.length, p50: q(0.5), p95: q(0.95), worst: +frames.at(-1).toFixed(1), longTasks: a.long, motionCLS: cls, observers: a.observers, sectionObservers: a.sectionObservers || 0, maxObserved: a.maxLive, observedAtEnd: a.live, allObservedAtEnd: a.liveAll || 0, maxPendingRAF: a.maxPending };
      if (port === 8771) { assert.equal(cls, 0, 'motion-attributable CLS'); assert.ok(a.maxPending <= 1, 'at most one pending requestAnimationFrame'); }
      log('scroll', entry);
      await context.close();
    }
  }
}
