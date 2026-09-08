import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applySalesPass } from './sales-transform.mjs';

const root=new URL('..',import.meta.url).pathname;
const read=(p,enc='utf8')=>readFile(join(root,p),enc);
const v3Files=['01.css','02.css','03.css','04.css','05.css','06.css'];
const required=['site/index.html','site/v3-final.css',...v3Files.map((name)=>`site/v3-final/${name}`),'site/v3-conversion.css','site/v3-sales.css','site/script.js','scripts/sales-transform.mjs','site/legal.css','site/privacidade.html','site/termos.html','site/404.html','site/robots.txt','site/sitemap.xml','site/og/ziistec-og.png','site/brand/ziistec-horizontal-light-web.png'];
for(const f of required) await read(f,f.endsWith('.png')?null:'utf8');
const sourceHtml=await read('site/index.html');
const html=applySalesPass(sourceHtml);
const conversionCss=await read('site/v3-conversion.css');
const salesCss=await read('site/v3-sales.css');
const css=`${(await Promise.all(v3Files.map((name)=>read(`site/v3-final/${name}`)))).join('')}\n${conversionCss}\n${salesCss}`;
const script=await read('site/script.js');
const pkg=JSON.parse(await read('package.json'));
const lock=JSON.parse(await read('package-lock.json'));
const logo=await read('site/brand/ziistec-horizontal-light-web.png',null);

const mustHave=[
  'Seu serviço inteiro','Gestão para prestadores de serviço e equipes de campo',
  'Menos informação perdida. Mais controle sobre cada serviço.',
  'Orçamento em um lugar, agenda em outro','A ZiisTec conecta esse caminho',
  'ANTES DA ZIISTEC','COM A ZIISTEC',
  'Por que vale centralizar a operação?','Menos retrabalho','Mais controle','Mais profissionalismo','Preparada para crescer',
  'Quem administra acompanha','Comece sozinho. Continue quando crescer.',
  'Começa no orçamento. Continua pela operação inteira.','não precisa recomeçar o atendimento',
  'pare de digitar os mesmos itens em todo orçamento','Esse serviço gerou dinheiro e o cliente já pagou?',
  'Se esse cliente chamar daqui a seis meses','O atendimento termina. O histórico fica.',
  'Preços de lançamento em validação','R$ 39,90','R$ 79,90','R$ 139,90',
  'R$ 40 a mais que o Essencial','Cerca de R$ 2,66 por dia','Quero conhecer o Profissional',
  'O que normalmente perguntam antes de usar a ZiisTec.','Serve para quem trabalha sozinho?','E se minha empresa já tem equipe?',
  'Consigo fazer orçamento em PDF?','O profissional de campo vê meu financeiro?','O histórico do cliente fica salvo?',
  'Recursos que ainda estão em desenvolvimento.','Contato comercial sem compromisso.',
  'data-pricing-status="validation"','data-scroll-story="journey"','data-scroll-story="team"','data-showcase-tab',
  'data-cta="hero-contact"','data-cta="workflow-contact"','data-cta="team-contact"','data-cta="pricing-professional"','data-cta="final-contact"'
];
for(const term of mustHave) if(!html.includes(term)) throw new Error(`Conteúdo Sales obrigatório ausente: ${term}`);

const forbiddenPublic=[
  /https?:\/\/app\.ziistec\.com/i,/https?:\/\/(?:wa\.me|api\.whatsapp\.com)/i,/GPS em tempo real/i,/rastreamento de equipe/i,/ponto eletrônico/i,/folha de pagamento/i,
  /NFS-e integrada/i,/conciliação bancária automática/i,/checkout próprio/i,/adquirência própria/i,/10\.000 empresas/i,/melhor sistema do Brasil/i,
  /\bledgers?\b/i,/\bbackend\b/i,/\bentitlements?\b/i,/\bmigrations?\b/i,/\bRLS\b/i,/\bidempotente\b/i,/\bV2\b/i,
  /Comprar agora/i,/Assinar agora/i,/Começar grátis/i,/Quero testar a ZiisTec/i,/teste grátis/i,/sem cartão/i
];
for(const re of forbiddenPublic) if(re.test(html)) throw new Error(`Promessa/linguagem proibida no site público: ${re}`);

if(!html.includes('Rentabilidade por OS</span><b>Em homologação</b>')) throw new Error('Rentabilidade precisa permanecer explicitamente em homologação');
if(!html.includes('Calculadora independente de margem')||!html.includes('Recursos que ainda estão em desenvolvimento.')) throw new Error('Limites de promessa ausentes');
if(!html.includes('limites de lançamento ainda estão em validação')||!html.includes('este Preview não cobra')) throw new Error('Pricing precisa manter validação e ausência de cobrança pública');
if((html.match(/\/brand\/ziistec-icon\.png/g)||[]).length<5) throw new Error('Símbolo oficial ZiisTec não está aplicado aos lockups esperados');
for(const cta of ['header-contact','hero-contact','workflow-contact','team-contact','pricing-essential','pricing-professional','pricing-company','final-contact']){
  if(!html.includes(`data-cta="${cta}"`)) throw new Error(`CTA analytics-ready ausente: ${cta}`);
}
function ctaUsesMailto(name){
  return new RegExp(`<a[^>]*(?:data-cta="${name}"[^>]*href="mailto:acesso@ziistec\\.com|href="mailto:acesso@ziistec\\.com[^>]*data-cta="${name}")[^>]*>`,`i`).test(html);
}
if(!ctaUsesMailto('hero-contact')) throw new Error('CTA principal do Hero precisa levar ao contato real');
if(!ctaUsesMailto('pricing-professional')) throw new Error('CTA Profissional precisa levar ao contato real');
if(!/data-cta="hero-product"[^>]+href="#produto"/i.test(html)) throw new Error('CTA secundário do Hero precisa levar à demonstração do produto');
if((html.match(/<details>/g)||[]).length!==6||(html.match(/<summary>/g)||[]).length!==6) throw new Error('FAQ comercial precisa ter exatamente seis perguntas acessíveis');
if(!css.includes('@media(prefers-reduced-motion:reduce)')&&!css.includes('@media (prefers-reduced-motion:reduce)')) throw new Error('Reduced motion ausente');
if(/animation\s*:[^;{}]*\binfinite\b/i.test(css)) throw new Error('Motion infinito não permitido');
if(script.includes('.style')) throw new Error('JS não deve criar inline style sob CSP');
if(!script.includes('data-scroll-story')||!script.includes('requestAnimationFrame(updateStories)')) throw new Error('Scroll storytelling V3 ausente');
if(!script.includes('visibilitychange')) throw new Error('Motion deve pausar quando aba está oculta');
if(!html.includes('role="tablist"')||!html.includes('aria-selected="true"')) throw new Error('Showcase acessível ausente');
if(!html.includes('skip-link')||!css.includes(':focus-visible')) throw new Error('Acessibilidade base regrediu');
const structuralClasses=[...new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m)=>m[1].split(/\s+/)).filter(Boolean))];
const unstyledStructural=structuralClasses.filter((name)=>!new RegExp(`\\.${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?![\\w-])`).test(css));
if(unstyledStructural.length) throw new Error(`Classes sem seletor no CSS publicado: ${unstyledStructural.join(', ')}`);
if(pkg.engines?.node!=='24.x'||lock.packages?.['']?.engines?.node!=='24.x') throw new Error('Node/lock precisam permanecer em 24.x');
if(!pkg.scripts?.prebuild?.includes('npm run check')||!pkg.scripts.prebuild.includes('node --check site/script.js')) throw new Error('Prebuild precisa executar gates de check e sintaxe no Preview');
const logoSha=createHash('sha256').update(logo).digest('hex');
if(logoSha!=='fed5c39249ad01f8b3f010d4988cf53590c094a93c609826e0cc35f52c44d1b6') throw new Error('Logo trimmed divergiu');
for(const file of ['site/index.html','site/privacidade.html','site/termos.html','site/404.html']){
  const content=await read(file);
  if(/https?:\/\/app\.ziistec\.com/i.test(content)) throw new Error(`app.ziistec.com não pode aparecer: ${file}`);
}
console.log('check ok  Site V3 Sales: dor, valor, FAQ, CTA, pricing, marca, a11y, motion e promises guardados');
