import {test,expect} from '@playwright/test';
const key='tbyb-teto-demo-v1';
async function sample(page){await page.goto('/app/');await page.getByRole('button',{name:'체험 중인 화면 둘러보기'}).click();await page.goto('/app/#compare');}
async function pick(page,label){await page.locator('#reflection-form').getByText(label,{exact:true}).click();}
async function next(page){await page.locator('#reflection-form').getByRole('button',{name:'다음',exact:true}).click();}
async function saveEveryday(page,{single=false}={}){
  if(await page.getByRole('button',{name:'다른 순간도 남기기'}).isVisible())await page.getByRole('button',{name:'다른 순간도 남기기'}).click();
  await pick(page,'영상 · 웹 서핑');await pick(page,single?'Air만 써봤어요':'두 대 다 써봤어요');
  if(!single)await pick(page,'같은 걸 해봤어요');await next(page);
  await pick(page,single?'조금 어려웠어요':'차이를 못 느꼈어요');await pick(page,'화면을 볼 때');await next(page);
  await pick(page,single?'사용하기 어려웠어요':'둘 다 하던 일에 충분했어요');await page.getByRole('button',{name:'경험 저장하기'}).click();
}
async function op(page,action,checks=[]){await page.goto('/studio/');const form=page.locator(`[data-transition="${action}"]`);for(const name of checks)await form.locator(`[name="${name}"]`).check();await form.locator('[name="reason"]').fill('운영 브라우저 시연');await form.getByRole('button').click();}
async function finish(page){await page.goto('/app/#decision');await page.locator('[name="choice"][value="return"]').check();await page.locator('[name="reason"]').fill('일단 사용만 해봤어요');await page.getByRole('button',{name:'선택과 이유 저장'}).click();await page.goto('/app/#return');await page.getByRole('button',{name:'데모 반납 요청'}).click();await op(page,'receive',['air','pro']);await op(page,'inspect',['air','pro']);}

test('a date-only request opens a compact status screen without a purpose or confidence questionnaire',async({page})=>{
  await page.goto('/#request');await expect(page.locator('#request-form input')).toHaveCount(2);await expect(page.locator('#request-form textarea,#request-form select')).toHaveCount(0);
  await page.getByRole('button',{name:'데모 요청 저장하기'}).click();await expect(page.locator('.trial-pass .badge')).toHaveText('요청 접수 · 미확정');
  await page.goto('/app/#compare');await expect(page.getByRole('heading',{name:'써본 다음에 만나요.'})).toBeVisible();await expect(page.locator('#reflection-form')).toHaveCount(0);
});
test('optional no-difference reflection survives reload, accumulates history, and rejects a repeated submission',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await sample(page);
  await pick(page,'영상 · 웹 서핑');await pick(page,'두 대 다 써봤어요');await pick(page,'같은 걸 해봤어요');await next(page);await page.reload();
  await expect(page.locator('.wizard-meta')).toContainText('2 / 3');await pick(page,'차이를 못 느꼈어요');await pick(page,'화면을 볼 때');await next(page);await pick(page,'둘 다 하던 일에 충분했어요');await page.getByRole('button',{name:'경험 저장하기'}).click();
  await expect(page.locator('.reflection-entry')).toHaveCount(1);await page.reload();await expect(page.locator('.reflection-entry')).toContainText('차이를 못 느꼈어요');
  await saveEveryday(page);await expect(page.locator('#reflection-form .error')).toContainText('이미 저장');await expect(page.locator('.reflection-entry')).toHaveCount(1);expect(errors).toEqual([]);
});
test('negative single-device answers can enter review; no payout is invented and duplicate claim is blocked after reload',async({page})=>{
  await sample(page);await saveEveryday(page,{single:true});await expect(page.locator('.reflection-entry')).toContainText('조금 어려웠어요');await expect(page.locator('.reward-wait')).toContainText('반납 확인 후');
  await finish(page);await page.goto('/app/#compare');await page.getByRole('button',{name:'리워드 검토 신청 · 데모'}).click();await page.reload();await expect(page.locator('.claim-status')).toContainText('검토 대기 · 데모');await expect(page.getByRole('button',{name:'리워드 검토 신청 · 데모'})).toHaveCount(0);
  await page.goto('/studio/');await expect(page.locator('.reward-review')).toContainText('한 대만 사용한 사정');await page.locator('#reward-review-form [name="result"]').selectOption('needs_context');await page.locator('#reward-review-form [name="reason"]').fill('Pro를 사용하기 어려웠던 사정을 확인할게요');await page.getByRole('button',{name:'검토 저장'}).click();await page.goto('/app/#compare');await expect(page.locator('.claim-status')).toContainText('Pro를 사용하기 어려웠던');
  await page.goto('/studio/');await page.locator('#reward-review-form [name="result"]').selectOption('reviewed');await page.locator('#reward-review-form [name="reason"]').fill('처음 쓰는 맥의 설정 문제를 확인');await page.getByRole('button',{name:'검토 저장'}).click();await page.goto('/app/#compare');await expect(page.locator('.claim-status')).toContainText('검토 완료 · 지급 없음');
  const s=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);expect(s.rewardClaim.amount).toBeNull();expect(s.rewardClaim.reviews).toHaveLength(2);
});
test('saved draft and records are not reported as saved when storage fails',async({page})=>{
  await sample(page);await pick(page,'영상 · 웹 서핑');await pick(page,'두 대 다 써봤어요');await pick(page,'같은 걸 해봤어요');await next(page);await pick(page,'차이를 못 느꼈어요');await pick(page,'화면을 볼 때');await next(page);await pick(page,'둘 다 하던 일에 충분했어요');
  const before=await page.evaluate(k=>localStorage.getItem(k),key);
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Quota exceeded','QuotaExceededError');};});
  await page.getByRole('button',{name:'경험 저장하기'}).click();await expect(page.locator('#reflection-form .error')).toContainText('저장하지 못했어요');await expect(page.locator('.wizard-meta')).toContainText('3 / 3');await expect(page.locator('.reflection-entry')).toHaveCount(0);expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);await page.reload();await expect(page.locator('.wizard-meta')).toContainText('3 / 3');await page.getByRole('button',{name:'경험 저장하기'}).click();await expect(page.locator('.reflection-entry')).toHaveCount(1);
});
test('skipping all reflections still allows choosing and returning',async({page})=>{await sample(page);await finish(page);await expect(page.locator('.studio-stats')).toContainText('체험 완료');expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).reflections||[],key)).toEqual([]);});
test('all tabs fit 320, 390 and 768px with reachable navigation; primary home action stays above the fold',async({page})=>{
  await sample(page);
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});for(const tab of ['home','compare','decision','return']){await page.goto(`/app/#${tab}`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${tab} @ ${width}`).toBe(true);await expect(page.getByRole('navigation',{name:'모바일 앱 메뉴'})).toBeVisible();if(tab==='home')expect((await page.locator('.today-card>.button').boundingBox()).y+(await page.locator('.today-card>.button').boundingBox()).height).toBeLessThan(750);}}
});
