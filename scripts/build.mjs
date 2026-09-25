import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyFonts } from './font-integrity.mjs';
import { assertValidPng, sha256 } from './png-integrity.mjs';
import { hasToolError, listTextFiles } from './repo-files.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const site=join(root,'site'), dist=join(root,'dist');
await rm(dist,{recursive:true,force:true}); await mkdir(dist,{recursive:true}); await cp(site,dist,{recursive:true});
const cssFiles=['00-fonts.css','01-tokens.css','02-home.css'];
const css=(await Promise.all(cssFiles.map(f=>readFile(join(site,'v4',f),'utf8')))).join('\n');
await writeFile(join(dist,'styles.css'),css);
for(const f of await verifyFonts(join(site,'fonts'))) console.log(`font ok  ${f.file}  ${f.bytes} bytes  ${f.family} ${f.weight}`);
const mark=await readFile(join(site,'brand','ziistec-favicon.png')); assertValidPng('ziistec-favicon.png',mark);
const markSha=sha256(mark); if(markSha!=='368d4153166acf6a39280a3766379b31fecd47ed50d07f721ad2d463cd95452a') throw new Error(`Símbolo ZiisTec divergente: ${markSha}`);
console.log(`png ok  ziistec-favicon.png  ${mark.length} bytes  ${markSha}`);
// Verificações sobre o que de fato vai ao ar (dist/), não só sobre a fonte.
for(const page of ['index.html','privacidade.html','termos.html','404.html']){
  const html=await readFile(join(dist,page),'utf8');
  for(const bad of ['ziistec-horizontal-light.png','ziistec-horizontal-dark.png','ziistec-icon.png','ziistec-og.png','legal.css']) if(html.includes(bad)) throw new Error(`Referência legada/corrompida publicada em ${page}: ${bad}`);
}
const published=await listTextFiles(dist);
for(const file of published) if(hasToolError(await readFile(join(dist,...file.split('/')),'utf8'))) throw new Error(`Arquivo publicado com mensagem de ferramenta: dist/${file}`);
console.log(`dist ok  ${published.length} arquivos de texto publicados sem mensagem de ferramenta nem referência legada`);
console.log('build ok  ZiisTec Homepage V4 Fase 3 pronta para Preview');