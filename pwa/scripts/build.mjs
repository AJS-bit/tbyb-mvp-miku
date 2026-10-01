import {cp,mkdir,readFile,readdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
for(const file of ['index.html','app/index.html','studio/index.html','styles.css','identity.css','editorial.css','visuals.mjs','fonts/gowun-batang.woff2','theme.js','theme.css','ui.mjs','app-view.mjs','reflection.mjs','app-v2.css','model.mjs','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable-512.png','brand/mark.svg','brand/mark-reverse.svg','brand/mark-dark.svg'])await readFile('dist/'+file);
console.log('Static build verified: '+(await readdir('dist')).length+' root entries.');
