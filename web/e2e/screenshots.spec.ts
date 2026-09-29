import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  PICKUP_STORES,
  STORAGE_KEY,
  addCompareLog,
  assignDevice,
  calendarDays,
  createInitialState,
  createReservation,
  setCheckout,
  setDecision,
  setInspection,
  setPaymentCheck,
  transition,
  type DemoState,
  type RequestInfo,
  type Result,
} from "../src/lib/domain";

// docs/screenshots/web-*.png 를 만든다. 상태는 domain 함수로 직접 만들어 localStorage 에 넣는다.
const OUT = join(process.cwd(), "..", "docs", "screenshots");
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

const now = new Date();
const openDays = calendarDays(createInitialState(now), now).filter((d) => d.status === "open");

function req(i: number, patch: Partial<RequestInfo> = {}): RequestInfo {
  return {
    startDate: openDays[Math.min(i, openDays.length - 1)].date,
    pickupStore: PICKUP_STORES[i % 2],
    workType: "video",
    wantToCompare: "4K 영상 내보내기 시간과 긴 렌더링 중 발열",
    leaningBefore: "air",
    confidenceBefore: 2,
    ...patch,
  };
}

function toPayment(s: DemoState, id: string, air: string, pro: string): DemoState {
  s = ok(transition(s, id, "operator_check", "operator", "딜러에게 두 대 재고 확인", now));
  s = ok(assignDevice(s, id, "air", air));
  s = ok(assignDevice(s, id, "pro", pro));
  return ok(transition(s, id, "payment_pending", "operator", "두 대 확보 — 결제 요청", now));
}

function toTrial(s: DemoState, id: string, air: string, pro: string): DemoState {
  s = toPayment(s, id, air, pro);
  s = ok(setPaymentCheck(s, id, "DEMO-TX-0001", true));
  s = ok(transition(s, id, "confirmed", "operator", "거래내역·예약ID 대조 완료", now));
  s = ok(setCheckout(s, id, "air", true));
  s = ok(setCheckout(s, id, "pro", true));
  return ok(transition(s, id, "in_trial", "operator", "픽업 완료 — 두 기기 출고", now));
}

function withLogs(s: DemoState, id: string): DemoState {
  s = ok(
    addCompareLog(
      s,
      id,
      {
        task: "같은 영상 내보내기에 걸린 시간",
        note: "Air는 후반에 조금 느려짐, Pro는 끝까지 조용",
        entries: {
          air: { minutes: 12, portability: 5, display: 3, feel: 3 },
          pro: { minutes: 7, portability: 3, display: 5, feel: 5 },
        },
      },
      now,
    ),
  );
  return ok(
    addCompareLog(
      s,
      id,
      {
        task: "가방에 넣고 하루 들고 다녀 보기",
        note: "",
        entries: {
          air: { minutes: null, portability: 5, display: null, feel: 4 },
          pro: { minutes: null, portability: 3, display: null, feel: 4 },
        },
      },
      now,
    ),
  );
}

async function seed(page: Page, s: DemoState) {
  await page.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem(k, v);
        sessionStorage.setItem("seeded", "1");
      }
    },
    [STORAGE_KEY, JSON.stringify(s)] as const,
  );
}

async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  // 포커스 링·호버·전환 중 색이 찍히지 않게 정리하고, 고정 헤더가 중간에 찍히지 않게 맨 위에서 캡처
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(OUT, `web-${name}.png`), fullPage: true, animations: "disabled" });
}

test.describe("모바일", () => {
  test.use({ viewport: MOBILE, deviceScaleFactor: 2 });

  test("소개·비교팩·일정 요청", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "intro-mobile");

    await page.goto("pack/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "pack");

    await page.goto("request/");
    await page.locator('[data-testid="calendar-day"][data-status="open"]').nth(1).click();
    await page.getByRole("radio", { name: PICKUP_STORES[0] }).check();
    await page.locator("label", { has: page.getByRole("radio", { name: "영상 편집" }) }).click();
    await page.locator("label", { has: page.getByRole("radio", { name: "Air 쪽" }) }).click();
    await page.locator("label", { has: page.getByRole("radio", { name: "그 생각에 얼마나 확신하나요? 2점" }) }).click();
    await page.locator("#want").fill("4K 영상 내보내기 시간과 긴 렌더링 중 발열");
    await shot(page, "request");
  });

  test("내 체험 — 결제 대기", async ({ page }) => {
    let s = ok(createReservation(createInitialState(now), req(0), now));
    s = toPayment(s, "TB-0001", "AIR-01", "PRO-01");
    await seed(page, s);
    await page.goto("my/?id=TB-0001");
    await expect(page.getByTestId("payment-deadline")).toBeVisible();
    await shot(page, "my-payment-pending");
  });

  test("비교 기록·결정", async ({ page }) => {
    let s = ok(createReservation(createInitialState(now), req(0), now));
    s = toTrial(s, "TB-0001", "AIR-01", "PRO-01");
    s = withLogs(s, "TB-0001");
    s = { ...s, dealerTermsConfirmed: true };
    await seed(page, s);
    await page.goto("my/record/?id=TB-0001");
    await expect(page.getByTestId("compare-log")).toHaveCount(2);
    await shot(page, "record");

    await page.goto("my/decide/?id=TB-0001");
    await page.locator("label", { has: page.getByRole("radio", { name: /체험한 기기 그대로 구매/ }) }).click();
    await page.locator("label", { has: page.getByRole("radio", { name: "MacBook Pro 14형", exact: true }) }).click();
    await page
      .locator("label", { has: page.getByRole("radio", { name: "체험 후, 이 결정에 얼마나 확신하나요? 4점" }) })
      .click();
    await page.locator("#reason").fill("긴 렌더링에서 Pro가 끝까지 속도를 유지했다");
    await expect(page.getByTestId("return-plan")).toContainText("반납할 기기: MacBook Air");
    await shot(page, "decide");
  });
});

test.describe("데스크톱", () => {
  test.use({ viewport: DESKTOP });

  test("소개", async ({ page }) => {
    await page.goto("");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shot(page, "intro-desktop");
  });

  test("운영 시뮬레이터", async ({ page }) => {
    let s = createInitialState(now);
    s = ok(createReservation(s, req(0), now));
    s = toTrial(s, "TB-0001", "AIR-01", "PRO-01");
    s = withLogs(s, "TB-0001");
    s = { ...s, dealerTermsConfirmed: true };
    s = ok(setDecision(s, "TB-0001", { choice: "buy_used", model: "pro", confidenceAfter: 4, reason: "렌더링 속도 차이" }, now));
    s = ok(transition(s, "TB-0001", "return_received", "operator", "Air 반납 · Pro 구매 선택", now));
    s = ok(transition(s, "TB-0001", "inspecting", "operator", "반납 기기 검수 시작", now));
    s = ok(setInspection(s, "TB-0001", "air", "condition", true));
    s = ok(setInspection(s, "TB-0001", "air", "accessories", true));
    s = ok(createReservation(s, req(1, { workType: "dev", leaningBefore: "pro", confidenceBefore: 3 }), now));
    s = toPayment(s, "TB-0002", "AIR-02", "PRO-02");
    s = ok(createReservation(s, req(2, { workType: "docs", leaningBefore: "unsure" }), now));
    await seed(page, s);
    await page.goto("ops/");
    await page.getByRole("button", { name: "TB-0001 열기" }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByTestId("ops-panel")).toBeVisible();
    await shot(page, "ops");
  });
});
