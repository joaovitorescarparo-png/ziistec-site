const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');

function closeMenu() {
  if (!menuButton || !nav) return;
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('is-open')) return;
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const reveals = [...document.querySelectorAll('.reveal')];

if (reduced || !('IntersectionObserver' in window)) {
  reveals.forEach((el) => el.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
  reveals.forEach((el) => revealObserver.observe(el));
}

const tabs = [...document.querySelectorAll('[data-showcase-tab]')];
const screens = [...document.querySelectorAll('[data-showcase-screen]')];

function selectShowcase(id) {
  tabs.forEach((tab) => {
    const active = tab.dataset.showcaseTab === id;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  screens.forEach((screen) => {
    screen.hidden = screen.dataset.showcaseScreen !== id;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectShowcase(tab.dataset.showcaseTab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    tabs[next]?.focus();
    selectShowcase(tabs[next]?.dataset.showcaseTab);
  });
});

const storySections = [...document.querySelectorAll('[data-scroll-story]')];
let ticking = false;
let storiesPaused = document.hidden;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function stepFor(section, maxStep) {
  const rect = section.getBoundingClientRect();
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const start = viewport * 0.72;
  const travel = Math.max(rect.height + viewport * 0.3, viewport);
  const progress = clamp((start - rect.top) / travel, 0, 0.999999);
  return 1 + Math.floor(progress * maxStep);
}

function updateStories() {
  ticking = false;
  if (storiesPaused) return;
  for (const section of storySections) {
    if (section.dataset.story === 'journey') {
      section.dataset.step = String(stepFor(section, 6));
    }
    if (section.dataset.story === 'team') {
      section.dataset.teamStep = String(stepFor(section, 4));
    }
  }
}

function requestStoryUpdate() {
  if (reduced || ticking || storiesPaused) return;
  ticking = true;
  requestAnimationFrame(updateStories);
}

if (storySections.length) {
  if (reduced) {
    storySections.forEach((section) => {
      if (section.dataset.story === 'journey') section.dataset.step = '6';
      if (section.dataset.story === 'team') section.dataset.teamStep = '4';
    });
  } else {
    updateStories();
    addEventListener('scroll', requestStoryUpdate, { passive: true });
    addEventListener('resize', requestStoryUpdate, { passive: true });
    document.addEventListener('visibilitychange', () => {
      storiesPaused = document.hidden;
      if (!storiesPaused) requestStoryUpdate();
    });
  }
}
