const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav-links');

if (menuButton && nav) {
  const closeMenu = ({ returnFocus = false } = {}) => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
    if (returnFocus) menuButton.focus();
  };

  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });

  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu({ returnFocus: true });
  });

  document.addEventListener('pointerdown', event => {
    if (!nav.classList.contains('open')) return;
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760 && nav.classList.contains('open')) closeMenu();
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px' });
  targets.forEach(target => observer.observe(target));
} else {
  targets.forEach(target => target.classList.add('visible'));
}

const motionTargets = [
  document.querySelector('.product-stage-v3'),
  document.querySelector('.operation-board'),
  document.querySelector('.team-stage'),
  document.querySelector('.day-timeline'),
  document.querySelector('.sale-device'),
  document.querySelector('.history-visual'),
].filter(Boolean);

const makeMotionStatic = () => motionTargets.forEach(target => {
  target.classList.remove('motion-run');
  target.classList.add('motion-static');
});

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const motionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('motion-run');
      motionObserver.unobserve(entry.target);
    });
  }, { threshold: 0.26, rootMargin: '0px 0px -8%' });
  motionTargets.forEach(target => motionObserver.observe(target));
} else {
  makeMotionStatic();
}

const syncMotionVisibility = () => {
  document.documentElement.classList.toggle('motion-paused', document.hidden);
};
document.addEventListener('visibilitychange', syncMotionVisibility);
syncMotionVisibility();

if (typeof reducedMotion.addEventListener === 'function') {
  reducedMotion.addEventListener('change', event => {
    if (event.matches) makeMotionStatic();
  });
}
