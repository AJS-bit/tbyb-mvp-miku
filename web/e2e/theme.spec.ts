import { expect, test, type Page } from "@playwright/test";
import {
  PICKUP_STORES,
  STORAGE_KEY,
  STORAGE_READ_ERROR,
  STORAGE_WRITE_ERROR,
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
import { THEME_KEY, THEME_SAVE_ERROR } from "../src/lib/theme-core";
import { expectReadable } from "./readability";

// 화면 테마: 시스템(기본)·라이트·다크, 번쩍임 없음, 저장 실패, 키보드·스크린리더, 두 테마의 읽기 대비.
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const DARK_BG = "rgb(22, 19, 15)"; // --color-bg (다크)
const LIGHT_BG = "rgb(250, 246, 239)"; // --color-bg (라이트)

const html = (page: Page) => page.locator("html");
type ThemeName = "시스템" | "라이트" | "다크";
const themeGroup = (page: Page) => page.getByRole("radiogroup", { name: "화면 테마" });
const themeRadio = (page: Page, name: ThemeName) => themeGroup(page).getByRole("radio", { name, exact: true });
/** 라디오를 감싼 칸(label) — has: 는 label 안에서 다시 찾으므로 페이지 루트에서 만든 locator 를 넘긴다 */
const themeOption = (page: Page, name: ThemeName) =>
  themeGroup(page).locator("label", { has: page.getByRole("radio", { name, exact: true }) });

/** sr-only 라디오를 감싼 label 을 눌러 테마를 고른다 */
async function chooseTheme(page: Page, name: ThemeName) {
  await themeOption(page, name).click();
  await expect(themeRadio(page, name)).toBeChecked();
}

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const storedTheme = (page: Page) => page.evaluate((k) => localStorage.getItem(k), THEME_KEY);

test.describe("테마 전환", () => {
  test.use({ colorScheme: "dark", viewport: MOBILE });

  test("기본은 시스템 설정(다크)을 따르고, 저장값은 만들지 않는다", async ({ page }) => {
    await page.goto("");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(html(page)).toHaveAttribute("data-theme-pref", "system");
    await expect(page.getByRole("radiogroup", { name: "화면 테마" })).toBeVisible();
    await expect(themeRadio(page, "시스템")).toBeChecked();
    await expect(themeRadio(page, "라이트")).not.toBeChecked();
    expect(await bodyBg(page)).toBe(DARK_BG);
    // 기본 폼 컨트롤·스크롤바도 다크
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
    expect(await storedTheme(page)).toBeNull();
  });

  test("라이트를 고르면 시스템 다크보다 우선하고, 새로고침·다른 화면에서도 유지된다", async ({ page }) => {
    await page.goto("");
    await chooseTheme(page, "라이트");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(html(page)).toHaveAttribute("data-theme-pref", "light");
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    expect(await storedTheme(page)).toBe("light");
    // 데모 상태 키와는 따로 저장
    expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).not.toContain("light");

    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(themeRadio(page, "라이트")).toBeChecked();

    // 화면 이동(클라이언트 이동)·새 주소 열기 모두 유지
    await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "비교팩", exact: true }).click();
    await expect(page).toHaveURL(/\/pack\/$/);
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await page.goto("request/");
    await expect(html(page)).toHaveAttribute("data-theme", "light");

    // 다크를 고르면 다크, 다시 시스템이면 OS(다크)
    await chooseTheme(page, "다크");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect(await storedTheme(page)).toBe("dark");
  });

  test("시스템을 다시 고르면 OS 설정을 따라가고, OS 가 바뀌면 바로 바뀐다", async ({ page }) => {
    await page.goto("");
    await chooseTheme(page, "라이트");
    // 직접 고른 동안에는 OS 설정이 바뀌어도 그대로
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html(page)).toHaveAttribute("data-theme", "light");

    await chooseTheme(page, "시스템");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect(await storedTheme(page)).toBe("system");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect(await bodyBg(page)).toBe(DARK_BG);
    await expect(themeRadio(page, "시스템")).toBeChecked();
  });

  test("다른 탭에서 바꾼 테마를 따라간다", async ({ page, context }) => {
    await page.goto("");
    const tab2 = await context.newPage();
    await tab2.goto("pack/");
    await expect(html(tab2)).toHaveAttribute("data-theme", "dark");
    await chooseTheme(page, "라이트");
    await expect(html(tab2)).toHaveAttribute("data-theme", "light");
    await expect(themeRadio(tab2, "라이트")).toBeChecked();
    await tab2.close();
  });
});

test.describe("번쩍임 없음", () => {
  test.use({ colorScheme: "dark" });

  test("테마를 정하는 인라인 스크립트가 정적 HTML 의 <head> 안, <body> 앞에 있다", async ({ page }) => {
    const res = await page.request.get("request/");
    expect(res.ok()).toBe(true);
    const doc = await res.text();
    const head = doc.slice(doc.indexOf("<head"), doc.indexOf("</head>"));
    expect(head).toContain(`localStorage.getItem("${THEME_KEY}")`);
    expect(head).toContain('setAttribute("data-theme"');
    expect(doc.indexOf(`localStorage.getItem("${THEME_KEY}")`)).toBeLessThan(doc.indexOf("<body"));
  });

  test("<body> 가 생기는 순간 이미 data-theme·color-scheme 가 붙어 있다 (하이드레이션 전)", async ({ page }) => {
    // 문서가 만들어질 때부터 지켜보다가 <body> 가 처음 들어오는 순간의 값을 적어 둔다
    await page.addInitScript(() => {
      const w = window as unknown as { __atBody?: { theme: string | null; scheme: string } };
      new MutationObserver((_, obs) => {
        if (document.body && !w.__atBody) {
          w.__atBody = { theme: document.documentElement.getAttribute("data-theme"), scheme: document.documentElement.style.colorScheme };
          obs.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto("");
    const atBody = await page.evaluate(() => (window as unknown as { __atBody?: { theme: string; scheme: string } }).__atBody);
    expect(atBody).toEqual({ theme: "dark", scheme: "dark" });
  });

  test("자바스크립트 번들 없이도(하이드레이션 없이) 저장된 테마가 첫 화면에 적용된다", async ({ page }) => {
    await page.route("**/_next/static/**/*.js", (r) => r.abort());
    // 시스템은 다크, 저장값은 라이트 → 라이트
    await page.addInitScript((k) => localStorage.setItem(k, "light"), THEME_KEY);
    await page.goto("");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(html(page)).toHaveAttribute("data-theme-pref", "light");
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    // 하이드레이션이 없었으므로 라디오는 아직 체크되지 않았지만, 고른 칸 모양은 CSS 가 먼저 맞춘다
    await expect(themeRadio(page, "라이트")).not.toBeChecked();
    const selectedBg = await themeOption(page, "라이트").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(selectedBg).toBe("rgb(31, 27, 22)"); // --color-ink (라이트)
  });

  test("저장값이 없으면 자바스크립트 번들 없이도 시스템(다크)이 첫 화면에 적용된다", async ({ page }) => {
    await page.route("**/_next/static/**/*.js", (r) => r.abort());
    await page.goto("pack/");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    expect(await bodyBg(page)).toBe(DARK_BG);
  });
});

test.describe("저장 실패", () => {
  test.use({ colorScheme: "dark", viewport: MOBILE });

  test("테마를 저장하지 못해도 이번 화면에는 적용하고 짧게 알린다 — 데모 데이터와 무관", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((k) => {
      const orig = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === k) throw new DOMException("quota", "QuotaExceededError");
        return orig.call(this, key, value);
      };
    }, THEME_KEY);
    await page.goto("");
    await chooseTheme(page, "라이트");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    expect(await bodyBg(page)).toBe(LIGHT_BG);
    const note = page.getByTestId("theme-save-error");
    await expect(note).toBeVisible();
    await expect(note).toContainText(THEME_SAVE_ERROR);
    await expect(page.getByRole("status").filter({ hasText: THEME_SAVE_ERROR })).toHaveCount(1);
    // 누르는 것을 막지 않는다 — 알림 아래 메뉴도 누를 수 있다
    await page.getByRole("navigation", { name: "주 메뉴" }).getByRole("link", { name: "비교팩", exact: true }).click();
    await expect(page).toHaveURL(/\/pack\/$/);
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    // 데모 저장소 오류 막대는 뜨지 않는다
    await expect(page.getByTestId("storage-write-error")).toHaveCount(0);
    await expect(page.getByText(STORAGE_WRITE_ERROR)).toHaveCount(0);
    // 닫을 수 있다
    await page.getByRole("button", { name: "알림 닫기" }).click();
    await expect(note).toHaveCount(0);
    // 저장되지 않았으니 새로고침하면 시스템(다크)으로 돌아간다
    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(themeRadio(page, "시스템")).toBeChecked();
    expect(errors).toEqual([]);
  });

  test("localStorage 자체에 접근할 수 없어도 오류 없이 시스템 테마로 열리고, 고른 테마는 이번 화면에 적용된다", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("denied", "SecurityError");
        },
      });
    });
    await page.goto("");
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await expect(themeRadio(page, "시스템")).toBeChecked();
    // 데모 저장소는 기존대로 읽기 오류를 알린다
    await expect(page.getByTestId("storage-load-error")).toContainText(STORAGE_READ_ERROR);
    await chooseTheme(page, "라이트");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(page.getByTestId("theme-save-error")).toContainText(THEME_SAVE_ERROR);
    expect(errors).toEqual([]);
  });
});

test.describe("키보드·스크린리더·모바일", () => {
  test.use({ colorScheme: "dark" });

  test("라디오 그룹 — Tab 으로 들어가 화살표로 바꾸고, 초점 링이 보인다", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("");
    const group = page.getByRole("radiogroup", { name: "화면 테마" });
    await expect(group.getByRole("radio")).toHaveCount(3);

    // 초점 순서: 건너뛰기 링크 → 로고 → 메뉴 5개 → 테마
    for (let i = 0; i < 8 && !(await themeRadio(page, "시스템").evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(themeRadio(page, "시스템")).toBeFocused();
    const label = themeOption(page, "시스템");
    // transition-colors 가 outline-color 도 부드럽게 바꾸므로 끝난 값을 기다린다
    await expect
      .poll(() =>
        label.evaluate((el) => {
          const cs = getComputedStyle(el);
          return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`;
        }),
      )
      .toBe("solid 2px rgb(243, 236, 226)"); // --color-ink (다크)

    await page.keyboard.press("ArrowRight");
    await expect(themeRadio(page, "라이트")).toBeChecked();
    await expect(themeRadio(page, "라이트")).toBeFocused();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await page.keyboard.press("ArrowRight");
    await expect(themeRadio(page, "다크")).toBeChecked();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(themeRadio(page, "시스템")).toBeChecked();
  });

  test("모바일 390px: 로고와 같은 줄에 들어가고 가로로 넘치지 않으며, 이름은 읽어 준다", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("");
    const group = page.getByRole("radiogroup", { name: "화면 테마" });
    const g = (await group.boundingBox())!;
    const logo = (await page.getByRole("link", { name: /소개로/ }).boundingBox())!;
    expect(g.x + g.width).toBeLessThanOrEqual(MOBILE.width - 16);
    expect(Math.abs(g.y + g.height / 2 - (logo.y + logo.height / 2))).toBeLessThan(6); // 같은 줄
    expect(logo.x + logo.width).toBeLessThan(g.x); // 겹치지 않음
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(MOBILE.width);
    // 칸마다 누르기 쉬운 크기(36px 이상)
    for (const name of ["시스템", "라이트", "다크"] as const) {
      const box = (await themeOption(page, name).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(36);
      expect(box.width).toBeGreaterThanOrEqual(36);
    }
    await chooseTheme(page, "라이트");
    await expect(html(page)).toHaveAttribute("data-theme", "light");
  });
});

// ───────── 두 테마의 읽기 대비 (실제로 그려진 글자) ─────────

function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

const H = 3600_000;
const T0 = new Date(Date.now() - 72 * H);
const at = (h: number) => new Date(T0.getTime() + h * H);
const openDays = calendarDays(createInitialState(T0), T0).filter((d) => d.status === "open");

const ANSWERS: Omit<MissionAnswer, "answeredAt">[] = [
  { id: "carry", pick: "air", followUp: "가방이 가벼웠어요" },
  { id: "video", pick: "same", battery: { air: { before: 92, after: 81 }, pro: { before: 95, after: 86 } } },
  { id: "screen", pick: "unsure" },
  { id: "typing", pick: "pro", followUp: "트랙패드가 편했어요" },
  { id: "daily", pick: "air", daily: "영상 보기" },
];

/** 체험 중(미션 5개·코드·리워드 신청) TB-0001 · 결제 대기(기한 지남) TB-0002 · 요청 접수 TB-0003 */
function richState(): DemoState {
  let s = createInitialState(T0);
  const req = (i: number) => ({
    startDate: openDays[Math.min(i, openDays.length - 1)].date,
    pickupStore: PICKUP_STORES[i % 2],
    usage: "unsure" as const,
    question: i ? "" : "유튜브랑 과제 정도인데 Pro까지 필요할까요?",
    leaningBefore: "air" as const,
    confidenceBefore: 2 as const,
  });
  s = ok(createReservation(s, req(0), T0));
  s = ok(transition(s, "TB-0001", "operator_check", "operator", "재고 확인", at(1)));
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
  const codes = s.reservations.find((r) => r.id === "TB-0001")!.ops.wallCodes!;
  s = ok(setCodeCheck(s, "TB-0001", `${codes.air.slice(0, 3)}${codes.air[3] === "Z" ? "Y" : "Z"}`, codes.pro, at(40)));
  s = ok(submitReward(s, "TB-0001", at(40)));
  s = ok(createReservation(s, req(1), T0));
  s = ok(transition(s, "TB-0002", "operator_check", "operator", "재고 확인", at(1)));
  s = ok(assignDevice(s, "TB-0002", "air", "AIR-02", at(1)));
  s = ok(assignDevice(s, "TB-0002", "pro", "PRO-02", at(1)));
  s = ok(transition(s, "TB-0002", "payment_pending", "operator", "결제 요청", at(2)));
  s = ok(createReservation(s, req(2), T0));
  return { ...s, dealerTermsConfirmed: true };
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

for (const scheme of ["light", "dark"] as const) {
  test.describe(`읽기 대비 — ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("고객 화면: 소개·비교팩·요청·내 체험·미션·결정", async ({ page }) => {
      await seed(page, richState());
      await page.setViewportSize(DESKTOP);
      await page.goto("");
      await expect(html(page)).toHaveAttribute("data-theme", scheme);
      await expectReadable(page, "소개 (데스크톱)");
      await page.setViewportSize(MOBILE);
      await expectReadable(page, "소개 (모바일)");
      await page.goto("pack/");
      await expectReadable(page, "비교팩");

      await page.goto("request/");
      await page.locator('[data-testid="calendar-day"]:not([data-status="closed"])').nth(1).click();
      await page.locator("label", { has: page.getByRole("radio", { name: "Pro 쪽이에요" }) }).click();
      await page.locator("label", { has: page.getByRole("radio", { name: "그 마음, 얼마나 확실해요? 3점" }) }).click();
      await page.getByRole("button", { name: "데모 일정 요청 보내기" }).click(); // 매장을 고르지 않아 오류 문구
      await expect(page.locator("main").getByRole("alert")).toBeVisible();
      await expectReadable(page, "일정 요청 (고른 날·오류)");

      await page.goto("my/");
      await expectReadable(page, "내 체험 목록");
      await page.goto("my/?id=TB-0002");
      await expect(page.getByTestId("payment-deadline")).toBeVisible();
      await expectReadable(page, "내 체험 — 결제 대기");
      await page.goto("my/?id=TB-0001");
      await expect(page.getByTestId("reward-mini")).toBeVisible();
      await expectReadable(page, "내 체험 — 체험 중");

      await page.goto("my/missions/?id=TB-0001");
      await expect(page.getByTestId("reward-locked")).toBeVisible();
      await expectReadable(page, "미션 (신청 후)");

      await page.goto("my/decide/?id=TB-0001");
      await page.locator("label", { has: page.getByRole("radio", { name: /써 본 기기를 그대로 살게요/ }) }).click();
      await page.locator("label", { has: page.getByRole("radio", { name: "MacBook Pro 14형", exact: true }) }).click();
      await page.getByRole("button", { name: "결정 저장" }).click(); // 오류 문구
      await expect(page.locator("main").getByRole("alert")).toBeVisible();
      await expectReadable(page, "마지막 날 결정 (선택·오류)");
    });

    test("미션 답하기 폼 · 운영 시뮬레이터 · 저장 오류 막대", async ({ page }) => {
      // 미션 폼: 아직 신청 전인 체험
      let s = richState();
      s = {
        ...s,
        reservations: s.reservations.map((r) => (r.id === "TB-0001" ? { ...r, reward: { ...r.reward, status: "none" as const, flags: [] } } : r)),
      };
      await seed(page, s);
      await page.setViewportSize(MOBILE);
      await page.goto("my/missions/?id=TB-0001");
      const heavy = page.getByTestId("mission-heavy");
      await heavy.getByRole("button", { name: /답하기/ }).click();
      await heavy.getByRole("button", { name: "이 답 저장" }).click(); // 오류
      await heavy.locator("label", { has: page.getByRole("radio", { name: "Air가 나았어요" }) }).click();
      await expect(heavy.getByRole("alert")).toBeVisible();
      await expectReadable(page, "미션 폼 (고른 답·오류)");

      await page.setViewportSize(DESKTOP);
      await page.goto("ops/");
      await page.getByRole("button", { name: "TB-0002 열기" }).click();
      await expectReadable(page, "운영 — 결제 대기");
      await page.getByLabel(/데모 시계/).check(); // 결제 기한 지남
      await expectReadable(page, "운영 — 결제 기한 지남");
      await page.getByRole("button", { name: "TB-0001 열기" }).click();
      await expect(page.getByTestId("reward-review")).toBeVisible();
      await expectReadable(page, "운영 — 리워드 확인");

      // 저장 실패 막대 + 테마 저장 실패 알림
      await page.evaluate(() => {
        Storage.prototype.setItem = function () {
          throw new DOMException("quota", "QuotaExceededError");
        };
      });
      await page.getByRole("button", { name: "TB-0003 열기" }).click();
      await page.getByLabel(/변경 사유/).fill("재고 확인");
      await page.getByTestId("ops-panel").getByRole("button", { name: "다음 단계: 운영 확인 중" }).click();
      await expect(page.getByTestId("storage-write-error")).toBeVisible();
      await chooseTheme(page, scheme === "dark" ? "다크" : "라이트");
      await expect(page.getByTestId("theme-save-error")).toBeVisible();
      await expectReadable(page, "저장 실패 막대·테마 알림");
    });

    test("손상된 저장본 막대", async ({ page }) => {
      await page.addInitScript((k) => localStorage.setItem(k, "{broken"), STORAGE_KEY);
      await page.setViewportSize(MOBILE);
      await page.goto("request/");
      const banner = page.getByTestId("storage-load-error");
      await expect(banner).toBeVisible();
      await banner.getByRole("button", { name: "원본 복사" }).click();
      await banner.getByRole("button", { name: "초기화", exact: true }).click();
      await expect(banner.locator("textarea")).toBeVisible();
      await expectReadable(page, "손상된 저장본 막대");
    });
  });
}
