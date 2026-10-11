(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reset = () => root.classList.remove('motion', 'motion-pending');
  reduced.addEventListener('change', event => { if (event.matches) reset(); });
  if (reduced.matches) return;
  root.classList.add('motion');
  const navigation = performance.getEntriesByType('navigation')[0];
  if (scrollY < 100 && !location.hash && navigation?.type !== 'back_forward') root.classList.add('motion-pending');
  window.ziisMotionBoot = { timer: setTimeout(reset, 1500) };
})();
