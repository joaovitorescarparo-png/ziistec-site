(() => {
  const root = document.documentElement;
  const home = document.querySelector('.page-home');
  if (!home) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pinQuery = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)');
  // The only scroll scheduler for all motion (M05 + workflow): one passive scroll listener and at
  // most one pending requestAnimationFrame. Each job reads layout and returns its writes; in a tick
  // every read runs before any write.
  const jobs = [];
  let frame = 0;
  function tick() {
    frame = 0;
    for (const write of jobs.map(read => read())) if (write) write();
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(tick); };
  addEventListener('scroll', schedule, { passive: true });
  window.ziisMotion = { isPinEligible: () => pinQuery.matches && !reduced.matches, schedule, job: read => jobs.push(read) };
  const stage = document.querySelector('.mk-hero-stage');
  const entrances = new Set();
  const quiet = new Map();
  const clamp = value => Math.max(0, Math.min(1, value));

  function clearQuiet() {
    for (const animation of quiet.values()) animation.cancel();
    quiet.clear();
  }
  function settle() {
    for (const animation of entrances) animation.cancel();
    entrances.clear();
    document.querySelector('.hero-win .ov-row.is-hi')?.removeAttribute('data-motion-tint');
    root.classList.remove('motion-pending');
  }
  function readQuiet() {
    if (reduced.matches || !root.classList.contains('motion') || innerWidth < 640) return clearQuiet;
    // M05: the last 40% exits across the viewport's top edge.
    const box = stage.getBoundingClientRect();
    const progress = clamp(1 - box.bottom / (box.height * 0.4));
    // No effect remains at the static endpoint: even text rasterization matches 0c6b4ff.
    return progress === 0 ? clearQuiet : () => writeQuiet(progress);
  }
  function writeQuiet(progress) {
    for (const element of stage.querySelectorAll('.hero-toast, .hero-where')) {
      if ([...entrances].some(a => a.effect.target === element)) continue;
      let animation = quiet.get(element);
      if (!animation) {
        animation = element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, fill: 'both', easing: 'linear' });
        animation.pause();
        quiet.set(element, animation);
      }
      animation.currentTime = progress;
    }
  }
  jobs.push(readQuiet);
  addEventListener('resize', () => { settle(); schedule(); }, { passive: true });
  addEventListener('pageshow', event => { if (event.persisted) { settle(); schedule(); } });
  reduced.addEventListener('change', event => {
    settle();
    clearQuiet();
    if (event.matches) root.classList.remove('motion');
    else root.classList.add('motion');
    schedule();
  });

  async function startHero() {
    const canEnter = root.classList.contains('motion-pending');
    // fonts.ready is capped, including browsers that never finish loading a font.
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 400))]);
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!canEnter || reduced.matches || !root.classList.contains('motion') || scrollY >= 100 || location.hash || navigation?.type === 'back_forward') {
      settle();
      clearTimeout(window.ziisMotionBoot?.timer);
      schedule();
      return;
    }
    // Remove pending synchronously to measure FINAL boxes, before any animation writes.
    root.classList.remove('motion-pending');
    const tokens = getComputedStyle(home);
    const token = name => tokens.getPropertyValue(name).trim();
    const standard = token('--zt-ease-standard');
    const emphasis = token('--mo-ease-emphasis');
    const enter = parseFloat(token('--zt-motion-enter'));
    const xl = parseFloat(token('--mo-enter-xl'));
    const stagger = parseFloat(token('--zt-motion-stagger'));
    const small = token('--mo-rise-sm');
    const rise = token('--zt-rise');
    const mobile = innerWidth < 640;
    const tablet = innerWidth < 1024;
    const durationScale = tablet ? 0.85 : 1;
    const timeline = [];
    function add(selector, delay, duration, translate = '0 0', easing = standard, extra = {}) {
      document.querySelectorAll(selector).forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (!element.getClientRects().length || rect.top >= innerHeight) return;
        timeline.push({ element, delay: delay + index * stagger, duration: duration * durationScale,
          easing, from: { opacity: 0, translate, ...extra }, to: { opacity: 1, translate: '0 0', ...(extra.scale ? { scale: 1 } : {}) } });
      });
    }
    add('.mk-hero-kicker', 0, 320, `0 ${small}`);
    // R4 at every width: the clip reveal held the LCP element (+200ms on mobile, ≈ +800ms on
    // desktop). The title is opaque and unmasked from first paint; it only rises 16px.
    add('.mk-hero-title', 60, xl, '0 16px', emphasis, { opacity: 1 });
    add('.mk-hero-deck', 240, enter, `0 ${rise}`);
    add('.mk-hero-cta', 310, enter, `0 ${rise}`);
    add('.mk-hero-note', 450, 320);
    add('.hero-win', 300, xl, `0 ${token('--mo-rise-xl')}`, emphasis, mobile ? {} : { scale: 0.98 });
    add('.hero-win .ov-tile', 620, enter, `0 ${rise}`);
    if (!mobile) add('.hero-win .ov-table-head, .hero-win .ov-row', 900, 320, `0 ${small}`);
    add('.hero-phone', 1050, 560, `0 ${mobile ? 32 : tablet ? 40 : 64}px`, emphasis);
    add('.hero-phone .ph-head, .hero-phone .ph-panel, .hero-phone .ph-btns', 1250, 320, `0 ${small}`);
    add('.hero-toast', 1400, enter, '-16px 0');
    add('.hero-where', 1560, 320);
    const tint = document.querySelector('.hero-win .ov-row.is-hi');
    const tintVisible = !mobile && tint.getClientRects().length && tint.getBoundingClientRect().top < innerHeight;
    // All geometry is now captured. WAAPI preserves the approved transform:scale(--k).
    for (const item of timeline) {
      const animation = item.element.animate([item.from, item.to], { delay: item.delay, duration: item.duration, easing: item.easing, fill: 'both' });
      entrances.add(animation);
      animation.finished.then(() => { animation.cancel(); entrances.delete(animation); schedule(); }, () => { /* Expected cancellation on reduced motion / resize. */ });
    }
    if (tintVisible) {
      tint.setAttribute('data-motion-tint', '');
      const animation = tint.animate([{ opacity: 0 }, { opacity: 1 }], { pseudoElement: '::before', delay: 1180, duration: 240 * durationScale, easing: standard, fill: 'both' });
      entrances.add(animation);
      animation.finished.then(() => { animation.cancel(); entrances.delete(animation); tint.removeAttribute('data-motion-tint'); }, () => { /* Expected cancellation. */ });
    }
    clearTimeout(window.ziisMotionBoot?.timer);
    schedule();
  }
  // Initialization has started; the remaining fonts wait is bounded at 400ms and caught.
  clearTimeout(window.ziisMotionBoot?.timer);
  startHero().catch(error => {
    settle();
    clearQuiet();
    root.classList.remove('motion');
    console.error('Motion initialization failed; static page restored.', error);
  });
})();
(() => {
  // M06–M14: pinned workflow. Scroll is native; one rAF per scroll maps scrollY to p (0 → 6 over
  // 600svh) and seeks paused, finite WAAPI effects. Every effect ends on the approved static frame.
  const root = document.documentElement;
  const track = window.IntersectionObserver && document.querySelector('[data-flow-track]');
  const motion = window.ziisMotion;
  if (!track || !motion) return;
  const frames = [...track.children];
  const section = track.closest('section');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pinQuery = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)');
  const P0 = -0.5, P1 = 6, SPAN = P1 - P0;
  // [start, end, overlay] in stage heights; overlay = the incoming frame lies over the outgoing one.
  const T = [[0.5, 1.2, 1], [1.55, 2.5, 1], [2.85, 3.45, 1], [3.8, 4.75, 1], [5.05, 5.65, 0]];
  const mid = t => t[0] + (t[1] - t[0]) / 2;
  const DWELL = [0.25, 1.375, 2.675, 3.625, 4.9, 5.825];
  const E = {
    standard: 'cubic-bezier(0.2,0,0,1)', emphasis: 'cubic-bezier(0.16,1,0.3,1)',
    travel: 'cubic-bezier(0.65,0,0.35,1)', exit: 'cubic-bezier(0.4,0,1,1)', linear: 'linear'
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  let segs, anims = [], extras = [], swaps = [], applied = NaN, built = false, needSync = false, anchored = false, lastP = 0, lastT = 0, fast = false, fastTimer = 0, shown = [-1, -1], latches = [], holds = [], grown = false;

  const at = (k, t) => T[k][0] + t * (T[k][1] - T[k][0]);
  const q = (k, s) => frames[k].querySelector(s);
  const qa = (k, s) => [...frames[k].querySelectorAll(s)];
  // A pseudo-element target for seg(): { el, pseudo }, one object per element and pseudo.
  const pseudos = new Map();
  const pse = (el, name) => { const k = pseudos.get(el) || {}; pseudos.set(el, k); return k[name] ||= { el, pseudo: name }; };
  function seg(el, prop, a, b, from, to, ease = E.standard) {
    if (!el) return;
    if (!segs.has(el)) segs.set(el, {});
    (segs.get(el)[prop] ||= []).push({ a, b, from, to, ease });
  }
  const rest = el => getComputedStyle(el).opacity;
  // Element enters (0 → rest) or leaves (rest → 0) with an optional translate.
  function enter(el, a, b, dx = 0, dy = 0, ease, r = rest(el)) {
    if (!el) return;
    seg(el, 'opacity', a, b, '0', r, ease);
    if (dx || dy) seg(el, 'translate', a, b, `${dx}px ${dy}px`, '0px 0px', ease);
  }
  function leave(el, a, b, dx = 0, dy = 0, ease, r = rest(el)) {
    if (!el) return;
    seg(el, 'opacity', a, b, r, '0', ease);
    if (dx || dy) seg(el, 'translate', a, b, '0px 0px', `${dx}px ${dy}px`, ease);
  }
  const step = (el, p, from, to, prop = 'opacity') => seg(el, prop, p, p, from, to, E.linear);
  const off = p => clamp((p - P0) / SPAN);
  function compile() {
    for (const [el, props] of segs) for (const [prop, list] of Object.entries(props)) {
      list.sort((x, y) => x.a - y.a);
      let cur = list[0].from;
      const keys = [{ offset: 0, [prop]: cur }];
      for (const s of list) {
        keys.push({ offset: off(s.a), [prop]: cur }, { offset: off(s.a), [prop]: s.from, easing: s.ease }, { offset: off(s.b), [prop]: s.to });
        cur = s.to;
      }
      keys.push({ offset: 1, [prop]: cur });
      const animation = (el.pseudo ? el.el : el).animate(keys, { duration: SPAN * 1000, fill: 'both', pseudoElement: el.pseudo });
      animation.pause();
      anims.push(animation);
    }
  }
  // Carrier: a visual clone (aria-hidden) in `holder`, flown through `path` points given in the
  // holder's local CSS px: [p, {x, y}, height, ease]. Scale follows the requested height. With
  // `inner`, the path is that element's inside the clone, laid out by its own CSS (measured).
  function carrier(src, holder, path, extra, inner) {
    const clone = src.cloneNode(true);
    clone.classList.add('mo-carrier');
    if (extra) clone.classList.add(extra);
    clone.setAttribute('aria-hidden', 'true');
    holder.append(clone);
    extras.push(clone);
    const x0 = clone.offsetLeft, y0 = clone.offsetTop, c = local(box(clone), holder), e = inner ? local(box(clone.querySelector(inner)), holder) : { x: c.x, y: c.y, h: clone.offsetHeight };
    const at = (r, h) => { const k = h / e.h; return [`${r.x - x0 - k * (e.x - c.x)}px ${r.y - y0 - k * (e.y - c.y)}px`, `${k}`]; };
    for (let i = 1; i < path.length; i++) {
      const [pa, ra, ha] = path[i - 1], [pb, rb, hb, ease = E.travel] = path[i], a = at(ra, ha), b = at(rb, hb);
      seg(clone, 'translate', pa, pb, a[0], b[0], ease);
      seg(clone, 'scale', pa, pb, a[1], b[1], ease);
    }
    return clone;
  }
  // Screen rect → local CSS px of `holder` (origin = its top-left), measured at the holder's scale k.
  const local = (r, holder, k = box(holder).width / holder.offsetWidth) => ({ x: (r.x - box(holder).x) / k, y: (r.y - box(holder).y) / k, h: (r.height || r.h) / k });
  const box = el => el.getBoundingClientRect();
  // Nav indicator and crumb crossfade for an overlay transition (bottom k, top k + 1).
  function chrome(k) {
    const items = [qa(k, '.app-mod'), qa(k + 1, '.app-mod')];
    const from = items[0].findIndex(m => m.classList.contains('is-active'));
    const to = items[1].findIndex(m => m.classList.contains('is-active'));
    const ghost = items[0][from].cloneNode(true);
    ghost.classList.replace('is-active', 'mo-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    q(k + 1, '.app-side').append(ghost);
    extras.push(ghost);
    const y = i => items[1][i].offsetTop - items[1][0].offsetTop;
    seg(ghost, 'translate', at(k, 0.2), at(k, 0.6), `0px ${y(from)}px`, `0px ${y(to)}px`, E.travel);
    for (const i of [from, to]) {
      items[1][i].classList.add('mo-show');
      leave(items[0][i], at(k, 0.2), at(k, 0.6), 0, 0, E.travel);
      enter(items[1][i], at(k, 0.2), at(k, 0.6), 0, 0, E.travel);
    }
    // Crumb crossfade over t 0.30–0.60: the same symmetric curve out and in, so the two always sum to
    // 1 and the crumb is never empty.
    leave(q(k, '.mo-crumb'), at(k, 0.3), at(k, 0.6), 0, 0, E.travel);
    enter(q(k + 1, '.mo-crumb'), at(k, 0.3), at(k, 0.6), 0, 0, E.travel);
  }

  function build() {
    teardown();
    segs = new Map();
    anims = [];
    extras = [];
    for (const crumb of track.querySelectorAll('.app-crumb')) {
      const text = [...crumb.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
      if (text) { const span = document.createElement('span'); span.className = 'mo-crumb'; text.replaceWith(span); span.append(text); }
    }
    // Pre-roll: the first frame rises into the pin.
    const dev = frames.map(f => f.querySelector('.flow-devices'));
    seg(dev[0], 'translate', P0, 0, '0px 24px', '0px 0px', E.standard);
    seg(dev[0], 'opacity', P0, 0, '0.6', '1', E.standard);
    // Layer visibility: devices switch at the overlay edges or at the transition midpoint.
    T.forEach((t, k) => {
      const [inP, outP] = t[2] ? [t[0], t[1]] : [mid(t), mid(t)];
      step(dev[k + 1], inP, '0', '1');
      step(dev[k], outP, '1', '0');
      // M07: copy, numeral and step count.
      for (const s of ['.flow-count', '.flow-step-title', '.flow-step-desc', '.flow-foot > span:last-child']) {
        leave(q(k, s), at(k, 0.1), at(k, 0.35), 0, -12, E.travel, '1');
        enter(q(k + 1, s), at(k, 0.4), at(k, 0.7), 0, 12, E.travel, '1');
      }
      seg(q(k, '.flow-num'), 'opacity', at(k, 0.3), at(k, 0.4), '1', '0', E.travel);
      seg(q(k, '.flow-num'), 'translate', at(k, 0.3), at(k, 0.4), '0px 0px', '0px -40%', E.travel);
      seg(q(k + 1, '.flow-num'), 'opacity', at(k, 0.4), at(k, 0.5), '0', '1', E.travel);
      seg(q(k + 1, '.flow-num'), 'translate', at(k, 0.4), at(k, 0.5), '0px 40%', '0px 0px', E.travel);
    });
    // M08: one continuous rail on all six frames; the token rides the same value.
    const rails = frames.map(f => f.querySelector('.rail'));
    const xs = rails.map(r => box(r.querySelector('.rail-token')).x - box(r).x);
    const fillAt = [0, 0.2, 0.4, 0.6, 0.8, 1];
    rails.forEach((r, n) => {
      const fill = r.querySelector('.rail-fill'), token = r.querySelector('.rail-token');
      T.forEach((t, k) => {
        seg(fill, 'scale', t[0], t[1], `${fillAt[k]} 1`, `${fillAt[k + 1]} 1`, E.linear);
        seg(token, 'translate', t[0], t[1], `${xs[k] - xs[n]}px 0px`, `${xs[k + 1] - xs[n]}px 0px`, E.linear);
      });
    });

    // M09 · T12: approved quote → OS #0248. D1 ends on the approval pill.
    const pill = q(0, '.scr-head .ui-pill');
    seg(pill, 'opacity', 0.15, 0.225, '0', '1');
    seg(pill, 'scale', 0.15, 0.225, '0.9', '1');
    ['.scr-title', '.scr-sub', '.orc-lines', '.orc-total', '.orc-actions'].forEach((s, i) => leave(q(0, s), at(0, 0.04 * i), at(0, 0.2 + 0.04 * i), 0, -8));
    const head = q(0, '.scr-head'), origin = q(1, '.os-field.is-accent .os-val');
    step(head, at(0, 0.2), '1', '0');
    const w1 = q(1, '.fd-win'), a12 = local(box(head), w1), b12 = local(box(origin), w1);
    const c12 = carrier(head, w1, [[at(0, 0.2), a12, a12.h], [at(0, 0.6), b12, b12.h]], 'scr-head');
    step(c12, P0, '0', '0');
    step(c12, at(0, 0.2), '0', '1');
    seg(c12, 'opacity', at(0, 0.6), at(0, 0.66), '1', '0');
    for (const s of ['.scr-head', '.scr-title', '.scr-sub']) enter(q(1, s), at(0, 0.45), at(0, 0.8), 0, 12);
    qa(1, '.os-grid .os-field').forEach((el, i) => enter(el, at(0, 0.5 + 0.04 * i), at(0, 0.7 + 0.04 * i), 0, 8));
    enter(q(1, '.os-field.is-accent'), at(0, 0.6), at(0, 0.66));
    enter(q(1, '.fd-toast'), at(0, 0.7), at(0, 1), -24, 0);
    chrome(0);

    // M10 · T23: window recedes, agenda takes over, OS #0248 drops into its slot, phone enters,
    // the "OS #0248 · Atribuída" chip travels to the phone, the phone fills. No value enters the phone.
    leave(q(1, '.fd-toast'), at(1, 0), at(1, 0.15), -16, 0);
    [...qa(1, '.app-main > .scr-head, .app-main > .scr-sub'), ...qa(1, '.os-field')].forEach((el, i) => leave(el, at(1, 0.02 * i), at(1, 0.08 + 0.02 * i), 0, -8));
    const title = q(1, '.scr-title'), slot = q(2, '.ag-slot.is-focus'), slotName = slot.querySelector('.ag-what b');
    step(title, at(1, 0), '1', '0');
    const w2 = q(2, '.fd-win');
    // Both windows recede together: bottom 1 → 0.88, top (already .fd-win-back) 1/0.88 → 1.
    seg(q(1, '.fd-win'), 'scale', at(1, 0.2), at(1, 0.55), '1', '0.88', E.travel);
    seg(q(2, '.fd-win'), 'scale', at(1, 0.2), at(1, 0.55), `${1 / 0.88}`, '1', E.travel);
    for (const s of ['.app-main > .scr-head', '.ag-title']) enter(q(2, s), at(1, 0.15), at(1, 0.4), 0, 8);
    qa(2, '.ag-slot.is-faded').forEach((el, i) => enter(el, at(1, 0.15 + 0.04 * i), at(1, 0.36 + 0.04 * i)));
    enter(slot, at(1, 0.26), at(1, 0.32));
    const phone = q(2, '.fd-phone');
    seg(phone, 'opacity', at(1, 0.3), at(1, 0.85), '0', '1', E.emphasis);
    seg(phone, 'translate', at(1, 0.3), at(1, 0.85), '120px 40px', '0px 0px', E.emphasis);
    seg(phone, 'scale', at(1, 0.3), at(1, 0.85), '0.92', '1', E.emphasis);
    const phHead = q(2, '.ph-head');
    enter(phHead, at(1, 0.78), at(1, 0.86));
    qa(2, '.ph-screen > :not(.ph-notch):not(.ph-head)').forEach((el, i) => enter(el, at(1, 0.8 + 0.04 * i), at(1, 0.85 + 0.04 * i), 0, 8));
    chrome(1);

    // M11 · T34: atribuída → em atendimento. The phone stays: an aria-hidden copy of the stage-03 phone
    // sits under the stage-04 phone (whose shell is transparent while it lies over stage 03), so the
    // outgoing and incoming content share one phone body above both windows. No value enters the phone.
    const ph4 = q(3, '.fd-phone'), ph3 = q(2, '.fd-phone').cloneNode(true), o3 = s => ph3.querySelector(s), o4 = s => ph4.querySelector(s);
    ph3.classList.add('mo-clone');
    ph3.setAttribute('aria-hidden', 'true');
    ph4.before(ph3);
    extras.push(ph3);
    step(ph3, P0, '0', '0');
    step(ph3, T[2][0], '0', '1');
    step(ph3, T[2][1], '1', '0');
    latches = [{ p: at(2, 0.25), outs: [o3('.ph-head .ui-pill')], ins: [o4('.ph-head .ui-pill')], ms: 240, fx: [] }];
    for (const s of ['.ph-title', '.ph-addr', '.ph-time']) leave(o3(s), at(2, 0.2), at(2, 0.35), 0, -12);
    ph3.querySelectorAll('.ph-panel').forEach(el => leave(el, at(2, 0.2), at(2, 0.45), 0, -12));
    enter(o4('.ph-title'), at(2, 0.3), at(2, 0.45), 0, 8);
    ph4.querySelectorAll('.tl-item').forEach((el, i) => enter(el, at(2, 0.4 + 0.12 * i), at(2, 0.55 + 0.12 * i), 0, 8));
    seg(o4('.tl-now'), 'scale', at(2, 0.7), at(2, 0.79), '0', '1');
    enter(o4('.ph-material'), at(2, 0.68), at(2, 0.8), 0, 8);
    ph4.querySelectorAll('.ph-check').forEach((el, i) => { enter(el, at(2, 0.78 + 0.04 * i), at(2, 0.88 + 0.04 * i)); seg(el, 'scale', at(2, 0.78 + 0.04 * i), at(2, 0.88 + 0.04 * i), '0.6', '1'); });
    // The head code and the buttons are the same on both phones: the outgoing ones stay (the buttons
    // slide to their new place) and the incoming ones take over when the overlay ends.
    const btns = [o3('.ph-btns'), o4('.ph-btns')], dy = (box(btns[1]).y - box(btns[0]).y) / (box(dev[2]).width / dev[2].offsetWidth);
    seg(btns[0], 'translate', at(2, 0.4), at(2, 0.8), '0px 0px', `0px ${dy}px`, E.travel);
    for (const el of [btns[1], o4('.ph-code')]) step(el, T[2][1], '0', '1');
    // Back window: dims behind the phone and crossfades agenda → "OS #0248 · Em atendimento".
    seg(pse(q(3, '.app'), '::after'), 'opacity', at(2, 0.1), at(2, 0.6), '0', '0.22');
    for (const s of ['.app-main > .scr-head', '.ag-title', '.ag-list']) leave(q(2, s), at(2, 0.3), at(2, 0.48));
    for (const s of ['.app-main > .scr-head', '.scr-title', '.scr-sub', '.live-kick', '.tl-desk']) enter(q(3, s), at(2, 0.42), at(2, 0.6));
    enter(q(3, '.live-sale'), at(2, 0.8), at(2, 0.95), 0, 8);
    chrome(2);

    // M12 · T45: return to the office. "Concluir atendimento" is pressed (illustration, not
    // interactive), the phone relinquishes, the window returns to full size.
    const press = o4('.ph-btn.is-primary');
    seg(press, 'scale', at(3, 0), at(3, 0.07), '1', '0.97');
    seg(press, 'scale', at(3, 0.07), at(3, 0.14), '0.97', '1');
    seg(pse(press, '::after'), 'opacity', at(3, 0), at(3, 0.07), '0', '1');
    seg(pse(press, '::after'), 'opacity', at(3, 0.07), at(3, 0.14), '1', '0');
    seg(ph4, 'translate', at(3, 0.12), at(3, 0.45), '0px 0px', '96px 56px', E.exit);
    seg(ph4, 'scale', at(3, 0.12), at(3, 0.45), '1', '0.92', E.exit);
    seg(ph4, 'opacity', at(3, 0.12), at(3, 0.45), '1', '0', E.exit);
    step(o4('.ph-code'), at(3, 0.3), '1', '0');
    seg(q(3, '.fd-win'), 'scale', at(3, 0.2), at(3, 0.6), '1', `${1 / 0.88}`, E.travel);
    seg(q(4, '.fd-win'), 'scale', at(3, 0.2), at(3, 0.6), '0.88', '1', E.travel);
    seg(pse(q(3, '.app'), '::after'), 'opacity', at(3, 0.2), at(3, 0.6), '0.22', '0');
    for (const s of ['.app-main > .scr-head', '.scr-title', '.scr-sub', '.live-kick', '.tl-desk']) leave(q(3, s), at(3, 0.2), at(3, 0.45), 0, -8);
    for (const s of ['.app-main > .scr-head', '.fin-figs', '.fin-chart']) enter(q(4, s), at(3, 0.45), at(3, 0.7), 0, 8);
    // The two values stay separate: the quote line first, then R$ 420 arrives from the field.
    const fin = q(4, '.fin-os'), lines = fin.querySelectorAll('.fin-line'), sale = q(3, '.live-sale');
    enter(fin, at(3, 0.62), at(3, 0.7));
    enter(fin.querySelector('b'), at(3, 0.64), at(3, 0.7));
    enter(lines[0], at(3, 0.72), at(3, 0.82), 0, 8);
    enter(lines[1], at(3, 0.8), at(3, 0.88), 0, 8);
    enter(lines[1].querySelector('.ui-val'), at(3, 0.86), at(3, 0.88));
    // .live-sale leaves with the field screen. Its value sat behind the phone; it is drawn again only
    // once the phone is gone (t 0.46), riding the returning window, so R$ 420 never crosses the phone.
    step(sale.querySelector('.ui-val'), at(3, 0.2), '1', '0');
    leave(sale, at(3, 0.2), at(3, 0.45), 0, -8);
    chrome(3);
    compile();
    // T23 FLIP: source and target are measured in the DOM at the instant each leg starts and lands,
    // with every other effect seeked there (window recession and phone entrance included).
    const seek = (t, k = 1) => { for (const a of anims) a.currentTime = (at(k, t) - P0) * 1000; };
    seek(0);
    const a23 = local(box(title), w2);
    seek(0.3);
    const b23 = local(box(slotName), w2);
    seek(0.4);
    const sp = local(box(slot.querySelector('.ui-pill')), dev[2]);
    seek(0.8);
    const head2 = local(box(phHead), dev[2]), chipPill = local(box(phHead.querySelector('.ui-pill')), dev[2]);
    // T45: OS #0248 leaves the phone head (t 0.30) for the .fin-os title (t 0.70); R$ 420 rides the
    // returning window from .live-sale (t 0.46–0.60), then flies to the second line (t 0.74–0.88).
    // Measured where each leg starts and lands.
    seek(0.46, 3);
    const saleV = sale.querySelector('.ui-val'), sale0 = local(box(saleV), dev[4]);
    seek(0.3, 3);
    const code = o4('.ph-code'), osA = local(box(code), dev[4]);
    seek(0.7, 3);
    const osB = local(box(fin.querySelector('b')), dev[4]);
    seek(0.6, 3);
    const saleA = local(box(saleV), dev[4]);
    seek(0.88, 3);
    const saleB = local(box(lines[1].querySelector('.ui-val')), dev[4]);
    segs = new Map();
    const c23 = carrier(title, w2, [[at(1, 0), a23, a23.h], [at(1, 0.3), b23, b23.h]]);
    step(c23, P0, '0', '0');
    step(c23, at(1, 0), '0', '1');
    seg(c23, 'opacity', at(1, 0.3), at(1, 0.36), '1', '0');
    // The chip leaves the 14:00 slot's pill and lands on the phone head. It flies inside a clone of the
    // phone whose other content is hidden, so the head keeps its own layout (no fixed width).
    const r0 = sp.h / chipPill.h;
    const from = { x: sp.x - (chipPill.x - head2.x) * r0, y: sp.y - (chipPill.y - head2.y) * r0 };
    const over = { x: (from.x + head2.x) / 2, y: (from.y + head2.y) / 2 - 24 };
    const chip = carrier(phone, dev[2], [[at(1, 0.4), from, head2.h * r0], [at(1, 0.6), over, head2.h * (r0 + 1) / 2, 'cubic-bezier(0.3,0,0.7,0.6)'], [at(1, 0.8), head2, head2.h, 'cubic-bezier(0.3,0.4,0.35,1)']], 'mo-shell', '.ph-head');
    step(chip, P0, '0', '0');
    seg(chip, 'opacity', at(1, 0.4), at(1, 0.44), '0', '1');
    seg(chip, 'opacity', at(1, 0.8), at(1, 0.86), '1', '0');
    // The OS carrier is the phone's own "OS #0248" code on a reverse arc; it carries no money.
    const c45 = carrier(code, dev[4], [[at(3, 0.3), osA, osA.h], [at(3, 0.5), { x: (osA.x + osB.x) / 2, y: (osA.y + osB.y) / 2 - 24 }, (osA.h + osB.h) / 2, 'cubic-bezier(0.3,0,0.7,0.6)'], [at(3, 0.7), osB, osB.h, 'cubic-bezier(0.3,0.4,0.35,1)']]);
    step(c45, P0, '0', '0');
    seg(c45, 'opacity', at(3, 0.3), at(3, 0.33), '0', '1');
    seg(c45, 'opacity', at(3, 0.66), at(3, 0.72), '1', '0');
    // R$ 420 moves alone (a copy of .live-sale with only its value drawn) into the second line.
    const c420 = carrier(sale, dev[4], [[at(3, 0.46), sale0, sale0.h], [at(3, 0.6), saleA, saleA.h], [at(3, 0.74), saleA, saleA.h], [at(3, 0.88), saleB, saleB.h]], 'mo-sale', '.ui-val');
    step(c420, P0, '0', '0');
    seg(c420, 'opacity', at(3, 0.46), at(3, 0.52), '0', '1');
    seg(c420, 'opacity', at(3, 0.86), at(3, 0.9), '1', '0');
    compile();
    // M13: the six bars hold at the baseline until T45 first passes t 0.60, then grow once (time-based,
    // latched for the page view). A build already past that point shows them final.
    if (progress() >= at(3, 0.6)) grown = true;
    holds = grown ? [] : qa(4, '.fin-bar').map(bar => bar.animate([{ scale: '1 0' }, { scale: '1 0' }], { duration: 1, fill: 'both' }));
    // #como-funciona lands on the pinned story start (p = 0), never on the intro or the pre-roll.
    const start = Math.ceil(track.getBoundingClientRect().top + scrollY), intro = section.getBoundingClientRect().top + scrollY;
    // The offset is held by a WAAPI effect (no inline style); scroll-margin moves no layout.
    const margin = `${intro - start}px`;
    anims.push(section.animate([{ scrollMarginTop: margin }, { scrollMarginTop: margin }], { duration: 1, fill: 'both' }));
    // A first load at #como-funciona may already be scrolling to the intro: send it once to the same
    // start instead (not on reload or history navigation, which restore their own position).
    if (!anchored && location.hash === '#' + section.id && performance.getEntriesByType('navigation')[0]?.type === 'navigate' && scrollY <= intro + 2) section.scrollIntoView({ behavior: 'instant' });
    anchored = true;
    built = true;
    shown = [-1, -1];
    applied = NaN;
    lastP = clamp(progress(), P0, P1 + 1);
    lastT = performance.now();
    update(lastP, lastT);
  }
  function teardown() {
    if (!built) return;
    for (const a of anims) a.cancel();
    for (const a of swaps) a.cancel();
    for (const l of latches) for (const a of l.fx) a.cancel();
    for (const a of holds) a.cancel();
    for (const el of extras) el.remove();
    for (const el of track.querySelectorAll('.mo-show')) el.classList.remove('mo-show');
    frames.forEach(f => f.classList.remove('mo-over', 'mo-under'));
    built = false;
  }
  const eligible = () => pinQuery.matches && !reduced.matches && root.classList.contains('motion');
  function progress() {
    const stage = frames[0].offsetHeight;
    return (scrollY - (track.getBoundingClientRect().top + scrollY)) / stage;
  }
  // Rail stops (160 ms) and the place chip (240 ms when its words change) switch at each midpoint.
  function swap(group, n, ms) {
    const els = frames.map(f => f.querySelector(group ? '.flow-place' : '.rail'));
    const old = shown[group];
    shown[group] = n;
    const same = old >= 0 && els[old].textContent === els[n].textContent;
    const d = old < 0 || (group && same) ? 0 : ms;
    els.forEach((el, i) => {
      if (i !== n && i !== old) return;
      const animation = el.animate([{ opacity: i === n ? 0 : 1 }, { opacity: i === n ? 1 : 0 }], { duration: d, easing: E.standard, fill: 'forwards' });
      swaps.push(animation);
    });
    if (old < 0) els.forEach((el, i) => { if (i !== n) swaps.push(el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: 'forwards' })); });
  }
  // Time-based threshold swaps (T34 phone pill, T56 rail token), reversible at the same threshold.
  function flip(l, on) {
    const d = l.on === undefined ? 0 : l.ms;
    l.on = on;
    for (const a of l.fx) a.cancel();
    l.fx = [...l.outs.map(el => el.animate([{ opacity: on ? 1 : 0 }, { opacity: on ? 0 : 1 }], { duration: d, easing: E.standard, fill: 'forwards' })),
      ...l.ins.map(el => el.animate(on ? [{ opacity: 0, scale: '0.96' }, { opacity: 1, scale: '1' }] : [{ opacity: 1 }, { opacity: 0 }], { duration: d, easing: E.standard, fill: 'forwards' }))];
  }
  // Read phase of the shared tick: a pending rebuild (resize, media change, fonts) measures and
  // writes on its own; otherwise only the scroll position is read here.
  function read() {
    if (needSync) { needSync = false; return sync; }
    if (!built) return;
    const raw = clamp(progress(), P0, P1 + 1), now = performance.now();
    return () => update(raw, now);
  }
  function update(raw, now) {
    // Fast scroll (> 3 stage heights per second): cut to the nearest dwell until it slows down.
    const speed = Math.abs(raw - lastP) / Math.max(16, now - lastT) * 1000;
    lastP = raw; lastT = now;
    if (speed > 3 && raw > 0 && raw < P1) {
      fast = true;
      clearTimeout(fastTimer);
      fastTimer = setTimeout(() => { fast = false; motion.schedule(); }, 140);
    }
    const p = fast ? DWELL.reduce((b, d) => Math.abs(d - raw) < Math.abs(b - raw) ? d : b) : raw;
    const time = (clamp(p, P0, P1) - P0) * 1000;
    // Far above or below the track nothing changes: skip the seek.
    if (time !== applied) for (const a of anims) a.currentTime = time;
    applied = time;
    const n = T.filter(t => p >= mid(t)).length;
    if (shown[0] !== n) swap(0, n, 160);
    if (shown[1] !== n) swap(1, n, 240);
    for (const l of latches) if ((p >= l.p) !== l.on) flip(l, p >= l.p);
    if (!grown && p >= at(3, 0.6)) {
      grown = true;
      for (const a of holds) a.cancel();
      qa(4, '.fin-bar').forEach((bar, i) => swaps.push(bar.animate([{ scale: '1 0' }, { scale: '1 1' }], { duration: 250, delay: 70 * i, easing: E.standard, fill: 'backwards' })));
    }
    frames.forEach((f, i) => {
      const t = T[i - 1], u = T[i];
      f.classList.toggle('mo-over', !!(t && t[2] && p > t[0] && p < t[1]));
      f.classList.toggle('mo-under', !!(u && u[2] && p > u[0] && p < u[1]));
    });
  }
  function sync() {
    if (eligible()) build(); else teardown();
  }
  const resync = () => { needSync = true; motion.schedule(); };
  motion.job(read);
  addEventListener('resize', resync, { passive: true });
  pinQuery.addEventListener('change', resync);
  reduced.addEventListener('change', resync);

  // Touch / coarse pointer (and short or narrow-desktop windows): no pin; each frame's devices
  // enter once in view. Frames already on screen or above it are shown as they are.
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      if (eligible() || !root.classList.contains('motion') || reduced.matches || innerWidth < 1024 || e.boundingClientRect.top < innerHeight) continue;
      e.target.animate([{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], { duration: 420, easing: E.standard });
    }
  }, { rootMargin: '0px 0px 25% 0px' });
  if (!eligible()) frames.forEach(f => io.observe(f.querySelector('.flow-devices')));
  // Fonts change text metrics; measure once they are settled (bounded), and again whenever webfonts
  // finish loading after that bound, so no measurement keeps fallback metrics.
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 400))]).then(resync);
  document.fonts.addEventListener('loadingdone', resync);
})();
