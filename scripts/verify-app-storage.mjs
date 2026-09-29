// 앱(Expo 웹 빌드) 저장 실패 처리 검증 — TETO 교차검토(2026-09-29) 재현 사례 포함.
// 저장(setItem)이 실패하면: 성공 표시 없음 · 상태 변경 없음 · 입력값 유지 · 다시 누르면 저장.
//
// 사용 (저장소 루트에서):
//   (cd app && EXPO_BASE_URL=/tbyb-mvp-miku/app npx expo export --platform web --output-dir dist)
//   node --experimental-strip-types scripts/verify-app-storage.mjs            # 로컬 dist 를 /tbyb-mvp-miku/app/ 로 서빙
//   node --experimental-strip-types scripts/verify-app-storage.mjs <공개 URL>   # 예: https://ajs-bit.github.io/tbyb-mvp-miku/app/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '../web/node_modules/@playwright/test/index.mjs';
import * as D from '../shared/domain.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PREFIX = '/tbyb-mvp-miku/app';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

async function serveDist() {
  const dist = resolve(ROOT, 'app/dist');
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith(PREFIX)) return res.writeHead(404).end();
    let p = join(dist, decodeURIComponent(url.pathname.slice(PREFIX.length)));
    const candidates = [p, join(p, 'index.html'), `${p}.html`, join(dist, 'index.html')];
    for (const c of candidates) {
      try {
        if ((await stat(c)).isFile()) {
          res.writeHead(200, { 'content-type': TYPES[extname(c)] ?? 'application/octet-stream' });
          return res.end(await readFile(c));
        }
      } catch {}
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}${PREFIX}/` };
}

const ok = (r) => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

function trialState() {
  const now = new Date();
  let s = D.createInitialState(now);
  s = ok(D.createReservation(s, {
    startDate: D.calendarDays(s, now).find((d) => d.status === 'open').date,
    pickupStore: D.PICKUP_STORES[0], workType: 'video', wantToCompare: '저장 실패 검증',
    leaningBefore: 'air', confidenceBefore: 2,
  }, now));
  s = ok(D.transition(s, 'TB-0001', 'operator_check', 'operator', '확인', now));
  s = ok(D.assignDevice(s, 'TB-0001', 'air', 'AIR-01', now));
  s = ok(D.assignDevice(s, 'TB-0001', 'pro', 'PRO-01', now));
  s = ok(D.transition(s, 'TB-0001', 'payment_pending', 'operator', '확보', now));
  s = ok(D.setPaymentCheck(s, 'TB-0001', 'DEMO-VERIFY-1', true, now));
  s = ok(D.transition(s, 'TB-0001', 'confirmed', 'operator', '대조', now));
  s = ok(D.setCheckout(s, 'TB-0001', 'air', true));
  s = ok(D.setCheckout(s, 'TB-0001', 'pro', true));
  s = ok(D.transition(s, 'TB-0001', 'in_trial', 'operator', '출고', now));
  return s;
}

const failWrites = (page) =>
  page.evaluate(() => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException('verify quota', 'QuotaExceededError');
    };
  });
const restoreWrites = (page) => page.evaluate(() => (Storage.prototype.setItem = window.__setItem));
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), D.STORAGE_KEY);

async function newPage(browser, seed) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  if (seed) {
    await page.addInitScript(({ key, state }) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, JSON.stringify(state));
        sessionStorage.setItem('seeded', '1');
      }
    }, { key: D.STORAGE_KEY, state: seed });
  }
  return page;
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${String(e.message ?? e).split('\n')[0]}`);
  }
}

const target = process.argv[2];
const local = target ? null : await serveDist();
const base = target ?? local.base;
const browser = await chromium.launch();

await check('결정 저장 실패 → 저장됨 표시 없음·입력 유지·재시도 성공·새로고침 복원', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}decide/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('radio', { name: /^두 대 모두 반납\./ }).click();
  await page.getByRole('radio', { name: /체험 후.* 4점$/ }).click();
  const reason = page.getByLabel('결정 이유, 필수');
  await reason.fill('저장 실패 검증 — 두 대 모두 반납');
  await failWrites(page);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(page.getByText(D.STORAGE_WRITE_ERROR).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '결정 저장', exact: true })).toBeEnabled();
  await expect(page.getByText('결정이 저장됐습니다')).toHaveCount(0);
  await expect(reason).toHaveValue('저장 실패 검증 — 두 대 모두 반납');
  if ((await stored(page)).reservations[0].decision) throw new Error('실패했는데 결정이 저장됨');
  await restoreWrites(page);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('결정 이유, 필수')).toHaveValue('저장 실패 검증 — 두 대 모두 반납');
  await page.context().close();
});

await check('비교 기록 저장 실패 → 기록 추가 없음·입력 유지·재시도 성공', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}log/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const task = page.getByLabel('두 기기에서 해 본 작업');
  await task.fill('4K 내보내기');
  await page.getByLabel('Air 소요 시간(분)').fill('12');
  await page.getByLabel('Pro 소요 시간(분)').fill('7');
  await failWrites(page);
  await page.getByRole('button', { name: '기록 저장' }).click();
  await expect(page.getByText(D.STORAGE_WRITE_ERROR).first()).toBeVisible();
  await expect(task).toHaveValue('4K 내보내기');
  if ((await stored(page)).reservations[0].logs.length !== 0) throw new Error('실패했는데 기록이 저장됨');
  await restoreWrites(page);
  await page.getByRole('button', { name: '기록 저장' }).click();
  await expect.poll(async () => (await stored(page)).reservations[0].logs.length).toBe(1);
  await page.context().close();
});

await check('운영 시뮬레이터 상태 변경 저장 실패 → 단계 그대로', async () => {
  const s = trialState();
  const page = await newPage(browser, s);
  await page.goto(`${base}simulator`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('switch', { name: /딜러 판매 조건 확정/ }).waitFor();
  await failWrites(page);
  await page.getByRole('switch', { name: /딜러 판매 조건 확정/ }).click();
  await expect(page.getByText(D.STORAGE_WRITE_ERROR).first()).toBeVisible();
  await expect(page.getByRole('switch', { name: /딜러 판매 조건 확정/ })).not.toBeChecked();
  if ((await stored(page)).dealerTermsConfirmed) throw new Error('실패했는데 설정이 저장됨');
  await page.context().close();
});

await browser.close();
local?.server.close();
console.log(`target: ${base}`);
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
