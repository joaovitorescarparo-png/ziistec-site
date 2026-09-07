import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const required = ['index.html', 'styles.css', 'v2.css', 'v4.css', 'script.js', 'privacidade.html', 'termos.html', '404.html', 'robots.txt', 'sitemap.xml', 'og/ziistec-og.png', 'brand/ziistec-horizontal-light-web.png'];
for (const file of required) await readFile(join(root, 'site', file));
const html = await readFile(join(root, 'site', 'index.html'), 'utf8');
const css = await readFile(join(root, 'site', 'styles.css'), 'utf8');
const v2Css = await readFile(join(root, 'site', 'v2.css'), 'utf8');
const v4Css = await readFile(join(root, 'site', 'v4.css'), 'utf8');
const v3Files = ['01-hero.css','02-operation.css','03-team.css','04-support.css','05-responsive.css','06-brand-motion.css'];
const v3Css = (await Promise.all(v3Files.map((name) => readFile(join(root, 'site', 'v3', name), 'utf8')))).join('\n');
const script = await readFile(join(root, 'site', 'script.js'), 'utf8');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const webLogo = await readFile(join(root, 'site', 'brand', 'ziistec-horizontal-light-web.png'));

const mustHave = [
  'Seu serviço inteiro', 'em um só lugar.', 'Software de gestão para prestadores de serviço',
  'Menos WhatsApp perdido', 'Por que ZiisTec', 'Operação conectada',
  'Comece sozinho. Estruture para crescer.',
  'Eletricistas', 'ar-condicionado', 'Jardinagem', 'Equipes de campo',
  'Conhecer a ZiisTec', 'Acesso em homologação', 'acesso@ziistec.com'
];
for (const term of mustHave) if (!html.includes(term)) throw new Error(`Conteúdo obrigatório ausente: ${term}`);
for (const oldTerm of ['Gestão para a rotina técnica', 'Feita para serviço técnico', 'equipes técnicas']) {
  if (html.includes(oldTerm)) throw new Error(`Posicionamento antigo regressou: ${oldTerm}`);
}
for (const seoTerm of ['<title>ZiisTec — Gestão para prestadores de serviço</title>', 'twitter:card', 'og:image:width', '/og/ziistec-og.png']) {
  if (!html.includes(seoTerm)) throw new Error(`SEO/posicionamento ausente: ${seoTerm}`);
}

const publicFiles = ['index.html', 'privacidade.html', 'termos.html', '404.html'];
for (const file of publicFiles) {
  const content = await readFile(join(root, 'site', file), 'utf8');
  if (/https?:\/\/app\.ziistec\.com/i.test(content)) {
    throw new Error(`Host reservado app.ziistec.com não pode aparecer em links públicos: ${file}`);
  }
}

if (!css.includes('@media (max-width:760px)')) throw new Error('Breakpoint mobile base ausente');
if (!v2Css.includes('@media (max-width:430px)')) throw new Error('Breakpoint mobile premium ausente');
if (!v4Css.includes('.brand.brand-web')) throw new Error('Uso robusto do logo web trimmed ausente');
if (!v4Css.includes('[data-flow-step="6"]')) throw new Error('Storytelling por scroll da operação ausente');
if (!v4Css.includes('[data-team-step="4"]')) throw new Error('Storytelling por scroll da equipe ausente');
if (!v4Css.includes('@media (prefers-reduced-motion:reduce)')) throw new Error('Reduced-motion da revisão de posicionamento ausente');
if (!script.includes('requestAnimationFrame(updateStories)') || !script.includes('data-scroll-story')) throw new Error('Controle leve de storytelling por scroll ausente');
if (script.includes('.style')) throw new Error('JavaScript não deve criar inline styles sob a CSP atual');
if (/animation\s*:[^;{}]*\binfinite\b/i.test(`${v3Css}\n${v4Css}`)) throw new Error('Motion infinito não é permitido');
if (pkg.engines?.node !== '24.x') throw new Error('Node deve permanecer fixado em 24.x');
if (lock.lockfileVersion !== 3 || lock.packages?.['']?.engines?.node !== '24.x') throw new Error('package-lock não está alinhado ao Node 24.x');
const webLogoSha = createHash('sha256').update(webLogo).digest('hex');
if (webLogoSha !== 'fed5c39249ad01f8b3f010d4988cf53590c094a93c609826e0cc35f52c44d1b6') throw new Error('Logo web trimmed divergiu do asset aprovado para esta branch');
if (!html.includes('data-demo-media="future"') || !(`${v3Css}\n${v4Css}`).includes('pointer-events:none')) throw new Error('Poster da demo futura deve permanecer passivo');
console.log('check ok  posicionamento, público amplo, marca, scroll storytelling, reduced-motion e pré-lançamento lockados');
