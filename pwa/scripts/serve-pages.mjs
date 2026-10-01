// GitHub Pages stand-in for base-path checks: the app directory is served at /tbyb-mvp-miku/app/
// (as deployed next to the web/ export), and /tbyb-mvp-miku/ answers with a small stand-in for the
// website so tests can confirm the app's service worker never touches pages outside /app/.
// Usage: node scripts/serve-pages.mjs [--dist]   (TBYB_PAGES_PORT, default 4318)
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const appRoot=path.resolve(process.argv.includes('--dist')?'dist/app':'public/app');
const site='/tbyb-mvp-miku/',mount=site+'app/';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
const port=Number(process.env.TBYB_PAGES_PORT||4318);
const webStub=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>web stub</title></head><body><h1>web stub</h1><p id="theme"></p><script>document.getElementById('theme').textContent=localStorage.getItem('tbyb-miku-theme')||'';</script></body></html>`;
http.createServer(async(req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  try{
    if(pathname===site||pathname===site+'index.html'){res.writeHead(200,{'Content-Type':types['.html'],'Cache-Control':'no-cache'});return res.end(webStub);}
    if(pathname+'/'===site||pathname+'/'===mount){res.writeHead(301,{Location:pathname+'/'});return res.end();}
    if(!pathname.startsWith(mount))throw new Error('outside');
    let file=path.resolve(appRoot,'.'+pathname.slice(mount.length-1));
    if(file!==appRoot&&!file.startsWith(appRoot+path.sep))throw new Error('outside');
    if((await stat(file)).isDirectory()){
      if(!pathname.endsWith('/')){res.writeHead(301,{Location:pathname+'/'});return res.end();}
      file=path.join(file,'index.html');
    }
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`TBYB pages: http://127.0.0.1:${port}${mount}`));
