import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  PICKUP_STORES,
  STORAGE_KEY,
  answerMission,
  assignDevice,
  calendarDays,
  createInitialState,
  createReservation,
  setCheckout,
  setCodeCheck,
  setDecision,
  setInspection,
  setPaymentCheck,
  submitReward,
  transition,
  type DemoState,
  type MissionAnswer,
  type RequestInfo,
  type Result,
} from "../src/lib/domain";

// docs/screenshots/web-*.png (라이트) · web-dark-*.png (다크) 를 만든다. 상태는 domain 함수로 직접 만들어 localStorage 에 넣는다.
// tbyb 헤더 로고: web-brand-header-{320,390,1280}.png · web-dark-brand-header-*.png (맨 위 데모 막대 + 헤더만 잘라서, 2배)
// FAQ 펼침: web-intro-faq.png · web-dark-intro-faq.png
// 테마는 저장값 없이 '시스템'으로 두고 prefers-color-scheme 를 흉내 내 고른다.
const OUT = join(process.cwd(), "..", "docs", "screenshots");
const THEMES = [
  { scheme: "light", prefix: "web-" },
  { scheme: "dark", prefix: "web-dark-" },
] as const;
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };

function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

const now = new Date();
const H = 3600_000;
const T0 = new Date(now.getTime() - 72 * H); // 요청 시각 (사흘 전)
const at = (hoursFromT0: number) => new Date(T0.getTime() + hoursFromT0 * H);
const openDays = calendarDays(createInitialState(T0), T0).filter((d) => d.status === "open");

function req(i: number, patch: Partial<RequestInfo> = {}): RequestInfo {
  return {
    startDate: openDays[Math.min(i, openDays.length - 1)].date,
    pickupStore: PICKUP_STORES[i % 2],
    usage: "unsure",
    question: "유튜브랑 과제 정도인데 Pro까지 필요할까요?",
    leaningBefore: "air",
    confidenceBefore: 2,
    ...patch,
  };
}

function toPayment(s: DemoState, id: string, air: string, pro: string): DemoState {
  s = ok(transition(s, id, "operator_check", "operator", "딜러에게 두 대 재고 확인", at(1)));
  s = ok(assignDevice(s, id, "air", air, at(2)));
  s = ok(assignDevice(s, id, "pro", pro, at(2)));
  return ok(transition(s, id, "payment_pending", "operator", "두 대 확보 — 결제 요청", at(3)));
}

function toTrial(s: DemoState, id: string, air: string, pro: string): DemoState {
  s = toPayment(s, id, air, pro);
  s = ok(setPaymentCheck(s, id, "DEMO-TX-0001", true, at(4)));
  s = ok(transition(s, id, "confirmed", "operator", "거래내역·예약ID 대조 완료", at(4)));
  s = ok(setCheckout(s, id, "air", true));
  s = ok(setCheckout(s, id, "pro", true));
  return ok(transition(s, id, "in_trial", "operator", "픽업 완료 — 두 기기 출고", at(20)));
}

const ANSWERS: Omit<MissionAnswer, "answeredAt">[] = [
  { id: "carry", pick: "air", followUp: "가방이 가벼웠어요" },
  { id: "video", pick: "same", followUp: "차이를 못 느꼈어요", battery: { air: { before: 92, after: 81 }, pro: { before: 95, after: 86 } } },
  { id: "screen", pick: "unsure" },
  { id: "typing", pick: "pro", followUp: "트랙패드가 편했어요" },
  { id: "daily", pick: "air", followUp: "가벼워서 자주 열었어요", daily: "영상 보기" },
];

function answer(s: DemoState, id: string, n: number): DemoState {
  ANSWERS.slice(0, n).forEach((a, i) => {
    s = ok(answerMission(s, id, a, at(24 + i * 6)));
  });
  return s;
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

async function prepare(page: Page, scheme: "light" | "dark") {
  await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
  await page.evaluate(() => document.fonts.ready);
  // 포커스 링·호버·전환 중 색이 찍히지 않게 정리하고, 고정 헤더가 중간에 찍히지 않게 맨 위에서 캡처
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function shot(page: Page, file: string, scheme: "light" | "dark") {
  await prepare(page, scheme);
  await page.screenshot({ path: join(OUT, `${file}.png`), fullPage: true, animations: "disabled" });
}

for (const { scheme, prefix } of THEMES) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    test.describe("모바일", () => {
      test.use({ viewport: MOBILE, deviceScaleFactor: 2 });

      test("소개·비교팩·일정 요청", async ({ page }) => {
        await page.goto("");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await shot(page, `${prefix}intro-mobile`, scheme);

        await page.goto("pack/");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await shot(page, `${prefix}pack`, scheme);

        await page.goto("request/");
        await page.locator('[data-testid="calendar-day"][data-status="open"]').nth(1).click();
        await page.getByRole("radio", { name: PICKUP_STORES[0] }).check();
        await page.locator("label", { has: page.getByRole("radio", { name: "Air 쪽이에요" }) }).click();
        await page.locator("label", { has: page.getByRole("radio", { name: "그 마음, 얼마나 확실해요? 2점" }) }).click();
        await page.locator("#question").fill("유튜브랑 과제 정도인데 Pro까지 필요할까요?");
        await shot(page, `${prefix}request`, scheme);
      });

      test("내 체험 — 미션 진행", async ({ page }) => {
        let s = ok(createReservation(createInitialState(T0), req(0), T0));
        s = toTrial(s, "TB-0001", "AIR-01", "PRO-01");
        s = answer(s, "TB-0001", 3);
        await seed(page, s);
        await page.goto("my/?id=TB-0001");
        await expect(page.getByTestId("mission-progress")).toContainText("3/5");
        await shot(page, `${prefix}my`, scheme);

        await page.goto("my/missions/?id=TB-0001");
        await expect(page.getByTestId("mission-answer")).toHaveCount(3);
        const typing = page.getByTestId("mission-typing");
        await typing.getByRole("button", { name: /답하기/ }).click();
        await typing.locator("label", { has: page.getByRole("radio", { name: "Pro가 나았어요" }) }).click();
        await typing.getByRole("button", { name: "트랙패드가 편했어요" }).click();
        await shot(page, `${prefix}missions`, scheme);
      });

      test("마지막 날 결정", async ({ page }) => {
        let s = ok(createReservation(createInitialState(T0), req(0), T0));
        s = toTrial(s, "TB-0001", "AIR-01", "PRO-01");
        s = answer(s, "TB-0001", 5);
        const codes = s.reservations[0].ops.wallCodes!;
        s = ok(setCodeCheck(s, "TB-0001", codes.air, codes.pro, at(52)));
        s = ok(submitReward(s, "TB-0001", at(52)));
        s = { ...s, dealerTermsConfirmed: true };
        await seed(page, s);
        await page.goto("my/decide/?id=TB-0001");
        await expect(page.getByTestId("mission-summary")).toBeVisible();
        await page.locator("label", { has: page.getByRole("radio", { name: /써 본 기기를 그대로 살게요/ }) }).click();
        await page.locator("label", { has: page.getByRole("radio", { name: "MacBook Air", exact: true }) }).click();
        await page.locator("label", { has: page.getByRole("radio", { name: "이 결정, 얼마나 확실해요? 4점" }) }).click();
        await page.getByRole("button", { name: "+ 가벼워서 들고 다니기 편했어요" }).click();
        await page.getByRole("button", { name: "+ 영상·과제엔 Air로 충분했어요" }).click();
        await expect(page.getByTestId("return-plan")).toContainText("반납할 기기: MacBook Pro 14형");
        await shot(page, `${prefix}decide`, scheme);
      });
    });

    test.describe("tbyb 헤더 로고", () => {
      test.use({ deviceScaleFactor: 2 });

      for (const width of [320, 390, 1280]) {
        test(`${width}px`, async ({ page }) => {
          await page.setViewportSize({ width, height: 720 });
          await page.goto("");
          await expect(page.getByRole("banner").getByTestId("brand-lockup")).toBeVisible();
          await prepare(page, scheme);
          const header = (await page.getByRole("banner").boundingBox())!;
          await page.screenshot({
            path: join(OUT, `${prefix}brand-header-${width}.png`),
            clip: { x: 0, y: 0, width, height: Math.ceil(header.y + header.height) },
            animations: "disabled",
          });
        });
      }
    });

    test.describe("FAQ", () => {
      test.use({ viewport: MOBILE, deviceScaleFactor: 2 });

      test("미리 알아두면 좋아요 — 첫 질문과 리워드 질문 펼침", async ({ page }) => {
        await page.goto("");
        const faq = page.locator("section", { has: page.getByTestId("faq") });
        await faq.locator("summary").nth(0).click();
        await faq.locator("summary").nth(3).click();
        await expect(faq.locator("details[open]")).toHaveCount(2);
        await prepare(page, scheme);
        // 요소 캡처는 스크롤 위치에 따라 고정 헤더가 겹쳐 찍히므로, 맨 위에서 전체 페이지 기준으로 잘라 찍는다
        const box = (await faq.boundingBox())!;
        await page.screenshot({
          path: join(OUT, `${prefix}intro-faq.png`),
          fullPage: true,
          clip: { x: 0, y: Math.floor(box.y) - 24, width: MOBILE.width, height: Math.ceil(box.height) + 48 },
          animations: "disabled",
        });
      });
    });

    test.describe("데스크톱", () => {
      test.use({ viewport: DESKTOP });

      test("소개", async ({ page }) => {
        await page.goto("");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await shot(page, `${prefix}intro-desktop`, scheme);
      });

      test("운영 시뮬레이터 — 리워드 확인", async ({ page }) => {
        let s = createInitialState(T0);
        s = ok(createReservation(s, req(0), T0));
        s = toTrial(s, "TB-0001", "AIR-01", "PRO-01");
        s = answer(s, "TB-0001", 5);
        const codes = s.reservations[0].ops.wallCodes!;
        // Air 코드는 한 글자 오타 — 참고용 불일치 표시
        const typo = `${codes.air.slice(0, 3)}${codes.air[3] === "Z" ? "Y" : "Z"}`;
        s = ok(setCodeCheck(s, "TB-0001", typo, codes.pro, at(52)));
        s = ok(submitReward(s, "TB-0001", at(52)));
        s = { ...s, dealerTermsConfirmed: true };
        s = ok(setDecision(s, "TB-0001", { choice: "buy_used", model: "air", confidenceAfter: 4, reason: "가벼워서 들고 다니기 편했어요" }, at(60)));
        s = ok(transition(s, "TB-0001", "return_received", "operator", "Pro 반납 · Air 구매 선택", at(66)));
        s = ok(transition(s, "TB-0001", "inspecting", "operator", "반납 기기 검수 시작", at(67)));
        s = ok(setInspection(s, "TB-0001", "pro", "condition", true));
        s = ok(setInspection(s, "TB-0001", "pro", "accessories", true));
        s = ok(createReservation(s, req(1, { usage: "school", leaningBefore: "pro", confidenceBefore: 3 }), T0));
        s = toTrial(s, "TB-0002", "AIR-02", "PRO-02");
        s = answer(s, "TB-0002", 2);
        s = ok(createReservation(s, req(2, { usage: "watch", leaningBefore: "unsure" }), T0));
        await seed(page, s);
        await page.goto("ops/");
        await page.getByRole("button", { name: "TB-0001 열기" }).click();
        await expect(page.getByTestId("reward-review")).toBeVisible();
        await page.locator("#reward-note").fill("Air 코드 한 글자 오타. 두 기기 사용 흔적 확인");
        await shot(page, `${prefix}ops-reward`, scheme);
      });
    });
  });
}
