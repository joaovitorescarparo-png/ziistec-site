import { gzipSync } from 'node:zlib';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFonts, fonts } from './font-integrity.mjs';
import { assertValidPng, sha256 } from './png-integrity.mjs';
import { classNames, extractUrls, findPhones, hasTag, isExternalUrl, parseTags } from './html-audit.mjs';
import { hasToolError, listTextFiles } from './repo-files.mjs';
import { auditMotion } from './motion-audit.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const abs=(path)=>join(root,...path.split('/'));
const read=(path,encoding='utf8')=>readFile(abs(path),encoding);
const exists=async(path)=>access(abs(path)).then(()=>true,()=>false);
const required=[
  'site/motion-boot.js','site/motion.js','site/v4/03-motion.css','scripts/motion-audit.mjs',
  'site/index.html','site/script.js','site/v4/00-fonts.css','site/v4/01-tokens.css','site/v4/02-home.css',
  'site/privacidade.html','site/termos.html','site/404.html','site/robots.txt','site/sitemap.xml',
  'site/brand/ziistec-favicon.png',...fonts.map((font)=>`site/fonts/${font.file}`),
  'site/fonts/LICENSE-SpaceGrotesk-OFL.txt','site/fonts/LICENSE-IBMPlex-OFL.txt','site/fonts/SOURCES.md',
  'scripts/html-audit.mjs','scripts/repo-files.mjs','scripts/png-integrity.mjs','scripts/font-integrity.mjs',
  'vercel.json','package.json','package-lock.json'
];
for(const path of required) await read(path,path.endsWith('.png')?null:'utf8');

const html=await read('site/index.html');
const script=await read('site/script.js');
const motionPaths=['site/motion-boot.js','site/motion.js','site/v4/03-motion.css'];
const motionFiles={};
for(const path of motionPaths) if(await exists(path)) motionFiles[path]=await read(path);
const css=(await Promise.all(['00-fonts.css','01-tokens.css','02-home.css'].map((file)=>read(`site/v4/${file}`)))).join('\n')+'\n'+(motionFiles['site/v4/03-motion.css']||'');
const pkg=JSON.parse(await read('package.json'));
const lock=JSON.parse(await read('package-lock.json'));
const vercel=JSON.parse(await read('vercel.json'));
const pageNames=['index','privacidade','termos','404'];
const pages=Object.fromEntries(await Promise.all(pageNames.map(async(name)=>[name,await read(`site/${name}.html`)])));

// ---------------------------------------------------------------- copy (Fase 3)
const approvedWhatsapp='https://wa.me/5547991797202?text=Ol%C3%A1%21%20Vim%20pelo%20site%20da%20ZiisTec%20e%20quero%20conhecer%20melhor%20a%20plataforma.';
const APPROVED_PHONE='5547991797202';
const requiredCopy=[
  'Do orçamento ao','histórico do cliente,','numa operação só.',
  'Cada etapa num lugar diferente é onde o serviço se perde.',
  'Um serviço só, atravessando o sistema inteiro.',
  'Profissional recebe o contexto','Campo atualiza a operação','Financeiro acompanha','O histórico fica',
  'Uso a ZiisTec no dia a dia e, mesmo estando na rua, consigo fazer tudo pelo celular.',
  'A ZiisTec me ajuda muito na parte de orçamentos e organização dos clientes.',
  'Já faz cerca de dois meses que estou usando a ZiisTec.',
  'Adrian','Lucas','Leonardo','Eletricista','Técnico em automação · Itapema/SC',
  'R$ 59,90','R$ 79,90','R$ 139,90','R$ 19,90/mês',
  'Proprietário + até 5 técnicos','Até 5.000 clientes','Até 1.000 orçamentos/OS por mês',
  'Gestão de equipe e permissões por papel','Acompanhamento de técnicos','Maior capacidade operacional',
  'A ZiisTec funciona para quem trabalha sozinho?','E se eu já tiver uma equipe?',
  'Consigo gerar orçamento em PDF?','Consigo cadastrar produtos e serviços?',
  'O profissional/técnico consegue ver o financeiro da empresa?','O histórico do cliente e dos serviços fica salvo?'
];
for(const copy of requiredCopy) if(!html.includes(copy)) throw new Error(`Copy aprovada ausente: ${copy}`);

const forbiddenCopy=[
  /relatórios avançados/i,/relatórios operacionais avançados/i,/controle\/relatórios operacionais mais avançados/i,
  /GPS em tempo real/i,/rastreamento de equipe/i,/ponto eletrônico/i,/folha de pagamento/i,
  /NFS-e integrada/i,/conciliação bancária automática/i,/checkout próprio/i,/adquirência própria/i,
  /Comprar agora/i,/Assinar agora/i,/Começar grátis/i,/teste grátis/i,/sem cartão/i,
  // Restaurados do gate pré-Fase 3 (abff903): promessas infladas e jargão interno.
  /https?:\/\/app\.ziistec\.com/i,/10\.000 empresas/i,/melhor sistema do Brasil/i,/Quero testar a ZiisTec/i,
  /\bledgers?\b/i,/\bbackend\b/i,/\bentitlements?\b/i,/\bmigrations?\b/i,/\bRLS\b/i,/\bidempotente\b/i,/\bV2\b/i
];
for(const [name,page] of Object.entries(pages)){
  for(const pattern of forbiddenCopy) if(pattern.test(page)) throw new Error(`Copy/funcionalidade proibida encontrada em ${name}.html: ${pattern}`);
}

// ---------------------------------------------------------------- assets legados (Fase 3)
const legacyAssets=['ziistec-horizontal-light.png','ziistec-horizontal-dark.png','ziistec-icon.png','ziistec-og.png','ziistec-horizontal-light-web.png'];
for(const [name,page] of Object.entries(pages)){
  for(const asset of legacyAssets) if(page.includes(asset)) throw new Error(`Asset legado não permitido em ${name}.html: ${asset}`);
}

// ---------------------------------------------------------------- destinos, formulários e telefone
// Toda a leitura de atributos passa por html-audit.mjs: aspas simples/duplas/ausentes, espaços em volta de "=",
// caixa, ordem de atributos e entidades HTML não mudam o resultado.
const APPROVED_EXTERNAL=new Set([approvedWhatsapp,'https://ziistec.com/','mailto:acesso@ziistec.com']);
const FORBIDDEN_DESTINATION=/checkout|signup|sign-up|assinar|assinatura|pagamento|pagar|payment|stripe|mercadopago|mercado-pago|mercadolivre|pagseguro|asaas|hotmart|kiwify|eduzz|calendly|typeform|forms\.gle|docs\.google\.com\/forms|jotform|tally\.so/i;
const WHATSAPP_HOST=/^(?:https?:)?\/\/(?:www\.)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|whatsapp\.com|chat\.whatsapp\.com)\b/i;
const builtAssets=new Set(['/styles.css']);
for(const [name,page] of Object.entries(pages)){
  if(hasTag(page,'form')) throw new Error(`Formulário não autorizado em ${name}.html`);
  for(const {tag,attr,url} of extractUrls(page)){
    if(FORBIDDEN_DESTINATION.test(url)) throw new Error(`Destino de cadastro/checkout/pagamento/formulário não permitido em ${name}.html: <${tag} ${attr}="${url}">`);
    if(WHATSAPP_HOST.test(url)&&url!==approvedWhatsapp) throw new Error(`Destino WhatsApp não aprovado em ${name}.html: ${url}`);
    if(isExternalUrl(url)){
      if(!APPROVED_EXTERNAL.has(url)) throw new Error(`Destino externo não aprovado em ${name}.html: <${tag} ${attr}="${url}">`);
      continue;
    }
    // Referência local precisa apontar para algo publicado (cleanUrls: /termos → termos.html).
    const path=url.split(/[?#]/)[0];
    if(!path||!path.startsWith('/')||path==='/'||builtAssets.has(path)) continue;
    const target=path.slice(1);
    if(!(await exists(`site/${target}`))&&!(await exists(`site/${target}.html`))) throw new Error(`Referência local quebrada em ${name}.html: ${url}`);
  }
  for(const phone of findPhones(page)) if(phone.normalized!==APPROVED_PHONE) throw new Error(`Telefone comercial não aprovado em ${name}.html: ${phone.raw}`);
}

// ---------------------------------------------------------------- CTAs (Fase 3, agora por âncora)
const anchors=parseTags(html).filter((tag)=>tag.name==='a');
const whatsappAnchors=anchors.filter((a)=>a.attrs.get('href')===approvedWhatsapp);
if(whatsappAnchors.length<6) throw new Error('CTAs WhatsApp insuficientes para header, hero, planos e CTA final');
for(const a of whatsappAnchors){
  if(a.attrs.get('target')!=='_blank') throw new Error('Todo CTA WhatsApp precisa abrir em nova aba');
  if(!/(?:^|\s)noopener(?:\s|$)/i.test(a.attrs.get('rel')||'')) throw new Error('Todo CTA WhatsApp precisa usar rel=noopener');
}
const ctaNames=new Set(anchors.map((a)=>a.attrs.get('data-cta')).filter(Boolean));
for(const name of ['header-contact','hero-contact','pricing-essential','pricing-professional','pricing-team','final-contact']){
  if(!ctaNames.has(name)) throw new Error(`CTA obrigatório ausente: ${name}`);
}

// ---------------------------------------------------------------- estrutura, marca, motion (Fase 3)
if((html.match(/<details/g)||[]).length!==6) throw new Error('FAQ precisa ter exatamente 6 perguntas');
if((html.match(/<summary/g)||[]).length!==6) throw new Error('FAQ precisa ter exatamente 6 summaries');
if(!html.includes('class="brand-lockup')||!html.includes('<span class="brand-word"><b>Ziis</b><b>Tec</b></span>')) throw new Error('Lockup Refinement A não está composto por símbolo + wordmark tipográfico');
if(!html.includes('/brand/ziistec-favicon.png')) throw new Error('Símbolo oficial Z não está referenciado');
// F2 replaces the Phase 4 ban; all static/business/security gates below remain.
auditMotion(motionFiles);
if(script.includes('.style')) throw new Error('JS não deve injetar inline styles sob CSP');
if(!html.includes('skip-link')||!css.includes(':focus-visible')) throw new Error('Acessibilidade de teclado ausente');

// ---------------------------------------------------------------- CSS publicado
if(/url\(\s*["']?(?:https?:)?\/\//i.test(css)||/@import/i.test(css)) throw new Error('CSS não pode buscar recurso externo');
if((css.match(/@font-face/g)||[]).length!==5) throw new Error('As cinco fontes aprovadas precisam estar auto-hospedadas');
for(const font of fonts) if(!css.includes(`/fonts/${font.file}`)) throw new Error(`Fonte não declarada no CSS: ${font.file}`);
const reducedMotion=/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i;
if(!reducedMotion.test(await read('site/v4/01-tokens.css'))) throw new Error('Reduced motion ausente na camada de tokens (01-tokens.css)');
if(!reducedMotion.test(await read('site/v4/02-home.css'))) throw new Error('Reduced motion ausente na camada da homepage (02-home.css)');
if(/animation(?:-iteration-count)?\s*:[^;{}]*\binfinite\b/i.test(css)) throw new Error('Motion infinito não permitido');
const requiredTokens=['--zt-brand:','--zt-brand-deep:','--zt-brand-deep-hover:','--zt-brand-tint:','--zt-ink:','--zt-ink-muted:','--zt-border-interactive:','--zt-divider-200:','--zt-icon-muted:','--zt-dark-surface-100:','--zt-focus-ring:','--zt-elev-1:','--zt-elev-brand:','--zt-motion-base:','--zt-ease-standard:','--zt-rise:','--zt-space-16:','--zt-space-24:','--zt-text-display-xl:','--zt-font-display:'];
for(const token of requiredTokens) if(!css.includes(token)) throw new Error(`Token v4 obrigatório ausente: ${token}`);

// Uma única folha publicada. legal.css foi removido no hardening pós-Fase 3 e não pode voltar.
if(await exists('site/legal.css')) throw new Error('site/legal.css foi removido definitivamente — as páginas legais usam /styles.css');
for(const [name,page] of Object.entries(pages)){
  const sheets=parseTags(page).filter((t)=>t.name==='link'&&/(?:^|\s)stylesheet(?:\s|$)/i.test(t.attrs.get('rel')||'')).map((t)=>t.attrs.get('href'));
  if(sheets.length!==1||sheets[0]!=='/styles.css') throw new Error(`${name}.html precisa carregar somente /styles.css (encontrado: ${sheets.join(', ')||'nenhuma'})`);
  if(parseTags(page).some((t)=>t.name==='style'||t.attrs.has('style'))) throw new Error(`${name}.html não pode ter CSS inline (CSP style-src 'self')`);
}

// Toda classe usada no markup publicado precisa de seletor no CSS publicado. Sem exceções.
const escapeRe=(s)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const [name,page] of Object.entries(pages)){
  const unstyled=classNames(page).filter((cls)=>!new RegExp(`\\.${escapeRe(cls)}(?![\\w-])`).test(css));
  if(unstyled.length) throw new Error(`Classes sem seletor no CSS publicado (${name}.html): ${unstyled.join(', ')}`);
}

// ---------------------------------------------------------------- CSP e cabeçalhos
// Tokeniza todas as diretivas antes de montar qualquer mapa: nome normalizado, ocorrências contadas,
// duplicata reprovada — o navegador aplica só a primeira e um mapa guardaria só a última.
const APPROVED_CSP={
  'default-src':["'self'"],'base-uri':["'self'"],'object-src':["'none'"],'frame-ancestors':["'none'"],
  'img-src':["'self'",'data:'],'style-src':["'self'"],'script-src':["'self'"],'connect-src':["'self'"],
  'form-action':["'self'"],'upgrade-insecure-requests':[]
};
function parseCsp(value){
  const directives=value.split(';').map((d)=>d.trim()).filter(Boolean).map((d)=>{
    const [name,...sources]=d.split(/[\t\n\f\r ]+/);
    return {name:name.toLowerCase(),sources:sources.map((s)=>s.toLowerCase())};
  });
  const counts=new Map();
  for(const {name} of directives) counts.set(name,(counts.get(name)||0)+1);
  const duplicated=[...counts].filter(([,n])=>n>1).map(([name,n])=>`${name} ×${n}`);
  if(duplicated.length) throw new Error(`CSP com diretiva duplicada: ${duplicated.join(', ')}`);
  return new Map(directives.map(({name,sources})=>[name,sources]));
}
const headerRules=vercel.headers||[];
const globalHeaders=headerRules.find((rule)=>rule.source==='/(.*)')?.headers||[];
const cspHeaders=headerRules.flatMap((rule)=>rule.headers||[]).filter((h)=>h.key.trim().toLowerCase()==='content-security-policy');
if(cspHeaders.length!==1) throw new Error(`vercel.json precisa declarar exatamente um Content-Security-Policy (encontrados: ${cspHeaders.length})`);
if(!globalHeaders.includes(cspHeaders[0])) throw new Error('Content-Security-Policy precisa valer para todas as rotas: source "/(.*)"');
if(headerRules.some((rule)=>(rule.headers||[]).some((h)=>h.key.trim().toLowerCase()==='content-security-policy-report-only'))) throw new Error('CSP report-only não substitui a CSP aprovada');
const csp=parseCsp(cspHeaders[0].value);
for(const [directive,sources] of csp){
  for(const source of sources){
    if(/^'(?:unsafe-inline|unsafe-eval|unsafe-hashes|wasm-unsafe-eval|strict-dynamic|unsafe-allow-redirects)'$/.test(source)) throw new Error(`CSP relaxada em ${directive}: ${source}`);
    if(source.includes('*')) throw new Error(`CSP com curinga em ${directive}: ${source}`);
    if(source!=='data:'&&!/^'[^']+'$/.test(source)) throw new Error(`CSP com esquema ou origem externa não aprovada em ${directive}: ${source}`);
  }
}
for(const [directive,sources] of Object.entries(APPROVED_CSP)){
  if(!csp.has(directive)) throw new Error(`CSP sem a diretiva aprovada: ${directive}`);
  if(csp.get(directive).join(' ')!==sources.join(' ')) throw new Error(`CSP alterada em ${directive}: "${csp.get(directive).join(' ')}" ≠ "${sources.join(' ')}"`);
}
for(const directive of csp.keys()) if(!(directive in APPROVED_CSP)) throw new Error(`CSP com diretiva não aprovada: ${directive}`);
const requiredHeaders={'x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'strict-origin-when-cross-origin'};
for(const [key,value] of Object.entries(requiredHeaders)){
  const matches=globalHeaders.filter((h)=>h.key.trim().toLowerCase()===key);
  if(matches.length!==1||matches[0].value!==value) throw new Error(`Cabeçalho de segurança alterado, duplicado ou ausente: ${key}`);
}

// ---------------------------------------------------------------- arquivos substituídos por saída de ferramenta
// Varredura recursiva do repositório inteiro (exceto .git, node_modules, dist e afins). Sem lista de exceções.
const textFiles=await listTextFiles(root);
for(const file of textFiles) if(hasToolError(await read(file))) throw new Error(`Arquivo substituído por mensagem de ferramenta: ${file}`);

// ---------------------------------------------------------------- tooling, Node e integridade
if(pkg.engines?.node!=='24.x'||lock.packages?.['']?.engines?.node!=='24.x') throw new Error('Node deve permanecer fixado em 24.x');
if(!pkg.scripts?.prebuild?.includes('npm run check')||!pkg.scripts.prebuild.includes('node --check site/script.js')) throw new Error('Prebuild precisa preservar gates de check e sintaxe');
if(!pkg.scripts?.check?.includes('node --test scripts/tooling.test.mjs')) throw new Error('npm run check precisa executar a suíte de tooling (scripts/tooling.test.mjs)');
await verifyFonts(join(root,'site','fonts'));
const mark=await read('site/brand/ziistec-favicon.png',null);
assertValidPng('ziistec-favicon.png',mark);
const expectedMarkSha='368d4153166acf6a39280a3766379b31fecd47ed50d07f721ad2d463cd95452a';
if(sha256(mark)!==expectedMarkSha) throw new Error('Símbolo oficial ZiisTec divergiu do asset aprovado');

// ---------------------------------------------------------------- invariantes da Homepage V3.1 (Static Fidelity)
// Regras do handoff congelado: rótulos públicos aprovados, "Cena A/B/C" só interno, financeiro separado,
// celular do técnico sem valor financeiro, as seis etapas e a estrutura preparada para a fase de motion.
const v31Labels=['Total do orçamento','03 · recebida','04 · em atendimento','No escritório · proprietário','No campo · técnico','Etapas 01–02','Etapas 03–04','Etapas 05–06'];
for(const label of v31Labels) if(!html.includes(label)) throw new Error(`Rótulo aprovado da V3.1 ausente: ${label}`);
if(!/Escritório[\s\S]{0,400}Campo[\s\S]{0,400}Escritório/.test(html)) throw new Error('Sequência Escritório → Campo → Escritório ausente');
for(const [name,page] of Object.entries(pages)){
  if(/\bCena\s+[ABC]\b/i.test(page)) throw new Error(`Terminologia interna "Cena A/B/C" publicada em ${name}.html`);
  if(/2\.420|2420/.test(page)) throw new Error(`Orçamento e venda somados (R$ 2.420) em ${name}.html`);
}
for(const stage of ['1','2','3','4','5','6']){
  if(!new RegExp(`data-flow-stage="${stage}"`).test(html)) throw new Error(`Etapa ${stage} do fluxo ausente (data-flow-stage)`);
}
if(!html.includes('data-flow-track')) throw new Error('Trilho do fluxo desktop ausente (data-flow-track)');
for(const scene of ['office-01-02','field-03-04','office-05-06']) if(!html.includes(`data-flow-scene="${scene}"`)) throw new Error(`Cena estática ausente: ${scene}`);
// V3.1.2 — no resumo financeiro da OS #0248, cada valor fica em .ui-val e não quebra entre “R$” e o número.
for(const [line] of html.matchAll(/<span class="fin-line">[\s\S]*?<\/span><\/span>/g)) if(!/<span class="ui-val">R\$ [\d.]+(?:,\d{2})?<\/span><\/span>$/.test(line)) throw new Error('Valor do resumo financeiro fora de .ui-val');
if(!/\.scene-device-c \.fin-line \.ui-val\{white-space:nowrap\}/.test(css)) throw new Error('Valor do resumo financeiro pode quebrar entre R$ e o número (white-space:nowrap ausente)');
// Celular do técnico: todo bloco class="ph" (até fechar o div) não pode conter valor em reais.
function phoneBlocks(source){
  const blocks=[];
  const open=/<div\s+class="ph(?:\s[^"]*)?"[^>]*>/g;
  let m;
  while((m=open.exec(source))){
    let depth=1,i=m.index+m[0].length;
    const tag=/<(\/?)div\b[^>]*>/g; tag.lastIndex=i;
    let t;
    while(depth&&(t=tag.exec(source))) depth+=t[1]?-1:1;
    blocks.push(source.slice(m.index,t?t.index:source.length));
  }
  return blocks;
}
const phones=phoneBlocks(html);
if(phones.length<3) throw new Error('Celulares do técnico ausentes na homepage');
for(const block of phones) if(/R\$|\d+,\d{2}\b/.test(block)) throw new Error('Valor financeiro da empresa no celular do técnico');

// M06: the pin exists only under R2 + the safety floor, and the frozen runway math holds.
const motionCss=(motionFiles['site/v4/03-motion.css']||'').replace(/\s+/g,' '),motionJs=motionFiles['site/motion.js']||'';
const pinQuery='(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-height: 600px)';
if(/position:\s?sticky/.test(motionCss)){
  for(const [token,value] of [['--mo-pin-stage','100svh'],['--mo-pin-scroll','600svh'],['--mo-pin-track','700svh']]) if(!motionCss.includes(`${token}:${value}`)) throw new Error(`M06 pin: ${token} precisa ser ${value}`);
  const pinRule=motionCss.match(/@media ([^{]*)\{ html\.motion \.flow-track \{[^}]*\}/);
  if(!pinRule||!pinRule[1].includes(pinQuery)||!pinRule[1].includes('(prefers-reduced-motion: no-preference)')||!pinRule[0].includes('var(--mo-pin-track)')) throw new Error('M06 pin: layout fora de R2/safety floor ou sem track de 700svh');
  if(!motionJs.includes(`matchMedia('${pinQuery}')`)) throw new Error('M06 pin: elegibilidade JS diverge de R2');
}
// M10 hardening: one scroll scheduler for all motion (M05 + workflow), never concurrent ones.
{
  const count=re=>(motionJs.match(re)||[]).length;
  if(count(/addEventListener\(\s*['"]scroll['"]/g)>1||/\bonscroll\b/.test(motionJs)||count(/\brequestAnimationFrame\(/g)>1||/\bcancelAnimationFrame\(/.test(motionJs)) throw new Error('M10 scheduler: motion.js precisa de um único listener de scroll e um único requestAnimationFrame');
}
// Hero LCP closure: the hero title (LCP element) is never hidden, masked or clipped by motion.
{
  const titleRules=[...motionCss.matchAll(/([^{}]*\.mk-hero-title[^{}]*)\{([^}]*)\}/g)].map(m=>m[2]);
  const titleCall=motionJs.split('\n').find(line=>line.includes("add('.mk-hero-title'"));
  if(titleRules.some(body=>/opacity:\s?0(?![.\d])|clip-path|visibility:\s?hidden/.test(body))||!titleCall||/clipPath|opacity:\s?0(?![.\d])/.test(titleCall)||!/opacity:\s?1\b/.test(titleCall)) throw new Error('Hero LCP: .mk-hero-title precisa ser visível desde o primeiro paint (sem opacity 0, clip-path ou máscara)');
}
// M15–M17: the three mobile scenes exist only below 1024 px, start from one shared observer at 80%
// of the viewport and play once (each scene is unobserved after it plays or is made final).
if(/data-flow-scene/.test(motionJs)){
  if(!motionJs.includes("matchMedia('(max-width: 1023px)')")) throw new Error('M15–M17: cenas mobile precisam ficar abaixo de 1024 px');
  if((motionJs.match(/rootMargin: '0px 0px -20% 0px'/g)||[]).length!==1) throw new Error('M15–M17: um único observer compartilhado (rootMargin 0px 0px -20% 0px)');
  if(!motionJs.includes('io.unobserve(devices[i])')) throw new Error('M15–M17: cada cena toca uma única vez (unobserve)');
}
// M18: the secondary sections share ONE observer at 85% of the viewport (the only other observers are
// the M15–M17 scenes and the workflow's coarse-pointer fallback), WAAPI only — no scroll scheduler, no
// requestAnimationFrame. Each block plays once; a block on screen, passed or unreachable is final.
{
  const sections=motionJs.slice(motionJs.lastIndexOf('(() => {')).replace(/^\s*\/\/.*$/gm,'');
  if((motionJs.match(/new IntersectionObserver\(/g)||[]).length!==3||(sections.match(/new IntersectionObserver\(/g)||[]).length!==1||!sections.includes("rootMargin: '0px 0px -15% 0px'")) throw new Error('M18: um único observer compartilhado para as seções (rootMargin 0px 0px -15% 0px)');
  if(/requestAnimationFrame|ziisMotion|iterations|addEventListener\(\s*['"](?:scroll|wheel|touch)/.test(sections)) throw new Error('M18: revelações secundárias sem RAF, scheduler ou listener de scroll');
  if(!sections.includes('if (u.done) continue;')||!sections.includes('u.done = true;')||!sections.includes('io?.unobserve(u.el);')) throw new Error('M18: cada bloco revela uma única vez (done + unobserve)');
  if(!sections.includes('else if (e.isIntersecting || e.boundingClientRect.top < 0) final(u);')||!sections.includes('if (r.top < innerHeight || !r.height || r.top + scrollY > end) final(u);')) throw new Error('M18: bloco passado, na tela, oculto ou inalcançável precisa ficar final (scroll rápido, reload, âncora)');
  if(!sections.includes('      sweep(top);\n    }, { rootMargin')||!sections.includes("addEventListener('resize', () => io && sweep(), { passive: true });")) throw new Error('M18: bloco ultrapassado por resize/salto sem entry precisa ficar final (sweep)');
  if(!sections.includes("addEventListener('focusin', e => units.forEach(v => !v.done && v.el.closest('section') === e.target.closest?.('section') && final(v)));")) throw new Error('M18: foco de teclado finaliza a seção (nunca em controle oculto)');
  if(!sections.includes("reduced.addEventListener('change', settle);")||!sections.includes("if (reduced.matches || !root.classList.contains('motion')) return settle();")) throw new Error('M18: reduced motion deixa todas as seções finais');
}
// M20: the final CTA title may reveal through a clip (below the fold), but only from JS on the shared
// observer — never a CSS start state, so no-JS, reduced motion, reload, anchor or a JS error leave it
// visible. The rail replays once, time-based (no scheduler, pin or carrier), and never changes display.
{
  const ctaRules=[...motionCss.matchAll(/([^{}]*\.cta-(?:title|lead|act|rail)[^{}]*)\{([^}]*)\}/g)];
  if(ctaRules.some(([,selector,body])=>/opacity:\s?0(?![.\d])|clip-path|visibility:\s?hidden|display:/.test(body)||/::?before|::?after/.test(selector)&&!/rail-fill/.test(selector))) throw new Error('M20: CTA final sem estado inicial em CSS (título, lead, botão e rail visíveis sem JS)');
  if((motionJs.match(/\['\.cta-title'/g)||[]).length!==1||(motionJs.match(/\['\.cta-rail'/g)||[]).length!==1||/\.cta-rail[^\n]*(?:mo-carrier|mo-fly|ziisMotion)/.test(motionJs)) throw new Error('M20: rail do CTA toca uma única vez, no observer compartilhado, sem scheduler ou carriers');
}
// M19: the FAQ stays native <details>/<summary> (keyboard, semantics, screen readers, several open at
// once). Motion is CSS only — no JS accordion or toggle handler — and the height transition exists only
// where ::details-content + interpolate-size are supported (instant elsewhere).
{
  const code=source=>source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  if((html.match(/<details class="faq-item"(?: open)?><summary class="faq-q">/g)||[]).length!==6) throw new Error('M19: FAQ precisa continuar <details>/<summary> nativo');
  if(/faq|<details|details-content|['"]toggle['"]|\.open\b|\bopen\s*=/i.test(code(motionJs))||/['"]toggle['"]|\.open\b|details/i.test(code(script))) throw new Error('M19: FAQ sem acordeão JS (nenhum handler de <details>)');
  if(!/@supports \(interpolate-size: allow-keywords\) \{ html\.motion \.faq-item \{ interpolate-size:allow-keywords; \} html\.motion \.faq-item::details-content \{ block-size:0;[^}]*transition:block-size 240ms/.test(motionCss)) throw new Error('M19: altura do FAQ só via ::details-content + interpolate-size (240 ms)');
}
// M21: microinteractions are CSS. The keyboard ring is never lost: 2px, 2px offset, brand-strong on dark
// buttons and the approved brand-deep on light ones, appearing in 90 ms and never transitioned away
// (outline-color is timed only inside :focus-visible). Pricing cards never react to hover, and the
// storytelling controls stay illustrations (not focusable, never hit-tested).
{
  const rule=selector=>[...motionCss.matchAll(new RegExp(`(?:^|[{}/] )${selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\{([^}]*)\\}`,'g'))].map(m=>m[1]).join(';');
  const base=rule('html.motion .mk-btn'),focus=rule('html.motion .mk-btn:focus-visible'),dark=rule('html.motion .mk-btn-dark:focus-visible');
  if(!/outline:2px solid transparent; outline-offset:2px;/.test(base)||!/outline-color:var\(--zt-brand-deep\);/.test(focus)||!/outline-color 90ms/.test(focus)||!/outline-color:var\(--zt-brand-strong\);/.test(dark)||/outline/.test(motionCss.replace(/html\.motion \.mk-btn(?:-dark)?:focus-visible \{[^}]*\}|html\.motion \.mk-btn \{ outline:2px solid transparent; outline-offset:2px; \}/g,''))) throw new Error('M21: foco visível dos botões (anel 2px, offset 2px, 90 ms, nunca animado para fora)');
  if([...motionCss.matchAll(/([^{}]*)\{[^}]*display 160ms allow-discrete[^}]*\}/g)].some(([,selector])=>!selector.includes('[data-mo-menu]'))||!motionJs.includes("nav?.removeAttribute('data-mo-menu')")) throw new Error('M21: menu mobile anima só após uso, nunca numa troca de breakpoint');
  if(/\.plan[\w-]*(?:\s[^{,]*)?:hover(?![^{]*\.mk-btn)/.test(motionCss)) throw new Error('M21: cartão de plano nunca anima no hover (só o botão)');
  if((html.match(/<button\b/g)||[]).length!==1||/\btabindex=|<(?:input|select|textarea)\b/.test(html)||!/html\.motion \.ph-btns, html\.motion \.orc-actions \{ pointer-events:none; \}/.test(motionCss)) throw new Error('M21: controles do storytelling são ilustrativos (sem foco, pointer-events none)');
}
// Runtime budget: motion-boot.js + motion.js ≤ 16 KB gzip (hard ceiling of the budget amendment).
{
  const gzip=gzipSync(Buffer.concat([Buffer.from(motionFiles['site/motion-boot.js']||''),Buffer.from(motionJs)])).length;
  if(gzip>16384) throw new Error(`Motion JS acima do teto: ${gzip} B gzip > 16384`);
}
// F2.6: approved CSS and markup are immutable, apart from the two external scripts.
const normalizedHash=source=>sha256(Buffer.from(source.replace(/\r\n/g,'\n')));
if(normalizedHash(await read('site/v4/01-tokens.css'))!=='61e4a5bdf990eec0adf38acb14253d3e2e59dd59743b5aa98c2b31141e6487b8' || normalizedHash(await read('site/v4/02-home.css'))!=='9ffee1bfe508f2de710c41b4631c09dd8df358842bdfe140b3ee3033df10c159') throw new Error('F2 static CSS changed');
const staticHtml=html.replace(/^  <script src="\/motion(?:-boot)?\.js"(?: defer)?><\/script>\r?\n/gm,'').replace(/\r\n/g,'\n').trimEnd();
if(sha256(Buffer.from(staticHtml))!=='d9ec7b683a7499c3f4c2e03e011b753c501acefafa142ec6b47f4a947bdc984f') throw new Error('F2 static frames/markup changed');
if(sha256(Buffer.from(script.replace(/\r\n/g,'\n')))!=='2f8080e63e564fe60c2161ea598590b3ab49c0508d87d029c03bc4cff851ac8c') throw new Error('F2 static menu script changed');
console.log(`check ok  F2 + V3.1/V3.1.2 + copy, planos, CTA, lockup, fontes, PNG, a11y + destinos/formulários/telefone completo, folha única, paridade de classes sem exceção, CSP sem duplicatas, ${textFiles.length} arquivos de texto sem saída de ferramenta`);
