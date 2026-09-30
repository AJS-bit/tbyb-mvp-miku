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
  setPaymentCheck,
  submitReward,
  transition,
  type DemoState,
  type MissionAnswer,
  type Result,
} from "../src/lib/domain";
import { FIRST_PACK_LABEL, PLATFORM_NAME, PLATFORM_TAGLINE } from "../src/lib/copy";
import { expectReadable } from "./readability";

// tbyb 브랜드 적용 + 교차 리뷰 업그레이드 (SPEC.md 마지막 절)
//  - 플랫폼은 tbyb + "써 보고, 나의 기준으로.", MacBook 은 "첫 비교팩". 예전 태그라인 "써 보고 고르는 맥북"은 어디에도 없다.
//  - 로고: TETO 선택안 도형(라이트 forest·apricot / 다크 cream), 파비콘은 APP_ICON_COLOR.
//  - 리워드는 '금액 미정'을 앞세우고, 1,000원은 항상 '검토 중인 예'로만.
//  - 로컬 데모와 맞지 않는 연락 약속 없음 · 고민 카드는 상상한 예시 · 신뢰 한 줄 · FAQ(키보드로 여닫기) · 비교팩 조건 표.

const MOBILE = { width: 390, height: 844 };
const NARROW = { width: 320, height: 700 };
const DESKTOP = { width: 1280, height: 900 };
const OLD_TAGLINE = "써 보고 고르는 맥북";
const APRICOT = "rgb(241, 132, 99)";
const FOREST = "rgb(25, 61, 53)";
const CREAM = "rgb(247, 243, 234)";
const SAGE = "rgb(220, 230, 207)"; // 다크 컬러 로고(MARK_DARK.svg) 왼쪽·점

function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

const H = 3600_000;
const T0 = new Date(Date.now() - 72 * H);
const at = (h: number) => new Date(T0.getTime() + h * H);

const ANSWERS: Omit<MissionAnswer, "answeredAt">[] = [
  { id: "carry", pick: "air" },
  { id: "video", pick: "same" },
  { id: "screen", pick: "unsure" },
  { id: "typing", pick: "pro" },
  { id: "daily", pick: "air", daily: "영상 보기" },
];

/** TB-0001 체험 중(미션 5개·코드·리워드 신청) · TB-0002 요청 접수 */
function seededState(): DemoState {
  const day = calendarDays(createInitialState(T0), T0).find((d) => d.status === "open")!.date;
  const req = { startDate: day, pickupStore: PICKUP_STORES[0], usage: "unsure" as const, question: "", leaningBefore: "unsure" as const, confidenceBefore: 3 as const };
  let s = ok(createReservation(createInitialState(T0), req, T0));
  s = ok(transition(s, "TB-0001", "operator_check", "operator", "확인", at(1)));
  s = ok(assignDevice(s, "TB-0001", "air", "AIR-01", at(1)));
  s = ok(assignDevice(s, "TB-0001", "pro", "PRO-01", at(1)));
  s = ok(transition(s, "TB-0001", "payment_pending", "operator", "결제 요청", at(2)));
  s = ok(setPaymentCheck(s, "TB-0001", "DEMO-TX-1", true, at(3)));
  s = ok(transition(s, "TB-0001", "confirmed", "operator", "대조 완료", at(3)));
  s = ok(setCheckout(s, "TB-0001", "air", true));
  s = ok(setCheckout(s, "TB-0001", "pro", true));
  s = ok(transition(s, "TB-0001", "in_trial", "operator", "픽업", at(4)));
  ANSWERS.forEach((a, i) => {
    s = ok(answerMission(s, "TB-0001", a, at(10 + i * 5)));
  });
  const codes = s.reservations[0].ops.wallCodes!;
  s = ok(setCodeCheck(s, "TB-0001", codes.air, codes.pro, at(40)));
  s = ok(submitReward(s, "TB-0001", at(40)));
  return ok(createReservation(s, req, T0));
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

/** 접힌 FAQ 까지 펼친 뒤 화면 글자 전체 */
async function allText(page: Page): Promise<string> {
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  return page.locator("body").innerText();
}

/** "1,000원"은 매번 바로 앞에 '예'가 붙어 있어야 한다 (예: '검토 중인 예: 1,000원') */
function expectAmountOnlyAsExample(text: string, where: string) {
  for (const m of text.matchAll(/1,000원/g)) {
    const before = text.slice(Math.max(0, m.index! - 10), m.index);
    expect(before, `${where}: '1,000원' 앞에 '예'가 없음 — "${before}1,000원"`).toMatch(/예:?\s*$/);
  }
}

const ROUTES = ["", "pack/", "request/", "my/", "my/?id=TB-0001", "my/?id=TB-0002", "my/missions/?id=TB-0001", "my/decide/?id=TB-0001", "ops/"];

test.describe("플랫폼 tbyb · 첫 비교팩", () => {
  test.use({ viewport: DESKTOP });

  test("어느 화면에도 '써 보고 고르는 맥북'이 없고, 헤더는 tbyb 로고 · 제목은 tbyb 를 쓴다", async ({ page }) => {
    await seed(page, seededState());
    for (const path of ROUTES) {
      const res = await page.goto(path);
      // 정적 HTML(RSC 데이터 포함) 원문에도 없어야 한다
      expect(await res!.text(), `${path} HTML`).not.toContain(OLD_TAGLINE);
      await expect(page.getByRole("banner").getByTestId("brand-lockup")).toHaveText(PLATFORM_NAME);
      expect(await allText(page), path).not.toContain(OLD_TAGLINE);
      expect(await page.title(), path).toContain(PLATFORM_NAME);
      await expect(page.getByRole("banner")).not.toContainText("Try Before You Buy");
    }
  });

  test("메타데이터: 플랫폼 tbyb · 첫 비교팩: MacBook Air · 14형 Pro", async ({ page }) => {
    await page.goto("");
    await expect(page).toHaveTitle(`${PLATFORM_NAME} — ${FIRST_PACK_LABEL}`);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toContain(PLATFORM_TAGLINE);
    expect(desc).toContain(FIRST_PACK_LABEL);
    await page.goto("pack/");
    await expect(page).toHaveTitle(`첫 비교팩 · ${PLATFORM_NAME}`);
  });

  test("히어로는 MacBook 을 '첫 비교팩'으로 소개하고, 태그라인은 넓은 헤더와 푸터에 있다", async ({ page }) => {
    await page.goto("");
    await expect(page.getByTestId("hero-eyebrow")).toHaveText(/첫 비교팩\s*MacBook Air & 14형 Pro/);
    await expect(page.getByRole("banner").getByText(PLATFORM_TAGLINE)).toBeVisible();
    await expect(page.locator("footer").getByText(PLATFORM_TAGLINE)).toBeVisible();
    await expect(page.locator("footer")).toContainText(FIRST_PACK_LABEL);
    // 좁은 화면 헤더에는 태그라인이 없다 (테마 스위처와 한 줄) — 푸터에는 그대로
    await page.setViewportSize(MOBILE);
    await expect(page.getByRole("banner").getByText(PLATFORM_TAGLINE)).toBeHidden();
    await expect(page.locator("footer").getByText(PLATFORM_TAGLINE)).toBeVisible();
  });

  test("파비콘은 APP_ICON_COLOR(cream 타일 + 컬러 심볼), apple-touch 아이콘도 basePath 아래에서 열린다", async ({ page }) => {
    await page.goto("");
    const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
    expect(icon).toMatch(/^\/tbyb-mvp-miku\/icon\.svg/);
    const svg = await (await page.request.get(icon!)).text();
    for (const c of ["#F7F3EA", "#193D35", "#F18463"]) expect(svg).toContain(c);
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(apple).toMatch(/^\/tbyb-mvp-miku\/apple-icon\.png/);
    const png = await page.request.get(apple!);
    expect(png.status()).toBe(200);
    const buf = await png.body();
    expect(buf.readUInt32BE(16)).toBe(180); // 너비
    expect(buf[25]).toBe(2); // 색 형식 2 = RGB (알파 없음)
  });
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`로고 색 — ${scheme}`, () => {
    test.use({ colorScheme: scheme, viewport: DESKTOP });

    test("라이트는 MARK.svg 색(forest · apricot), 다크는 MARK_REVERSE(cream)", async ({ page }) => {
      await page.goto("");
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      const fills = await page
        .getByRole("banner")
        .getByTestId("brand-lockup")
        .locator("svg > *")
        .evaluateAll((els) => els.map((e) => getComputedStyle(e).fill));
      const word = await page.getByRole("banner").getByTestId("brand-lockup").getByText(PLATFORM_NAME).evaluate((e) => {
        const cs = getComputedStyle(e);
        return { color: cs.color, family: cs.fontFamily, weight: cs.fontWeight };
      });
      expect(fills).toEqual(scheme === "light" ? [FOREST, APRICOT, FOREST] : [SAGE, APRICOT, SAGE]); // 다크에서도 색을 잃지 않는다
      expect(word.color).toBe(scheme === "light" ? FOREST : CREAM);
      expect(word.family).toMatch(/^Georgia/);
      expect(word.weight).toBe("600");
    });
  });
}

test.describe("헤더 폭", () => {
  for (const vp of [NARROW, MOBILE]) {
    test(`${vp.width}px: 로고와 테마 스위처가 한 줄에 들어가고 가로로 넘치지 않는다`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto("");
      const logo = (await page.getByRole("link", { name: `${PLATFORM_NAME} 소개로` }).boundingBox())!;
      const group = (await page.getByRole("radiogroup", { name: "화면 테마" }).boundingBox())!;
      expect(Math.abs(group.y + group.height / 2 - (logo.y + logo.height / 2))).toBeLessThan(6);
      expect(logo.x + logo.width).toBeLessThan(group.x);
      expect(group.x + group.width).toBeLessThanOrEqual(vp.width - 16);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
    });
  }
});

test.describe("리워드 문구 — 금액 미정", () => {
  test.use({ viewport: MOBILE });

  test("소개·내 체험·미션·푸터: '금액 미정'을 앞세우고 1,000원은 항상 '검토 중인 예'로만 보인다", async ({ page }) => {
    await seed(page, seededState());

    await page.goto("");
    const intro = page.getByTestId("reward-intro");
    await expect(intro.getByTestId("reward-amount")).toHaveText(/^금액 미정/);
    for (const step of ["미션 기록", "반납 점검", "운영자 확인"]) await expect(intro.getByTestId("reward-flow")).toContainText(step);
    const introText = await allText(page);
    expect(introText).not.toContain("미션 5개를 마치면");
    expect(introText).not.toContain("리워드를 드려요");
    expect(introText).not.toContain("가정 · 금액 미정");
    expect(introText).toContain("검토 중인 예: 1,000원"); // 검사할 1,000원이 실제로 화면에 있다
    expectAmountOnlyAsExample(introText, "소개");
    await expect(page.locator("footer")).toContainText("리워드는 금액 미정이고");

    await page.goto("my/?id=TB-0001");
    const mini = page.getByTestId("reward-mini");
    await expect(mini.getByTestId("reward-amount")).toHaveText(/^금액 미정/);
    // 신청 뒤 체험 중 — 지금 단계는 '반납 점검'
    await expect(mini.getByTestId("reward-flow").locator('[aria-current="step"]')).toContainText("반납 점검");
    expectAmountOnlyAsExample(await allText(page), "내 체험");

    await page.goto("my/missions/?id=TB-0001");
    const card = page.getByTestId("reward-card");
    await expect(card.getByTestId("reward-amount")).toHaveText(/^금액 미정/);
    await expect(card.getByTestId("reward-flow").locator('[aria-current="step"]')).toContainText("반납 점검");
    await expect(card).toContainText("리워드 금액과 지급 방식은 아직 정하는 중이에요");
    expectAmountOnlyAsExample(await allText(page), "미션");

    for (const path of ["pack/", "request/", "my/decide/?id=TB-0001"]) {
      await page.goto(path);
      expectAmountOnlyAsExample(await allText(page), path);
    }
  });
});

test.describe("로컬 데모에 맞는 말", () => {
  test.use({ viewport: MOBILE });

  test("연락을 약속하지 않고, 이 기기에 저장 · 내 체험 · 운영 시뮬레이터로 안내한다", async ({ page }) => {
    await seed(page, seededState());
    await page.goto("");
    const introText = await allText(page);
    expect(introText).not.toContain("두 대를 준비한 뒤 안내해 드릴게요");
    await expect(page.getByText("요청은 이 기기에 저장돼요. 다음 단계는 ‘내 체험’과 운영 시뮬레이터에서 이어서 볼 수 있어요.")).toBeVisible();

    await page.goto("request/");
    await expect(page.locator("main")).toContainText("데모라서 실제로 연락이 가지는 않아요");
    await expect(page.locator("main").getByRole("link", { name: "운영 시뮬레이터" })).toHaveAttribute("href", "/tbyb-mvp-miku/ops/");

    await page.goto("my/?id=TB-0002"); // 요청 접수
    const main = page.locator("main");
    await expect(main).toContainText("다음 단계는 운영 시뮬레이터에서 넘겨 볼 수 있어요");
    await expect(main).not.toContainText("알려 드릴게요");
    await main.getByRole("link", { name: /운영 시뮬레이터 열기/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("운영 시뮬레이터");
  });

  test("고민 카드는 상상한 예시라고 밝히고, 이름표는 '예:'로 시작한다", async ({ page }) => {
    await page.goto("");
    const worry = page.locator("section", { has: page.locator("#worry") });
    await expect(worry.getByTestId("worry-note")).toHaveText("이런 고민을 상상했어요. 실제 후기는 아니에요.");
    const labels = await worry.locator("li > p").allInnerTexts();
    expect(labels).toHaveLength(3);
    for (const l of labels) expect(l).toMatch(/^— 예: /);
  });
});

test.describe("새 구성 — 신뢰 한 줄 · FAQ · 조건 표", () => {
  test.use({ viewport: MOBILE });

  test("히어로 바로 아래 신뢰 한 줄: 가치 세 개", async ({ page }) => {
    await page.goto("");
    const line = page.getByRole("list", { name: "tbyb로 고르는 방법" });
    await expect(line.getByRole("listitem")).toHaveText(["두 대를 같은 하루에", "스펙보다 내 경험", "기록은 이 기기에만"]);
    const hero = (await page.locator("main section").first().boundingBox())!;
    const box = (await line.boundingBox())!;
    expect(box.y).toBeGreaterThan(hero.y + hero.height);
    expect(box.y - (hero.y + hero.height)).toBeLessThan(80);
  });

  test("FAQ '미리 알아두면 좋아요': 질문 5개, 마지막 CTA 앞, 키보드(Tab · Enter · Space)로 여닫힌다", async ({ page }) => {
    await page.goto("");
    const faq = page.getByTestId("faq");
    const summaries = faq.locator("summary");
    await expect(summaries).toHaveText([
      "지금 예약·결제할 수 있나요?",
      "맥이 처음인데 괜찮을까요?",
      "한 대를 사면 반납은 어떻게 하나요?",
      "리워드는 어떻게 받나요?금액 미정",
      "기록은 어디에 저장되나요?",
    ]);
    await expect(page.getByRole("heading", { name: "미리 알아두면 좋아요", level: 2 })).toBeVisible();
    // 마지막 CTA('먼저 같이 지내 보고…')보다 앞
    const faqBox = (await faq.boundingBox())!;
    const cta = (await page.getByRole("heading", { name: /먼저 같이 지내 보고/ }).boundingBox())!;
    expect(faqBox.y + faqBox.height).toBeLessThan(cta.y);

    // 키보드: 첫 질문에 초점 → Tab 으로 다음 질문들 → Enter 로 열고 Space 로 닫기
    await summaries.nth(0).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("Tab");
    await expect(summaries.nth(3)).toBeFocused();
    const reward = faq.locator("details").nth(3);
    await expect(reward).not.toHaveAttribute("open");
    await page.keyboard.press("Enter");
    await expect(reward).toHaveAttribute("open", "");
    await expect(reward.getByText(/리워드 금액과 지급 방식은 아직 정하는 중이에요/)).toBeVisible();
    await page.keyboard.press("Space");
    await expect(reward).not.toHaveAttribute("open");

    // 예전 '아직 정해지지 않았어요' 상자는 첫 질문에 합쳤다 — 따로 된 섹션은 없다
    await expect(page.getByRole("heading", { name: "아직 정해지지 않았어요" })).toHaveCount(0);
    await summaries.nth(0).focus();
    await page.keyboard.press("Enter");
    const first = faq.locator("details").nth(0);
    await expect(first.getByRole("list", { name: "딜러와 계약한 뒤 정해지는 것" }).getByRole("listitem")).toHaveCount(6);
  });

  test("비교팩 조건 표: 요금·기간 / 매장·계약 주체 / 취소·환불·보증", async ({ page }) => {
    await page.goto("pack/");
    const terms = page.getByTestId("pack-terms");
    await expect(terms.locator("dt")).toHaveText(["체험 요금 · 기간", "픽업 매장 · 계약 주체", "취소 · 환불 · 보증"]);
    await expect(terms.locator("dd")).toHaveText(["딜러와 계약한 뒤 안내해요", "협의하고 있어요", "유료 운영 전에 확정해요"]);
    await expect(page.locator("main")).toContainText("tbyb의 첫 비교팩이에요");
  });
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`새 구성 읽기 대비 — ${scheme}`, () => {
    test.use({ colorScheme: scheme, viewport: MOBILE });

    test("FAQ 를 모두 펼친 소개 · 비교팩 조건 표 · 리워드 진행", async ({ page }) => {
      await seed(page, seededState());
      await page.goto("");
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
      await expectReadable(page, "소개 (FAQ 펼침)");
      await page.setViewportSize(DESKTOP);
      await expectReadable(page, "소개 (FAQ 펼침 · 데스크톱)");
      await page.goto("pack/");
      await expectReadable(page, "비교팩 (조건 표)");
      await page.setViewportSize(MOBILE);
      await page.goto("my/?id=TB-0002");
      await expectReadable(page, "내 체험 — 요청 접수 (운영 시뮬레이터 안내)");
    });
  });
}
