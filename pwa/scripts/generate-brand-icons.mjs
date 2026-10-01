// Rasterize the approved vector; no redraw or generated replacement geometry.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
  for(const [source,name,size] of [['app-icon.svg','icon-192.png',192],['app-icon.svg','icon-512.png',512],['app-icon-maskable.svg','icon-maskable-512.png',512]]){
    const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
    const svg=await readFile(new URL('../public/app/brand/'+source,import.meta.url),'utf8');
    await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%}svg{display:block;width:100%;height:100%}</style>${svg}`);
    await writeFile(new URL('../public/app/'+name,import.meta.url),await page.screenshot({omitBackground:true}));
    await page.close();
  }
}finally{await browser.close();}
console.log('Approved app icon rendered at 192px and 512px, plus a full-bleed maskable variant.');
