// V3.2 M06–M14 browser validation: the complete pinned desktop workflow (pin, track, dwells, T12–T56,
// the latched chart) against the approved static build. Same runtime as validate-hero.cjs: MOTION_TEST_MODULES, MOTION_TEST_BROWSER,
// MOTION_REPORT_DIR, and serve-motion-validation.cjs (baseline :8770, candidate :8771).
// `--video` also records 01 → 02 → 03 → 04 → 05 → 06 → 05 → 04 → 03 at 1440×900 and 1280×720.
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
    boxes: [...li.querySelectorAll('*')].filter(e => !e.closest('.mo-carrier,.mo-ghost,.mo-crumb,.mo-clone')).map(e => { const r = e.getBoundingClientRect(); return [r.x - o.x, r.y - o.y, r.width, r.height, eff(e)]; }),
    others: pinned ? Math.max(0, ...[...t.children].filter((_, i) => i !== k).flatMap(f => [...f.querySelectorAll(layers)].map(eff))) : 0,
    carriers: Math.max(0, ...[...t.querySelectorAll('.mo-carrier, .mo-clone')].map(eff)),
    inside: [...li.querySelectorAll('.flow-devices, .flow-copy, .rail, .flow-foot')].every(e => { const r = e.getBoundingClientRect(); return r.top >= o.top - 30 && r.bottom <= o.bottom + 0.5; })
  };
};
const STATE = () => {
  const t = document.querySelector('[data-flow-track]');
  const eff = el => { let v = 1; for (let e = el; e && e !== t; e = e.parentElement) v *= +getComputedStyle(e).opacity; return v; };
  const at = el => { const r = el.getBoundingClientRect(); return [+eff(el).toFixed(3), Math.round(r.x), Math.round(r.y)]; };
  return { devices: [...t.children].map(f => +eff(f.querySelector('.flow-devices')).toFixed(3)), carriers: [...t.querySelectorAll('.mo-carrier')].map(at), phone: at(t.children[2].querySelector('.fd-phone')), classes: [...t.children].map(f => f.className) };
};
// Crumbs on screen (effective opacity, visibility included): in every transition they crossfade and are never empty.
const CRUMB = () => {
  const t = document.querySelector('[data-flow-track]');
  const eff = el => { let v = getComputedStyle(el).visibility === 'visible' ? 1 : 0; for (let e = el; e && e !== t; e = e.parentElement) v *= +getComputedStyle(e).opacity; return v; };
  const o = [...t.querySelectorAll('.app-crumb .mo-crumb')].filter(c => !c.closest('.mo-carrier')).map(eff);
  return { sum: o.reduce((a, b) => a + b, 0), max: Math.max(...o) };
};
// FLIP (T23, T45, T56): every effect is seeked to the exact instant each carrier leg starts or lands, and
// the carrier is compared with the real DOM element it stands for (boxes in CSS px).
const FLIP = () => {
  const t = document.querySelector('[data-flow-track]'), f = [...t.children];
  const timeline = document.getAnimations().filter(a => a.effect.getTiming().duration === 6500);
  const T = [[0.5, 1.2], [1.55, 2.5], [2.85, 3.45], [3.8, 4.75], [5.05, 5.65]];
  const seek = (k, n = 1) => { for (const a of timeline) a.currentTime = (T[n][0] + k * (T[n][1] - T[n][0]) + 0.5) * 1000; };
  const b = el => el.getBoundingClientRect();
  const d = (x, y) => Math.max(Math.abs(x.x - y.x), Math.abs(x.y - y.y), Math.abs(x.height - y.height));
  const title = t.querySelector('.mo-carrier.scr-title'), shell = t.querySelector('.mo-carrier.mo-shell');
  const out = {};
  seek(0); out.titleStart = d(b(title), b(f[1].querySelector('.scr-title')));
  seek(0.3); out.titleSlot = d(b(title), b(f[2].querySelector('.ag-slot.is-focus .ag-what b')));
  seek(0.4); out.chipStart = d(b(shell.querySelector('.ph-head .ui-pill')), b(f[2].querySelector('.ag-slot.is-focus .ui-pill')));
  seek(0.8); out.chipLand = d(b(shell.querySelector('.ph-head')), b(f[2].querySelector('.ph-head')));
  out.chipWidth = Math.abs(b(shell.querySelector('.ph-head')).width - b(f[2].querySelector('.ph-head')).width);
  const os = t.querySelector('.mo-carrier.ph-code'), sale = t.querySelector('.mo-carrier.mo-sale .ui-val'), fin = t.querySelector('.mo-carrier.mo-fin b');
  const phone4 = f[3].querySelector('.fd-phone:last-child'), lines = f[4].querySelectorAll('.fin-line .ui-val');
  seek(0.3, 3); out.osStart = d(b(os), b(phone4.querySelector('.ph-code')));
  seek(0.7, 3); out.osLand = d(b(os), b(f[4].querySelector('.fin-os b')));
  seek(0.46, 3); out.saleStart = d(b(sale), b(f[3].querySelector('.live-sale .ui-val')));
  seek(0.88, 3); out.saleLand = d(b(sale), b(lines[1]));
  seek(0.3, 4); out.finStart = d(b(fin), b(f[4].querySelector('.fin-os b')));
  seek(0.6, 4); out.finLand = d(b(fin), b(f[5].querySelectorAll('.hist-ev')[1].querySelector('b')));
  return out;
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
      // D5: the first arrival also grows the chart once (600 ms, time-based); compare the settled frame.
      await go(pin.page, g.top + DWELL[k] * height); await pin.page.waitForTimeout(k === 4 ? 900 : 300);
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
    const REV = [0.8, 1.0, 1.9, 2.1, 2.3, 3.0, 3.2, 4.0, 4.2, 4.4, 4.6, 5.2, 5.4, 5.6];
    for (const p of REV) { await go(page, g.top + p * height); await page.waitForTimeout(300); forward[p] = await page.evaluate(STATE); }
    await go(page, g.top + 5.8 * height); await page.waitForTimeout(300);
    for (const p of [...REV].reverse()) { await go(page, g.top + p * height); await page.waitForTimeout(300); back[p] = await page.evaluate(STATE); }
    for (const p of Object.keys(forward)) assert.deepEqual(back[p], forward[p], `reverse at p = ${p}`);
    // Crumbs never empty, and money stays out of the phone: no R$ in any phone (or the T34 copy) or in the
    // carrier bound for it, no visible R$ value drawn over a visible phone, and R$ 2.420 nowhere in the
    // track, at every sampled instant of T12–T56 (slow scroll, under the fast-scroll threshold).
    const MONEY = () => {
      const t = document.querySelector('[data-flow-track]');
      const eff = el => { let v = getComputedStyle(el).visibility === 'visible' ? 1 : 0; for (let e = el; e && e !== document.body; e = e.parentElement) v *= +getComputedStyle(e).opacity; return v; };
      const phones = [...t.querySelectorAll('.fd-phone .ph')].filter(ph => eff(ph) > 0.01).map(ph => ph.getBoundingClientRect());
      const over = [...t.querySelectorAll('.mo-carrier .ui-val')].filter(v => /R\$/.test(v.textContent) && eff(v) > 0.01).some(v => { const a = v.getBoundingClientRect(); return phones.some(ph => a.right > ph.left && a.left < ph.right && a.bottom > ph.top && a.top < ph.bottom); });
      return { inPhone: /R\$/.test([...t.querySelectorAll('.fd-phone, .mo-carrier.mo-shell')].map(e => e.textContent).join(' ')), over, sum: /R\$\s?2\.420/.test(t.textContent) };
    };
    let crumb = { minSum: 2, max: 1 };
    await go(page, g.top + 0.4 * height); await page.waitForTimeout(250);
    for (let p = 0.45; p <= 5.7; p += 0.02) {
      await go(page, g.top + p * height); await page.waitForTimeout(40);
      const c = await page.evaluate(CRUMB), m = await page.evaluate(MONEY);
      assert.deepEqual(m, { inPhone: false, over: false, sum: false }, `money at p = ${p.toFixed(2)}`);
      crumb = { minSum: Math.min(crumb.minSum, c.sum), max: Math.min(crumb.max, c.max) };
    }
    assert.ok(crumb.minSum > 0.98 && crumb.max >= 0.5, `crumb never empty: ${JSON.stringify(crumb)}`);
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'entry/sticky/exit + reverse + no R$ on phone + crumb never empty', viewport: `${width}x${height}`, tops, crumbMinSum: +crumb.minSum.toFixed(3), crumbMinMax: +crumb.max.toFixed(3) });
    await context.close();
  }
  // 2a. T23, T45 and T56 FLIP: carriers start on and land on the real DOM elements (no fixed widths).
  for (const [width, height] of PINNED) {
    const { context, page, errors } = await open(browser, { viewport: { width, height } });
    const flip = await page.evaluate(FLIP);
    assert.ok(Object.values(flip).every(v => v < 0.05), `FLIP ${width}x${height}: ${JSON.stringify(flip)}`);
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'T23/T45/T56 FLIP measured on the DOM', viewport: `${width}x${height}`, ...flip });
    await context.close();
  }
  // 2b. One scroll scheduler for M05 + workflow: one passive scroll listener, never two pending frames.
  for (const [width, height] of [[1440, 900], [1280, 720]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const s = window.scheduler = { listeners: 0, passive: true, pending: 0, maxPending: 0, ticks: 0 };
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, fn, options) {
        if (type === 'scroll' && (this === window || this === document)) { s.listeners++; s.passive = s.passive && !!(options && options.passive); }
        return add.call(this, type, fn, options);
      };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => { s.pending++; s.maxPending = Math.max(s.maxPending, s.pending); return raf(t => { s.pending--; s.ticks++; callback(t); }); };
    });
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(1300);
    const top = await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; return document.querySelector('[data-flow-track]').getBoundingClientRect().top + scrollY; });
    await page.mouse.move(width / 2, height / 2);
    // The hero exit (M05) and the whole workflow (M06–M14), wheel-driven, then back.
    for (let y = 0; y < top + 6.5 * height; y += 90) { await page.mouse.wheel(0, 90); await page.waitForTimeout(12); }
    for (let y = 0; y < top + 6.5 * height; y += 90) { await page.mouse.wheel(0, -90); await page.waitForTimeout(12); }
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => window.scheduler);
    assert.equal(s.listeners, 1, 'one scroll listener');
    assert.ok(s.passive, 'scroll listener is passive');
    assert.equal(s.maxPending, 1, 'at most one pending requestAnimationFrame');
    log('behaviour', { test: 'single scroll scheduler (M05 + workflow)', viewport: `${width}x${height}`, ...s });
    await context.close();
  }
  // 3. Resize mid-T23/T34/T45/T56 equals a fresh load (the fresh load first walks the same path, so the
  // once-only chart is in the same state); anchors; fast-scroll cut.
  for (const [name, at] of [['T23', 2.05], ['T34', 3.15], ['T45', 4.3], ['T56', 5.35]]) {
    const walk = async (page, top, h) => { for (let p = 0; p <= at; p += 0.05) { await go(page, top + p * h); await page.waitForTimeout(25); } await go(page, top + at * h); await page.waitForTimeout(350); };
    const { context, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } });
    let g = await page.evaluate(GEOMETRY);
    await walk(page, g.top, 900);
    await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(500);
    g = await page.evaluate(GEOMETRY); await go(page, g.top + at * 720); await page.waitForTimeout(350);
    const resized = await page.evaluate(STATE);
    const fresh = await open(browser, { viewport: { width: 1280, height: 720 } });
    const f = await fresh.page.evaluate(GEOMETRY); await walk(fresh.page, f.top, 720);
    assert.deepEqual(resized, await fresh.page.evaluate(STATE), `resize mid-${name}`);
    const flip = await page.evaluate(FLIP);
    assert.ok(Object.values(flip).every(v => v < 0.05), `FLIP after resize mid-${name}: ${JSON.stringify(flip)}`);
    assert.deepEqual([...errors, ...fresh.errors], []);
    log('behaviour', { test: `resize 1440x900 → 1280x720 mid-${name} = fresh load, FLIP re-measured`, ...flip });
    await context.close(); await fresh.context.close();
  }
  // M13: the chart grows once per page view (time-based, latched), never with the scroll.
  {
    const { context, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } });
    await page.evaluate(() => { window.grows = 0; const o = Element.prototype.animate; Element.prototype.animate = function (k, t) { if (this.classList.contains('fin-bar') && t?.duration === 250) window.grows++; return o.call(this, k, t); }; });
    const g = await page.evaluate(GEOMETRY);
    const bars = () => page.evaluate(() => [...document.querySelectorAll('[data-flow-track] > :nth-child(5) .fin-bar')].map(e => getComputedStyle(e).scale));
    const walk = async (a, z) => { const s = a < z ? 0.04 : -0.04; for (let p = a; s > 0 ? p <= z : p >= z; p += s) { await go(page, g.top + p * 900); await page.waitForTimeout(30); } await page.waitForTimeout(700); };
    await walk(2.6, 4.3);
    const held = await bars();
    await walk(4.3, 4.9);
    const grown = await bars();
    await walk(4.9, 3.6); await walk(3.6, 4.9); await walk(4.9, 5.8); await walk(5.8, 4.9);
    const after = await bars(), n = await page.evaluate(() => window.grows);
    assert.ok(held.every(v => v === '1 0'), `held before T45 t 0.60: ${held}`);
    assert.ok(grown.every(v => v === 'none') && after.every(v => v === 'none'), `final after growing: ${grown} / ${after}`);
    assert.equal(n, 6, 'one grow: six bars, once');
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'M13 chart grows once (03→04→05, 05→04→05, 05→06→05)', growEffects: n });
    await context.close();
  }
  // Webfonts arriving after the 400 ms bound: the workflow is re-measured and equals a normal load.
  {
    const TOKENS = () => [...document.querySelectorAll('[data-flow-track] .rail-token')].map(e => getComputedStyle(e).translate);
    const normal = await open(browser, { viewport: { width: 1440, height: 900 } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/*.woff2', async route => { await new Promise(r => setTimeout(r, 1500)); await route.continue(); });
    const page = await context.newPage(); await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(3200);
    const late = { tokens: await page.evaluate(TOKENS), flip: await page.evaluate(FLIP) };
    assert.deepEqual(late.tokens, await normal.page.evaluate(TOKENS), 'late webfonts: rail token stops');
    assert.ok(Object.values(late.flip).every(v => v < 0.05), `late webfonts: FLIP ${JSON.stringify(late.flip)}`);
    log('behaviour', { test: 'late webfonts (+1500 ms) re-measured = normal load', ...late.flip });
    await context.close(); await normal.context.close();
  }
  {
    const { context, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 } }, 8771, '#planos');
    const s = await page.evaluate(STATE);
    assert.deepEqual(errors, []);
    assert.equal(s.carriers.filter(c => c[0] > 0).length, 0);
    log('behaviour', { test: 'anchor #planos', devices: s.devices });
    await context.close();
  }
  // #como-funciona lands on the pinned story start (p = 0, pre-roll complete) from a load and from the
  // header link (smooth scroll); unpinned it stays the native anchor of the approved static page.
  const START = () => {
    const t = document.querySelector('[data-flow-track]'), d = t.children[0].querySelector('.flow-devices'), s = getComputedStyle(d);
    return { p: +((scrollY - (t.getBoundingClientRect().top + scrollY)) / t.children[0].offsetHeight).toFixed(4), frameTop: +t.children[0].getBoundingClientRect().top.toFixed(1), devices: [+s.opacity, s.translate] };
  };
  for (const [width, height] of PINNED) {
    const { context, page, errors } = await open(browser, { viewport: { width, height } }, 8771, '#como-funciona');
    const load = await page.evaluate(START);
    await go(page, 0); await page.waitForTimeout(300);
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = ''; });
    await page.click('.mk-nav-links a[href="#como-funciona"]'); await page.waitForTimeout(2500);
    const link = await page.evaluate(START);
    for (const s of [load, link]) assert.ok(Math.abs(s.p) < 0.002 && Math.abs(s.frameTop) < 1 && s.devices[0] === 1 && ['none', '0px', '0px 0px'].includes(s.devices[1]), `#como-funciona ${width}x${height}: ${JSON.stringify(s)}`);
    assert.deepEqual(errors, []);
    log('behaviour', { test: 'anchor #como-funciona → pinned story start', viewport: `${width}x${height}`, load, link });
    await context.close();
  }
  for (const [name, options] of [['coarse pointer 1280x800', { viewport: { width: 1280, height: 800 }, hasTouch: true }], ['tablet 768x1024', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }], ['reduced motion 1440x900', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }]]) {
    const c = await open(browser, options, 8771, '#como-funciona'), b = await open(browser, options, 8770, '#como-funciona');
    const y = [await c.page.evaluate(() => scrollY), await b.page.evaluate(() => scrollY)];
    assert.equal(y[0], y[1], `${name}: native #como-funciona`);
    assert.deepEqual(c.errors, []);
    log('behaviour', { test: `anchor #como-funciona native, ${name}`, scrollY: y[0] });
    await c.context.close(); await b.context.close();
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
  // 5. Scroll performance 03 → 06 → 03: long tasks, frame pacing, motion-attributable CLS, pending frames.
  for (const [width, height] of [[1440, 900], [1280, 720]]) for (const cpu of [1, 4]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.audit = { raf, pending: 0, maxPending: 0 }; window.requestAnimationFrame = cb => { window.audit.pending++; window.audit.maxPending = Math.max(window.audit.maxPending, window.audit.pending); return raf(t => { window.audit.pending--; cb(t); }); }; });
    await page.addInitScript(() => { Object.assign(window.audit, { long: [], shifts: [], frames: [] }); new PerformanceObserver(l => { for (const e of l.getEntries()) window.audit.long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.audit.shifts.push(e.value); }).observe({ type: 'layout-shift', buffered: true }); });
    const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await page.goto('http://127.0.0.1:8771/'); await page.waitForTimeout(2500);
    const top = await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; return document.querySelector('[data-flow-track]').getBoundingClientRect().top + scrollY; });
    await go(page, Math.round(top + 2.675 * height)); await page.waitForTimeout(800);
    // The test's own frame clock uses the unwrapped requestAnimationFrame; only the page's are counted.
    const before = await page.evaluate(() => { const n = window.audit.shifts.length; window.audit.long = []; window.audit.maxPending = window.audit.pending; let last = performance.now(); const tick = t => { window.audit.frames.push(t - last); last = t; if (!window.audit.stop) window.audit.raf(tick); }; window.audit.raf(tick); return n; });
    await page.mouse.move(width / 2, height / 2);
    // D3 → D6 (3.15 stage heights) and back, at ≈ 2 stage heights per second.
    const step = 60, wait = Math.round(step / (2 * height) * 1000);
    for (let y = 0; y < 3.15 * height; y += step) { await page.mouse.wheel(0, step); await page.waitForTimeout(wait); }
    for (let y = 0; y < 3.15 * height; y += step) { await page.mouse.wheel(0, -step); await page.waitForTimeout(wait); }
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => { window.audit.stop = true; return window.audit; });
    const frames = a.frames.slice(2).sort((x, y) => x - y), q = f => +frames[Math.min(frames.length - 1, Math.floor(f * frames.length))].toFixed(1);
    const cls = a.shifts.slice(before).reduce((s, v) => s + v, 0);
    assert.equal(cls, 0, 'motion-attributable CLS');
    assert.deepEqual(a.long, [], 'long tasks while scrolling the workflow');
    assert.equal(a.maxPending, 1, 'at most one pending requestAnimationFrame');
    log('scroll', { viewport: `${width}x${height}`, cpu, path: '03 → 06 → 03', frames: frames.length, p50: q(0.5), p95: q(0.95), max: +frames.at(-1).toFixed(1), over25ms: frames.filter(f => f > 25).length, longTasks: a.long.length, motionCLS: cls, maxPendingRAF: a.maxPending });
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
    for (const [p, hold] of [[0.25, 900], [1.375, 900], [2.675, 1200], [3.625, 1200], [4.9, 1500], [5.825, 1500], [4.9, 1200], [3.625, 1200], [2.675, 1500]]) await to(p, hold);
    const video = page.video(); await context.close();
    fs.renameSync(await video.path(), path.join(out, `workflow-${width}x${height}.webm`));
  }
  fs.writeFileSync(path.join(out, 'workflow-validation.json'), JSON.stringify(report, null, 1));
  await browser.close();
  console.log('workflow validation passed');
})().catch(error => { console.error(error); process.exit(1); });
