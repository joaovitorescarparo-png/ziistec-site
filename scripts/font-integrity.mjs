import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Fontes auto-hospedadas sob a CSP existente. Procedência completa em site/fonts/SOURCES.md.
// Cada peso é um peso realmente desenhado pelo autor — nenhum peso sintético foi gerado.
export const fonts=[
  {file:'SpaceGrotesk-Bold.woff2',family:'Space Grotesk',weight:700,bytes:35436,sha256:'aaa4fb7d71023da0c2cec811d449d0beff4d04c05107d0b1ed9bf0a93bbe0a76'},
  {file:'IBMPlexSans-Regular.woff2',family:'IBM Plex Sans',weight:400,bytes:63020,sha256:'ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a'},
  {file:'IBMPlexSans-Bold.woff2',family:'IBM Plex Sans',weight:700,bytes:63012,sha256:'fa7130d854a660b39a7fc9e6e0f2dc23dba5f1346e2adea3e1fe37b6d884133d'},
  {file:'IBMPlexMono-Regular.woff2',family:'IBM Plex Mono',weight:400,bytes:45640,sha256:'49ce58b41a0e1cb921c0f58d9a5b8b96a2cc21437c7066f3ba4f24873076d131'},
  {file:'IBMPlexMono-Medium.woff2',family:'IBM Plex Mono',weight:500,bytes:46724,sha256:'8c2c290cbd998fa1f647e4572aca6ebbd72589551b0f3f9f8bb8628fbb8219d5'}
];

export const licenses=['LICENSE-SpaceGrotesk-OFL.txt','LICENSE-IBMPlex-OFL.txt'];

const WOFF2_SIGNATURE=Buffer.from('wOF2','latin1');

export async function verifyFonts(fontsDir){
  const results=[];
  for(const font of fonts){
    const buffer=await readFile(join(fontsDir,font.file));
    if(!buffer.subarray(0,4).equals(WOFF2_SIGNATURE)) throw new Error(`Fonte ${font.file} não é WOFF2 (assinatura wOF2 ausente)`);
    if(buffer.length!==font.bytes) throw new Error(`Fonte ${font.file}: tamanho ${buffer.length} difere do esperado ${font.bytes}`);
    const sha256=createHash('sha256').update(buffer).digest('hex');
    if(font.sha256&&font.sha256.length===64&&sha256!==font.sha256) throw new Error(`Fonte ${font.file}: sha256 ${sha256} difere do esperado ${font.sha256}`);
    results.push({...font,sha256});
  }
  for(const license of licenses){
    const text=await readFile(join(fontsDir,license),'utf8');
    if(!/SIL Open Font License/i.test(text)) throw new Error(`Licença ausente ou inesperada em ${license}`);
  }
  return results;
}
