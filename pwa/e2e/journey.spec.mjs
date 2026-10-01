import {test,expect} from '@playwright/test';
async function doAction(page,action,checks=[]){const form=page.locator(`form[data-transition="${action}"]`);for(const key of checks)await form.locator(`[name="${key}"]`).check();await form.locator('[name="reason"]').fill('브라우저 리허설 확인');await form.getByRole('button').click();}
test('complete requested → verified → compared → one sold → other returned journey',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.getByRole('heading',{name:'써 보고, 나의 기준으로.'})).toBeVisible();
  await expect(page.locator('[name="task"]')).toHaveCount(0);await expect(page.locator('[name="point"]')).toHaveCount(0);await page.getByRole('button',{name:'데모 요청 저장하기'}).click();
  await expect(page.locator('.trial-pass .badge')).toHaveText('요청 접수 · 미확정');
  await page.goto('/studio/');await doAction(page,'review');await doAction(page,'secure',['terms','buffer']);
  await expect(page.locator('.studio-stats')).toContainText('결제 대기 · 미확정');
  await doAction(page,'confirm',['approved','amount']);await expect(page.locator('[data-transition="confirm"] .error')).toContainText('대조');
  await doAction(page,'confirm',['reservation']);await doAction(page,'pickup',['handoff']);
  await page.goto('/app/#compare');await page.locator('.advanced-record > summary').click();await page.locator('[name="air-minutes"]').fill('6.2');await page.locator('[name="pro-minutes"]').fill('4.1');await page.locator('[name="air-portability"]').selectOption('5');await page.locator('[name="pro-portability"]').selectOption('3');await page.locator('[name="air-note"]').fill('매일 들고 다니기 편함');await page.locator('[name="pro-note"]').fill('작업은 빨랐지만 무게가 느껴짐');await page.getByRole('button',{name:'비교 기록 저장'}).click();
  await page.reload();await page.locator('.advanced-record > summary').click();await expect(page.locator('[name="air-minutes"]')).toHaveValue('6.2');
  await page.goto('/app/#decision');await expect(page.locator('.summary-table')).toContainText('6.2분');await page.locator('[name="choice"][value="used"]').check();await page.locator('[name="device"]').selectOption('air');await page.locator('[name="reason"]').fill('휴대성이 더 중요해요.');await page.getByRole('button',{name:'선택과 이유 저장'}).click();
  await page.goto('/app/#return');await expect(page.locator('.return-status h2')).toHaveText('Air + Pro 14″');
  await page.goto('/studio/');await doAction(page,'sale',['dealer','settled']);
  await page.goto('/app/#return');await expect(page.locator('.return-status h2')).toHaveText('Pro 14″');await page.getByRole('button',{name:'데모 반납 요청'}).click();
  await page.goto('/studio/');await doAction(page,'receive',['pro']);await expect(page.locator('.device-list')).toContainText('회수됨 · 검수 대기');await doAction(page,'inspect',['pro']);await expect(page.locator('.studio-stats')).toContainText('체험 완료 · 데모');await expect(page.locator('.device-list')).toContainText('판매 확인됨');await expect(page.locator('.device-list')).toContainText('검수 통과 · 재대여 가능');expect(errors).toEqual([]);
});
test('small screens have no horizontal overflow on every route',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.screenshot({path:'artifacts/WEB_MOBILE.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();
  for(const route of ['home','compare','decision','return']){await page.goto('/app/#'+route);await expect(page.locator('.bottom-nav')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/APP_${route.toUpperCase()}.png`,fullPage:true});}
  await page.goto('/studio/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('desktop layouts and local data export',async({page})=>{await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.screenshot({path:'artifacts/WEB_DESKTOP.png',fullPage:true});await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();await page.screenshot({path:'artifacts/APP_DESKTOP.png',fullPage:true});await page.goto('/studio/');await page.screenshot({path:'artifacts/STUDIO_DESKTOP.png',fullPage:true});const download=page.waitForEvent('download');await page.getByRole('button',{name:'기록 내보내기'}).click();expect((await download).suggestedFilename()).toBe('TBYB_DEMO_RECORDS.json');});
test('corrupt storage is not silently replaced',async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.setItem('tbyb-teto-demo-v1','{bad'));await page.reload();await expect(page.locator('.persistent')).toContainText('저장 데이터를 읽지 못했어요');await page.getByRole('button',{name:'데모 요청 저장하기'}).click();await expect(page.locator('#form-error')).toContainText('저장 오류');expect(await page.evaluate(()=>localStorage.getItem('tbyb-teto-demo-v1'))).toBe('{bad');});
test('cached app and records survive an offline reload',async({page,context})=>{await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);await context.setOffline(true);await page.reload();await expect(page.locator('.trial-pass .badge')).toHaveText('체험 중 · 데모');await page.goto('/app/#compare');await expect(page.getByRole('group',{name:'어떤 시간을 보냈나요?'})).toBeVisible();await context.setOffline(false);});
