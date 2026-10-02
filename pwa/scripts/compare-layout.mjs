// Layout-equivalence check for the MIKU recolour (2026-10-02).
// Serves two copies of the app directory at the same base path (/app/) on two local ports — the ORIGINAL
// (default: a git worktree of main 5655031 at /tmp/tbyb-base) and the NEW tree (this checkout) — seeds the same
// localStorage demo state, walks the same screens, and compares every visible element's bounding box plus the
// computed geometry (font size, padding, margin, border widths, radii). Borders that were visible in the original
// must stay visible. It also writes original|new side-by-side PNGs and an index.
//
// Usage: node scripts/compare-layout.mjs [--base=/tmp/tbyb-base/pwa/public/app] [--new=public/app]
//          [--out=<dir>] [--themes=light,dark] [--width=390] [--no-shots]
// Exit code 1 when any element differs by more than 1px (unless listed in EXPECTED_FIXES below).
import http from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const arg=(name,fallback)=>{const hit=process.argv.find(a=>a.startsWith(`--${name}=`));return hit?hit.slice(name.length+3):fallback;};
const baseRoot=path.resolve(arg('base','/tmp/tbyb-base/pwa/public/app'));
const newRoot=path.resolve(arg('new','public/app'));
const out=path.resolve(arg('out','/Users/anjusung/.buzz/OUTBOX/TBYB_APP_MIKU_COLOR_20261002'));
const themes=arg('themes','light,dark').split(',');
const widths=arg('width','390').split(',').map(Number);
const shots=!process.argv.includes('--no-shots');
// Elements intentionally changed in size/position by the "strange parts" fixes. Keyed by a CSS selector the
// differing element must match; anything else that moves is a failure.
const EXPECTED_FIXES=[];

const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
function serve(root,port){
  return new Promise(resolve=>{const server=http.createServer(async(req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://x').pathname);
    try{
      if(pathname==='/'||pathname==='/index.html'){res.writeHead(200,{'Content-Type':types['.html']});return res.end('<!doctype html><title>web stub</title><h1>web stub</h1>');}
      if(pathname==='/app'){res.writeHead(301,{Location:'/app/'});return res.end();}
      if(!pathname.startsWith('/app/'))throw 0;
      let file=path.resolve(root,'.'+pathname.slice(4));
      if(file!==root&&!file.startsWith(root+path.sep))throw 0;
      if((await stat(file)).isDirectory())file=path.join(file,'index.html');
      res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
    }catch{res.writeHead(404);res.end('Not found');}
  });server.listen(port,'127.0.0.1',()=>resolve(server));});
}

const STILL='*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}';
// Every element under <body> with a non-empty box: document-relative box and geometry-defining computed styles.
const measure=()=>{
  const props=['fontSize','fontWeight','lineHeight','letterSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','outlineWidth','opacity','display','visibility'];
  const alpha=c=>{const m=c.match(/[\d.]+/g);return !m?0:m.length>=4?Number(m[3]):1;};
  const list=[];const all=document.body.querySelectorAll('*');let i=0;
  for(const el of all){
    i++;const r=el.getBoundingClientRect();if(!r.width&&!r.height)continue;
    const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')continue;
    const path=[];let n=el;while(n&&n!==document.body){const p=n.parentElement;path.unshift(n.tagName.toLowerCase()+':'+Array.prototype.indexOf.call(p.children,n));n=p;}
    const sides=['Top','Right','Bottom','Left'].map(side=>parseFloat(s[`border${side}Width`])>0&&s[`border${side}Style`]!=='none'&&alpha(s[`border${side}Color`])>0);
    list.push({key:path.join('>'),cls:typeof el.className==='string'?el.className:(el.className?.baseVal||''),tag:el.tagName.toLowerCase(),box:[r.left+scrollX,r.top+scrollY,r.width,r.height].map(v=>Math.round(v*10)/10),style:Object.fromEntries(props.map(p=>[p,s[p]])),visibleBorders:sides,bgAlpha:alpha(s.backgroundColor)});
  }
  return {count:all.length,list,docHeight:document.documentElement.scrollHeight,docWidth:document.documentElement.scrollWidth};
};

async function snapshotDemoState(browser,origin){
  const ctx=await browser.newContext({serviceWorkers:'block'});const page=await ctx.newPage();
  await page.goto(origin+'/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  await page.waitForFunction(()=>localStorage.getItem('tbyb-teto-demo-v1'));
  const state=await page.evaluate(()=>localStorage.getItem('tbyb-teto-demo-v1'));await ctx.close();return state;
}

const pick=(page,label)=>page.locator('#reflection-form').getByText(label,{exact:true}).click();
const nextStep=page=>page.locator('#reflection-form').getByRole('button',{name:'다음',exact:true}).click();
// Screens are visited in order inside one context so that the writing flow accumulates identically.
const SCREENS=[
  {name:'01_WELCOME',seed:false,go:'/app/'},
  {name:'02_HOME',go:'/app/#home'},
  {name:'03_COMPARE',go:'/app/#compare'},
  {name:'04_COMPARE_STEP1_ANSWERS',act:async p=>{for(const l of ['영상 · 웹 서핑','두 대 다 써봤어요','같은 걸 해봤어요'])await pick(p,l);}},
  {name:'05_COMPARE_STEP2',act:async p=>{await nextStep(p);for(const l of ['차이를 못 느꼈어요','화면을 볼 때'])await pick(p,l);}},
  {name:'06_COMPARE_STEP3',act:async p=>{await nextStep(p);await pick(p,'둘 다 하던 일에 충분했어요');}},
  {name:'07_COMPARE_SAVED',act:async p=>{await p.getByRole('button',{name:'경험 저장하기'}).click();await p.evaluate(()=>document.querySelector('#toast')?.classList.remove('visible'));}},
  {name:'08_COMPARE_ADVANCED',act:async p=>{await p.locator('.advanced-record>summary').click();}},
  {name:'09_DECISION',go:'/app/#decision'},
  {name:'10_DECISION_SELECTED',act:async p=>{await p.locator('[name="choice"]').first().check();}},
  {name:'11_RETURN',go:'/app/#return'},
  {name:'12_MENU_SHEET',go:'/app/#home',act:async p=>{await p.getByRole('button',{name:'앱 더 보기'}).click();await p.locator('dialog[open]').waitFor();},viewportOnly:true},
  {name:'13_THEME_SELECT_FOCUS',go:'/app/#home',act:async p=>{await p.getByRole('combobox',{name:'화면 테마'}).focus();},viewportOnly:true},
  {name:'14_STUDIO',go:'/app/studio/'},
];

async function runSide(browser,origin,{theme,width,state},label){
  const results={};
  const ctx=await browser.newContext({serviceWorkers:'block',colorScheme:theme,viewport:{width,height:844},deviceScaleFactor:2});
  await ctx.addInitScript(([theme,state])=>{
    try{localStorage.setItem('tbyb-miku-theme',theme);
      if(state&&!sessionStorage.getItem('seeded')){localStorage.setItem('tbyb-teto-demo-v1',state);sessionStorage.setItem('seeded','1');}}catch{}
  },[theme,state]);
  // A separate context for the empty (unseeded) welcome screen.
  const emptyCtx=await browser.newContext({serviceWorkers:'block',colorScheme:theme,viewport:{width,height:844},deviceScaleFactor:2});
  await emptyCtx.addInitScript(theme=>{try{localStorage.setItem('tbyb-miku-theme',theme);}catch{}},theme);
  const page=await ctx.newPage(),emptyPage=await emptyCtx.newPage();
  for(const screen of SCREENS){
    const p=screen.seed===false?emptyPage:page;
    if(screen.go){await p.goto(origin+screen.go,{waitUntil:'load'});}
    await p.addStyleTag({content:STILL});
    await p.evaluate(()=>document.fonts.ready);
    if(screen.act)await screen.act(p);
    await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(150);
    await p.evaluate(()=>{const t=document.querySelector('#toast');if(t)t.classList.remove('visible');});
    const file=`${out}/shots/${label}_${screen.name}_${theme}_${width}.png`;
    if(shots)await p.screenshot({path:file,fullPage:!screen.viewportOnly});
    results[screen.name]={file,...await p.evaluate(measure)};
  }
  await ctx.close();await emptyCtx.close();return results;
}

function compare(a,b){
  const mismatches=[],byKey=new Map(b.list.map(e=>[e.key,e]));let compared=0;
  if(a.list.length!==b.list.length)mismatches.push({kind:'count',orig:a.list.length,next:b.list.length});
  for(const e of a.list){
    const f=byKey.get(e.key);if(!f){mismatches.push({kind:'missing',key:e.key,cls:e.cls});continue;}
    compared++;
    const d=e.box.map((v,i)=>Math.abs(v-f.box[i]));const styleDiff=Object.keys(e.style).filter(k=>e.style[k]!==f.style[k]);
    const lostBorders=e.visibleBorders.map((v,i)=>v&&!f.visibleBorders[i]).some(Boolean);
    const lostCard=e.bgAlpha>0&&f.bgAlpha===0;
    if(d.some(v=>v>1)||styleDiff.length||lostBorders||lostCard){
      mismatches.push({kind:'element',key:e.key,tag:e.tag,cls:e.cls,orig:e.box,next:f.box,styleDiff:styleDiff.map(k=>`${k}: ${e.style[k]} -> ${f.style[k]}`),lostBorders,lostCard});
    }
  }
  return {compared,mismatches};
}

async function sideBySide(browser,orig,next,file,title){
  const page=await browser.newPage({viewport:{width:900,height:600},deviceScaleFactor:1});
  const [a,b]=await Promise.all([readFile(orig),readFile(next)]);
  await page.setContent(`<!doctype html><style>body{margin:0;font:14px -apple-system,sans-serif;background:#8a8278;color:#fff}h1{font-size:15px;margin:10px 14px}div{display:flex;gap:14px;padding:0 14px 14px;align-items:flex-start}figure{margin:0}figcaption{margin:4px 0}img{width:390px;display:block;border:1px solid #0003}</style><h1>${title}</h1><div><figure><figcaption>ORIGINAL (TETO, main 5655031)</figcaption><img src="data:image/png;base64,${a.toString('base64')}"></figure><figure><figcaption>NEW (MIKU colours, app-miku-color)</figcaption><img src="data:image/png;base64,${b.toString('base64')}"></figure></div>`);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:file,fullPage:true});await page.close();
}

await mkdir(`${out}/shots`,{recursive:true});await mkdir(`${out}/side-by-side`,{recursive:true});
const [s1,s2]=await Promise.all([serve(baseRoot,4421),serve(newRoot,4422)]);
const browser=await chromium.launch({headless:true});
const report={generated:new Date().toISOString(),baseRoot,newRoot,runs:[]};let failures=0,totalCompared=0,totalMismatch=0;
try{
  const state=await snapshotDemoState(browser,'http://127.0.0.1:4421');
  for(const theme of themes)for(const width of widths){
    const orig=await runSide(browser,'http://127.0.0.1:4421',{theme,width,state},'orig');
    const next=await runSide(browser,'http://127.0.0.1:4422',{theme,width,state},'new');
    for(const screen of SCREENS){
      const r=compare(orig[screen.name],next[screen.name]);
      const unexpected=r.mismatches.filter(m=>!(m.kind==='element'&&EXPECTED_FIXES.some(sel=>m.cls&&m.cls.split(' ').some(c=>sel.includes('.'+c)))));
      totalCompared+=r.compared;totalMismatch+=r.mismatches.length;failures+=unexpected.length;
      const sbs=`${out}/side-by-side/${screen.name}_${theme}_${width}.png`;
      if(shots)await sideBySide(browser,orig[screen.name].file,next[screen.name].file,sbs,`${screen.name} · ${theme} · ${width}px`);
      report.runs.push({screen:screen.name,theme,width,elements:orig[screen.name].list.length,compared:r.compared,docHeight:[orig[screen.name].docHeight,next[screen.name].docHeight],mismatches:r.mismatches,unexpected:unexpected.length,sideBySide:shots?sbs:null});
      console.log(`${screen.name.padEnd(26)} ${theme.padEnd(5)} ${width}px  compared ${String(r.compared).padStart(4)}  mismatches ${r.mismatches.length}${unexpected.length?`  UNEXPECTED ${unexpected.length}`:''}`);
    }
  }
  report.summary={totalCompared,totalMismatch,unexpected:failures};
  await writeFile(`${out}/LAYOUT_COMPARE.json`,JSON.stringify(report,null,1));
  console.log(`\nTotal elements compared: ${totalCompared}; mismatches: ${totalMismatch}; unexpected: ${failures}`);
  if(failures)process.exitCode=1;
}finally{await browser.close();s1.close();s2.close();}
