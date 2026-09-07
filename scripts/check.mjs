import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const required = ['index.html', 'styles.css', 'v2.css', 'script.js', 'privacidade.html', 'termos.html', 'robots.txt'];
for (const file of required) await readFile(join(root, 'site', file));
const html = await readFile(join(root, 'site', 'index.html'), 'utf8');
const css = await readFile(join(root, 'site', 'styles.css'), 'utf8');
const v2Css = await readFile(join(root, 'site', 'v2.css'), 'utf8');
const script = await readFile(join(root, 'site', 'script.js'), 'utf8');
const mustHave = [
  'Seu serviço técnico, organizado',
  'do orçamento ao pós-venda.',
  'Orçamentos', 'Ordens de serviço', 'Agenda', 'Equipe técnica',
  'Produtos e vendas', 'Financeiro', 'Histórico e garantias',
  'Conhecer a ZiisTec', 'Acesso em homologação', 'acesso@ziistec.com'
];
for (const term of mustHave) if (!html.includes(term)) throw new Error(`Conteúdo obrigatório ausente: ${term}`);

const publicFiles = ['index.html', 'privacidade.html', 'termos.html', '404.html'];
for (const file of publicFiles) {
  const content = await readFile(join(root, 'site', file), 'utf8');
  if (/https?:\/\/app\.ziistec\.com/i.test(content)) {
    throw new Error(`Host reservado app.ziistec.com não pode aparecer em links públicos: ${file}`);
  }
}

if (!css.includes('@media (max-width:760px)')) throw new Error('Breakpoint mobile ausente');
if (!v2Css.includes('@media (max-width:430px)')) throw new Error('Breakpoint mobile premium ausente');
if (!v2Css.includes('.metric-card,.metric-card:last-child{display:grid')) throw new Error('Agenda deve permanecer visível em telas pequenas');
if (script.includes('.style')) throw new Error('JavaScript não deve criar inline styles sob a CSP atual');
console.log('check ok  estrutura, conteúdo e breakpoint mobile presentes');
