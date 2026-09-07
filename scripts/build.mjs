import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const root=join(here,'..');
const site=join(root,'site');
const dist=join(root,'dist');
const brandDir=join(dist,'brand');
const SOURCE_COMMIT='24f790b46f0299cd9b11f5b51501eecb05ede89b';
const SOURCE_REPO='joaovitorescarparo-png/Ziistec';
const WEB_LOGO_SHA256='fed5c39249ad01f8b3f010d4988cf53590c094a93c609826e0cc35f52c44d1b6';
const assets={
  'ziistec-horizontal-light.png':'bff25617f2040409fb5ff3def57b7a18aa52bd10',
  'ziistec-horizontal-dark.png':'fa869f33e943be6453a7f0ea935c203f01a4d03c',
  'ziistec-icon.png':'b17b13a4d4989b21469267f02be9d608e5581a90',
  'ziistec-favicon.png':'6282b9a5739531e5e55dd2fbf4bdfb16e1574e3f'
};
function gitBlobSha(buffer){const header=Buffer.from(`blob ${buffer.length}\0`);return createHash('sha1').update(header).update(buffer).digest('hex');}
await rm(dist,{recursive:true,force:true});
await mkdir(brandDir,{recursive:true});
await cp(site,dist,{recursive:true});
const v3Files=['01.css','02.css','03.css','04.css','05.css','06.css'];
const v3Css=(await Promise.all(v3Files.map((name)=>readFile(join(site,'v3-final',name),'utf8')))).join('');
await writeFile(join(dist,'styles.css'),v3Css);
const webLogo=await readFile(join(site,'brand','ziistec-horizontal-light-web.png'));
const webLogoSha=createHash('sha256').update(webLogo).digest('hex');
if(webLogoSha!==WEB_LOGO_SHA256) throw new Error(`Integridade inválida no logo web trimmed: esperado ${WEB_LOGO_SHA256}, recebido ${webLogoSha}`);
console.log(`brand web ok  ziistec-horizontal-light-web.png  ${webLogo.length} bytes  ${webLogoSha}`);
for(const [name,expectedSha] of Object.entries(assets)){
  const url=`https://raw.githubusercontent.com/${SOURCE_REPO}/${SOURCE_COMMIT}/public/brand/${name}`;
  const response=await fetch(url,{redirect:'error'});
  if(!response.ok) throw new Error(`Falha ao baixar ${name}: HTTP ${response.status}`);
  const buffer=Buffer.from(await response.arrayBuffer());
  const actualSha=gitBlobSha(buffer);
  if(actualSha!==expectedSha) throw new Error(`Integridade inválida em ${name}: esperado ${expectedSha}, recebido ${actualSha}`);
  await writeFile(join(brandDir,name),buffer);
  console.log(`brand ok  ${name}  ${buffer.length} bytes  ${actualSha}`);
}
const html=await readFile(join(dist,'index.html'),'utf8');
if(!html.includes('/brand/ziistec-horizontal-light-web.png')) throw new Error('index.html não referencia a marca web trimmed');
console.log('build ok  ZiisTec Site V3 pronto para publicação estática');
