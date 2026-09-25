import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyFonts } from './font-integrity.mjs';
import { assertValidPng, inspectPng, sha256 } from './png-integrity.mjs';
import { extractUrls, findPhones, parseTags } from './html-audit.mjs';
import { EXCLUDED_DIRS } from './repo-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const FAVICON_SHA = '368d4153166acf6a39280a3766379b31fecd47ed50d07f721ad2d463cd95452a';

function run(script, cwd, scriptRoot = root) {
  return spawnSync(process.execPath, [join(scriptRoot, 'scripts', script)], { cwd, encoding: 'utf8' });
}

// ---------------------------------------------------------------- portabilidade
for (const script of ['check.mjs', 'secret-scan.mjs']) {
  test(`${script} funciona fora do diretório do projeto`, () => {
    const result = run(script, tmpdir());
    assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`);
  });
}

// ---------------------------------------------------------------- integridade de assets
test('favicon/Z oficial é PNG íntegro com o hash aprovado', async () => {
  const mark = await readFile(join(root, 'site', 'brand', 'ziistec-favicon.png'));
  assert.equal(assertValidPng('ziistec-favicon.png', mark).valid, true);
  assert.equal(sha256(mark), FAVICON_SHA);
});

test('as cinco fontes auto-hospedadas passam na verificação de integridade', async () => {
  assert.equal((await verifyFonts(join(root, 'site', 'fonts'))).length, 5);
});

test('PNG com CRC alterado ou sem IEND é reprovado', async () => {
  const mark = await readFile(join(root, 'site', 'brand', 'ziistec-favicon.png'));
  const badCrc = Buffer.from(mark);
  badCrc[29] ^= 0xff; // primeiro byte do CRC do IHDR
  assert.equal(inspectPng(badCrc).valid, false);
  assert.throws(() => assertValidPng('fixture-crc.png', badCrc), /Asset inválido/);
  assert.throws(() => assertValidPng('fixture-truncado.png', mark.subarray(0, mark.length - 12)), /IEND ausente/);
});

test('ziistec-og.png e legal.css não existem no site', async () => {
  await assert.rejects(access(join(root, 'site', 'og', 'ziistec-og.png')));
  await assert.rejects(access(join(root, 'site', 'legal.css')));
});

// ---------------------------------------------------------------- extração de HTML (unidade)
test('extração de URLs ignora formatação: aspas, espaços, caixa, ordem e entidades', () => {
  const html = `<A class=x TARGET='_blank' HREF = 'https://stripe.com/x'>a</A><a href = "/checkout">b</a>`
    + `<a href='h&#116;tps://example.org'>c</a><FORM action='/x'></FORM><a href=https://evil.example>d</a>`;
  assert.deepEqual(extractUrls(html).map((u) => u.url),
    ['https://stripe.com/x', '/checkout', 'https://example.org', '/x', 'https://evil.example']);
  assert.ok(parseTags(html).some((t) => t.name === 'form'));
});

test('telefone é normalizado com país e DDD', () => {
  assert.deepEqual(findPhones('(11) 99179-7202 · +55 11 99179-7202 · +55 (47) 99179-7202 · 5547991797202').map((p) => p.normalized),
    ['5511991797202', '5511991797202', '5547991797202', '5547991797202']);
});

// ---------------------------------------------------------------- gate completo contra regressões
// Cada caso copia o repositório inteiro (menos .git, node_modules e dist) para uma pasta com espaço e
// acento, aplica uma regressão e exige que o gate completo reprove com a mensagem certa.
async function withCopy(mutate, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'ziistec gate ção-'));
  try {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await cp(join(root, entry.name), join(dir, entry.name), { recursive: true });
    }
    await mutate(dir);
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function edit(dir, rel, change) {
  const file = join(dir, ...rel.split('/'));
  await writeFile(file, change(await readFile(file, 'utf8')));
}
const write = (dir, rel, content) => writeFile(join(dir, ...rel.split('/')), content);
const inBody = (snippet) => (s) => s.replace('</main>', `${snippet}</main>`);
const cspEdit = (change) => (d) => edit(d, 'vercel.json', (s) => {
  const json = JSON.parse(s);
  const header = json.headers[0].headers.find((h) => h.key === 'Content-Security-Policy');
  header.value = change(header.value);
  return JSON.stringify(json, null, 2);
});
const TOOL_SIGNATURE = ['The requested file reference', 'is not currently visible.'].join(' ');
const SECRET = `${'ghp_'}${'a'.repeat(30)}`;

test('cópia intacta em caminho com espaço e acento passa check, secret scan e build', async () => {
  await withCopy(async () => {}, async (dir) => {
    for (const script of ['check.mjs', 'secret-scan.mjs', 'build.mjs']) {
      const result = run(script, tmpdir(), dir);
      assert.equal(result.status, 0, `${script}\n${result.stdout}\n${result.stderr}`);
    }
  });
});

const regressions = [
  // assets legados
  ['referência publicada ao OG antigo', 'check.mjs', /Asset legado/,
    (d) => edit(d, 'site/index.html', (s) => s.replace('</head>', '<meta property="og:image" content="/og/ziistec-og.png"></head>'))],
  ['build com referência ao OG antigo', 'build.mjs', /Referência legada/,
    (d) => edit(d, 'site/index.html', (s) => s.replace('</head>', '<meta name="twitter:image" content="/og/ziistec-og.png"></head>'))],
  // CSP
  ['CSP com unsafe-inline', 'check.mjs', /CSP relaxada/, cspEdit((v) => v.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'"))],
  ['CSP com origem externa', 'check.mjs', /origem externa/, cspEdit((v) => v.replace("style-src 'self'", "style-src 'self' https://fonts.googleapis.com"))],
  ['CSP com curinga', 'check.mjs', /curinga/, cspEdit((v) => v.replace("img-src 'self' data:", 'img-src *'))],
  ['CSP sem diretiva aprovada', 'check.mjs', /sem a diretiva aprovada: object-src/, cspEdit((v) => v.replace("object-src 'none'; ", ''))],
  ['CSP com diretiva duplicada divergente', 'check.mjs', /diretiva duplicada: object-src/,
    cspEdit((v) => v.replace("object-src 'none'", "object-src 'self'; object-src 'none'"))],
  ['CSP com diretiva duplicada idêntica', 'check.mjs', /diretiva duplicada: script-src/, cspEdit((v) => `${v}; script-src 'self'`)],
  ['CSP duplicada com caixa e espaços diferentes', 'check.mjs', /diretiva duplicada: object-src/, cspEdit((v) => `${v};   OBJECT-SRC \t 'none'  `)],
  // destinos externos e proibidos, em qualquer formatação
  ['link externo com aspas duplas', 'check.mjs', /Destino externo não aprovado/, (d) => edit(d, 'site/index.html', inBody('<a href="https://example.org/">x</a>'))],
  ['link externo com aspas simples', 'check.mjs', /Destino externo não aprovado/, (d) => edit(d, 'site/index.html', inBody("<a href='https://example.org/'>x</a>"))],
  ['link externo sem aspas e em ordem diferente', 'check.mjs', /Destino externo não aprovado/,
    (d) => edit(d, 'site/termos.html', inBody('<a class="x" target=_blank href=https://example.org/>x</a>'))],
  ['link externo com entidade HTML no esquema', 'check.mjs', /Destino externo não aprovado/,
    (d) => edit(d, 'site/privacidade.html', inBody('<a href="h&#116;tps://example.org/">x</a>'))],
  ['link javascript:', 'check.mjs', /Destino externo não aprovado/, (d) => edit(d, 'site/404.html', inBody('<a href="javascript:alert(1)">x</a>'))],
  ['link tel: com outro número', 'check.mjs', /Destino externo não aprovado|Telefone comercial/, (d) => edit(d, 'site/index.html', inBody('<a href="tel:+551199179720">x</a>'))],
  ['checkout com "href =" e espaços', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/termos.html', inBody('<a href = "/checkout">x</a>'))],
  ['Stripe com HREF maiúsculo e aspas simples', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/index.html', inBody("<a HREF = 'https://stripe.com/pay'>x</a>"))],
  ['Mercado Pago', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/index.html', inBody('<a href="https://www.mercadopago.com.br/x">x</a>'))],
  ['Hotmart', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/index.html', inBody('<a href="https://pay.hotmart.com/x">x</a>'))],
  ['Calendly', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/index.html', inBody('<a href="https://calendly.com/x">x</a>'))],
  ['Typeform', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/index.html', inBody('<a href="https://x.typeform.com/to/y">x</a>'))],
  ['Google Forms', 'check.mjs', /cadastro\/checkout/, (d) => edit(d, 'site/index.html', inBody('<a href="https://docs.google.com/forms/d/x">x</a>'))],
  ['formulário', 'check.mjs', /Formulário não autorizado/, (d) => edit(d, 'site/privacidade.html', inBody('<form><button>x</button></form>'))],
  ['formulário em maiúsculas com action', 'check.mjs', /Formulário não autorizado/, (d) => edit(d, 'site/404.html', inBody("<FORM action='/x'></FORM>"))],
  ['referência local quebrada', 'check.mjs', /Referência local quebrada/, (d) => edit(d, 'site/index.html', inBody('<a href="/pagina-que-nao-existe">x</a>'))],
  // telefone e WhatsApp
  ['telefone com DDD 11', 'check.mjs', /Telefone comercial não aprovado/, (d) => edit(d, 'site/index.html', inBody('<p>(11) 99179-7202</p>'))],
  ['telefone +55 com DDD 11', 'check.mjs', /Telefone comercial não aprovado/, (d) => edit(d, 'site/termos.html', inBody('<p>+55 11 99179-7202</p>'))],
  ['telefone de outro número', 'check.mjs', /Telefone comercial não aprovado/, (d) => edit(d, 'site/index.html', inBody('<p>(47) 98888-1234</p>'))],
  ['WhatsApp com DDD 11', 'check.mjs', /WhatsApp não aprovado/, (d) => edit(d, 'site/404.html', inBody("<a href='https://wa.me/5511991797202'>x</a>"))],
  ['WhatsApp com outra mensagem', 'check.mjs', /WhatsApp não aprovado/, (d) => edit(d, 'site/404.html', inBody('<a href="https://wa.me/5547991797202?text=oi">x</a>'))],
  // CSS publicado
  ['legal.css recriado', 'check.mjs', /legal\.css foi removido definitivamente/, (d) => write(d, 'site/legal.css', '.legal-page{display:block}\n')],
  ['página legal voltando a carregar legal.css', 'check.mjs', /somente \/styles\.css/,
    (d) => edit(d, 'site/termos.html', (s) => s.replace('<link rel="stylesheet" href="/styles.css">', '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/v4.css">'))],
  ['homepage sem reduced motion', 'check.mjs', /Reduced motion ausente na camada da homepage/,
    (d) => edit(d, 'site/v4/02-home.css', (s) => s.replaceAll(/prefers-reduced-motion\s*:\s*reduce/g, 'min-width:1px'))],
  ['animação infinita', 'check.mjs', /Motion infinito/, (d) => edit(d, 'site/v4/02-home.css', (s) => `${s}\n.x{animation:spin 1s linear infinite}`)],
  ['token v4 obrigatório removido', 'check.mjs', /Token v4 obrigatório ausente/, (d) => edit(d, 'site/v4/01-tokens.css', (s) => s.replaceAll('--zt-rise:', '--zt-rise-removido:'))],
  ['classe nova sem seletor', 'check.mjs', /Classes sem seletor/, (d) => edit(d, 'site/index.html', inBody('<span class="classe-sem-estilo">x</span>'))],
  ['amber-dot perde o estilo', 'check.mjs', /Classes sem seletor.*amber-dot/,
    (d) => edit(d, 'site/v4/02-home.css', (s) => s.replace('.timeline>p i.amber-dot{background:var(--zt-accent-status)}', ''))],
  // saída de ferramenta
  ['mensagem de ferramenta em arquivo publicado', 'check.mjs', /mensagem de ferramenta: site\/v4\/02-home\.css/, (d) => edit(d, 'site/v4/02-home.css', (s) => `${s}\n/* ${TOOL_SIGNATURE} */`)],
  ['mensagem de ferramenta em documentação', 'check.mjs', /mensagem de ferramenta: docs\//, (d) => edit(d, 'docs/CAPABILITY_AUDIT_V3.md', () => TOOL_SIGNATURE)],
  ['mensagem de ferramenta em arquivo novo da raiz', 'check.mjs', /mensagem de ferramenta: NOTAS/, (d) => write(d, 'NOTAS', TOOL_SIGNATURE)],
  ['build com mensagem de ferramenta no publicado', 'build.mjs', /publicado com mensagem de ferramenta/, (d) => write(d, 'site/extra.txt', TOOL_SIGNATURE)],
  // segredos
  ['segredo em documentação', 'secret-scan.mjs', /Possível segredo encontrado em docs\//, (d) => edit(d, 'docs/CAPABILITY_AUDIT_V3.md', (s) => `${s}\n${SECRET}\n`)],
  ['segredo em script de integridade', 'secret-scan.mjs', /Possível segredo encontrado em scripts\/png-integrity/,
    (d) => edit(d, 'scripts/png-integrity.mjs', (s) => `${s}\n// ${'sk_live_'}${'b'.repeat(20)}\n`)],
  ['segredo em arquivo textual novo na raiz', 'secret-scan.mjs', /Possível segredo encontrado em notas\.txt/, (d) => write(d, 'notas.txt', `token=${SECRET}\n`)],
  ['segredo em arquivo sem extensão na raiz', 'secret-scan.mjs', /Possível segredo encontrado em \.env\.local/, (d) => write(d, '.env.local', `GITHUB_TOKEN=${SECRET}\n`)],
  ['segredo em pasta nova', 'secret-scan.mjs', /Possível segredo encontrado em config\/deploy\.yml/,
    async (d) => { await mkdir(join(d, 'config')); await write(d, 'config/deploy.yml', `token: ${SECRET}\n`); }],
  // gates da Fase 3
  ['copy aprovada removida', 'check.mjs', /Copy aprovada ausente/, (d) => edit(d, 'site/index.html', (s) => s.replaceAll('R$ 79,90', 'R$ 89,90'))],
  ['promessa de relatórios avançados', 'check.mjs', /proibida/, (d) => edit(d, 'site/index.html', inBody('<p>Relatórios avançados</p>'))],
  ['motion da Fase 4', 'check.mjs', /Fase 4/, (d) => edit(d, 'site/script.js', (s) => `${s}\nnew IntersectionObserver(()=>{});`)],
  ['CTA WhatsApp sem nova aba', 'check.mjs', /nova aba/, (d) => edit(d, 'site/index.html', (s) => s.replace('target="_blank"', 'target="_self"'))],
  ['suíte de tooling fora do npm run check', 'check.mjs', /suíte de tooling/, (d) => edit(d, 'package.json', (s) => s.replace(' && node --test scripts/tooling.test.mjs', ''))],
];

for (const [name, script, expected, mutate] of regressions) {
  test(`gate reprova: ${name}`, async () => {
    await withCopy(mutate, async (dir) => {
      const result = run(script, tmpdir(), dir);
      assert.notEqual(result.status, 0, `${script} deveria reprovar\n${result.stdout}`);
      assert.match(`${result.stdout}\n${result.stderr}`, expected);
    });
  });
}

test('legal.css ausente não quebra o build nem as páginas legais', async () => {
  await withCopy(async () => {}, async (dir) => {
    assert.equal(run('build.mjs', tmpdir(), dir).status, 0);
    await assert.rejects(access(join(dir, 'dist', 'legal.css')));
    for (const page of ['privacidade.html', 'termos.html', '404.html']) {
      const html = await readFile(join(dir, 'dist', page), 'utf8');
      assert.ok(!html.includes('legal.css'), page);
    }
  });
});

