import { createHash } from 'node:crypto';

const PNG_SIGNATURE=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

export function gitBlobSha(buffer){
  const header=Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

export function sha256(buffer){
  return createHash('sha256').update(buffer).digest('hex');
}

// Integridade de hash prova apenas que o arquivo é o esperado.
// Esta verificação prova que o arquivo é um PNG que o navegador consegue renderizar:
// assinatura correta, todos os chunks com CRC válido e terminador IEND presente.
export function inspectPng(buffer){
  const problems=[];
  if(buffer.length<8||!buffer.subarray(0,8).equals(PNG_SIGNATURE)) return {valid:false,chunks:[],problems:['assinatura PNG ausente']};
  const chunks=[];
  let offset=8;
  while(offset+8<=buffer.length){
    const length=buffer.readUInt32BE(offset);
    const type=buffer.subarray(offset+4,offset+8).toString('latin1');
    if(offset+12+length>buffer.length){ problems.push(`chunk ${type} truncado`); chunks.push(type); break; }
    const declared=buffer.readUInt32BE(offset+8+length);
    const actual=Number(BigInt.asUintN(32,BigInt(crc32(buffer.subarray(offset+4,offset+8+length)))));
    if(declared!==actual) problems.push(`CRC inválido no chunk ${type}`);
    chunks.push(type);
    offset+=12+length;
  }
  if(!chunks.includes('IHDR')) problems.push('IHDR ausente');
  if(!chunks.includes('IEND')) problems.push('IEND ausente (arquivo incompleto)');
  return {valid:problems.length===0,chunks,problems};
}

export function assertValidPng(name,buffer){
  const report=inspectPng(buffer);
  if(!report.valid) throw new Error(`Asset inválido ${name}: ${report.problems.join('; ')}`);
  return report;
}

let table=null;
function crc32(buffer){
  if(!table){
    table=new Int32Array(256);
    for(let i=0;i<256;i+=1){
      let c=i;
      for(let k=0;k<8;k+=1) c=c&1?0xedb88320^(c>>>1):c>>>1;
      table[i]=c;
    }
  }
  let crc=-1;
  for(let i=0;i<buffer.length;i+=1) crc=(crc>>>8)^table[(crc^buffer[i])&0xff];
  return (crc^-1)>>>0;
}
