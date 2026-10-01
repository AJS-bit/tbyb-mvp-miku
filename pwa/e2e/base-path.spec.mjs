import {test,expect} from '@playwright/test';
// GitHub Pages layout: website (web/ export) at /tbyb-mvp-miku/, this PWA at /tbyb-mvp-miku/app/.
// Served by scripts/serve-pages.mjs; the website is a stand-in page.
const origin='http://127.0.0.1:4318',site=origin+'/tbyb-mvp-miku/',app=site+'app/',studio=app+'studio/';
const dataKey='tbyb-teto-demo-v1',webKey='tbyb-miku-demo-v2',themeKey='tbyb-miku-theme',legacyThemeKey='tbyb-teto-theme';
const theme=(page,value)=>expect(page.locator('html')).toHaveAttribute('data-theme',value);
const picker=page=>page.getByRole('combobox',{name:'화면 테마'});
const webState=start=>JSON.stringify({version:2,reservations:[{id:'TB-0001',createdAt:'2026-10-01T00:00:00.000Z',status:'requested',request:{startDate:start,pickupStore:'demo',usage:'unsure',question:'',leaningBefore:'unsure',confidenceBefore:3},ops:{},missions:{},reward:{status:'none',flags:[]},history:[]}],devices:[],dealerTermsConfirmed:false,calendarUpdatedAt:'2026-10-01T00:00:00.000Z'});
function watch(page){const bad=[];page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`);});page.on('requestfailed',r=>bad.push(`failed ${r.url()}`));page.on('pageerror',e=>bad.push(`error ${e.message}`));
  page.on('request',r=>{const url=new URL(r.url());if(url.origin===origin&&!url.pathname.startsWith('/tbyb-mvp-miku/'))bad.push(`outside base ${r.url()}`);});return bad;}

test('app and studio load under /tbyb-mvp-miku/app/ with no 404s; the service worker is scoped to the app',async({page})=>{
  const bad=watch(page);
  await page.goto(app);await expect(page.getByRole('button',{name:'체험 중인 화면 둘러보기'})).toBeVisible();
  const scope=await page.evaluate(async()=>(await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(app);
  // every asset the shell references resolves under the base
  const manifest=await page.evaluate(async()=>{const href=document.querySelector('link[rel=manifest]').href;const m=await (await fetch(href)).json();return {href,m};});
  for(const key of ['start_url','scope','id'])expect(new URL(manifest.m[key],manifest.href).href,key).toBe(app);
  for(const icon of manifest.m.icons)expect((await page.request.get(new URL(icon.src,manifest.href).href)).status(),icon.src).toBe(200);
  const imgs=await page.evaluate(()=>[...document.images].map(img=>[img.src,img.complete&&img.naturalWidth>0]));
  for(const [src] of imgs)expect(src.startsWith(app),src).toBe(true);
  await expect(page.locator('.desktop-note a').first()).toHaveAttribute('href',site);
  await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  await page.goto(app+'#home');await expect(page.locator('.today-card')).toBeVisible();
  await expect(page.locator('.journey-details>a')).toHaveAttribute('href',studio);
  await page.goto(studio);await expect(page.locator('.studio-stats')).toContainText('체험 중');
  await expect(page.locator('.studio-toolbar a').first()).toHaveAttribute('href',app);
  await page.goto(app.slice(0,-1));expect(page.url()).toBe(app);
  expect(bad).toEqual([]);
});

test('service worker leaves the website alone and caches only the app directory',async({page,context})=>{
  await page.goto(app);await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  const caches=await page.evaluate(async()=>{const out={};for(const name of await caches.keys())out[name]=(await (await caches.open(name)).keys()).map(r=>r.url);return out;});
  const names=Object.keys(caches);expect(names.length).toBeGreaterThan(0);
  for(const name of names){expect(name.startsWith('tbyb-pwa:/tbyb-mvp-miku/app/:'),name).toBe(true);for(const url of caches[name])expect(url.startsWith(app),url).toBe(true);}
  const web=await context.newPage();await web.goto(site);await expect(web.getByRole('heading',{name:'web stub'})).toBeVisible();
  expect(await web.evaluate(()=>navigator.serviceWorker.controller)).toBeNull();
  expect(await web.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope))).toEqual([app]);
  await context.setOffline(true);
  expect(await web.reload().then(()=>'loaded',()=>'offline')).toBe('offline');
  await context.setOffline(false);await web.close();
});

test('offline reload of the app and the studio works after the first visit',async({page,context})=>{
  await page.goto(app);await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);
  await page.reload();await expect(page.locator('.trial-pass .badge')).toHaveText('체험 중 · 데모');
  await page.goto(app+'#compare');await expect(page.getByRole('group',{name:'어떤 시간을 보냈나요?'})).toBeVisible();
  await page.goto(studio);await expect(page.locator('.studio-stats')).toContainText('체험 중');
  await expect(page.locator('.brand-mark img').first()).toHaveJSProperty('complete',true);
  await context.setOffline(false);
});

test('existing app data and the website request are never rewritten; a pending web request pre-fills the date',async({page})=>{
  const web=webState('2099-01-05');
  await page.goto(site);await page.evaluate(([key,value])=>localStorage.setItem(key,value),[webKey,web]);
  await page.goto(app);
  await expect(page.locator('.v2-request')).toHaveAttribute('open','');
  await expect(page.locator('.bridge-note')).toContainText('1월 5일');
  await expect(page.locator('#request-form [name="start"]')).toHaveValue('2099-01-05');
  await expect(page.locator('#request-form [name="end"]')).toHaveValue('2099-01-08');
  expect(await page.evaluate(key=>localStorage.getItem(key),webKey)).toBe(web);
  await page.getByRole('button',{name:'데모 요청 저장하기'}).click();
  await expect(page.locator('.trial-pass .badge')).toBeVisible();
  const saved=await page.evaluate(key=>localStorage.getItem(key),dataKey);
  expect(JSON.parse(saved).request.start).toBe('2099-01-05');
  expect(await page.evaluate(key=>localStorage.getItem(key),webKey)).toBe(web);
  // reloads, theme changes and the studio leave both stores byte-for-byte unchanged
  await page.reload();await picker(page).selectOption('dark');await page.goto(studio);await picker(page).selectOption('light');await page.goto(app+'#compare');
  expect(await page.evaluate(([a,b])=>[localStorage.getItem(a),localStorage.getItem(b)],[dataKey,webKey])).toEqual([saved,web]);
  // finished or past web requests do not pre-fill
  await page.evaluate(([key])=>localStorage.removeItem(key),[dataKey]);
  await page.evaluate(([key,value])=>localStorage.setItem(key,value),[webKey,webState('2001-01-01')]);
  await page.goto(app);await expect(page.locator('.v2-request')).not.toHaveAttribute('open','');await expect(page.locator('.bridge-note')).toHaveCount(0);
});

test('theme: shared key wins, the old PWA key is copied once, failed copies retry, and the website sees the choice',async({page,context})=>{
  await page.emulateMedia({colorScheme:'light'});
  await page.goto(site);
  await page.evaluate(([shared,legacy])=>{localStorage.setItem(shared,'light');localStorage.setItem(legacy,'dark');},[themeKey,legacyThemeKey]);
  await page.goto(app);await theme(page,'light');await expect(picker(page)).toHaveValue('light');
  expect(await page.evaluate(([a,b])=>[localStorage.getItem(a),localStorage.getItem(b)],[themeKey,legacyThemeKey])).toEqual(['light','dark']);
  // only the old key: copy it
  await page.evaluate(key=>localStorage.removeItem(key),themeKey);await page.reload();await theme(page,'dark');
  expect(await page.evaluate(key=>localStorage.getItem(key),themeKey)).toBe('dark');
  // the website (same origin) reads the same key
  await page.goto(site);await expect(page.locator('#theme')).toHaveText('dark');
  // copy fails: theme still applies, nothing marked done, next load retries
  await page.evaluate(key=>localStorage.removeItem(key),themeKey);
  const failing=await context.newPage();
  await failing.addInitScript(key=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('full','QuotaExceededError');return write.call(this,k,v);};},themeKey);
  await failing.goto(app);await theme(failing,'dark');
  expect(await failing.evaluate(key=>localStorage.getItem(key),themeKey)).toBeNull();
  await failing.close();
  await page.goto(app);await theme(page,'dark');
  expect(await page.evaluate(([a,b])=>[localStorage.getItem(a),localStorage.getItem(b)],[themeKey,legacyThemeKey])).toEqual(['dark','dark']);
  // choices are written to the shared key only
  await picker(page).selectOption('light');
  expect(await page.evaluate(([a,b])=>[localStorage.getItem(a),localStorage.getItem(b)],[themeKey,legacyThemeKey])).toEqual(['light','dark']);
});
