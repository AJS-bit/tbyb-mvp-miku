// 앱(Expo 웹 빌드) 저장 실패 처리 검증 — TETO 교차검토(2026-09-29) 재현 사례 포함. v2: 미션·리워드 흐름.
// 저장(setItem)이 실패하면: 성공 표시 없음 · 상태 변경 없음 · 입력값 유지 · 다시 누르면 저장.
// + 리워드 검토 메모·표시(flag)는 고객 화면에 나오지 않는다 (거절 사유만 고객에게 보인다).
// + 화면 모드(시스템/라이트/다크): 고른 값은 새로고침 뒤에도 남고, 저장 실패 시 이번 실행에만 적용 + 저장 오류 표시,
//   기기 설정이 다크(colorScheme: 'dark')면 첫 화면 바탕이 다크.
// + 노트북 화면 문구·브랜드 워드마크가 고운바탕(같은 사이트의 ttf)으로 그려지는지.
//
// 사용 (저장소 루트에서):
//   (cd app && rm -rf dist && EXPO_BASE_URL=/tbyb-mvp-miku/app npx expo export --platform web --output-dir dist)
//   node scripts/verify-app-storage.mjs            # 로컬 dist 를 /tbyb-mvp-miku/app/ 로 서빙 (Node 24: .ts 타입 제거 기본)
//   node scripts/verify-app-storage.mjs <공개 URL>   # 예: https://ajs-bit.github.io/tbyb-mvp-miku/app/
//   VERIFY_DEBUG=1 node scripts/verify-app-storage.mjs   # 실패 시 Playwright 호출 로그 전체 출력
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

const H = 3600_000;

// 상태는 도메인 함수로만 만든다 (시각을 앞으로 당겨 두면 미션 답이 몇 시간에 걸쳐 나뉜다)
function trialState(T0 = new Date()) {
  let s = D.createInitialState(T0);
  s = ok(D.createReservation(s, {
    startDate: D.calendarDays(s, T0).find((d) => d.status === 'open').date,
    pickupStore: D.PICKUP_STORES[0], usage: 'watch', question: '저장 실패 검증',
    leaningBefore: 'air', confidenceBefore: 2,
  }, T0));
  s = ok(D.transition(s, 'TB-0001', 'operator_check', 'operator', '확인', T0));
  s = ok(D.assignDevice(s, 'TB-0001', 'air', 'AIR-01', T0));
  s = ok(D.assignDevice(s, 'TB-0001', 'pro', 'PRO-01', T0));
  s = ok(D.transition(s, 'TB-0001', 'payment_pending', 'operator', '확보', T0));
  s = ok(D.setPaymentCheck(s, 'TB-0001', 'DEMO-VERIFY-1', true, T0));
  s = ok(D.transition(s, 'TB-0001', 'confirmed', 'operator', '대조', T0));
  s = ok(D.setCheckout(s, 'TB-0001', 'air', true));
  s = ok(D.setCheckout(s, 'TB-0001', 'pro', true));
  s = ok(D.transition(s, 'TB-0001', 'in_trial', 'operator', '출고', T0));
  return s;
}

// 핵심 미션 5개 + 바탕화면 코드까지 (리워드 신청 직전). wrongPro 면 Pro 코드를 틀리게 적는다.
function readyState({ wrongPro = false } = {}) {
  const T0 = new Date(Date.now() - 3 * 24 * H);
  let s = trialState(T0);
  const picks = { carry: 'air', video: 'same', screen: 'pro', typing: 'air', daily: 'unsure' };
  Object.entries(picks).forEach(([id, pick], i) => {
    s = ok(D.answerMission(s, 'TB-0001', { id, pick, ...(id === 'daily' ? { daily: D.DAILY_OPTIONS[0] } : {}) }, new Date(T0.getTime() + (i + 1) * 5 * H)));
  });
  const codes = s.reservations[0].ops.wallCodes;
  s = ok(D.setCodeCheck(s, 'TB-0001', codes.air, wrongPro ? 'ZZZZ' : codes.pro, new Date(T0.getTime() + 30 * H)));
  return s;
}

// 리워드 신청 → 결정 → 반납 → 검수 중 (운영자 검토 가능 단계)
function reviewState({ wrongPro = true } = {}) {
  const T1 = new Date(Date.now() - 20 * H);
  let s = readyState({ wrongPro });
  s = ok(D.submitReward(s, 'TB-0001', T1));
  s = ok(D.setDecision(s, 'TB-0001', { choice: 'return_both', confidenceAfter: 4, reason: '검증' }, T1));
  s = ok(D.transition(s, 'TB-0001', 'return_received', 'operator', '반납', new Date(T1.getTime() + H)));
  s = ok(D.transition(s, 'TB-0001', 'inspecting', 'operator', '검수', new Date(T1.getTime() + 2 * H)));
  return s;
}

const failWrites = (page) =>
  page.evaluate(() => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException('verify quota', 'QuotaExceededError');
    };
  });
// 특정 키 쓰기만 실패시킨다 (두 키 중 하나만 실패하는 부분 실패 재현)
const failWritesFor = (page, key) =>
  page.evaluate((key) => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key) throw new DOMException('verify quota', 'QuotaExceededError');
      return window.__setItem.call(this, k, v);
    };
  }, key);
const UI_KEY = `${D.STORAGE_KEY}:app-ui`;
// 시트·시뮬레이터(모달) 아래에는 숨겨진 탭 화면이 깔려 같은 안내가 두 번 있을 수 있다 — 보이는 것만 본다
const writeError = (page) => page.getByText(D.STORAGE_WRITE_ERROR).filter({ visible: true }).first();
const restoreWrites = (page) => page.evaluate(() => (Storage.prototype.setItem = window.__setItem));
const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), D.STORAGE_KEY);

async function newPage(browser, seed, { colorScheme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', colorScheme });
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
    if (process.env.VERIFY_DEBUG) console.error(`--- ${name}\n${e.message ?? e}`); // VERIFY_DEBUG=1 이면 전체 오류(호출 로그) 출력
  }
}

const target = process.argv[2];
const local = target ? null : await serveDist();
const base = target ?? local.base;
const browser = await chromium.launch();

// 결정 선택지 라디오 이름 = '라벨. 설명' (RadioRow) — 라벨은 도메인 문구 그대로
const RETURN_BOTH = new RegExp(`^${D.DECISION_LABEL.return_both}\\.`);

await check('결정 저장 실패 → 저장됨 표시 없음·입력 유지·재시도 성공·새로고침 복원', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}decide/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('radio', { name: RETURN_BOTH }).click();
  await page.getByRole('radio', { name: /체험 후.* 4점$/ }).click();
  const reason = page.getByLabel('결정 이유, 필수');
  await reason.fill('저장 실패 검증 — 두 대 모두 반납');
  await failWrites(page);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(writeError(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '결정 저장', exact: true })).toBeEnabled();
  await expect(page.getByText('결정을 저장했어요')).toHaveCount(0);
  await expect(reason).toHaveValue('저장 실패 검증 — 두 대 모두 반납');
  if ((await stored(page)).reservations[0].decision) throw new Error('실패했는데 결정이 저장됨');
  await restoreWrites(page);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('결정 이유, 필수')).toHaveValue('저장 실패 검증 — 두 대 모두 반납');
  await page.context().close();
});

await check('미션 답 저장 실패 → 답 없음·고른 답 유지·재시도 성공·새로고침 복원', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}mission/carry`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const air = page.getByRole('radio', { name: 'Air가 나았어요', exact: true });
  await air.click();
  await expect(air).toBeChecked();
  await page.getByRole('radio', { name: '가방이 가벼웠어요', exact: true }).click();
  await failWrites(page);
  await page.getByRole('button', { name: '답 저장', exact: true }).click();
  await expect(writeError(page)).toBeVisible();
  await expect(air).toBeChecked();
  await expect(page.getByRole('radio', { name: '가방이 가벼웠어요', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '답 저장', exact: true })).toBeEnabled();
  if ((await stored(page)).reservations[0].missions.carry) throw new Error('실패했는데 미션 답이 저장됨');
  await restoreWrites(page);
  await page.getByRole('button', { name: '답 저장', exact: true }).click();
  await expect.poll(async () => (await stored(page)).reservations[0].missions.carry?.pick).toBe('air');
  if ((await stored(page)).reservations[0].missions.carry.followUp !== '가방이 가벼웠어요') throw new Error('후속 선택이 저장되지 않음');
  await page.goto(`${base}missions`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page.getByRole('button', { name: /들고 나가 보기.*내 답: Air가 나았어요/ })).toBeVisible();
  await page.context().close();
});

await check('리워드 신청 저장 실패 → 신청 전 그대로·재시도 성공', async () => {
  const page = await newPage(browser, readyState());
  await page.goto(`${base}missions`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const submit = page.getByRole('button', { name: '리워드 신청', exact: true });
  await expect(submit).toBeEnabled();
  await failWrites(page);
  await submit.click();
  await expect(writeError(page)).toBeVisible();
  await expect(submit).toBeEnabled();
  await expect(page.getByText(D.REWARD_STATUS_LABEL.submitted)).toHaveCount(0);
  if ((await stored(page)).reservations[0].reward.status !== 'none') throw new Error('실패했는데 리워드가 신청됨');
  await restoreWrites(page);
  await submit.click();
  await expect.poll(async () => (await stored(page)).reservations[0].reward.status).toBe('submitted');
  await expect(page.getByText(D.REWARD_STATUS_LABEL.submitted).first()).toBeVisible();
  await page.context().close();
});

await check('운영 시뮬레이터 상태 변경 저장 실패 → 단계 그대로', async () => {
  const s = trialState();
  const page = await newPage(browser, s);
  await page.goto(`${base}simulator`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('switch', { name: /딜러 판매 조건 확정/ }).waitFor();
  await failWrites(page);
  await page.getByRole('switch', { name: /딜러 판매 조건 확정/ }).click();
  await expect(writeError(page)).toBeVisible();
  await expect(page.getByRole('switch', { name: /딜러 판매 조건 확정/ })).not.toBeChecked();
  if ((await stored(page)).dealerTermsConfirmed) throw new Error('실패했는데 설정이 저장됨');
  await page.context().close();
});

async function fillDecision(page) {
  await page.getByRole('radio', { name: RETURN_BOTH }).click();
  await page.getByRole('radio', { name: /체험 후.* 4점$/ }).click();
  await page.getByLabel('결정 이유, 필수').fill('부분 실패 검증');
}

await check('UI 키만 실패 → 결정은 도메인 키 하나만 쓰므로 화면·저장본 모두 저장됨 (TETO 부분 실패 사례)', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}decide/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await fillDecision(page);
  await failWritesFor(page, UI_KEY);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toBeVisible();
  if (!(await stored(page)).reservations[0].decision) throw new Error('화면은 저장됨인데 저장본에 결정 없음');
  await restoreWrites(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toBeVisible();
  await page.context().close();
});

await check('도메인 키만 실패 → 결정 저장 실패, 저장본에도 없고 새로고침 후에도 없음', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}decide/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await fillDecision(page);
  await failWritesFor(page, D.STORAGE_KEY);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(writeError(page)).toBeVisible();
  await expect(page.getByRole('button', { name: '결정 저장', exact: true })).toBeEnabled();
  if ((await stored(page)).reservations[0].decision) throw new Error('실패했는데 결정이 저장됨');
  await restoreWrites(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '결정 저장', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toHaveCount(0);
  await page.context().close();
});

await check('초기화 중 UI 키만 실패 → 저장된 도메인 초기화는 화면에도 반영, 오류 표시', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}simulator`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: '데모 초기화' }).waitFor();
  await failWritesFor(page, UI_KEY);
  await page.getByRole('button', { name: '데모 초기화' }).click();
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(writeError(page)).toBeVisible();
  if ((await stored(page)).reservations.length !== 0) throw new Error('도메인 키 초기화가 저장되지 않음');
  await expect(page.getByText('진행할 요청이 없습니다')).toBeVisible();
  await page.context().close();
});

// 고객 화면 — 화면마다 다 그려졌는지 확인할 글자
const CUSTOMER_PAGES = { 'my/': '요청 내용', missions: '미션 리워드', 'decide/': '기기별 결과' };
const FLAG_TEXTS = Object.values(D.REWARD_FLAG_LABEL);
async function customerText(page, path) {
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByText(CUSTOMER_PAGES[path]).first().waitFor();
  return page.evaluate(() => document.body.innerText);
}

await check('리워드 승인 저장 실패 → 대기 그대로·재시도 성공, 승인 메모·표시는 고객 화면에 없음 (운영 이력에만)', async () => {
  const NOTE = 'VERIFY-승인메모 두 기기 스크린 타임 확인';
  const page = await newPage(browser, reviewState({ wrongPro: true }));
  await page.goto(`${base}simulator?section=reward`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByLabel('리워드 확인 메모').fill(NOTE);
  await failWrites(page);
  await page.getByRole('button', { name: '승인 · 지급 예정', exact: true }).click();
  await expect(writeError(page)).toBeVisible();
  if ((await stored(page)).reservations[0].reward.status !== 'submitted') throw new Error('실패했는데 검토가 저장됨');
  await restoreWrites(page);
  await page.getByRole('button', { name: '승인 · 지급 예정', exact: true }).click();
  await expect.poll(async () => (await stored(page)).reservations[0].reward.status).toBe('approved');
  await expect(page.getByText(`운영 메모: ${NOTE}`)).toBeVisible();
  const h = (await stored(page)).reservations[0].history.at(-1);
  if (h.reason.includes(NOTE) || h.internalNote !== NOTE) throw new Error('이력 사유에 운영 메모가 섞임');
  for (const path of Object.keys(CUSTOMER_PAGES)) {
    const text = await customerText(page, path);
    if (text.includes(NOTE)) throw new Error(`${path}: 승인 메모가 고객 화면에 보임`);
    const leaked = FLAG_TEXTS.filter((f) => text.includes(f));
    if (leaked.length) throw new Error(`${path}: 검토 표시가 고객 화면에 보임 (${leaked.join(', ')})`);
  }
  await page.context().close();
});

await check('리워드 거절 → 거절 사유는 미션 탭 리워드 카드에만, 표시(flag)는 어디에도 없음', async () => {
  const NOTE = 'VERIFY-거절사유 사용 흔적 없음';
  const s = ok(D.reviewReward(reviewState({ wrongPro: true }), 'TB-0001', 'rejected', NOTE));
  const page = await newPage(browser, s);
  const texts = {};
  for (const path of Object.keys(CUSTOMER_PAGES)) {
    texts[path] = await customerText(page, path);
    const leaked = FLAG_TEXTS.filter((f) => texts[path].includes(f));
    if (leaked.length) throw new Error(`${path}: 검토 표시가 고객 화면에 보임 (${leaked.join(', ')})`);
  }
  if (!texts.missions.includes(`거절 사유: ${NOTE}`)) throw new Error('미션 탭에 거절 사유가 없음');
  if (texts['my/'].includes(NOTE) || texts['decide/'].includes(NOTE)) throw new Error('거절 사유가 이력·다른 화면에 보임');
  await page.context().close();
});

// ───────── 글꼴·브랜드 ─────────
await check('노트북 화면 문구·브랜드 워드마크 — 고운바탕(자체 호스팅 ttf)으로 그려짐', async () => {
  const page = await newPage(browser, null);
  const fontRequests = [];
  page.on('response', (r) => /GowunBatang-Bold-subset.*\.ttf/.test(r.url()) && fontRequests.push(r.status()));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // 히어로 SVG 안의 두 노트북 화면 문구 (줄마다 <text> 하나)
  for (const line of ['어디로 갈까?', '어디까지 해 볼까?']) {
    const el = page.locator('svg text', { hasText: line }).first();
    await el.waitFor({ state: 'attached' });
    const family = await el.evaluate((n) => getComputedStyle(n).fontFamily);
    if (!family.includes('GowunBatang_700Bold')) throw new Error(`'${line}' 글꼴이 고운바탕이 아님: ${family}`);
  }
  const mark = await page.getByText('Try Before You Buy', { exact: true }).first().evaluate((n) => getComputedStyle(n).fontFamily);
  if (!mark.includes('GowunBatang_700Bold')) throw new Error(`워드마크 글꼴이 고운바탕이 아님: ${mark}`);
  // 글꼴 파일이 실제로 받아지고(같은 사이트) 브라우저가 불러온 상태
  await expect
    .poll(() => page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'GowunBatang_700Bold' && f.status === 'loaded')), { timeout: 20_000 })
    .toBe(true);
  if (!fontRequests.length || fontRequests.some((st) => st >= 400)) throw new Error(`글꼴 파일 응답: ${fontRequests.join(', ') || '요청 없음'}`);
  await page.context().close();
});

// ───────── 화면 모드 ─────────
const LIGHT_BG = 'rgb(250, 246, 239)'; // palette.ts light.bg #FAF6EF
const DARK_BG = 'rgb(22, 19, 15)'; // palette.ts dark.bg #16130F
const storedUi = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), UI_KEY);
// 문서에 적용된 모드: <html data-theme> · 앱이 다시 그린 뒤 붙는 data-theme-ready · body 바탕
const docTheme = (page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    ready: document.documentElement.dataset.themeReady === '1',
    body: getComputedStyle(document.body).backgroundColor,
  }));
// 화면 왼쪽 여백(카드 바깥)의 요소에서 위로 올라가며 처음 칠해진 바탕색 = 탭 화면의 실제 바탕
const screenBg = (page) =>
  page.evaluate(() => {
    let el = document.elementFromPoint(6, window.innerHeight / 2);
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
      el = el.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  });
const themeRadio = (page, name) => page.getByRole('radio', { name, exact: true });

await check('화면 모드 다크 선택 → UI 키에 저장, 새로고침 뒤에도 다크 (기기 설정은 라이트)', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}my/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(themeRadio(page, '기기 설정 따라가기')).toBeChecked();
  await expect.poll(async () => (await docTheme(page)).theme).toBe('light');
  await themeRadio(page, '다크').click();
  await expect(themeRadio(page, '다크')).toBeChecked();
  await expect.poll(async () => (await storedUi(page))?.theme).toBe('dark');
  await expect.poll(() => docTheme(page)).toEqual({ theme: 'dark', ready: true, body: DARK_BG });
  await expect.poll(() => screenBg(page)).toBe(DARK_BG);
  await expect(writeError(page)).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(themeRadio(page, '다크')).toBeChecked();
  await expect.poll(() => docTheme(page)).toEqual({ theme: 'dark', ready: true, body: DARK_BG });
  await expect.poll(() => screenBg(page)).toBe(DARK_BG);
  // 다른 탭(정적 HTML 로 바로 연 페이지)도 첫 화면부터 다크
  await page.goto(`${base}decide/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByText('미션 답 모아 보기').first().waitFor();
  await expect.poll(() => screenBg(page)).toBe(DARK_BG);
  // 데모 초기화를 해도 화면 모드는 남는다 (기기 설정)
  await page.goto(`${base}simulator`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('button', { name: '데모 초기화' }).click();
  await page.getByRole('button', { name: '초기화', exact: true }).click();
  await expect(page.getByText('진행할 요청이 없습니다')).toBeVisible();
  if ((await storedUi(page))?.theme !== 'dark') throw new Error('데모 초기화 뒤 화면 모드가 사라짐');
  await page.context().close();
});

await check('화면 모드 저장 실패 → 이번 실행에만 적용·저장 오류 표시·앱은 계속 쓸 수 있음, 새로고침하면 이전 모드', async () => {
  const page = await newPage(browser, trialState());
  await page.goto(`${base}my/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(themeRadio(page, '기기 설정 따라가기')).toBeChecked();
  await failWritesFor(page, UI_KEY);
  await themeRadio(page, '다크').click();
  await expect(writeError(page)).toBeVisible();
  await expect(page.getByText('이번 실행에만 적용됐어요')).toBeVisible();
  await expect(themeRadio(page, '다크')).toBeChecked();
  await expect.poll(() => docTheme(page)).toEqual({ theme: 'dark', ready: true, body: DARK_BG });
  if ((await storedUi(page))?.theme === 'dark') throw new Error('실패했는데 화면 모드가 저장됨');
  // 탭을 옮겨도 다크 그대로, 데모 저장(도메인 키)은 정상
  await page.getByRole('tab', { name: /결정·반납/ }).click();
  await fillDecision(page);
  await page.getByRole('button', { name: '결정 저장', exact: true }).click();
  await expect(page.getByRole('button', { name: '저장됨', exact: true })).toBeVisible();
  if (!(await stored(page)).reservations[0].decision) throw new Error('화면 모드 실패 뒤 결정 저장이 안 됨');
  await expect.poll(() => screenBg(page)).toBe(DARK_BG);
  await restoreWrites(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '저장됨', exact: true }).waitFor();
  await expect.poll(() => docTheme(page)).toEqual({ theme: 'light', ready: true, body: LIGHT_BG });
  await page.context().close();
});

await check('기기 설정 다크(colorScheme: dark) + 시스템 모드 → 미션 화면 첫 바탕부터 다크, 글자는 밝은 잉크', async () => {
  const page = await newPage(browser, readyState(), { colorScheme: 'dark' });
  await page.goto(`${base}missions`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // <head> 스크립트가 앱보다 먼저 다크를 정한다 (번쩍임 방지)
  if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'dark') throw new Error('첫 HTML 에서 다크가 적용되지 않음');
  await page.getByText('미션 리워드').first().waitFor();
  await expect.poll(() => docTheme(page)).toEqual({ theme: 'dark', ready: true, body: DARK_BG });
  await expect.poll(() => screenBg(page)).toBe(DARK_BG);
  const ink = await page.getByText('미션 리워드', { exact: true }).first().evaluate((el) => getComputedStyle(el).color);
  if (ink !== 'rgb(243, 236, 226)') throw new Error(`제목 글자색이 다크 잉크가 아님: ${ink}`);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => screenBg(page)).toBe(LIGHT_BG);
  await page.context().close();
});

// ── 앱 JS 가 늦거나 안 올 때: 다크 사용자에게 라이트로 미리 그려진 화면을 드러내지 않는다 (TETO 교차검토 2026-09-30)
// 문서 시작부터 100ms 마다 상태를 적어 두고, 준비 전 #root 가 보인 순간이 한 번도 없어야 한다.
async function slowJsPage({ delayMs, abort = false, reducedMotion = 'no-preference' }) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', colorScheme: 'dark', reducedMotion });
  await context.route('**/_expo/static/js/**', async (route) => {
    if (abort) return route.abort();
    await new Promise((r) => setTimeout(r, delayMs));
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__samples = [];
    const tick = () => {
      const root = document.getElementById('root');
      const de = document.documentElement;
      if (root && document.body) {
        window.__samples.push({
          t: Math.round(performance.now()),
          visible: getComputedStyle(root).visibility !== 'hidden',
          ready: de.hasAttribute('data-theme-ready'),
          body: getComputedStyle(document.body).backgroundColor,
          text: getComputedStyle(document.body, '::before').content,
        });
      }
    };
    setInterval(tick, 100);
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  return page;
}
const leaked = (samples) => samples.filter((x) => x.visible && !x.ready);

for (const reducedMotion of ['no-preference', 'reduce']) {
  await check(`다크 + 앱 JS 3.5초 지연 (${reducedMotion}) → 준비 전엔 다크 '불러오는 중'만, 라이트 화면 노출 없음`, async () => {
    const page = await slowJsPage({ delayMs: 3500, reducedMotion });
    await page.goto(`${base}missions`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute('data-theme-ready')), { timeout: 30_000 }).toBe(true);
    const samples = await page.evaluate(() => window.__samples);
    const before = samples.filter((x) => !x.ready);
    if (before.length < 20) throw new Error(`지연 구간 표본이 너무 적음: ${before.length}`);
    if (leaked(samples).length) throw new Error(`준비 전 #root 노출 ${leaked(samples).length}회 (첫 ${leaked(samples)[0].t}ms)`);
    if (before.some((x) => x.body !== DARK_BG)) throw new Error('준비 전 바탕이 다크가 아님');
    if (!before.every((x) => x.text.includes('불러오는 중'))) throw new Error('준비 전 다크 로딩 문구가 없음');
    // 예약 없이 연 미션 탭(잠김 화면)이 다크로 그려졌는지
    await page.getByText('미션은 픽업한 날부터 열려요').first().waitFor();
    await expect.poll(() => docTheme(page)).toEqual({ theme: 'dark', ready: true, body: DARK_BG });
    await page.context().close();
  });
}

await check('다크 + 앱 JS 차단 → 8초 뒤 다크 안내 문구, 라이트 화면은 끝까지 노출 없음', async () => {
  const page = await slowJsPage({ abort: true });
  await page.goto(`${base}missions`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(9_000);
  const state = await page.evaluate(() => ({
    slow: document.documentElement.hasAttribute('data-load-slow'),
    text: getComputedStyle(document.body, '::before').content,
    samples: window.__samples,
  }));
  if (!state.slow || !state.text.includes('불러오지 못하고')) throw new Error(`8초 뒤 안내 문구 없음: ${state.text}`);
  if (leaked(state.samples).length) throw new Error('JS 없이 라이트 화면이 드러남');
  if (state.samples.some((x) => x.body !== DARK_BG)) throw new Error('바탕이 다크가 아닌 순간이 있음');
  await page.context().close();
});

await browser.close();
local?.server.close();
console.log(`target: ${base}`);
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
