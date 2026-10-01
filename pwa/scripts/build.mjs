import {cp,mkdir,readFile,readdir,rm} from 'node:fs/promises';
// dist/ mirrors public/. The deployable PWA is dist/app/ (app at its root, operator simulator at studio/);
// copy that directory to /tbyb-mvp-miku/app/ on GitHub Pages. dist/index.html is the legacy local website.
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
for(const file of ['index.html','app/index.html','app/studio/index.html','app/styles.css','app/identity.css','app/editorial.css','app/visuals.mjs','app/fonts/gowun-batang.woff2','app/theme.js','app/theme.css','app/ui.mjs','app/app-view.mjs','app/bridge.mjs','app/reflection.mjs','app/app-v2.css','app/model.mjs','app/sw.js','app/manifest.webmanifest','app/icon.svg','app/icon-192.png','app/icon-512.png','app/icon-maskable-512.png','app/brand/mark.svg','app/brand/mark-reverse.svg','app/brand/mark-dark.svg'])await readFile('dist/'+file);
// The app directory must not reference root-absolute paths (it is served under a sub-path).
for(const file of ['app/index.html','app/studio/index.html','app/sw.js','app/manifest.webmanifest','app/identity.css','app/ui.mjs','app/app-view.mjs','app/visuals.mjs','app/theme.js']){
  const text=await readFile('dist/'+file,'utf8');
  const hit=text.match(/(?:href|src)="\/(?!\/)|url\(['"]?\/(?!\/)|register\(['"]\/|location\.href='\/|"(?:start_url|scope|id|src)":"\//);
  if(hit)throw new Error(`${file}: root-absolute path near ${JSON.stringify(text.slice(hit.index,hit.index+40))}`);
}
console.log('Static build verified: '+(await readdir('dist')).length+' root entries; deploy dist/app/ to <base>/app/.');
