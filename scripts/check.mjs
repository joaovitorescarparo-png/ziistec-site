import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const required = ['index.html', 'styles.css', 'script.js', 'privacidade.html', 'termos.html', 'robots.txt'];
for (const file of required) await readFile(join(root, 'site', file));
const html = await readFile(join(root, 'site', 'index.html'), 'utf8');
const css = await readFile(join(root, 'site', 'styles.css'), 'utf8');
const script = await readFile(join(root, 'site', 'script.js'), 'utf8');
const mustHave = [
  'Seu serviço técnico, organizado',
  'do orçamento ao pós-venda.',
  'Orçamentos', 'Ordens de serviço', 'Agenda', 'Equipe técnica',
  'Produtos e vendas', 'Financeiro', 'Histórico e garantias',
  'https://app.ziistec.com'
];
for (const term of mustHave) if (!html.includes(term)) throw new Error(`Conteúdo obrigatório ausente: ${term}`);
if (!css.includes('@media (max-width:760px)')) throw new Error('Breakpoint mobile ausente');
if (script.includes('.style')) throw new Error('JavaScript não deve criar inline styles sob a CSP atual');
console.log('check ok  estrutura, conteúdo e breakpoint mobile presentes');
