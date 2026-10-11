const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
if(!process.env.MOTION_BASELINE_DIST) throw new Error('Set MOTION_BASELINE_DIST to the built 0c6b4ff fixture');
const bases=[path.resolve(process.env.MOTION_BASELINE_DIST),path.join(repo,'dist')];
const headers=JSON.parse(fs.readFileSync(path.join(repo,'vercel.json'))).headers[0].headers;
for(let i=0;i<2;i++)http.createServer((req,res)=>{
 for(const h of headers) if(h.key!=='Content-Security-Policy')res.setHeader(h.key,h.value);
 // HTTPS upgrade directive is deployment-only; all other approved directives are enforced locally.
 res.setHeader('Content-Security-Policy',headers.find(h=>h.key==='Content-Security-Policy').value.replace(/;?\s*upgrade-insecure-requests/g,''));
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
 const file=path.resolve(bases[i],relative);
 if(!file.startsWith(bases[i]+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);});
}).listen(8770+i,'127.0.0.1',()=>console.log('listening '+(8770+i)));
