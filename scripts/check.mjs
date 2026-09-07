import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const v3Files = ['v3/01-hero.css','v3/02-operation.css','v3/03-team.css','v3/04-support.css','v3/05-responsive.css','v3/06-brand-motion.css'];
const required = ['index.html', 'styles.css', 'v2.css', ...v3Files, 'script.js', 'privacidade.html', 'termos.html', '404.html', 'robots.txt', 'sitemap.xml', 'og/ziistec-og.png'];
for (const file of required) await readFile(join(root, 'site', file));
const html = await readFile(join(root, 'site', 'index.html'), 'utf8');
const css = await readFile(join(root, 'site', 'styles.css'), 'utf8');
const v2Css = await readFile(join(root, 'site', 'v2.css'), 'utf8');
const v3Css = (await Promise.all(v3Files.map((file) => readFile(join(root, 'site', file), 'utf8')))).join('\n');
const script = await readFile(join(root, 'site', 'script.js'), 'utf8');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));

const mustHave = [
  'Seu serviço organizado', 'do orçamento ao pós-venda.',
  'Orçamentos', 'Ordens de serviço', 'Agenda', 'Equipe técnica',
  'Produtos e vendas', 'Financeiro', 'Histórico e garantias',
  'Conhecer a ZiisTec', 'Acesso em homologação', 'acesso@ziistec.com'
];
for (const term of mustHave) if (!html.includes(term)) throw new Error(`Conteúdo obrigatório ausente: ${term}`);
for (const visualTerm of ['id="fluxo"','id="equipe"','id="dia"','id="venda-em-campo"','id="historico"','id="demo"','Dados ilustrativos','Demonstração da plataforma em breve.','operation-flow','team-stage','day-timeline','history-visual','demo-frame']) {
  if (!html.includes(visualTerm)) throw new Error(`Narrativa visual ausente: ${visualTerm}`);
}
for (const seoTerm of ['twitter:card', 'og:image:width', '/og/ziistec-og.png']) if (!html.includes(seoTerm)) throw new Error(`SEO social ausente: ${seoTerm}`);
for (const motionTerm of ['.product-stage-v3.motion-run','.operation-board.motion-run','.team-stage.motion-run','.day-timeline.motion-run']) if (!v3Css.includes(motionTerm)) throw new Error(`Motion funcional sem regra: ${motionTerm}`);
if (!html.includes('class="play-disc"') || !v3Css.includes('content:"Vídeo · em breve"')) throw new Error('Poster futuro deve indicar claramente que o vídeo ainda não existe');
if (!v3Css.includes('.brand{display:block;width:178px')) throw new Error('Presença de marca do header não está protegida pelo gate');
if (!v3Css.includes('.motion-paused .motion-run')) throw new Error('Pausa de motion em background ausente');
if (/animation:[^;]*infinite/i.test(v3Css)) throw new Error('Motion de produto não deve rodar infinitamente');

for (const file of ['index.html', 'privacidade.html', 'termos.html', '404.html']) {
  const content = await readFile(join(root, 'site', file), 'utf8');
  if (/https?:\/\/app\.ziistec\.com/i.test(content)) throw new Error(`Host reservado app.ziistec.com não pode aparecer em links públicos: ${file}`);
}
if (!css.includes('@media (max-width:760px)')) throw new Error('Breakpoint mobile base ausente');
if (!v2Css.includes('@media (max-width:430px)')) throw new Error('Breakpoint mobile premium ausente');
if (!v3Css.includes('@media (max-width:430px)')) throw new Error('Breakpoint mobile visual ausente');
if (!v2Css.includes('.metric-card,.metric-card:last-child{display:grid')) throw new Error('Agenda deve permanecer visível em telas pequenas');
if (!v2Css.includes('.float-icon.money{font-size:11px}')) throw new Error('Rótulos do mockup mobile não podem regredir para texto operacional minúsculo');
if (!v2Css.includes(':focus-visible')) throw new Error('Tratamento de foco visível ausente');
if (!v3Css.includes('prefers-reduced-motion:reduce')) throw new Error('Novas microinterações devem respeitar reduced motion');
if (script.includes('.style')) throw new Error('JavaScript não deve criar inline styles sob a CSP atual');
if (pkg.engines?.node !== '24.x') throw new Error('Node deve permanecer fixado em 24.x');
if (lock.lockfileVersion !== 3 || lock.packages?.['']?.engines?.node !== '24.x') throw new Error('package-lock não está alinhado ao Node 24.x');
console.log('check ok  conteúdo, pré-lançamento, mobile, acessibilidade, SEO, marca, motion e build lockados');
