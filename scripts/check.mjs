import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFonts, fonts } from './font-integrity.mjs';
import { assertValidPng, sha256 } from './png-integrity.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=(path,encoding='utf8')=>readFile(join(root,path),encoding);
const required=[
  'site/index.html','site/script.js','site/v4/00-fonts.css','site/v4/01-tokens.css','site/v4/02-home.css',
  'site/legal.css','site/privacidade.html','site/termos.html','site/404.html','site/robots.txt','site/sitemap.xml',
  'site/brand/ziistec-favicon.png',...fonts.map((font)=>`site/fonts/${font.file}`),
  'site/fonts/LICENSE-SpaceGrotesk-OFL.txt','site/fonts/LICENSE-IBMPlex-OFL.txt','site/fonts/SOURCES.md'
];
for(const path of required) await read(path,path.endsWith('.png')?null:'utf8');

const html=await read('site/index.html');
const script=await read('site/script.js');
const css=(await Promise.all(['00-fonts.css','01-tokens.css','02-home.css'].map((file)=>read(`site/v4/${file}`)))).join('\n');
const pkg=JSON.parse(await read('package.json'));
const lock=JSON.parse(await read('package-lock.json'));

const approvedWhatsapp='https://wa.me/5547991797202?text=Ol%C3%A1%21%20Vim%20pelo%20site%20da%20ZiisTec%20e%20quero%20conhecer%20melhor%20a%20plataforma.';
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
  /Comprar agora/i,/Assinar agora/i,/Começar grátis/i,/teste grátis/i,/sem cartão/i
];
for(const pattern of forbiddenCopy) if(pattern.test(html)) throw new Error(`Copy/funcionalidade proibida encontrada: ${pattern}`);

const legacyAssets=['ziistec-horizontal-light.png','ziistec-horizontal-dark.png','ziistec-icon.png','ziistec-og.png','ziistec-horizontal-light-web.png'];
for(const asset of legacyAssets){
  for(const path of ['site/index.html','site/privacidade.html','site/termos.html','site/404.html']){
    const text=await read(path);
    if(text.includes(asset)) throw new Error(`Asset legado não permitido em ${path}: ${asset}`);
  }
}

const whatsappLinks=[...html.matchAll(/https:\/\/wa\.me\/[^"'\s>]*/g)].map((match)=>match[0]);
if(whatsappLinks.length<6) throw new Error('CTAs WhatsApp insuficientes para header, hero, planos e CTA final');
for(const link of whatsappLinks) if(link!==approvedWhatsapp) throw new Error(`Destino WhatsApp não aprovado: ${link}`);
for(const name of ['header-contact','hero-contact','pricing-essential','pricing-professional','pricing-team','final-contact']){
  if(!html.includes(`data-cta="${name}"`)) throw new Error(`CTA obrigatório ausente: ${name}`);
}
if((html.match(/target="_blank"/g)||[]).length<whatsappLinks.length) throw new Error('Todo CTA WhatsApp precisa abrir em nova aba');
if((html.match(/rel="noopener"/g)||[]).length<whatsappLinks.length) throw new Error('Todo CTA WhatsApp precisa usar rel=noopener');

if((html.match(/<details/g)||[]).length!==6) throw new Error('FAQ precisa ter exatamente 6 perguntas');
if((html.match(/<summary/g)||[]).length!==6) throw new Error('FAQ precisa ter exatamente 6 summaries');
if(!html.includes('class="brand-lockup')||!html.includes('<span class="brand-word"><b>Ziis</b><b>Tec</b></span>')) throw new Error('Lockup Refinement A não está composto por símbolo + wordmark tipográfico');
if(!html.includes('/brand/ziistec-favicon.png')) throw new Error('Símbolo oficial Z não está referenciado');
if(/data-scroll-story|requestAnimationFrame\(|IntersectionObserver\(/.test(`${html}\n${script}`)) throw new Error('Motion/scroll storytelling da Fase 4 não pode ser implementado na Fase 3');
if(script.includes('.style')) throw new Error('JS não deve injetar inline styles sob CSP');
if(!html.includes('skip-link')||!css.includes(':focus-visible')) throw new Error('Acessibilidade de teclado ausente');
if(/url\(\s*["']?https?:\/\//i.test(css)||/@import\s+.*https?:\/\//i.test(css)) throw new Error('CSS não pode buscar recurso externo');
if((css.match(/@font-face/g)||[]).length!==5) throw new Error('As cinco fontes aprovadas precisam estar auto-hospedadas');
for(const font of fonts) if(!css.includes(`/fonts/${font.file}`)) throw new Error(`Fonte não declarada no CSS: ${font.file}`);

if(pkg.engines?.node!=='24.x'||lock.packages?.['']?.engines?.node!=='24.x') throw new Error('Node deve permanecer fixado em 24.x');
if(!pkg.scripts?.prebuild?.includes('npm run check')||!pkg.scripts.prebuild.includes('node --check site/script.js')) throw new Error('Prebuild precisa preservar gates de check e sintaxe');
await verifyFonts(join(root,'site/fonts'));
const mark=await read('site/brand/ziistec-favicon.png',null);
assertValidPng('ziistec-favicon.png',mark);
const expectedMarkSha='368d4153166acf6a39280a3766379b31fecd47ed50d07f721ad2d463cd95452a';
if(sha256(mark)!==expectedMarkSha) throw new Error('Símbolo oficial ZiisTec divergiu do asset aprovado');

console.log('check ok  Homepage V4 Fase 3: copy, planos, CTA, lockup, fontes, PNG, CSP, a11y e ausência de motion Fase 4 verificados');