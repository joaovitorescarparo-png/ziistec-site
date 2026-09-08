import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root=new URL('..',import.meta.url).pathname;
const files=[
  'site/index.html',
  'site/script.js',
  'site/v3-conversion.css',
  'site/v3-sales.css',
  'scripts/sales-transform.mjs',
  'site/privacidade.html',
  'site/termos.html',
  'site/404.html'
];
const patterns=[
  /sk_(?:live|test)_[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['\"]?[^\s'\"]+/i,
  /service_role\s*[=:]\s*['\"]?[A-Za-z0-9._-]{20,}/i
];
for(const file of files){
  const content=await readFile(join(root,file),'utf8');
  for(const pattern of patterns){
    if(pattern.test(content)) throw new Error(`Possível segredo encontrado em ${file}: ${pattern}`);
  }
}
console.log(`secret scan ok  ${files.length} arquivos públicos/verificáveis`);
