// Interação mínima da homepage V3.1 (Static Fidelity): só o menu.
// O FAQ usa <details>/<summary> nativos. Nenhum motion/scroll storytelling aqui.
const menuButton=document.querySelector('.mk-menu');
const nav=document.querySelector('.mk-nav');

function closeMenu(){
  if(!menuButton||!nav) return;
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded','false');
  menuButton.setAttribute('aria-label','Abrir menu');
}

if(menuButton&&nav){
  menuButton.addEventListener('click',()=>{
    const open=!nav.classList.contains('is-open');
    nav.classList.toggle('is-open',open);
    menuButton.setAttribute('aria-expanded',String(open));
    menuButton.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');
  });
  nav.addEventListener('click',(event)=>{ if(event.target.closest('a')) closeMenu(); });
  document.addEventListener('click',(event)=>{ if(!nav.contains(event.target)&&!menuButton.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown',(event)=>{ if(event.key==='Escape'){ const wasOpen=nav.classList.contains('is-open'); closeMenu(); if(wasOpen) menuButton.focus(); } });
}
