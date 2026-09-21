import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValidPng, gitBlobSha, inspectPng, sha256 } from './png-integrity.mjs';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const site=join(root,'site');
const dist=join(root,'dist');
const brandDir=join(dist,'brand');
const SOURCE_COMMIT='24f790b46f0299cd9b11f5b51501eecb05ede89b';
const SOURCE_REPO='joaovitorescarparo-png/Ziistec';
const WEB_LOGO_SHA256='fed5c39249ad01f8b3f010d4988cf53590c094a93c609826e0cc35f52c44d1b6';

// Ativos verificados: hash pinado E PNG que o navegador consegue renderizar.
// O símbolo Z de 96x96 é o único ativo de marca comprovadamente íntegro hoje.
const verifiedAssets={
  'ziistec-favicon.png':'6282b9a5739531e5e55dd2fbf4bdfb16e1574e3f'
};

// Quarentena: hash pinado confere, mas o PNG está corrompido na origem e não renderiza.
// Continuam sendo publicados somente porque o HTML atual ainda os referencia.
// Saem do pipeline na Fase 3, junto com as referências no markup. Não substituir por arquivos novos.
const quarantinedAssets={
  'ziistec-horizontal-light.png':'bff25617f2040409fb5ff3def57b7a18aa52bd10',
  'ziistec-horizontal-dark.png':'fa869f33e943be6453a7f0ea935c203f01a4d03c',
  'ziistec-icon.png':'b17b13a4d4989b21469267f02be9d608e5581a90'
};

await rm(dist,{recursive:true,force:true});
await mkdir(brandDir,{recursive:true});
await cp(site,dist,{recursive:true});

const v3Files=['01.css','02.css','03.css','04.css','05.css','06.css'];
const v3Css=(await Promise.all(v3Files.map((name)=>readFile(join(site,'v3-final',name),'utf8')))).join('');
const conversionCss=await readFile(join(site,'v3-conversion.css'),'utf8');
const salesCss=await readFile(join(site,'v3-sales.css'),'utf8');
await writeFile(join(dist,'styles.css'),`${v3Css}\n${conversionCss}\n${salesCss}`);

// site/index.html é a fonte real do HTML publicado. Nenhuma transformação por string acontece no build.
const sourceHtml=await readFile(join(site,'index.html'),'utf8');
await writeFile(join(dist,'index.html'),sourceHtml);

const webLogo=await readFile(join(site,'brand','ziistec-horizontal-light-web.png'));
const webLogoSha=sha256(webLogo);
if(webLogoSha!==WEB_LOGO_SHA256) throw new Error(`Integridade inválida no logo web trimmed: esperado ${WEB_LOGO_SHA256}, recebido ${webLogoSha}`);
assertValidPng('ziistec-horizontal-light-web.png',webLogo);
console.log(`brand web ok  ziistec-horizontal-light-web.png  ${webLogo.length} bytes  ${webLogoSha}`);

async function fetchAsset(name,expectedSha){
  const url=`https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}/public/brand/${name}`;
  const response=await fetch(url,{redirect:'error'});
  if(!response.ok) throw new Error(`Falha ao baixar ${name}: HTTP ${response.status}`);
  const buffer=Buffer.from(await response.arrayBuffer());
  const actualSha=gitBlobSha(buffer);
  if(actualSha!==expectedSha) throw new Error(`Integridade inválida em ${name}: esperado ${expectedSha}, recebido ${actualSha}`);
  await writeFile(join(brandDir,name),buffer);
  return {buffer,actualSha};
}

for(const [name,expectedSha] of Object.entries(verifiedAssets)){
  const {buffer,actualSha}=await fetchAsset(name,expectedSha);
  assertValidPng(name,buffer);
  console.log(`brand ok  ${name}  ${buffer.length} bytes  ${actualSha}  PNG íntegro`);
}

const quarantineReport=[];
for(const [name,expectedSha] of Object.entries(quarantinedAssets)){
  const {buffer,actualSha}=await fetchAsset(name,expectedSha);
  const report=inspectPng(buffer);
  if(report.valid){
    console.log(`brand ok  ${name}  ${buffer.length} bytes  ${actualSha}  PNG íntegro (pode sair da quarentena)`);
  }else{
    quarantineReport.push(`${name}: ${report.problems.join('; ')}`);
    console.warn(`brand QUARENTENA  ${name}  ${buffer.length} bytes  ${actualSha}  PNG CORROMPIDO — ${report.problems.join('; ')}`);
  }
}
if(quarantineReport.length){
  console.warn(`\n⚠  ${quarantineReport.length} ativo(s) de marca corrompido(s) na origem continuam publicados porque o HTML atual ainda os referencia:`);
  for(const line of quarantineReport) console.warn(`   - ${line}`);
  console.warn('   Remoção prevista na Fase 3, junto com as referências no markup. Nenhum substituto pode ser fabricado.\n');
}

const html=await readFile(join(dist,'index.html'),'utf8');
if(!html.includes('/brand/ziistec-horizontal-light-web.png')) throw new Error('index.html não referencia a marca web trimmed');
if((html.match(/\/brand\/ziistec-icon\.png/g)||[]).length<5) throw new Error('Lockups não usam o símbolo oficial ZiisTec em quantidade esperada');
if(!html.includes('Quero conhecer o Profissional')||!html.includes('O que normalmente perguntam antes de usar a ZiisTec.')) throw new Error('Conteúdo comercial obrigatório ausente no HTML publicado');
console.log('build ok  ZiisTec Site pronto para Preview');
