import { open, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

// Diretórios que não são fonte do repositório. Todo o resto é varrido.
export const EXCLUDED_DIRS=new Set(['.git','node_modules','dist','.vercel','.next','coverage','.cache','.turbo']);
// Formatos binários conhecidos. Qualquer outro arquivo é tratado como texto se não tiver byte NUL.
const BINARY_EXT=/\.(?:png|jpe?g|gif|webp|avif|ico|bmp|tiff?|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|br|zst|7z|rar|bundle|pack|idx|mp4|mov|webm|mp3|wav|ogg)$/i;
const MAX_TEXT_BYTES=5*1024*1024;

async function looksTextual(path){
  const info=await stat(path);
  if(info.size>MAX_TEXT_BYTES) return false;
  const handle=await open(path,'r');
  try{
    const probe=Buffer.alloc(Math.min(8192,info.size));
    await handle.read(probe,0,probe.length,0);
    return !probe.includes(0);
  }finally{ await handle.close(); }
}

// Lista recursiva, com caminhos relativos em "/", de todo arquivo textual sob `base`
// (ou sob `base/sub`, quando informado). Não depende de extensão para incluir: um arquivo
// novo na raiz, com qualquer nome, entra automaticamente.
export async function listTextFiles(base,sub=''){
  const out=[];
  async function walk(rel){
    const dir=rel?join(base,...rel.split('/')):base;
    const entries=(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      const childRel=rel?`${rel}/${entry.name}`:entry.name;
      if(entry.isDirectory()){ if(!EXCLUDED_DIRS.has(entry.name)) await walk(childRel); continue; }
      if(!entry.isFile()||BINARY_EXT.test(entry.name)) continue;
      if(await looksTextual(join(base,...childRel.split('/')))) out.push(childRel);
    }
  }
  await walk(sub);
  return out;
}

// Mensagens de ferramenta/agente que já substituíram arquivos versionados deste repositório.
// Montadas por partes para que este próprio arquivo não case com elas.
export const TOOL_ERROR_SIGNATURES=[
  ['requested file reference','is not currently visible'],
  ['Use files.search','or files.list'],
  ['rediscover the file,','then retry'],
].map((parts)=>new RegExp(parts.join(' ').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));

export function hasToolError(text){
  return TOOL_ERROR_SIGNATURES.some((re)=>re.test(text));
}
