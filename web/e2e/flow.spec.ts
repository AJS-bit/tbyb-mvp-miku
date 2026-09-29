import { expect, test, type Page } from "@playwright/test";
import {
  DEALER_TERMS_TBD,
  INSPECTION_LABEL,
  PICKUP_STORES,
  STORAGE_KEY,
  STORAGE_READ_ERROR,
  STORAGE_WRITE_ERROR,
  type Inspection,
} from "../src/lib/domain";

// 고객 화면은 모바일, 운영 시뮬레이터는 데스크톱 폭으로 같은 페이지(같은 localStorage)에서 오간다.
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const INSPECTION_FIELDS = Object.keys(INSPECTION_LABEL) as (keyof Inspection)[];

/** sr-only 라디오는 감싼 label 을 눌러 고른다 */
async function pickRadio(page: Page, name: string | RegExp) {
  const radio = page.getByRole("radio", { name, exact: typeof name === "string" });
  await page.locator("label", { has: radio }).click();
  await expect(radio).toBeChecked();
}

async function requestDemo(page: Page, expectedId: string) {
  await page.setViewportSize(MOBILE);
  await page.goto("request/");
  await expect(page.getByRole("heading", { name: "데모 일정 요청", level: 1 })).toBeVisible();
  await expect(page.getByText("이름·전화번호를 받지 않습니다")).toBeVisible();
  await expect(page.getByText(/마지막 갱신/)).toBeVisible();

  // 마감일은 고를 수 없다
  const closed = page.locator('[data-testid="calendar-day"][data-status="closed"]');
  if (await closed.count()) await expect(closed.first()).toBeDisabled();

  await pickRadio(page, "영상 편집");
  await page.locator("#want").fill("4K 내보내기 시간과 발열");
  await pickRadio(page, "Air 쪽");
  await pickRadio(page, "그 생각에 얼마나 확신하나요? 2점");

  // domain 의 오류 문구가 그대로 보인다
  const submit = page.getByRole("button", { name: "데모 일정 요청 보내기" });
  await submit.click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("희망 시작일을 골라 주세요.");
  await page.locator('[data-testid="calendar-day"][data-status="open"]').first().click();
  await submit.click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("픽업 매장을 골라 주세요.");
  await page.getByRole("radio", { name: PICKUP_STORES[0] }).check();
  await submit.click();

  await expect(page).toHaveURL(new RegExp(`/tbyb-mvp-miku/my/\\?id=${expectedId}$`));
  await expect(page.getByRole("heading", { name: expectedId, level: 1 })).toBeVisible();
}

async function openOps(page: Page, id?: string) {
  await page.setViewportSize(DESKTOP);
  await page.goto("ops/");
  await expect(page.getByRole("heading", { name: "운영 시뮬레이터 — 데모, 실제 운영자 인증 없음" })).toBeVisible();
  if (id) await selectRes(page, id);
}

async function selectRes(page: Page, id: string) {
  await page.getByRole("button", { name: `${id} 열기` }).click();
  await expect(page.getByTestId("ops-panel").getByRole("heading", { name: id })).toBeVisible();
}

function panelStatus(page: Page) {
  return page.getByTestId("ops-panel").getByTestId("status-chip").first();
}

async function move(page: Page, to: string, reason: string) {
  await page.getByLabel(/변경 사유/).fill(reason);
  await page.getByRole("button", { name: `다음 단계: ${to}` }).click();
  await expect(page.getByText(`'${to}'(으)로 변경했습니다.`)).toBeVisible();
  await expect(panelStatus(page)).toHaveText(to);
}

function device(page: Page, id: string) {
  return page.getByTestId(`device-${id}`);
}

test("요청 → 운영 확인 → 결제 대조 → 체험 → 기록 → 결정 → 반납·검수 → 완료", async ({ page }) => {
  // ── 1. 고객: 데모 일정 요청 (모바일)
  await requestDemo(page, "TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("요청 접수");
  // 고객 화면에는 단계를 넘기는 버튼이 없고, 출고 전 취소만 있다
  await expect(page.getByRole("button", { name: /다음 단계/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "요청 취소" })).toBeVisible();

  // ── 2. 운영: 단계 건너뛰기 불가 + 사유 필수
  await openOps(page, "TB-0001");
  const panel = page.getByTestId("ops-panel");
  await expect(panel.getByRole("button", { name: /^다음 단계:/ })).toHaveCount(1);
  await expect(panel.getByRole("button", { name: "다음 단계: 운영 확인 중" })).toBeVisible();
  for (const skip of ["결제 대기", "예약 확정", "체험 중", "반납 접수", "검수 중", "완료"]) {
    await expect(panel.getByRole("button", { name: `다음 단계: ${skip}` })).toHaveCount(0);
  }
  await panel.getByRole("button", { name: "다음 단계: 운영 확인 중" }).click();
  await expect(panel.getByRole("alert")).toHaveText("운영자 상태 변경에는 사유가 필요합니다.");
  await expect(panelStatus(page)).toHaveText("요청 접수");
  await move(page, "운영 확인 중", "딜러에게 Air·Pro 두 대 재고 확인");

  // ── 3. 기기 확보 전에는 결제 대기로 못 간다
  await expect(panel.getByRole("button", { name: "다음 단계: 결제 대기" })).toBeDisabled();
  await expect(panel.getByTestId("blocked-payment_pending")).toContainText("Air와 Pro 두 대를 모두 확보해야");
  await page.getByLabel("MacBook Air 기기 배정").selectOption("AIR-01");
  await expect(panel.getByTestId("blocked-payment_pending")).toBeVisible();
  await page.getByLabel("MacBook Pro 14형 기기 배정").selectOption("PRO-01");
  await expect(device(page, "AIR-01")).toContainText("예약 보류");
  await expect(device(page, "PRO-01")).toContainText("예약 보류");
  await move(page, "결제 대기", "두 대 확보 — 결제 요청");

  // ── 4. 새로고침해도 저장이 복원된다
  await page.reload();
  await selectRes(page, "TB-0001");
  await expect(panelStatus(page)).toHaveText("결제 대기");
  await expect(device(page, "AIR-01")).toContainText("TB-0001");

  // ── 5. 고객: 결제 대기 화면 (모바일)
  await page.setViewportSize(MOBILE);
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("결제 대기");
  await expect(page.getByTestId("payment-deadline")).toBeVisible();
  await expect(page.getByRole("button", { name: "결제 링크 (데모 — 실제 결제 없음)" })).toBeDisabled();
  await expect(page.getByText(/결제 화면 캡처로는 확정되지 않습니다/)).toBeVisible();

  // ── 6. 운영: 거래 대조 없이는 확정 불가
  await openOps(page, "TB-0001");
  await expect(panel.getByRole("button", { name: "다음 단계: 예약 확정" })).toBeDisabled();
  await expect(panel.getByTestId("blocked-confirmed")).toContainText("데모 거래 식별자를 입력해야");
  await page.getByLabel("데모 거래 식별자").fill("DEMO-TX-0001");
  await expect(panel.getByTestId("blocked-confirmed")).toContainText("대조를 완료해야");
  await page.getByLabel("거래내역·예약ID 대조 완료").check();
  await expect(panel.getByTestId("payment-expiry")).toContainText("남음");
  await move(page, "예약 확정", "거래내역·예약ID 대조 완료");

  // ── 7. 출고 기록 두 대 → 체험 중
  await expect(panel.getByRole("button", { name: "다음 단계: 체험 중" })).toBeDisabled();
  await page.getByLabel("MacBook Air 출고 기록 완료").check();
  await expect(panel.getByRole("button", { name: "다음 단계: 체험 중" })).toBeDisabled();
  await page.getByLabel("MacBook Pro 14형 출고 기록 완료").check();
  await move(page, "체험 중", "픽업 완료 — 두 기기 출고");
  await expect(device(page, "AIR-01")).toContainText("고객 사용 중");
  // 결정 전에는 반납 접수 불가
  await expect(panel.getByTestId("blocked-return_received")).toContainText("마지막 날 결정");

  // ── 8. 고객: 비교 기록 (모바일)
  await page.setViewportSize(MOBILE);
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("체험 중");
  await page.getByRole("link", { name: "비교 기록" }).click();
  await expect(page.getByRole("heading", { name: "비교 기록", level: 1 })).toBeVisible();
  await page.getByLabel("두 기기에서 똑같이 해 본 작업").fill("같은 4K 영상 내보내기");
  await page.getByLabel("MacBook Air 소요 시간 (분)").fill("12");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("같은 항목을 두 기기 모두");
  await page.getByLabel("MacBook Pro 14형 소요 시간 (분)").fill("0");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("0분보다 크고 1,440분 이하");
  await expect(page.getByTestId("compare-log")).toHaveCount(0);
  await page.getByLabel("MacBook Pro 14형 소요 시간 (분)").fill("7");
  await pickRadio(page, "MacBook Air 휴대성 5점");
  await pickRadio(page, "MacBook Pro 14형 휴대성 3점");
  await pickRadio(page, "MacBook Air 사용감 3점");
  await pickRadio(page, "MacBook Pro 14형 사용감 5점");
  await page.getByLabel("메모").fill("Air는 후반에 느려짐, Pro는 끝까지 조용");
  await page.getByRole("button", { name: "기록 저장" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("기록을 저장했습니다");
  await expect(page.getByTestId("compare-log")).toHaveCount(1);
  const summary = page.getByTestId("compare-summary");
  await expect(summary.getByTestId("summary-minutes")).toContainText("12");
  await expect(summary.getByTestId("summary-minutes")).toContainText("7");
  await expect(summary.getByTestId("summary-minutes")).toContainText("1개 기록 기준");
  // 화면 점수는 두 기기 모두 적지 않았으므로 평균을 내지 않는다
  await expect(summary.getByTestId("summary-display")).toContainText("두 기기 모두 측정한 기록 없음");

  // ── 9. 고객: 결정 — 딜러 조건 확정 전에는 구매 선택 불가
  await page.goto("my/decide/?id=TB-0001");
  await expect(page.getByRole("heading", { name: "마지막 날 결정", level: 1 })).toBeVisible();
  await expect(page.getByRole("radio", { name: /체험한 기기 그대로 구매/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /새 제품 구매/ })).toBeDisabled();
  await expect(page.getByText(DEALER_TERMS_TBD).first()).toBeVisible();

  // 운영 시뮬레이터 데모 설정으로 딜러 조건 확정
  await openOps(page);
  await page.getByLabel(/데모 설정: 딜러 판매 조건 확정됨/).check();

  await page.setViewportSize(MOBILE);
  await page.goto("my/decide/?id=TB-0001");
  await pickRadio(page, /체험한 기기 그대로 구매/);
  await pickRadio(page, "MacBook Pro 14형");
  await pickRadio(page, "체험 후, 이 결정에 얼마나 확신하나요? 4점");
  // 이유는 필수
  await page.getByRole("button", { name: "결정 저장" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("선택한 이유를 한 줄 남겨 주세요");
  await page.getByLabel(/선택 이유/).fill("긴 렌더링에서 Pro가 속도를 유지");
  const plan = page.getByTestId("return-plan");
  await expect(plan).toContainText("반납할 기기: MacBook Air");
  await expect(plan).toContainText("딜러 판매가 확인돼야 구매로 확정됩니다");
  await expect(page.getByTestId("before-after")).toContainText("Air 쪽");
  await expect(page.getByTestId("before-after")).toContainText("(+2)");
  await page.getByRole("button", { name: "결정 저장" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("결정을 저장했습니다");

  // ── 10. 운영: 반납 접수 → Air 검수 대기, Pro 딜러 판매 확인 대기
  await openOps(page, "TB-0001");
  await move(page, "반납 접수", "Air 반납 · Pro 구매 선택");
  await expect(device(page, "AIR-01")).toContainText("검수 대기 (재대여 불가)");
  await expect(device(page, "PRO-01")).toContainText("딜러 판매 확인 대기");

  // ── 11. 두 번째 예약: 검수 대기·구매 대기 기기는 배정 불가
  await requestDemo(page, "TB-0002");
  await openOps(page, "TB-0002");
  await move(page, "운영 확인 중", "딜러 확인");
  const airSelect = page.getByLabel("MacBook Air 기기 배정");
  await expect(airSelect.locator('option[value="AIR-01"]')).toBeDisabled();
  await expect(airSelect.locator('option[value="AIR-02"]')).toBeEnabled();
  await expect(page.getByTestId("unavailable-air")).toContainText("AIR-01 — 검수 대기 (재대여 불가)");
  await expect(page.getByLabel("MacBook Pro 14형 기기 배정").locator('option[value="PRO-01"]')).toBeDisabled();
  await expect(page.getByTestId("unavailable-pro")).toContainText("PRO-01");

  // ── 12. TB-0001 검수: 검수·판매 확인 전에는 완료 불가
  await selectRes(page, "TB-0001");
  await move(page, "검수 중", "반납 기기 검수 시작");
  const complete = panel.getByRole("button", { name: "다음 단계: 완료" });
  await expect(complete).toBeDisabled();
  await expect(panel.getByTestId("blocked-completed")).toBeVisible();
  // 구매 선택 기기(Pro)는 검수 체크 대상이 아니다
  await expect(page.getByTestId("inspect-pro").getByRole("checkbox")).toHaveCount(0);
  for (const f of INSPECTION_FIELDS) await page.getByLabel(`MacBook Air ${INSPECTION_LABEL[f]}`).check();
  await expect(page.getByTestId("inspect-air")).toContainText("검수 완료");
  // Air 검수를 마쳐도 딜러 판매 확인 전에는 완료 불가
  await expect(complete).toBeDisabled();
  await expect(panel.getByTestId("blocked-completed")).toContainText("딜러 판매 확인");
  await expect(device(page, "PRO-01")).toContainText("딜러 판매 확인 대기");
  await page.getByRole("button", { name: "딜러 판매 확인", exact: true }).click();
  await expect(device(page, "PRO-01")).toContainText("판매 확인 · 재고 제외");
  await expect(complete).toBeEnabled();
  await move(page, "완료", "Air 검수 완료 · Pro 딜러 판매 확인");
  await expect(device(page, "AIR-01")).toContainText("요청 가능");
  await expect(device(page, "PRO-01")).toContainText("판매 확인 · 재고 제외");

  // 전체 이력에 사유가 남는다
  const history = panel.getByRole("table").last();
  await expect(history).toContainText("딜러에게 Air·Pro 두 대 재고 확인");
  await expect(history).toContainText("Air 검수 완료 · Pro 딜러 판매 확인");

  // ── 13. 새로고침 후에도 완료 상태 복원, 고객 화면 반영
  await page.reload();
  await expect(device(page, "AIR-01")).toContainText("요청 가능");
  await page.setViewportSize(MOBILE);
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("완료");
  await expect(page.getByTestId("return-air")).toContainText("반납 · 검수");
  await expect(page.getByTestId("return-pro")).toContainText("딜러 판매 확인 완료");
  await expect(page.getByText(/7일·30일 뒤 짧은 후속 설문/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "요청 취소" })).toHaveCount(0);
});

test("결제 기한 만료는 자동 확정하지 않고 취소로 처리, 고객은 출고 전 취소 가능", async ({ page }) => {
  await requestDemo(page, "TB-0001");
  await openOps(page, "TB-0001");
  await move(page, "운영 확인 중", "재고 확인");
  await page.getByLabel("MacBook Air 기기 배정").selectOption("AIR-02");
  await page.getByLabel("MacBook Pro 14형 기기 배정").selectOption("PRO-02");
  await move(page, "결제 대기", "결제 요청");
  const panel = page.getByTestId("ops-panel");
  await expect(panel.getByRole("button", { name: "기한 만료 처리" })).toBeDisabled();

  // 데모 시계를 앞당기면 기한이 지난 것으로 표시되고, 대조를 마쳐도 확정되지 않는다
  await page.getByLabel(/데모 시계/).check();
  await expect(panel.getByTestId("payment-expiry")).toContainText("기한 지남");
  await page.getByLabel("데모 거래 식별자").fill("DEMO-TX-9");
  await page.getByLabel("거래내역·예약ID 대조 완료").check();
  await expect(panel.getByRole("button", { name: "다음 단계: 예약 확정" })).toBeDisabled();
  await expect(panel.getByTestId("blocked-confirmed")).toContainText("결제 기한이 지났습니다");
  await panel.getByRole("button", { name: "기한 만료 처리" }).click();
  await expect(panelStatus(page)).toHaveText("취소");
  await expect(device(page, "AIR-02")).toContainText("요청 가능");
  await page.getByLabel(/데모 시계/).uncheck();

  // 고객 직접 취소 (요청 접수 단계)
  await requestDemo(page, "TB-0002");
  await page.getByRole("button", { name: "요청 취소" }).click();
  await page.getByRole("button", { name: "네, 취소합니다" }).click();
  await expect(page.getByTestId("status-chip").first()).toHaveText("취소");
  await expect(page.getByText("취소된 요청입니다").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "요청 취소" })).toHaveCount(0);

  // 데모 데이터 초기화
  await openOps(page);
  await page.getByRole("button", { name: "데모 데이터 초기화" }).click();
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await expect(page.getByText("아직 요청이 없습니다.").first()).toBeVisible();
});

test("손상된 저장본은 덮어쓰지 않고 오류를 보여 주며, 명시적 초기화만 덮어쓴다", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("");
  await page.evaluate((k) => localStorage.setItem(k, "{broken"), STORAGE_KEY);
  await page.reload();
  const banner = page.getByTestId("storage-load-error");
  await expect(banner).toContainText(STORAGE_READ_ERROR);
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe("{broken");

  // 변경은 거부되고 원본은 그대로
  await page.goto("request/");
  await expect(banner).toBeVisible();
  await page.locator('[data-testid="calendar-day"][data-status="open"]').first().click();
  await page.getByRole("radio", { name: PICKUP_STORES[0] }).check();
  await pickRadio(page, "개발");
  await pickRadio(page, "그 생각에 얼마나 확신하나요? 3점");
  await page.getByRole("button", { name: "데모 일정 요청 보내기" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText(STORAGE_READ_ERROR);
  await expect(page).toHaveURL(/\/request\/$/);
  expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe("{broken");

  // 원본 복사 (클립보드가 막혀도 원본을 보여 준다)
  await banner.getByRole("button", { name: "원본 복사" }).click();
  await expect(banner.locator("textarea")).toHaveValue("{broken");

  // 명시적 초기화만 덮어쓴다
  await banner.getByRole("button", { name: "초기화", exact: true }).click();
  await banner.getByRole("button", { name: "원본을 지우고 초기화" }).click();
  await expect(page.getByTestId("storage-load-error")).toHaveCount(0);
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), STORAGE_KEY);
  expect(saved.version).toBe(1);
  expect(saved.reservations).toHaveLength(0);
  await page.getByRole("button", { name: "데모 일정 요청 보내기" }).click();
  await expect(page).toHaveURL(/\/my\/\?id=TB-0001$/);
});

test("초기화 중 한 키만 실패해도 화면과 저장본이 같다 (부분 실패)", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("");
  await page.evaluate((k) => localStorage.setItem(k, "{broken"), STORAGE_KEY);
  await page.reload();
  const banner = page.getByTestId("storage-load-error");
  await expect(banner).toContainText(STORAGE_READ_ERROR);
  // 데모 시계 키만 쓰기 실패
  await page.evaluate((clockKey) => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === clockKey) throw new DOMException("quota", "QuotaExceededError");
      return orig.call(this, k, v);
    };
  }, `${STORAGE_KEY}:clock-offset-hours`);
  await banner.getByRole("button", { name: "초기화", exact: true }).click();
  await banner.getByRole("button", { name: "원본을 지우고 초기화" }).click();
  // 상태 키는 저장됐으니 손상 배너는 사라지고, 시계 키 실패는 쓰기 오류로 알린다
  await expect(page.getByTestId("storage-load-error")).toHaveCount(0);
  await expect(page.getByText(STORAGE_WRITE_ERROR).first()).toBeVisible();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), STORAGE_KEY);
  expect(saved.reservations).toHaveLength(0);
});

test("저장에 실패하면 성공으로 표시하지 않고 상태도 바꾸지 않는다", async ({ page }) => {
  await requestDemo(page, "TB-0001");
  await openOps(page, "TB-0001");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  const panel = page.getByTestId("ops-panel");
  await page.getByLabel(/변경 사유/).fill("재고 확인");
  await panel.getByRole("button", { name: "다음 단계: 운영 확인 중" }).click();
  await expect(panel.getByRole("alert")).toHaveText(STORAGE_WRITE_ERROR);
  await expect(panel.getByRole("status")).toHaveCount(0);
  await expect(panelStatus(page)).toHaveText("요청 접수");
  await expect(page.getByTestId("storage-write-error")).toContainText(STORAGE_WRITE_ERROR);
  await page.reload();
  await selectRes(page, "TB-0001");
  await expect(panelStatus(page)).toHaveText("요청 접수");
});
