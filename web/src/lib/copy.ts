// 화면 공통 문구 (domain.ts 에 없는 UI 전용 문구만)
import { CORE_MISSIONS } from "./domain";

// ───────── 플랫폼과 첫 비교팩 (SPEC 'tbyb 브랜드 적용', shared/brand/tbyb/README.md) ─────────
// 플랫폼 = tbyb · 태그라인 "써 보고, 나의 기준으로." — MacBook Air · 14형 Pro 는 플랫폼이 아니라 "첫 비교팩"이다.
// (domain 의 SERVICE_NAME 'Try Before You Buy' 는 tbyb 의 풀어 쓴 이름이라 그대로 둔다.)

/** 플랫폼 워드마크 — 항상 소문자 */
export const PLATFORM_NAME = "tbyb";
export const PLATFORM_TAGLINE = "써 보고, 나의 기준으로.";
/** 첫 비교팩의 두 기기 */
export const FIRST_PACK = "MacBook Air · 14형 Pro";
export const FIRST_PACK_LABEL = `첫 비교팩: ${FIRST_PACK}`;

/** 딜러와 계약한 뒤에 정해지는 것 — 숫자를 만들지 않는다 */
export const DEALER_UNDECIDED = ["체험료", "체험 기간", "보증", "할인", "제휴 매장 위치", "계약 주체"];

/** 리워드는 딜러 계약과 별개로 금액·지급 방식을 정하는 중이다 (domain REWARD_RULE) */
export const REWARD_UNDECIDED_NOTE = "리워드는 금액 미정이고, 지급 방식도 아직 정하는 중이에요.";

/** 리워드 확인 순서 — 미션 기록 → 반납 점검 → 운영자 확인 (domain submitReward · reviewReward 순서) */
export const REWARD_STEPS = [
  { label: "미션 기록", body: `핵심 미션 ${CORE_MISSIONS.length}개에 답하고, 두 맥의 바탕화면 코드를 적어요.` },
  { label: "반납 점검", body: "돌려준 두 대를 운영자가 점검해요." },
  { label: "운영자 확인", body: "운영자가 기록을 보고 지급 여부를 정해요." },
] as const;
