import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXCLUDED_DIRS, listTextFiles } from './repo-files.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const abs=(rel)=>join(root,...rel.split('/'));

// Arquivos críticos: precisam existir e ser lidos — ausência reprova.
// Inclui os 8 da Fase 3 e os que o scan cobria antes dela (abff903).
const required=[
  'site/index.html','site/script.js','site/v4/02-home.css','scripts/build.mjs','scripts/check.mjs',
  'site/privacidade.html','site/termos.html','site/404.html',
  'scripts/png-integrity.mjs','scripts/font-integrity.mjs','site/v3-conversion.css','site/v3-sales.css',
  'package.json','vercel.json'
];

// Varredura recursiva de todo o repositório. Entra qualquer arquivo sem byte NUL, com qualquer nome ou
// extensão, em qualquer pasta — inclusive um arquivo novo na raiz. Saem só .git, node_modules, dist e
// outros diretórios gerados (repo-files.mjs), e formatos binários conhecidos (imagens, fontes, arquivos).
const swept=await listTextFiles(root);
const files=[...new Set([...required,...swept])];

const patterns=[
  /sk_(?:live|test)_[A-Za-z0-9_-]{12,}/,/ghp_[A-Za-z0-9]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['\"]?[^\s'\"]+/i,/service_role\s*[=:]\s*['\"]?[A-Za-z0-9._-]{20,}/i
];
for(const file of files){
  const content=await readFile(abs(file),'utf8');
  for(const pattern of patterns) if(pattern.test(content)) throw new Error(`Possível segredo encontrado em ${file}: ${pattern}`);
}
console.log(`secret scan ok  ${files.length} arquivos (${required.length} obrigatórios + varredura recursiva do repositório, exceto ${[...EXCLUDED_DIRS].join(', ')})`);
