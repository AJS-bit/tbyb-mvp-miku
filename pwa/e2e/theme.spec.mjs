import {test,expect} from '@playwright/test';
const themeKey='tbyb-teto-theme', dataKey='tbyb-teto-demo-v1';
const picker=page=>page.getByRole('combobox',{name:'화면 테마'});
const theme=(page,value)=>expect(page.locator('html')).toHaveAttribute('data-theme',value);

test('system changes apply live; manual choice persists across routes and reload',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});await page.goto('/');
  await theme(page,'dark');await expect(picker(page)).toHaveValue('system');
  await page.emulateMedia({colorScheme:'light'});await theme(page,'light');
  await picker(page).selectOption('dark');await page.emulateMedia({colorScheme:'light'});await theme(page,'dark');
  for(const path of ['/app/','/studio/','/']){await page.goto(path);await theme(page,'dark');await expect(picker(page)).toHaveValue('dark');}
  await page.reload();await theme(page,'dark');
  await picker(page).selectOption('system');await theme(page,'light');
  await page.emulateMedia({colorScheme:'dark'});await theme(page,'dark');
  await picker(page).selectOption('light');await theme(page,'light');await page.reload();await theme(page,'light');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#fbfbf7');
});

test('stored theme is applied in the head before app rendering',async({page,context})=>{
  await context.addInitScript(key=>localStorage.setItem(key,'dark'),themeKey);
  await page.emulateMedia({colorScheme:'light'});
  await page.route('**/ui.mjs',route=>route.abort());
  for(const path of ['/','/app/','/studio/']){
    await page.goto(path);await theme(page,'dark');
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
    expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(17, 28, 23)');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#111c17');
    await expect(page.locator('#root')).toBeEmpty();
  }
});

test('theme changes sync between tabs without replacing unfinished input or demo data',async({page,context})=>{
  await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  await page.goto('/app/#decision');await page.locator('[name="reason"]').fill('아직 작성 중인 내 선택');
  const before=await page.evaluate(key=>localStorage.getItem(key),dataKey);
  await picker(page).selectOption('dark');await expect(page.locator('[name="reason"]')).toHaveValue('아직 작성 중인 내 선택');
  const second=await context.newPage();await second.goto('/studio/');await expect(picker(second)).toHaveValue('dark');
  await picker(second).selectOption('light');await theme(page,'light');await expect(picker(page)).toHaveValue('light');
  await expect(page.locator('[name="reason"]')).toHaveValue('아직 작성 중인 내 선택');
  expect(await page.evaluate(key=>localStorage.getItem(key),dataKey)).toBe(before);
  await second.close();
});

test('unavailable theme storage falls back safely and failed writes explain the limit',async({page,context})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(key=>{
    const read=Storage.prototype.getItem,write=Storage.prototype.setItem;
    Storage.prototype.getItem=function(k){if(k===key)throw new DOMException('blocked','SecurityError');return read.call(this,k);};
    Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('full','QuotaExceededError');return write.call(this,k,v);};
  },themeKey);
  await page.emulateMedia({colorScheme:'light'});await page.goto('/app/');await theme(page,'light');
  await picker(page).selectOption('dark');await theme(page,'dark');
  await expect(page.getByRole('status')).toContainText('이 화면에만 적용했어요');
  await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();await expect(picker(page)).toHaveValue('dark');
  await page.reload();await theme(page,'light');await expect(page.locator('.trial-pass .badge')).toContainText('체험 중');
  expect(errors).toEqual([]);
});

test('theme assets and choice work offline; invalid saved preferences use the system',async({page,context})=>{
  await page.emulateMedia({colorScheme:'dark'});await page.goto('/app/');
  await page.evaluate(key=>localStorage.setItem(key,'invalid'),themeKey);await page.reload();await theme(page,'dark');await expect(picker(page)).toHaveValue('system');
  await picker(page).selectOption('dark');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);await page.reload();
  await theme(page,'dark');await expect(picker(page)).toHaveValue('dark');await picker(page).selectOption('light');await page.reload();await theme(page,'light');
  await context.setOffline(false);
});

test('theme control stays reachable and layouts fit small phones through desktop',async({page})=>{
  await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    for(const path of ['/','/app/#home','/app/#compare','/app/#decision','/app/#return','/studio/']){
      await page.goto(path);await expect(picker(page)).toBeVisible();
      const box=await picker(page).boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${path} at ${width}px`).toBe(true);
    }
  }
});
