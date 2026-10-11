(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pinQuery = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)');
  // R2 eligibility only. No pin, F1 composition or 700svh track is activated yet.
  window.ziisMotion = { isPinEligible: () => pinQuery.matches && !reduced.matches };
  clearTimeout(window.ziisMotionBoot?.timer);
  document.documentElement.classList.remove('motion-pending');
})();
