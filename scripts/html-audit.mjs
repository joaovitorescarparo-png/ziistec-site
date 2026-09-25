// Extração centralizada de tags, atributos e URLs dos HTMLs publicados.
// Tolerante a aspas simples, duplas ou ausentes, espaços em volta de "=", caixa e ordem
// de atributos, e entidades HTML — para que nenhum gate dependa da formatação do markup.

const NAMED_ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",colon:':',sol:'/',period:'.',lpar:'(',rpar:')',nbsp:' ',tab:'\t',newline:'\n'};

export function decodeEntities(text){
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi,(match,body)=>{
    if(body[0]==='#'){
      const code=body[1].toLowerCase()==='x'?parseInt(body.slice(2),16):parseInt(body.slice(1),10);
      return Number.isFinite(code)&&code>=0&&code<=0x10ffff?String.fromCodePoint(code):match;
    }
    const named=NAMED_ENTITIES[body.toLowerCase()];
    return named===undefined?match:named;
  });
}

const TAG=/<([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR=/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

// Todas as tags de abertura, com nomes em minúsculas e valores de atributo já decodificados.
// Comentários são removidos antes; o conteúdo não vira tag.
export function parseTags(html){
  const source=html.replace(/<!--[\s\S]*?-->/g,' ');
  const tags=[];
  for(const tag of source.matchAll(TAG)){
    const attrs=new Map();
    for(const attr of tag[2].matchAll(ATTR)){
      const name=attr[1].toLowerCase();
      if(attrs.has(name)) continue; // o navegador usa a primeira ocorrência
      const raw=attr[2]??attr[3]??attr[4]??'';
      attrs.set(name,decodeEntities(raw));
    }
    tags.push({name:tag[1].toLowerCase(),attrs});
  }
  return tags;
}

const URL_ATTRS=['href','src','action','formaction','poster','data','cite','background','ping','xlink:href','srcset','imagesrcset'];

// Todo destino de navegação/recurso declarado no HTML, em qualquer formatação.
export function extractUrls(html){
  const out=[];
  for(const {name,attrs} of parseTags(html)){
    for(const attr of URL_ATTRS){
      if(!attrs.has(attr)) continue;
      const value=attrs.get(attr).trim();
      if(attr.endsWith('srcset')){
        for(const candidate of value.split(',')) { const url=candidate.trim().split(/\s+/)[0]; if(url) out.push({tag:name,attr,url}); }
      }else{
        out.push({tag:name,attr,url:value});
      }
    }
    if(name==='meta'&&/^refresh$/i.test(attrs.get('http-equiv')||'')){
      const target=(attrs.get('content')||'').match(/url\s*=\s*['"]?([^'";]+)/i);
      if(target) out.push({tag:name,attr:'content',url:target[1].trim()});
    }
  }
  return out;
}

// Esquema explícito (https:, mailto:, javascript:, tel: …) ou URL relativa a protocolo (//host).
export function isExternalUrl(url){
  const compact=url.replace(/[\u0000- ]/g,'');
  return /^[a-z][a-z0-9+.-]*:/i.test(compact)||compact.startsWith('//')||compact.startsWith('\\\\');
}

export function hasTag(html,tagName){
  return parseTags(html).some((tag)=>tag.name===tagName);
}

export function classNames(html){
  const names=new Set();
  for(const {attrs} of parseTags(html)) for(const cls of (attrs.get('class')||'').split(/\s+/)) if(cls) names.add(cls);
  return [...names];
}

// Números de telefone brasileiros em qualquer formatação, normalizados para dígitos com país.
// (DDD) 9XXXX-XXXX, +55 DDD …, 55DDD… — sem país, assume 55.
const PHONE=/(?<![\d])(?:\+?\s*55[\s.\-]*)?(?:\(\s*\d{2}\s*\)|\d{2})[\s.\-]*9?[\s.\-]?\d{4}[\s.\-]?\d{4}(?![\d])/g;
export function findPhones(text){
  return [...decodeEntities(text).matchAll(PHONE)].map((m)=>{
    const digits=m[0].replace(/\D/g,'');
    return {raw:m[0],normalized:digits.length<=11?`55${digits}`:digits};
  });
}
