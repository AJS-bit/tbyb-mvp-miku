import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  DEALER_TERMS_TBD,
  INSPECTION_LABEL,
  PICKUP_STORES,
  REWARD_FLAG_LABEL,
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
  setDecision,
  setPaymentCheck,
  submitReward,
  transition,
  type DemoState,
  type Inspection,
  type MissionAnswer,
  type Result,
} from "../src/lib/domain";
import { expectReadable } from "./readability";

// 고객 화면은 모바일, 운영 시뮬레이터는 데스크톱 폭으로 같은 페이지(같은 localStorage)에서 오간다.
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const INSPECTION_FIELDS = Object.keys(INSPECTION_LABEL) as (keyof Inspection)[];
const FLAG_TEXTS = Object.values(REWARD_FLAG_LABEL);

/** sr-only 라디오는 감싼 label 을 눌러 고른다 */
async function pickRadio(scope: Page | Locator, name: string | RegExp) {
  const opts = { name, exact: typeof name === "string" };
  // has: 안의 locator 는 label 기준으로 다시 찾으므로 페이지 루트에서 만든다
  const root = "goto" in scope ? scope : scope.page();
  await scope.locator("label", { has: root.getByRole("radio", opts) }).click();
  await expect(scope.getByRole("radio", opts)).toBeChecked();
}

async function requestDemo(page: Page, expectedId: string) {
  await page.setViewportSize(MOBILE);
  await page.goto("request/");
  await expect(page.getByRole("heading", { name: "데모 일정 요청", level: 1 })).toBeVisible();
  await expect(page.getByText("이름·전화번호를 받지 않아요")).toBeVisible();
  await expect(page.getByText(/마지막 갱신/)).toBeVisible();

  // 마감일은 고를 수 없다
  const closed = page.locator('[data-testid="calendar-day"][data-status="closed"]');
  if (await closed.count()) await expect(closed.first()).toBeDisabled();

  // 용도는 선택 — 기본값 '잘 모르겠어요' 그대로 둔다. 이름·전화번호 입력칸은 없다
  await expect(page.getByRole("radio", { name: "잘 모르겠어요" })).toBeChecked();
  await expect(page.getByRole("textbox")).toHaveCount(1); // 궁금한 점 하나뿐
  await page.locator("#question").fill("유튜브랑 과제 정도인데 Pro까지 필요할까요?");
  await pickRadio(page, "Air 쪽");

  // domain 의 오류 문구가 순서대로 그대로 보인다
  const submit = page.getByRole("button", { name: "데모 일정 요청 보내기" });
  const alert = page.locator("main").getByRole("alert");
  await submit.click();
  await expect(alert).toHaveText("희망 시작일을 골라 주세요.");
  await page.locator('[data-testid="calendar-day"][data-status="open"]').first().click();
  await submit.click();
  await expect(alert).toHaveText("픽업 매장을 골라 주세요.");
  await page.getByRole("radio", { name: PICKUP_STORES[0] }).check();
  await submit.click();
  await expect(alert).toHaveText("체험 전 확신을 1–5 중에서 골라 주세요.");
  await pickRadio(page, "그 마음, 얼마나 확실해요? 2점");
  await submit.click();

  await expect(page).toHaveURL(new RegExp(`/tbyb-mvp-miku/my/\\?id=${expectedId}$`));
  await expect(page.getByTestId("res-id")).toHaveText(expectedId);
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

function mission(page: Page, id: string) {
  return page.getByTestId(`mission-${id}`);
}

async function openMission(page: Page, id: string) {
  await mission(page, id).getByRole("button", { name: /^(답하기|답 바꾸기)/ }).click();
}

async function saveMission(page: Page, id: string) {
  await mission(page, id).getByRole("button", { name: "이 답 저장" }).click();
}

/** 고객 화면에는 리워드 검토 표시(flag)·예상 코드·일치 여부가 보이지 않는다 */
async function expectNoFlagsOnCustomerPage(page: Page, hiddenCodes: string[] = []) {
  const main = page.locator("main");
  for (const t of FLAG_TEXTS) await expect(main.getByText(t)).toHaveCount(0);
  for (const t of ["불일치", "일치", "몰아서", "증명", "인증"]) await expect(main.getByText(t)).toHaveCount(0);
  const text = await main.innerText();
  for (const c of hiddenCodes) expect(text).not.toContain(c);
}

function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

/** domain 함수로 만든 상태를 저장하고 연다 (리워드 부분만 빠르게 확인하는 테스트용) */
async function seed(page: Page, s: DemoState) {
  await page.goto("");
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(s)] as const);
}

const H = 3600_000;
function seededTrial(): { s: DemoState; t0: Date } {
  const t0 = new Date(Date.now() - 72 * H);
  const at = (h: number) => new Date(t0.getTime() + h * H);
  const day = calendarDays(createInitialState(t0), t0).find((d) => d.status === "open")!.date;
  let s = ok(
    createReservation(
      createInitialState(t0),
      { startDate: day, pickupStore: PICKUP_STORES[0], usage: "unsure", question: "", leaningBefore: "unsure", confidenceBefore: 3 },
      t0,
    ),
  );
  s = ok(transition(s, "TB-0001", "operator_check", "operator", "확인", at(1)));
  s = ok(assignDevice(s, "TB-0001", "air", "AIR-01", at(1)));
  s = ok(assignDevice(s, "TB-0001", "pro", "PRO-01", at(1)));
  s = ok(transition(s, "TB-0001", "payment_pending", "operator", "결제 요청", at(2)));
  s = ok(setPaymentCheck(s, "TB-0001", "DEMO-TX-1", true, at(3)));
  s = ok(transition(s, "TB-0001", "confirmed", "operator", "대조 완료", at(3)));
  s = ok(setCheckout(s, "TB-0001", "air", true));
  s = ok(setCheckout(s, "TB-0001", "pro", true));
  s = ok(transition(s, "TB-0001", "in_trial", "operator", "픽업", at(4)));
  return { s, t0 };
}

test("요청 → 운영 확인 → 결제 대조 → 체험 → 미션·코드·리워드 → 결정 → 반납·검수·리워드 확인 → 완료", async ({ page, context }) => {
  // ── 1. 고객: 데모 일정 요청 (모바일, 용도 기본값)
  await requestDemo(page, "TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("요청 접수");
  // 이 흐름은 라이트(chromium)와 다크(chromium-dark) 프로젝트에서 모두 돈다 — 테마는 시스템 설정을 따른다
  const scheme = test.info().project.use.colorScheme === "dark" ? "dark" : "light";
  await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
  await expectReadable(page, "1. 고객 — 요청 접수");
  await expect(page.locator("main")).toContainText("주로 할 것 같은 일");
  await expect(page.locator("main")).toContainText("잘 모르겠어요");
  // 고객 화면에는 단계를 넘기는 버튼이 없고, 출고 전 취소만 있다
  await expect(page.getByRole("button", { name: /다음 단계/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "요청 취소" })).toBeVisible();

  // ── 2. 운영: 단계 건너뛰기 불가 + 사유 필수
  await openOps(page, "TB-0001");
  const panel = page.getByTestId("ops-panel");
  await expect(panel.getByRole("button", { name: /^다음 단계:/ })).toHaveCount(1);
  for (const skip of ["결제 대기", "예약 확정", "체험 중", "반납 접수", "검수 중", "완료"]) {
    await expect(panel.getByRole("button", { name: `다음 단계: ${skip}` })).toHaveCount(0);
  }
  await panel.getByRole("button", { name: "다음 단계: 운영 확인 중" }).click();
  await expect(panel.getByRole("alert")).toHaveText("운영자 상태 변경에는 사유가 필요합니다.");
  await expectReadable(page, "2. 운영 — 사유 필수 오류");
  await expect(panelStatus(page)).toHaveText("요청 접수");
  await move(page, "운영 확인 중", "딜러에게 Air·Pro 두 대 재고 확인");

  // ── 3. 기기 확보 전에는 결제 대기로 못 간다
  await expect(panel.getByRole("button", { name: "다음 단계: 결제 대기" })).toBeDisabled();
  await expect(panel.getByTestId("blocked-payment_pending")).toContainText("Air와 Pro 두 대를 모두 확보해야");
  await expectReadable(page, "3. 운영 — 기기 확보 전 막힘");
  await page.getByLabel("MacBook Air 기기 배정").selectOption("AIR-01");
  await page.getByLabel("MacBook Pro 14형 기기 배정").selectOption("PRO-01");
  await expect(device(page, "AIR-01")).toContainText("예약 보류");
  await expect(device(page, "PRO-01")).toContainText("예약 보류");
  await move(page, "결제 대기", "두 대 확보 — 결제 요청");

  // ── 4. 새로고침해도 저장이 복원된다
  await page.reload();
  await selectRes(page, "TB-0001");
  await expect(panelStatus(page)).toHaveText("결제 대기");
  await expect(device(page, "AIR-01")).toContainText("TB-0001");

  // ── 5. 고객: 결제 대기 화면
  await page.setViewportSize(MOBILE);
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("결제 대기");
  await expect(page.getByTestId("payment-deadline")).toBeVisible();
  await expect(page.getByRole("button", { name: "결제 링크 (데모 — 실제 결제 없음)" })).toBeDisabled();
  await expect(page.getByText(/결제 화면 캡처로는 확정되지 않아요/)).toBeVisible();
  await expectReadable(page, "5. 고객 — 결제 대기");

  // ── 6. 운영: 거래 대조 없이는 확정 불가 → 확정 → 출고 기록 → 체험 중
  await openOps(page, "TB-0001");
  await expect(panel.getByRole("button", { name: "다음 단계: 예약 확정" })).toBeDisabled();
  await page.getByLabel("데모 거래 식별자").fill("DEMO-TX-0001");
  await expect(panel.getByTestId("blocked-confirmed")).toContainText("대조를 완료해야");
  await page.getByLabel("거래내역·예약ID 대조 완료").check();
  await move(page, "예약 확정", "거래내역·예약ID 대조 완료");
  // 코드는 예약 확정 때 생긴다 — 출고 전에 두 맥 바탕화면에 띄워 둘 수 있게
  await expect(panel.getByTestId("wall-codes")).toContainText("출고 때 바탕화면에 띄울 코드");
  await page.getByLabel("MacBook Air 출고 기록 완료").check();
  await expect(panel.getByRole("button", { name: "다음 단계: 체험 중" })).toBeDisabled();
  await page.getByLabel("MacBook Pro 14형 출고 기록 완료").check();
  await move(page, "체험 중", "픽업 완료 — 두 기기 출고");
  await expect(device(page, "AIR-01")).toContainText("고객 사용 중");
  await expect(panel.getByTestId("blocked-return_received")).toContainText("마지막 날 결정");
  await expectReadable(page, "6. 운영 — 체험 중·바탕화면 코드");

  // ── 7. 운영: 체험 중에도 같은 코드가 보인다
  const airCode = (await page.getByTestId("wall-code-air").innerText()).trim();
  const proCode = (await page.getByTestId("wall-code-pro").innerText()).trim();
  expect(airCode).toMatch(/^[A-Z2-9]{4}$/);
  expect(proCode).toMatch(/^[A-Z2-9]{4}$/);
  const wrongAir = airCode === "ZZZZ" ? "YYYY" : "ZZZZ";
  await expect(page.getByTestId("reward-review")).toContainText("고객이 아직 리워드를 신청하지 않았습니다.");

  // ── 8. 고객: 내 체험 — 미션 진행·리워드 요약 (코드는 보이지 않음)
  await page.setViewportSize(MOBILE);
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("체험 중");
  await expect(page.getByTestId("mission-progress")).toContainText("0/5");
  await expect(page.getByTestId("reward-mini")).toContainText("아직 신청 전");
  await expectReadable(page, "8. 고객 — 체험 중");
  await expectNoFlagsOnCustomerPage(page, [airCode, proCode]);
  await page.getByRole("link", { name: "미션 하러 가기" }).click();
  await expect(page.getByRole("heading", { name: "오늘은 어떤 걸 해 볼까요?", level: 1 })).toBeVisible();
  await expect(page.getByText("픽업할 때 두 맥 바탕화면에 적힌 4자리 코드를 적어 주세요", { exact: false })).toBeVisible();
  await expect(page.getByText("비슷했거나 모르겠어도 그대로 골라 주세요", { exact: false }).first()).toBeVisible();
  const submitReward = page.getByRole("button", { name: "리워드 신청하기" });
  await expect(submitReward).toBeDisabled();
  await expectNoFlagsOnCustomerPage(page, [airCode, proCode]);
  await expectReadable(page, "8. 고객 — 미션 화면");

  // ── 9. 미션: 들고 나가 보기 — 고르지 않으면 domain 문구
  await openMission(page, "carry");
  await saveMission(page, "carry");
  await expect(mission(page, "carry").getByRole("alert")).toContainText("어느 쪽이었는지 골라 주세요");
  await pickRadio(mission(page, "carry"), "Air가 나았어요");
  await expectReadable(page, "9. 미션 폼 — 고른 답·오류");
  await mission(page, "carry").getByRole("button", { name: "가방이 가벼웠어요" }).click();
  await saveMission(page, "carry");
  await expect(page.getByText("‘들고 나가 보기’ 답을 저장했어요.")).toBeVisible();
  await expect(mission(page, "carry").getByTestId("mission-answer")).toContainText("Air가 나았어요");
  await expect(mission(page, "carry").getByTestId("mission-answer")).toContainText("가방이 가벼웠어요");

  // ── 10. 같은 영상 — 배터리(선택)는 적는다면 네 칸 모두, 끝이 시작보다 높으면 domain 오류
  await openMission(page, "video");
  await pickRadio(mission(page, "video"), "비슷했어요");
  await page.getByLabel("MacBook Air 시작 배터리 %").fill("90");
  await saveMission(page, "video");
  await expect(mission(page, "video").getByRole("alert")).toContainText("두 맥의 시작·끝 %를 모두");
  await page.getByLabel("MacBook Air 끝 배터리 %").fill("82");
  await page.getByLabel("MacBook Pro 14형 시작 배터리 %").fill("90");
  await page.getByLabel("MacBook Pro 14형 끝 배터리 %").fill("95");
  await saveMission(page, "video");
  await expect(mission(page, "video").getByRole("alert")).toContainText("끝 배터리가 시작보다 높아요");
  await expectReadable(page, "10. 미션 폼 — 배터리 입력");
  await page.getByLabel("MacBook Pro 14형 끝 배터리 %").fill("84");
  await saveMission(page, "video");
  await expect(mission(page, "video").getByTestId("mission-answer")).toContainText("배터리 Air 90→82% · Pro 90→84%");

  // ── 11. 밝은 곳·어두운 곳 — '잘 모르겠어요'도 유효한 답
  await openMission(page, "screen");
  await pickRadio(mission(page, "screen"), "잘 모르겠어요");
  await saveMission(page, "screen");
  await expect(mission(page, "screen").getByTestId("mission-answer")).toContainText("잘 모르겠어요");

  // ── 12. 메모 5분
  await openMission(page, "typing");
  await pickRadio(mission(page, "typing"), "Pro가 나았어요");
  await saveMission(page, "typing");
  await expect(mission(page, "typing").getByTestId("mission-answer")).toContainText("Pro가 나았어요");

  // ── 13. 평소 폰으로 하는 일 — 해 본 일 칩은 domain 이 요구
  await openMission(page, "daily");
  await pickRadio(mission(page, "daily"), "Air가 나았어요");
  await saveMission(page, "daily");
  await expect(mission(page, "daily").getByRole("alert")).toHaveText("무엇을 해 봤는지 골라 주세요.");
  await pickRadio(mission(page, "daily"), "쇼핑·검색");
  await saveMission(page, "daily");
  await expect(mission(page, "daily").getByTestId("mission-answer")).toContainText("해 본 일: 쇼핑·검색");

  // 신청 전에는 답을 바꿀 수 있다
  await openMission(page, "typing");
  await expect(mission(page, "typing").getByRole("radio", { name: "Pro가 나았어요" })).toBeChecked();
  await pickRadio(mission(page, "typing"), "비슷했어요");
  await saveMission(page, "typing");
  await expect(mission(page, "typing").getByTestId("mission-answer")).toContainText("비슷했어요");

  // ── 14. 핵심 미션 5/5 — 코드가 없으면 아직 신청 불가
  await expect(page.getByTestId("reward-progress")).toHaveText("5/5");
  await expect(submitReward).toBeDisabled();
  await expect(page.getByTestId("reward-card")).toContainText("남은 것: 바탕화면 코드");
  await expectReadable(page, "14. 미션 5/5 — 코드 전");

  // ── 15. 바탕화면 코드 — Air 는 일부러 틀리게(검토 표시용), Pro 는 소문자로 (정규화)
  const codeCard = page.getByTestId("code-card");
  await codeCard.getByRole("button", { name: "코드 저장" }).click();
  await expect(codeCard.getByRole("alert")).toHaveText("두 맥의 바탕화면 코드를 모두 적어 주세요.");
  await page.getByLabel("MacBook Air 바탕화면 코드").fill(wrongAir.toLowerCase());
  await page.getByLabel("MacBook Pro 14형 바탕화면 코드").fill(` ${proCode.toLowerCase()} `);
  await codeCard.getByRole("button", { name: "코드 저장" }).click();
  await expect(codeCard.getByText("코드를 저장했어요.")).toBeVisible();
  await expect(codeCard.getByTestId("code-saved")).toContainText(`Air ${wrongAir} · Pro ${proCode}`);
  // 맞았는지 틀렸는지 고객에게 알려 주지 않는다
  await expectNoFlagsOnCustomerPage(page, [airCode]);

  // ── 16. 두 번째 탭을 열어 둔 채 신청 — 다른 탭도 신청 완료로 바뀌고 다시 신청할 수 없다
  const tab2 = await context.newPage();
  await tab2.setViewportSize(MOBILE);
  await tab2.goto("my/missions/?id=TB-0001");
  await expect(tab2.getByRole("button", { name: "리워드 신청하기" })).toBeEnabled();

  await expect(submitReward).toBeEnabled();
  await submitReward.click();
  const rewardCard = page.getByTestId("reward-card");
  await expect(rewardCard.getByTestId("reward-status")).toHaveText("운영자 확인 대기");
  await expect(rewardCard.getByTestId("reward-locked")).toContainText("이제 답과 코드는 바꿀 수 없어요");
  await expect(page.getByRole("button", { name: "리워드 신청하기" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /답 바꾸기|답하기/ })).toHaveCount(0);
  await expect(page.getByLabel("MacBook Air 바탕화면 코드")).toBeDisabled();
  await expectReadable(page, "16. 리워드 신청 후 잠김");

  await expect(tab2.getByTestId("reward-card").getByTestId("reward-status")).toHaveText("운영자 확인 대기");
  await expect(tab2.getByRole("button", { name: "리워드 신청하기" })).toHaveCount(0);
  await tab2.close();

  // 새로고침해도 잠김 유지, 고객 화면에 검토 표시 없음 (rushed·code_mismatch 가 붙어 있어도)
  await page.reload();
  await expect(page.getByTestId("reward-card").getByTestId("reward-status")).toHaveText("운영자 확인 대기");
  await expect(page.getByRole("button", { name: "리워드 신청하기" })).toHaveCount(0);
  await expectNoFlagsOnCustomerPage(page, [airCode]);

  // ── 17. 운영: 신청된 리워드 — 표시는 운영자만, 체험 중에는 승인·거절 불가
  await openOps(page, "TB-0001");
  await expect(page.getByTestId("reward-queue")).toContainText("운영자 확인 대기");
  const review = page.getByTestId("reward-review");
  await expect(review.getByTestId("reward-flags")).toContainText(REWARD_FLAG_LABEL.code_mismatch);
  await expect(review.getByTestId("reward-flags")).toContainText(REWARD_FLAG_LABEL.rushed);
  await expect(review.getByTestId("code-match-air")).toHaveText("불일치");
  await expect(review.getByTestId("code-match-pro")).toHaveText("일치");
  await expect(review).toContainText("잘 모르겠어요");
  await expect(review).toContainText("배터리 Air 90→82% · Pro 90→84%");
  await expect(review.getByRole("button", { name: "리워드 승인" })).toBeDisabled();
  await expect(review.getByTestId("reward-review-blocked")).toContainText("반납 검수 단계부터");
  await expectReadable(page, "17. 운영 — 리워드 검토 표시");

  // ── 18. 고객: 결정 — 딜러 조건 확정 전에는 구매 선택 불가
  await page.setViewportSize(MOBILE);
  await page.goto("my/decide/?id=TB-0001");
  await expect(page.getByRole("heading", { name: "마지막 날, 어떻게 할까요?", level: 1 })).toBeVisible();
  const summary = page.getByTestId("mission-summary");
  await expect(summary.getByTestId("summary-air")).toContainText("2");
  await expect(summary.getByTestId("summary-same")).toContainText("2");
  await expect(summary.getByTestId("summary-pro")).toContainText("0");
  await expect(summary.getByTestId("summary-unsure")).toContainText("1");
  await expect(page.getByTestId("mission-pick-list")).toContainText("해 본 일: 쇼핑·검색");
  await expect(page.getByRole("radio", { name: /체험한 기기 그대로 구매/ })).toBeDisabled();
  await expect(page.getByText(DEALER_TERMS_TBD).first()).toBeVisible();
  await expectReadable(page, "18. 결정 — 구매 선택 막힘");
  await expectNoFlagsOnCustomerPage(page, [airCode]);

  await openOps(page);
  await page.getByLabel(/데모 설정: 딜러 판매 조건 확정됨/).check();

  await page.setViewportSize(MOBILE);
  await page.goto("my/decide/?id=TB-0001");
  await pickRadio(page, /체험한 기기 그대로 구매/);
  await pickRadio(page, "MacBook Pro 14형");
  await pickRadio(page, "체험 후, 이 결정에 얼마나 확신하나요? 4점");
  await page.getByRole("button", { name: "결정 저장" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("선택한 이유를 한 줄 남겨 주세요");
  // 빠른 이유 칩은 입력칸을 채운다
  await page.getByRole("button", { name: "+ 무거운 작업에서 Pro가 빨랐어요" }).click();
  await page.getByRole("button", { name: "+ 화면이 커서 오래 봐도 편했어요" }).click();
  await expect(page.getByLabel(/고른 이유/)).toHaveValue("무거운 작업에서 Pro가 빨랐어요. 화면이 커서 오래 봐도 편했어요");
  const plan = page.getByTestId("return-plan");
  await expect(plan).toContainText("반납할 기기: MacBook Air");
  await expect(plan).toContainText("딜러 판매가 확인돼야 구매로 확정돼요");
  await expect(page.getByTestId("before-after")).toContainText("Air 쪽");
  await expect(page.getByTestId("before-after")).toContainText("(+2)");
  await expectReadable(page, "18. 결정 — 이유·반납 계획");
  await page.getByRole("button", { name: "결정 저장" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("결정을 저장했어요");

  // ── 19. 운영: 반납 접수 → Air 검수 대기, Pro 딜러 판매 확인 대기
  await openOps(page, "TB-0001");
  await move(page, "반납 접수", "Air 반납 · Pro 구매 선택");
  await expect(device(page, "AIR-01")).toContainText("검수 대기 (재대여 불가)");
  await expect(device(page, "PRO-01")).toContainText("딜러 판매 확인 대기");

  // ── 20. 두 번째 예약: 검수 대기·구매 대기 기기는 배정 불가
  await requestDemo(page, "TB-0002");
  await openOps(page, "TB-0002");
  await move(page, "운영 확인 중", "딜러 확인");
  const airSelect = page.getByLabel("MacBook Air 기기 배정");
  await expect(airSelect.locator('option[value="AIR-01"]')).toBeDisabled();
  await expect(airSelect.locator('option[value="AIR-02"]')).toBeEnabled();
  await expect(page.getByTestId("unavailable-air")).toContainText("AIR-01 — 검수 대기 (재대여 불가)");
  await expect(page.getByLabel("MacBook Pro 14형 기기 배정").locator('option[value="PRO-01"]')).toBeDisabled();

  // ── 21. TB-0001 검수 중 → 리워드 확인: 표시가 있으면 메모 필수 → 승인
  await selectRes(page, "TB-0001");
  await move(page, "검수 중", "반납 기기 검수 시작");
  await expect(review.getByRole("button", { name: "리워드 승인" })).toBeEnabled();
  await review.getByRole("button", { name: "리워드 승인" }).click();
  await expect(review.getByRole("alert")).toHaveText("거절하거나 표시가 있는 건을 승인할 때는 확인 메모가 필요합니다.");
  await expect(review.getByTestId("reward-status")).toHaveText("운영자 확인 대기");
  await review.getByLabel(/확인 메모/).fill("Air 코드 오타. 두 기기 사용 흔적 확인");
  await review.getByRole("button", { name: "리워드 승인" }).click();
  await expect(review.getByTestId("reward-status")).toHaveText("확인 완료 · 지급 예정");
  await expect(review).toContainText("메모: Air 코드 오타. 두 기기 사용 흔적 확인");
  await expect(review.getByRole("button", { name: "리워드 승인" })).toHaveCount(0);
  await expectReadable(page, "21. 운영 — 리워드 승인");

  // ── 22. 검수·판매 확인 전에는 완료 불가 → 완료
  const complete = panel.getByRole("button", { name: "다음 단계: 완료" });
  await expect(complete).toBeDisabled();
  await expect(page.getByTestId("inspect-pro").getByRole("checkbox")).toHaveCount(0);
  for (const f of INSPECTION_FIELDS) await page.getByLabel(`MacBook Air ${INSPECTION_LABEL[f]}`).check();
  await expect(page.getByTestId("inspect-air")).toContainText("검수 완료");
  await expect(complete).toBeDisabled();
  await expect(panel.getByTestId("blocked-completed")).toContainText("딜러 판매 확인");
  await page.getByRole("button", { name: "딜러 판매 확인", exact: true }).click();
  await expect(device(page, "PRO-01")).toContainText("판매 확인 · 재고 제외");
  await move(page, "완료", "Air 검수 완료 · Pro 딜러 판매 확인");
  await expect(device(page, "AIR-01")).toContainText("요청 가능");

  const history = panel.getByRole("table").last();
  await expect(history).toContainText("딜러에게 Air·Pro 두 대 재고 확인");
  await expect(history).toContainText("리워드 확인 완료 · 지급 예정");
  await expect(history).toContainText("운영 메모: Air 코드 오타. 두 기기 사용 흔적 확인");
  await expect(history).toContainText("Air 검수 완료 · Pro 딜러 판매 확인");
  await expectReadable(page, "22. 운영 — 완료·이력");

  // ── 23. 새로고침 후에도 완료 상태 복원, 고객 화면 반영 (표시·메모 없이 상태만)
  await page.reload();
  await expect(device(page, "AIR-01")).toContainText("요청 가능");
  await selectRes(page, "TB-0001");
  await expect(page.getByTestId("reward-review").getByTestId("reward-status")).toHaveText("확인 완료 · 지급 예정");
  await page.setViewportSize(MOBILE);
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("status-chip").first()).toHaveText("완료");
  await expect(page.getByTestId("return-air")).toContainText("반납 · 검수");
  await expect(page.getByTestId("return-pro")).toContainText("딜러 판매 확인 완료");
  await expect(page.getByTestId("reward-mini").getByTestId("reward-status")).toHaveText("확인 완료 · 지급 예정");
  await expect(page.getByRole("button", { name: "요청 취소" })).toHaveCount(0);
  await expectNoFlagsOnCustomerPage(page, [airCode]);
  // 운영자 확인 메모는 고객 이력에 남기지 않고 상태만 보인다
  await expect(page.locator("main").getByText("운영자 · 리워드 확인 완료 · 지급 예정", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Air 코드 오타");
  await expect(page.locator("main")).not.toContainText("운영 메모");
  await expect(page.locator("main").getByText("코드 오타")).toHaveCount(0);
  await expectReadable(page, "23. 고객 — 완료");
  await page.goto("my/missions/?id=TB-0001");
  await expect(page.getByTestId("reward-card").getByTestId("reward-status")).toHaveText("확인 완료 · 지급 예정");
  await expectNoFlagsOnCustomerPage(page, [airCode]);
});

test("리워드는 체험 건당 한 번 — 신청 뒤에는 어느 탭에서도 다시 신청·수정할 수 없다", async ({ page, context }) => {
  let { s } = seededTrial();
  const answers: Omit<MissionAnswer, "answeredAt">[] = [
    { id: "carry", pick: "air" },
    { id: "video", pick: "same" },
    { id: "screen", pick: "unsure" },
    { id: "typing", pick: "pro" },
    { id: "daily", pick: "air", daily: "영상 보기" },
  ];
  answers.forEach((a, i) => (s = ok(answerMission(s, "TB-0001", a, new Date(Date.now() - (10 - i) * H)))));
  const codes = s.reservations[0].ops.wallCodes!;
  s = ok(setCodeCheck(s, "TB-0001", codes.air, codes.pro, new Date(Date.now() - H)));
  await page.setViewportSize(MOBILE);
  await seed(page, s);

  await page.goto("my/missions/?id=TB-0001");
  const tab2 = await context.newPage();
  await tab2.setViewportSize(MOBILE);
  await tab2.goto("my/missions/?id=TB-0001");
  await expect(page.getByRole("button", { name: "리워드 신청하기" })).toBeEnabled();
  await expect(tab2.getByRole("button", { name: "리워드 신청하기" })).toBeEnabled();

  await page.getByRole("button", { name: "리워드 신청하기" }).click();
  await expect(page.getByTestId("reward-status")).toHaveText("운영자 확인 대기");
  // 다른 탭도 저장본을 다시 읽어 신청 완료로 바뀐다 — 두 번째 신청 버튼이 남지 않는다
  await expect(tab2.getByTestId("reward-status")).toHaveText("운영자 확인 대기");
  await expect(tab2.getByRole("button", { name: "리워드 신청하기" })).toHaveCount(0);
  await expect(tab2.getByRole("button", { name: /답 바꾸기/ })).toHaveCount(0);

  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), STORAGE_KEY);
  expect(saved.reservations[0].reward.status).toBe("submitted");
  expect(saved.reservations[0].reward.flags).toEqual([]);
  await tab2.close();
});

test("리워드 거절: 고객에게는 상태와 운영자 메모만, 검토 표시는 보이지 않는다", async ({ page }) => {
  let { s } = seededTrial();
  // 전부 '모르겠음' + 배터리 이상 + 코드 불일치 + 몰아서 답함
  const now = new Date(Date.now() - 2 * H);
  for (const m of ["carry", "video", "screen", "typing", "daily"] as const) {
    const extra = m === "video" ? { battery: { air: { before: 90, after: 20 }, pro: { before: 90, after: 88 } } } : m === "daily" ? { daily: "기타" } : {};
    s = ok(answerMission(s, "TB-0001", { id: m, pick: "unsure", ...extra }, now));
  }
  s = ok(setCodeCheck(s, "TB-0001", "ABCD", "EFGH", now));
  s = ok(submitReward(s, "TB-0001", now));
  s = ok(setDecision(s, "TB-0001", { choice: "return_both", confidenceAfter: 3, reason: "둘 다 비슷" }, now));
  s = ok(transition(s, "TB-0001", "return_received", "operator", "반납", now));
  s = ok(transition(s, "TB-0001", "inspecting", "operator", "검수", now));
  const flags = s.reservations[0].reward.flags;
  expect(flags.length).toBeGreaterThanOrEqual(4);
  await page.setViewportSize(DESKTOP);
  await seed(page, s);

  await openOps(page, "TB-0001");
  const review = page.getByTestId("reward-review");
  for (const f of flags) await expect(review.getByTestId("reward-flags")).toContainText(REWARD_FLAG_LABEL[f]);
  await review.getByRole("button", { name: "리워드 거절" }).click();
  await expect(review.getByRole("alert")).toHaveText("거절하거나 표시가 있는 건을 승인할 때는 확인 메모가 필요합니다.");
  await review.getByLabel(/확인 메모/).fill("기기 사용 흔적이 거의 없어 이번에는 지급하지 않아요");
  await review.getByRole("button", { name: "리워드 거절" }).click();
  await expect(review.getByTestId("reward-status")).toHaveText("지급 안 함");

  await page.setViewportSize(MOBILE);
  for (const path of ["my/?id=TB-0001", "my/missions/?id=TB-0001", "my/decide/?id=TB-0001"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoFlagsOnCustomerPage(page, [s.reservations[0].ops.wallCodes!.air, s.reservations[0].ops.wallCodes!.pro]);
  }
  await page.goto("my/missions/?id=TB-0001");
  await expect(page.getByTestId("reward-card").getByTestId("reward-status")).toHaveText("지급 안 함");
  await expect(page.getByTestId("reward-card")).toContainText("운영자 메모: 기기 사용 흔적이 거의 없어 이번에는 지급하지 않아요");
  await page.goto("my/?id=TB-0001");
  await expect(page.getByTestId("reward-mini")).toContainText("운영자 메모: 기기 사용 흔적이 거의 없어 이번에는 지급하지 않아요");
});

test("예전 비교 기록 주소는 미션 화면으로 옮겨 준다", async ({ page }) => {
  const { s } = seededTrial();
  await page.setViewportSize(MOBILE);
  await seed(page, s);
  await page.goto("my/record/?id=TB-0001");
  await expect(page).toHaveURL(/\/my\/missions\/\?id=TB-0001$/);
  await expect(page.getByRole("heading", { name: "오늘은 어떤 걸 해 볼까요?", level: 1 })).toBeVisible();
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
  await expect(page.getByText("취소된 요청이에요").first()).toBeVisible();
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
  await pickRadio(page, "코딩");
  await pickRadio(page, "그 마음, 얼마나 확실해요? 3점");
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
  expect(saved.version).toBe(2);
  expect(saved.reservations).toHaveLength(0);
  await page.getByRole("button", { name: "데모 일정 요청 보내기" }).click();
  await expect(page).toHaveURL(/\/my\/\?id=TB-0001$/);
});

test("초기화 중 한 키만 실패해도 화면과 저장본이 같다 (부분 실패, 데모 시계 보존)", async ({ page }) => {
  const clockKey = `${STORAGE_KEY}:clock-offset-hours`;
  await page.setViewportSize(DESKTOP);
  await page.goto("ops/");
  // 도메인 키는 손상, 데모 시계 키는 정상(+25시간)
  await page.evaluate(
    ([k, ck]) => {
      localStorage.setItem(k, "{broken");
      localStorage.setItem(ck, "25");
    },
    [STORAGE_KEY, clockKey],
  );
  await page.reload();
  const banner = page.getByTestId("storage-load-error");
  await expect(banner).toContainText(STORAGE_READ_ERROR);
  const clock = page.getByRole("checkbox", { name: /데모 시계/ });
  await expect(clock).toBeChecked(); // 손상 중에도 정상 시계 값은 화면에 그대로
  // 데모 시계 키만 쓰기 실패
  await page.evaluate((ck) => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === ck) throw new DOMException("quota", "QuotaExceededError");
      return orig.call(this, k, v);
    };
  }, clockKey);
  await banner.getByRole("button", { name: "초기화", exact: true }).click();
  await banner.getByRole("button", { name: "원본을 지우고 초기화" }).click();
  // 상태 키는 저장됐으니 손상 배너는 사라지고, 시계 키 실패는 쓰기 오류로 알린다
  await expect(page.getByTestId("storage-load-error")).toHaveCount(0);
  await expect(page.getByText(STORAGE_WRITE_ERROR).first()).toBeVisible();
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), STORAGE_KEY);
  expect(saved.reservations).toHaveLength(0);
  // 시계는 저장되지 않았으므로 화면도 저장본(25)과 같아야 한다
  expect(await page.evaluate((ck) => localStorage.getItem(ck), clockKey)).toBe("25");
  await expect(clock).toBeChecked();
  // 재시도 없이 새로고침해도 화면이 바뀌지 않는다
  await page.reload();
  await expect(page.getByTestId("storage-load-error")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /데모 시계/ })).toBeChecked();
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

test("미션 저장이 실패하면 저장했다고 말하지 않는다", async ({ page }) => {
  const { s } = seededTrial();
  await page.setViewportSize(MOBILE);
  await seed(page, s);
  await page.goto("my/missions/?id=TB-0001");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await openMission(page, "carry");
  await pickRadio(mission(page, "carry"), "비슷했어요");
  await saveMission(page, "carry");
  await expect(mission(page, "carry").getByRole("alert")).toHaveText(STORAGE_WRITE_ERROR);
  await expect(page.getByText("‘들고 나가 보기’ 답을 저장했어요.")).toHaveCount(0);
  await page.reload();
  await expect(mission(page, "carry").getByTestId("mission-answer")).toHaveCount(0);
});
