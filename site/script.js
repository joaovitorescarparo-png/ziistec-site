const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function closeMenu(){
  if(!menuButton || !nav) return;
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded','false');
  menuButton.setAttribute('aria-label','Abrir menu');
}
if(menuButton && nav){
  menuButton.addEventListener('click',()=>{
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open',open);
    menuButton.setAttribute('aria-expanded',String(open));
    menuButton.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
  });
  nav.addEventListener('click',(e)=>{ if(e.target.closest('a')) closeMenu(); });
  document.addEventListener('click',(e)=>{ if(!nav.contains(e.target)&&!menuButton.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') closeMenu(); });
}

const reveals=[...document.querySelectorAll('.reveal')];
if(reduceMotion.matches){
  reveals.forEach(el=>el.classList.add('is-visible'));
}else{
  const revealObserver=new IntersectionObserver((entries,obs)=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');obs.unobserve(entry.target);}});
  },{threshold:.12,rootMargin:'0px 0px -7%'});
  reveals.forEach(el=>revealObserver.observe(el));
}

const tabs=[...document.querySelectorAll('[data-showcase-tab]')];
const screens=[...document.querySelectorAll('[data-screen]')];
function activateShowcase(id){
  tabs.forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.showcaseTab===id)));
  screens.forEach(screen=>{
    const active=screen.dataset.screen===id;
    screen.hidden=!active;
    screen.classList.toggle('active',active);
  });
}
tabs.forEach(btn=>btn.addEventListener('click',()=>activateShowcase(btn.dataset.showcaseTab)));

const stories=[...document.querySelectorAll('[data-scroll-story]')];
let frame=0;
function stepFromViewport(section,max){
  const rect=section.getBoundingClientRect();
  const viewport=window.innerHeight || document.documentElement.clientHeight;
  const start=viewport*.76;
  const end=Math.min(viewport*.26,220);
  const travel=Math.max(1,rect.height + start - end);
  const progressed=Math.min(1,Math.max(0,(start-rect.top)/travel));
  return Math.min(max,Math.max(1,Math.floor(progressed*max)+1));
}
function updateStories(){
  frame=0;
  if(document.hidden) return;
  stories.forEach(section=>{
    if(reduceMotion.matches){
      if(section.dataset.scrollStory==='journey') section.dataset.step='6';
      if(section.dataset.scrollStory==='team') section.dataset.teamStep='4';
      return;
    }
    if(section.dataset.scrollStory==='journey') section.dataset.step=String(stepFromViewport(section,6));
    if(section.dataset.scrollStory==='team') section.dataset.teamStep=String(stepFromViewport(section,4));
  });
}
function requestStoryUpdate(){ if(!frame&&!document.hidden) frame=requestAnimationFrame(updateStories); }
window.addEventListener('scroll',requestStoryUpdate,{passive:true});
window.addEventListener('resize',requestStoryUpdate,{passive:true});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) requestStoryUpdate(); });
reduceMotion.addEventListener?.('change',requestStoryUpdate);
requestStoryUpdate();
