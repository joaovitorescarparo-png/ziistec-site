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
const revealTargets = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -30px' });
  revealTargets.forEach(target => revealObserver.observe(target));
} else {
  revealTargets.forEach(target => target.classList.add('visible'));
}

const oneShotMotionTargets = [
  document.querySelector('.product-stage-v3'),
  document.querySelector('.sale-device'),
  document.querySelector('.history-visual'),
].filter(Boolean);

const makeOneShotMotionStatic = () => oneShotMotionTargets.forEach(target => {
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
  oneShotMotionTargets.forEach(target => motionObserver.observe(target));
} else {
  makeOneShotMotionStatic();
}

const scrollStories = [
  { element: document.querySelector('.operation-board'), attribute: 'data-flow-step', steps: 6 },
  { element: document.querySelector('.team-stage'), attribute: 'data-team-step', steps: 4 },
].filter(story => story.element);

scrollStories.forEach(story => story.element.setAttribute('data-scroll-story', story.attribute));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let storyFrame = 0;

const setStoryFinalState = () => {
  scrollStories.forEach(story => story.element.setAttribute(story.attribute, String(story.steps)));
};

const updateStories = () => {
  storyFrame = 0;
  if (document.hidden) return;
  if (reducedMotion.matches) {
    setStoryFinalState();
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  scrollStories.forEach(story => {
    const rect = story.element.getBoundingClientRect();
    const start = viewportHeight * 0.82;
    const end = viewportHeight * 0.24;
    const travel = Math.max(1, rect.height + start - end);
    const progress = clamp((start - rect.top) / travel, 0, 1);
    const step = clamp(Math.floor(progress * story.steps) + 1, 1, story.steps);
    story.element.setAttribute(story.attribute, String(step));
  });
};

const requestStoryUpdate = () => {
  if (storyFrame || document.hidden) return;
  storyFrame = requestAnimationFrame(updateStories);
};

if (scrollStories.length) {
  if (reducedMotion.matches) setStoryFinalState();
  else {
    updateStories();
    window.addEventListener('scroll', requestStoryUpdate, { passive: true });
    window.addEventListener('resize', requestStoryUpdate);
  }
}

const syncMotionVisibility = () => {
  document.documentElement.classList.toggle('motion-paused', document.hidden);
  if (!document.hidden) requestStoryUpdate();
};
document.addEventListener('visibilitychange', syncMotionVisibility);
syncMotionVisibility();

if (typeof reducedMotion.addEventListener === 'function') {
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      makeOneShotMotionStatic();
      setStoryFinalState();
    } else {
      requestStoryUpdate();
    }
  });
}
