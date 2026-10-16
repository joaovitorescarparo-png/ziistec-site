// V3.2 M15–M17 browser validation: the responsive workflow story below 1024 px (three scenes, no pin)
// against the approved static build. Same runtime as validate-hero.cjs: MOTION_TEST_MODULES,
// MOTION_TEST_BROWSER, MOTION_REPORT_DIR, and serve-motion-validation.cjs (baseline :8770,
// candidate :8771). `--video` also records the natural scroll at 390×844 and 768×1024.
const dependency = name => require(process.env.MOTION_TEST_MODULES ? require('node:path').join(process.env.MOTION_TEST_MODULES, name) : name);
const { chromium } = dependency('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const out = process.env.MOTION_REPORT_DIR;
if (!out) throw new Error('Set MOTION_REPORT_DIR to an external evidence directory');
fs.mkdirSync(out, { recursive: true });
const SIZES = [[320, 700], [330, 700], [360, 780], [390, 844], [640, 900], [768, 1024], [1023, 768]];
const report = { scenes: [], behaviour: [], money: [], scroll: [] };
const log = (list, entry) => { report[list].push(entry); console.log(list, JSON.stringify(entry)); };

// Counts every scene animation (holds excluded) and every scene observer, before the page runs.
const INSTRUMENT = () => {
  const s = window.sceneAudit = { plays: [0, 0, 0], holds: [0, 0, 0], observers: 0, live: 0, clearance: Infinity, sumSeen: false, moneyInFly: false, phoneMoney: false };
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keys, options) {
    const scene = this.closest?.('[data-flow-scene]');
    if (scene) { const i = [...document.querySelectorAll('[data-flow-scene]')].indexOf(scene); if (options?.duration === 1) s.holds[i]++; else s.plays[i]++; }
    return animate.call(this, keys, options);
  };
  const IO = window.IntersectionObserver;
  window.IntersectionObserver = class extends IO {
    constructor(cb, options) { super(cb, options); this.scene = options?.rootMargin === '0px 0px -20% 0px'; if (this.scene) { s.observers++; s.live++; } }
    disconnect() { if (this.scene && !this.gone) { this.gone = true; s.live--; } return super.disconnect(); }
  };
};
// Money and clearance watch, every rendered frame while it runs.
const WATCH = () => {
  const s = window.sceneAudit, c = document.querySelector('[data-flow-scene="office-05-06"]');
  const card = c.querySelector('.hist-card'), lines = [...c.querySelectorAll('.fin-line')];
  const tick = () => {
    const top = card.getBoundingClientRect().top, bottom = Math.max(...lines.map(l => l.getBoundingClientRect().bottom)), summary = c.querySelector('.fin-os').getBoundingClientRect().bottom;
    if (getComputedStyle(card).opacity > 0) { s.clearance = Math.min(s.clearance, top - bottom); s.boxClearance = Math.min(s.boxClearance ?? Infinity, top - summary); }
    if (/R\$\s?2\.420/.test(document.body.textContent)) s.sumSeen = true;
    if ([...document.querySelectorAll('.mo-fly')].some(f => /R\$/.test(f.textContent))) s.moneyInFly = true;
    if (/R\$/.test([...document.querySelectorAll('.scene-device-b .ph, .mo-fly')].map(e => e.textContent).join(' '))) s.phoneMoney = true;
    if (document.documentElement.scrollWidth > innerWidth) s.overflow = true;
    if (!s.stopWatch) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
// Boxes relative to the scene and effective opacity of every element (carriers excluded).
const SNAP = i => {
  const s = document.querySelectorAll('[data-flow-scene]')[i], o = s.getBoundingClientRect();
  const eff = el => { let v = 1; for (let e = el; e && e !== document.body; e = e.parentElement) v *= +getComputedStyle(e).opacity; return v; };
  return [...s.querySelectorAll('*')].filter(e => !e.closest('.mo-fly')).map(e => { const r = e.getBoundingClientRect(); return r.width || r.height ? [r.x - o.x, r.y - o.y, r.width, r.height, eff(e)] : [0, 0, 0, 0, eff(e)]; });
};
const diff = (a, b) => { let box = 0, op = 0; assert.equal(a.length, b.length); b.forEach((r, k) => { box = Math.max(box, ...r.slice(0, 4).map((v, j) => Math.abs(v - a[k][j]))); op = Math.max(op, Math.abs(r[4] - a[k][4])); }); return { box: +box.toFixed(4), op: +op.toFixed(4) }; };
const options = ([width, height], extra = {}) => ({ viewport: { width, height }, hasTouch: true, isMobile: width < 640, deviceScaleFactor: 1, ...extra });
async function open(browser, opts, port = 8771) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(INSTRUMENT);
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForTimeout(900);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return { context, page, errors };
}
const go = (page, y) => page.evaluate(y => scrollTo(0, y), y);
const deviceTops = page => page.evaluate(() => [...document.querySelectorAll('.scene-device')].map(d => d.getBoundingClientRect().top + scrollY));
// A steady read-and-scroll pace (≈ 1200 px/s), the way a visitor moves through the section.
async function walk(page, from, to) { const step = from < to ? 40 : -40; for (let y = from; step > 0 ? y < to : y > to; y += step) { await go(page, y); await page.waitForTimeout(33); } await go(page, to); }

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.MOTION_TEST_BROWSER, headless: true });
  const baseline = {};
  // 1. Every width: each scene plays once while scrolling down, never again on the way back or down
  //    again; the finished scenes equal the static ones; money stays where it belongs; the history
  //    card never comes closer than 16 px to R$ 2.000 / R$ 420; values never wrap.
  for (const size of SIZES) {
    const [width, height] = size;
    const { context, page, errors } = await open(browser, options(size));
    const base = await open(browser, options(size), 8770);
    await page.evaluate(WATCH);
    const tops = await deviceTops(page);
    const start = tops[0] - height * 1.1, end = tops[2] + height * 0.6;
    await go(page, start); await page.waitForTimeout(300);
    const before = await page.evaluate(() => ({ ...window.sceneAudit }));
    assert.deepEqual(before.plays, [0, 0, 0], 'nothing plays before its trigger');
    assert.ok(before.holds.every(n => n > 0), 'future scenes hold their start state');
    await walk(page, start, end); await page.waitForTimeout(2600);
    const once = await page.evaluate(() => [...window.sceneAudit.plays]);
    assert.ok(once.every(n => n > 0), `every scene played: ${once}`);
    await walk(page, end, start); await walk(page, start, end); await page.waitForTimeout(600);
    const again = await page.evaluate(() => { window.sceneAudit.stopWatch = true; return window.sceneAudit; });
    assert.deepEqual(again.plays, once, 'no replay on reverse scroll or a second pass');
    const fidelity = [];
    for (let i = 0; i < 3; i++) fidelity.push(diff(await page.evaluate(SNAP, i), baseline[`${width}x${height}:${i}`] ||= await base.page.evaluate(SNAP, i)));
    assert.ok(fidelity.every(f => f.box < 0.05 && f.op < 0.001), `final scenes equal static: ${JSON.stringify(fidelity)}`);
    assert.equal(again.sumSeen, false, 'R$ 2.420 never rendered');
    assert.equal(again.moneyInFly, false, 'no money in any carrier');
    assert.equal(again.phoneMoney, false, 'no money on the phones');
    assert.ok(!again.overflow, 'no horizontal scroll at any frame (start states, carriers, entrances)');
    // ≥ 16 px from the R$ 2.000 / R$ 420 lines at every frame (and the approved gap to the summary box).
    assert.ok(again.clearance >= 16 - 0.01 && again.boxClearance > 0, `history clearance ${again.clearance} / ${again.boxClearance}`);
    // Values stay one line; label and value keep at least 12 px apart (the label may wrap).
    const money = await page.evaluate(() => [...document.querySelectorAll('.scene-device-c .fin-line')].map(l => {
      const [label, value] = l.children, v = value.getBoundingClientRect(), lb = label.getBoundingClientRect();
      // One line box for the value text (the flex item itself may stretch with a wrapped label).
      const range = document.createRange(); range.selectNodeContents(value);
      const lines = new Set([...range.getClientRects()].map(r => Math.round(r.top))).size;
      return { text: value.textContent, oneLine: lines === 1, labelLines: new Set([...label.getClientRects()].map(r => Math.round(r.top))).size, gap: +(v.left - lb.right).toFixed(2) };
    }));
    assert.ok(money.every(m => m.oneLine && m.gap >= 12), `money nowrap / spacing: ${JSON.stringify(money)}`);
    assert.deepEqual(errors, []);
    log('scenes', { viewport: `${width}x${height}`, plays: once, holds: before.holds, fidelity, minHistoryClearance: +again.clearance.toFixed(2), minClearanceToSummaryBox: +again.boxClearance.toFixed(2), money, observers: again.observers });
    await context.close(); await base.context.close();
  }
  // 2. Reload in the middle of the page and fast scroll: nothing is ever left hidden.
  for (const [name, target] of [['reload at Field 03–04', 1], ['reload at Office 05–06', 2]]) {
    const size = [390, 844];
    const { context, page, errors } = await open(browser, options(size));
    const tops = await deviceTops(page);
    await go(page, tops[target] - 120); await page.waitForTimeout(300);
    await page.reload(); await page.waitForTimeout(700);
    const audit = await page.evaluate(() => window.sceneAudit);
    const base = await open(browser, options(size), 8770);
    for (let i = 0; i <= target; i++) assert.ok(diff(await page.evaluate(SNAP, i), await base.page.evaluate(SNAP, i)).op < 0.001, `${name}: scene ${i + 1} final at once`);
    for (let i = 0; i <= target; i++) assert.equal(audit.plays[i], 0, `${name}: scene ${i + 1} does not play`);
    assert.deepEqual(errors, []);
    log('behaviour', { test: name, scrollY: await page.evaluate(() => scrollY), plays: audit.plays });
    await context.close(); await base.context.close();
  }
  {
    const size = [390, 844];
    const { context, page, errors } = await open(browser, options(size));
    const base = await open(browser, options(size), 8770);
    const tops = await deviceTops(page);
    await go(page, tops[0] - 900); await page.waitForTimeout(300);
    await go(page, tops[2] + 1400); await page.waitForTimeout(400);
    await walk(page, tops[2] + 1400, tops[0] - 900); await page.waitForTimeout(500);
    const audit = await page.evaluate(() => window.sceneAudit);
    for (let i = 0; i < 3; i++) assert.ok(diff(await page.evaluate(SNAP, i), await base.page.evaluate(SNAP, i)).op < 0.001, `fast scroll: scene ${i + 1} final`);
    assert.deepEqual(audit.plays, [0, 0, 0], 'scenes passed by a jump never play, also not on the way back');
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'fast scroll past all scenes, then back up', plays: audit.plays });
    await context.close(); await base.context.close();
  }
  // 3. Reduced motion: final, no holds, no carriers; switching it on mid-play finishes everything.
  {
    const size = [390, 844];
    const r = await open(browser, options(size, { reducedMotion: 'reduce' }));
    const base = await open(browser, options(size), 8770);
    const tops = await deviceTops(r.page);
    await walk(r.page, tops[0] - 900, tops[2] + 500); await r.page.waitForTimeout(300);
    const audit = await r.page.evaluate(() => window.sceneAudit);
    assert.deepEqual([audit.plays, audit.holds, audit.observers], [[0, 0, 0], [0, 0, 0], 0], 'reduced motion: no scene motion');
    for (let i = 0; i < 3; i++) assert.ok(diff(await r.page.evaluate(SNAP, i), await base.page.evaluate(SNAP, i)).op < 0.001);
    log('behaviour', { test: 'reduced motion: three scenes final, no observer', ...audit });
    const { context, page, errors } = await open(browser, options(size));
    const t2 = await deviceTops(page);
    await go(page, t2[1] - 900); await page.waitForTimeout(300); await go(page, t2[1] - 600); await page.waitForTimeout(400);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(200);
    const state = await page.evaluate(() => ({ flies: document.querySelectorAll('.mo-fly').length, running: document.querySelectorAll('.flow-scenes *').length && [...document.querySelectorAll('.flow-scenes *')].filter(e => e.getAnimations().length).length }));
    for (let i = 0; i < 3; i++) assert.ok(diff(await page.evaluate(SNAP, i), await base.page.evaluate(SNAP, i)).op < 0.001, `reduced switched on mid-play: scene ${i + 1} final`);
    assert.deepEqual(state, { flies: 0, running: 0 });
    assert.deepEqual([...r.errors, ...errors], []);
    log('behaviour', { test: 'reduced motion switched on mid-play: cancelled, final', ...state });
    await r.context.close(); await context.close(); await base.context.close();
  }
  // 4. Breakpoint crossing: 1024 → 768 (passed scenes final, future ones play once) and 768 → 1024
  //    mid-play (mobile motion cancelled, desktop restored), one live observer at most.
  {
    const { context, page, errors } = await open(browser, { viewport: { width: 1024, height: 768 } });
    const desk = await page.evaluate(() => ({ ...window.sceneAudit, pinned: getComputedStyle(document.querySelector('.flow-frame')).position }));
    assert.deepEqual([desk.observers, desk.plays, desk.holds], [0, [0, 0, 0], [0, 0, 0]], 'M15–M17 not initialised at 1024');
    // Scroll at 1024 (desktop, nothing primed) to where, at 768, Office 05–06 is just below the fold.
    const probe = await open(browser, { viewport: { width: 768, height: 1024 } });
    const tops = await deviceTops(probe.page), y = tops[2] - 1024 - 80;
    await probe.context.close();
    await go(page, y); await page.waitForTimeout(300);
    await page.setViewportSize({ width: 768, height: 1024 }); await page.waitForTimeout(500);
    const passed = await page.evaluate(() => ({ ...window.sceneAudit, above: [...document.querySelectorAll('.scene-device')].map(d => d.getBoundingClientRect().top < innerHeight * 0.8) }));
    await walk(page, y, tops[2] + 600); await page.waitForTimeout(2600);
    const after = await page.evaluate(() => ({ ...window.sceneAudit }));
    passed.above.forEach((a, i) => { if (a) assert.equal(after.plays[i], 0, `scene ${i + 1} reached while crossing stays final`); });
    assert.deepEqual(passed.above, [true, true, false]);
    assert.ok(after.plays[2] > 0, 'the future scene still plays once');
    assert.ok(after.live <= 1, `one live observer at most (${after.live})`);
    // 768 → 1024 in the middle of Office 05–06.
    const { context: c2, page: p2, errors: e2 } = await open(browser, { viewport: { width: 768, height: 1024 } });
    const t2 = await deviceTops(p2);
    await go(p2, t2[2] - 1000); await p2.waitForTimeout(300); await go(p2, t2[2] - 700); await p2.waitForTimeout(500);
    await p2.setViewportSize({ width: 1024, height: 768 }); await p2.waitForTimeout(500);
    const desktop = await p2.evaluate(() => ({ flies: document.querySelectorAll('.mo-fly').length, running: [...document.querySelectorAll('.flow-scenes *')].filter(e => e.getAnimations().length).length, live: window.sceneAudit.live, pinned: getComputedStyle(document.querySelector('.flow-frame')).position, motion: document.documentElement.className }));
    assert.deepEqual([desktop.flies, desktop.running, desktop.live], [0, 0, 0], `768 → 1024: mobile motion cancelled ${JSON.stringify(desktop)}`);
    assert.equal(desktop.pinned, 'sticky', 'desktop pin restored');
    await p2.setViewportSize({ width: 768, height: 1024 }); await p2.waitForTimeout(400);
    const back = await p2.evaluate(() => [...document.querySelectorAll('[data-flow-scene] *')].filter(e => e.getAnimations().length).length);
    assert.deepEqual([...errors, ...e2], []);
    log('behaviour', { test: 'breakpoint 1024 → 768 → 1024 → 768', reachedAtCrossing: passed.above, passedPlays: passed.plays, afterPlays: after.plays, liveObservers: after.live, midPlayToDesktop: desktop, backToMobileRunning: back });
    await context.close(); await c2.close();
  }
  // 5. Desktop and ≥ 1024 touch keep their own behaviour: no scene observer, no scene motion.
  for (const [name, opts] of [['desktop 1440x900', { viewport: { width: 1440, height: 900 } }], ['coarse pointer 1366x1024', { viewport: { width: 1366, height: 1024 }, hasTouch: true }], ['coarse pointer 1024x768', { viewport: { width: 1024, height: 768 }, hasTouch: true }]]) {
    const { context, page, errors } = await open(browser, opts);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(400);
    const a = await page.evaluate(() => window.sceneAudit);
    assert.deepEqual([a.observers, a.plays, a.holds], [0, [0, 0, 0], [0, 0, 0]], `${name}: M15–M17 not initialised`);
    assert.deepEqual(errors, []);
    log('behaviour', { test: `${name}: M15–M17 not initialised`, observers: a.observers });
    await context.close();
  }
  // 6. Scroll performance through the three scenes at 390×844 (CPU 1× and 4×) and 768×1024.
  for (const [width, height, cpu] of [[390, 844, 1], [390, 844, 4], [768, 1024, 1], [768, 1024, 4]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => { window.audit = { long: [], shifts: [], frames: [] }; new PerformanceObserver(l => { for (const e of l.getEntries()) window.audit.long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.audit.shifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true }); });
    const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(2500);
    const tops = await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; return [...document.querySelectorAll('.scene-device')].map(d => d.getBoundingClientRect().top + scrollY); });
    await go(page, tops[0] - height); await page.waitForTimeout(600);
    const before = await page.evaluate(() => { const n = window.audit.shifts.length; window.audit.long = []; let last = performance.now(); const tick = t => { window.audit.frames.push(t - last); last = t; if (!window.audit.stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick); return n; });
    await page.mouse.move(width / 2, height / 2);
    for (let y = tops[0] - height; y < tops[2] + height; y += 60) { await page.mouse.wheel(0, 60); await page.waitForTimeout(40); }
    await page.waitForTimeout(2400);
    const a = await page.evaluate(() => { window.audit.stop = true; return window.audit; });
    const frames = a.frames.slice(2).sort((x, y) => x - y), q = f => +frames[Math.min(frames.length - 1, Math.floor(f * frames.length))].toFixed(1);
    const cls = a.shifts.slice(before).reduce((s, v) => s + v, 0);
    assert.equal(cls, 0, 'motion-attributable CLS');
    log('scroll', { viewport: `${width}x${height}`, cpu, frames: frames.length, p50: q(0.5), p95: q(0.95), max: +frames.at(-1).toFixed(1), longTasks: a.long, motionCLS: cls });
    await context.close();
  }
  // 7. Optional recordings: a natural pass through Office 01–02 → Field 03–04 → Office 05–06.
  if (process.argv.includes('--video')) for (const [width, height] of [[390, 844], [768, 1024]]) {
    const context = await browser.newContext({ viewport: { width, height }, recordVideo: { dir: out, size: { width, height } } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(1200);
    const tops = await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; return [...document.querySelectorAll('.scene-device')].map(d => d.getBoundingClientRect().top + scrollY); });
    const intro = await page.evaluate(() => document.querySelector('#como-funciona').getBoundingClientRect().top + scrollY);
    await go(page, intro); await page.waitForTimeout(900); await page.mouse.move(width / 2, height / 2);
    // Flick-and-read: about 700 px in ≈ 0.4 s, then a pause to read, like a thumb on a phone.
    let y = intro;
    const flick = async (to, pause) => { while (y < to) { const d = Math.min(70, to - y); await page.mouse.wheel(0, d); y += d; await page.waitForTimeout(40); } await page.waitForTimeout(pause); };
    for (const [to, pause] of [[tops[0] - height * 0.55, 2200], [tops[0] + height * 0.2, 1400], [tops[1] - height * 0.55, 2600], [tops[1] + height * 0.25, 1400], [tops[2] - height * 0.55, 2800], [tops[2] + height * 0.35, 1600], [tops[2] + height * 0.75, 1500]]) await flick(to, pause);
    const video = page.video(); await context.close();
    fs.renameSync(await video.path(), path.join(out, `scenes-${width}x${height}.webm`));
  }
  fs.writeFileSync(path.join(out, 'scenes-validation.json'), JSON.stringify(report, null, 1));
  await browser.close();
  console.log('scenes validation passed');
})().catch(error => { console.error(error); process.exit(1); });
