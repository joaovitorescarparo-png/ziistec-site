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
    add('.mk-hero-title', 60, xl, '0 24px', emphasis, { clipPath: 'inset(0 0 100% 0)' });
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
  startHero().catch(error => {
    settle();
    clearQuiet();
    root.classList.remove('motion');
    console.error('Motion initialization failed; static page restored.', error);
  });
})();
