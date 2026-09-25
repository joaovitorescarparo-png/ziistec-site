import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFonts, fonts } from './font-integrity.mjs';
import { assertValidPng, sha256 } from './png-integrity.mjs';
import { classNames, extractUrls, findPhones, hasTag, isExternalUrl, parseTags } from './html-audit.mjs';
import { hasToolError, listTextFiles } from './repo-files.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const abs=(path)=>join(root,...path.split('/'));
const read=(path,encoding='utf8')=>readFile(abs(path),encoding);
const exists=async(path)=>access(abs(path)).then(()=>true,()=>false);
const required=[
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
const css=(await Promise.all(['00-fonts.css','01-tokens.css','02-home.css'].map((file)=>read(`site/v4/${file}`)))).join('\n');
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
if(/data-scroll-story|requestAnimationFrame\(|IntersectionObserver\(/.test(`${html}\n${script}`)) throw new Error('Motion/scroll storytelling da Fase 4 não pode ser implementado na Fase 3');
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

console.log(`check ok  Fase 3 (copy, planos, CTA, lockup, fontes, PNG, a11y, sem motion Fase 4) + destinos/formulários/telefone completo, folha única, paridade de classes sem exceção, CSP sem duplicatas, ${textFiles.length} arquivos de texto sem saída de ferramenta`);
