import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const files=['site/index.html','site/script.js','site/v4/02-home.css','scripts/build.mjs','scripts/check.mjs','site/privacidade.html','site/termos.html','site/404.html'];
const patterns=[/sk_(?:live|test)_[A-Za-z0-9_-]{12,}/,/ghp_[A-Za-z0-9]{20,}/,/github_pat_[A-Za-z0-9_]{20,}/,/xox[baprs]-[A-Za-z0-9-]{10,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*['\"]?[^\s'\"]+/i,/service_role\s*[=:]\s*['\"]?[A-Za-z0-9._-]{20,}/i];
for(const f of files){const s=await readFile(join(root,f),'utf8');for(const p of patterns)if(p.test(s))throw new Error(`Possível segredo encontrado em ${f}: ${p}`);}
console.log(`secret scan ok  ${files.length} arquivos públicos/verificáveis`);