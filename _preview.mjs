import http from 'http'; import fs from 'fs'; import path from 'path';
const root='C:/Users/user/seika-roplay';
const types={'.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{let f=decodeURIComponent(req.url.split('?')[0]);if(f==='/')f='/index.html';
  fs.readFile(path.join(root,f),(e,d)=>{if(e){res.writeHead(404);res.end('404');return;}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(d);});
}).listen(8200,'0.0.0.0',()=>console.log('preview on 8200'));
