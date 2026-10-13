(() => {
  const root = document.documentElement;
  const home = document.querySelector('.page-home');
  if (!home) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pinQuery = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)');
  // R2 eligibility only. No pin, F1 composition or 700svh track is activated yet.
  window.ziisMotion = { isPinEligible: () => pinQuery.matches && !reduced.matches };
  const stage = document.querySelector('.mk-hero-stage');
  const entrances = new Set();
  const quiet = new Map();
  let frame = 0;
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
  function updateQuiet() {
    frame = 0;
    if (reduced.matches || !root.classList.contains('motion') || innerWidth < 640) {
      clearQuiet();
      return;
    }
    // M05: the last 40% exits across the viewport's top edge. Reads precede writes.
    const box = stage.getBoundingClientRect();
    const progress = clamp(1 - box.bottom / (box.height * 0.4));
    // No effect remains at the static endpoint: even text rasterization matches 0c6b4ff.
    if (progress === 0) {
      clearQuiet();
      return;
    }
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
  function scheduleQuiet() {
    if (!frame) frame = requestAnimationFrame(updateQuiet);
  }
  addEventListener('scroll', scheduleQuiet, { passive: true });
  addEventListener('resize', () => { settle(); scheduleQuiet(); }, { passive: true });
  addEventListener('pageshow', event => { if (event.persisted) { settle(); scheduleQuiet(); } });
  reduced.addEventListener('change', event => {
    settle();
    clearQuiet();
    if (event.matches) root.classList.remove('motion');
    else root.classList.add('motion');
    scheduleQuiet();
  });

  async function startHero() {
    const canEnter = root.classList.contains('motion-pending');
    // fonts.ready is capped, including browsers that never finish loading a font.
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 400))]);
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!canEnter || reduced.matches || !root.classList.contains('motion') || scrollY >= 100 || location.hash || navigation?.type === 'back_forward') {
      settle();
      clearTimeout(window.ziisMotionBoot?.timer);
      scheduleQuiet();
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
          easing, from: { opacity: 0, translate, ...extra }, to: { opacity: 1, translate: '0 0', ...(extra.scale ? { scale: 1 } : {}), ...(extra.clipPath ? { clipPath: 'inset(0 0 -12% 0)' } : {}) } });
      });
    }
    add('.mk-hero-kicker', 0, 320, `0 ${small}`);
    // R4: active mobile CPU-throttled trials exceeded +200ms with the clip reveal.
    // Frozen fallback: opaque title, translate 16px only; desktop/tablet keep the reveal.
    add('.mk-hero-title', 60, xl, mobile ? '0 16px' : '0 24px', emphasis, mobile ? { opacity: 1 } : { clipPath: 'inset(0 0 100% 0)' });
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
      animation.finished.then(() => { animation.cancel(); entrances.delete(animation); scheduleQuiet(); }, () => { /* Expected cancellation on reduced motion / resize. */ });
    }
    if (tintVisible) {
      tint.setAttribute('data-motion-tint', '');
      const animation = tint.animate([{ opacity: 0 }, { opacity: 1 }], { pseudoElement: '::before', delay: 1180, duration: 240 * durationScale, easing: standard, fill: 'both' });
      entrances.add(animation);
      animation.finished.then(() => { animation.cancel(); entrances.delete(animation); tint.removeAttribute('data-motion-tint'); }, () => { /* Expected cancellation. */ });
    }
    clearTimeout(window.ziisMotionBoot?.timer);
    scheduleQuiet();
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
  // M06–M09: pinned workflow, copy, rail and T12 (M10 adds T23). Scroll is native; one rAF per scroll maps scrollY to p (0 → 6 over
  // 600svh) and seeks paused, finite WAAPI effects. Every effect ends on the approved static frame.
  const root = document.documentElement;
  const track = window.IntersectionObserver && document.querySelector('[data-flow-track]');
  if (!track) return;
  const frames = [...track.children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pinQuery = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)');
  const P0 = -0.5, P1 = 6, SPAN = P1 - P0;
  // [start, end, overlay] in stage heights; overlay = the incoming frame lies over the outgoing one.
  const T = [[0.5, 1.2, 1], [1.55, 2.5, 0], [2.85, 3.45, 0], [3.8, 4.75, 0], [5.05, 5.65, 0]];
  const mid = t => t[0] + (t[1] - t[0]) / 2;
  const DWELL = [0.25, 1.375, 2.675, 3.625, 4.9, 5.825];
  const E = {
    standard: 'cubic-bezier(0.2,0,0,1)', emphasis: 'cubic-bezier(0.16,1,0.3,1)',
    travel: 'cubic-bezier(0.65,0,0.35,1)', exit: 'cubic-bezier(0.4,0,1,1)', linear: 'linear'
  };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  let segs, anims = [], extras = [], swaps = [], applied = NaN, built = false, frame = 0, lastP = 0, lastT = 0, fast = false, fastTimer = 0, shown = [-1, -1];

  const at = (k, t) => T[k][0] + t * (T[k][1] - T[k][0]);
  const q = (k, s) => frames[k].querySelector(s);
  const qa = (k, s) => [...frames[k].querySelectorAll(s)];
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
      const animation = el.animate(keys, { duration: SPAN * 1000, fill: 'both' });
      animation.pause();
      anims.push(animation);
    }
  }
  // Carrier: a visual clone (aria-hidden) in `holder`, flown through `path` points given in the
  // holder's local CSS px: [p, {x, y}, height, ease]. Scale follows the requested height.
  function carrier(src, holder, path, extra) {
    const clone = src.cloneNode(true);
    clone.classList.add('mo-carrier');
    if (extra) clone.classList.add(extra);
    clone.setAttribute('aria-hidden', 'true');
    holder.append(clone);
    extras.push(clone);
    const x0 = clone.offsetLeft, y0 = clone.offsetTop, h0 = clone.offsetHeight;
    for (let i = 1; i < path.length; i++) {
      const [pa, ra, ha] = path[i - 1], [pb, rb, hb, ease = E.travel] = path[i];
      seg(clone, 'translate', pa, pb, `${ra.x - x0}px ${ra.y - y0}px`, `${rb.x - x0}px ${rb.y - y0}px`, ease);
      seg(clone, 'scale', pa, pb, `${ha / h0}`, `${hb / h0}`, ease);
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
    leave(q(k, '.mo-crumb'), at(k, 0.3), at(k, 0.45));
    enter(q(k + 1, '.mo-crumb'), at(k, 0.45), at(k, 0.6));
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

    compile();
    built = true;
    shown = [-1, -1];
    applied = NaN;
    lastP = clamp(progress(), P0, P1 + 1);
    lastT = performance.now();
    update();
  }
  function teardown() {
    if (!built) return;
    for (const a of anims) a.cancel();
    for (const a of swaps) a.cancel();
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
  function update() {
    frame = 0;
    if (!built) return;
    const now = performance.now();
    const raw = clamp(progress(), P0, P1 + 1);
    // Fast scroll (> 3 stage heights per second): cut to the nearest dwell until it slows down.
    const speed = Math.abs(raw - lastP) / Math.max(16, now - lastT) * 1000;
    lastP = raw; lastT = now;
    if (speed > 3 && raw > 0 && raw < P1) {
      fast = true;
      clearTimeout(fastTimer);
      fastTimer = setTimeout(() => { fast = false; schedule(); }, 140);
    }
    const p = fast ? DWELL.reduce((b, d) => Math.abs(d - raw) < Math.abs(b - raw) ? d : b) : raw;
    const time = (clamp(p, P0, P1) - P0) * 1000;
    // Far above or below the track nothing changes: skip the seek.
    if (time !== applied) for (const a of anims) a.currentTime = time;
    applied = time;
    const n = T.filter(t => p >= mid(t)).length;
    if (shown[0] !== n) swap(0, n, 160);
    if (shown[1] !== n) swap(1, n, 240);
    frames.forEach((f, i) => {
      const t = T[i - 1], u = T[i];
      f.classList.toggle('mo-over', !!(t && t[2] && p > t[0] && p < t[1]));
      f.classList.toggle('mo-under', !!(u && u[2] && p > u[0] && p < u[1]));
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function sync() {
    if (eligible()) build(); else teardown();
  }
  addEventListener('scroll', schedule, { passive: true });
  let resizing = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizing); resizing = requestAnimationFrame(sync); }, { passive: true });
  pinQuery.addEventListener('change', sync);
  reduced.addEventListener('change', () => requestAnimationFrame(sync));

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
  // Fonts change text metrics; measure once they are settled (bounded).
  Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 400))]).then(sync);
})();
