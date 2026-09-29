// 자동 복사본 — 원본은 shared/domain.ts. 여기서 고치지 말고 scripts/sync-domain.sh 를 실행한다.
// Try Before You Buy — 웹/앱 공통 도메인 규칙 (데모 MVP)
// 이 파일이 원본이다. web/src/lib/domain.ts, app/src/domain.ts 는 scripts/sync-domain.sh 로 복사한 사본이며 직접 고치지 않는다.
// 외부 import 없음 · enum 없음(Node type stripping 으로 테스트 가능하게 유지).

// ───────────────────────── 기본 타입 ─────────────────────────

export type DeviceKey = 'air' | 'pro';
export type Leaning = DeviceKey | 'unsure';
// 맥을 처음 쓰는 손님이 대부분 — 용도는 선택이고 기본값은 '잘 모르겠어요' (Administrator 피드백 2026-09-29)
export type Usage = 'unsure' | 'watch' | 'school' | 'photo' | 'dev' | 'other';

export type ReservationStatus =
  | 'requested' // 요청 접수 (미확정)
  | 'operator_check' // 운영 확인 중
  | 'payment_pending' // 결제 대기 (기한 있음)
  | 'confirmed' // 예약 확정
  | 'in_trial' // 체험 중
  | 'return_received' // 반납 접수
  | 'inspecting' // 검수 중
  | 'completed' // 완료
  | 'cancelled'; // 취소 (출고 전)

export type DeviceState =
  | 'available' // 요청 가능
  | 'held' // 예약 보류
  | 'out' // 고객 사용 중
  | 'inspection' // 반납 검수 대기 — 검수 완료 전 재대여 불가
  | 'sale_pending' // 고객이 구매 선택 — 딜러 판매 확인 대기. 확인되지 않으면 반납·검수로 돌린다
  | 'sold'; // 운영자가 딜러 판매를 확인 — 재고에서 제외

// 구매 의향과 판매 완료를 분리한다: 고객 선택만으로는 'none', 운영자가 딜러 판매를 확인해야 'confirmed'
export type SaleStatus = 'none' | 'confirmed' | 'failed';

export type DecisionChoice = 'return_both' | 'buy_new' | 'buy_used' | 'undecided';
export type Actor = 'customer' | 'operator';
export type Score = 1 | 2 | 3 | 4 | 5;

export interface Device {
  id: string;
  kind: DeviceKey;
  state: DeviceState;
  heldBy?: string; // reservation id
}

export interface RequestInfo {
  startDate: string; // YYYY-MM-DD 희망 시작일
  pickupStore: string;
  usage: Usage; // 주로 할 것 같은 일 (선택, 기본 unsure)
  question: string; // 궁금한 점 (선택)
  leaningBefore: Leaning; // 체험 전 기울어진 쪽
  confidenceBefore: Score; // 체험 전 확신 1–5
}

export interface Inspection {
  condition: boolean; // 외관·작동 상태 확인
  accessories: boolean; // 충전기·케이블 등 부속품 확인
  signedOut: boolean; // 고객 로그아웃·'나의 찾기' 해제 확인
  erased: boolean; // 초기화 후 초기 설정 화면·재활성화 가능 확인
}

export interface Ops {
  deviceIds: Partial<Record<DeviceKey, string>>; // 운영자가 확보한 실제 기기
  paymentDeadline?: string; // ISO — 결제 대기 기한
  demoTxId: string; // 데모 거래 식별자
  txMatched: boolean; // 거래내역·예약ID 대조 완료 (운영자만)
  checkout: Record<DeviceKey, boolean>; // 출고 기록(상태·부속품) 완료
  inspection: Record<DeviceKey, Inspection>;
  sale: SaleStatus; // 체험 기기 구매(buy_used)일 때만 의미 있음
  wallCodes?: Record<DeviceKey, string>; // 예약 확정 때 생성 — 출고 전 두 맥 바탕화면에 띄우는 예약별 코드 (운영자만 봄)
}

// ─ 미션: 맥을 처음 써 보는 사람도 할 수 있는 일상 과제. 답은 선택형이고 '비슷/모르겠음'도 유효하다.
export type MissionId = 'carry' | 'video' | 'screen' | 'typing' | 'daily' | 'heavy';
export type Pick = 'air' | 'same' | 'pro' | 'unsure';

export interface BatteryReading {
  before: number; // %
  after: number; // %
}

export interface MissionAnswer {
  id: MissionId;
  pick: Pick;
  followUp?: string; // 미션별 후속 선택지 중 하나
  battery?: Record<DeviceKey, BatteryReading>; // video
  minutes?: Record<DeviceKey, number>; // heavy
  daily?: string; // daily — 무엇을 했는지
  answeredAt: string;
}

export interface CodeCheck {
  air: string;
  pro: string;
  at: string;
}

// ─ 리워드: 체험 건당 1회. 자동 거절 없음 — 표시(flag)는 운영자 검토 신호일 뿐이다.
export type RewardStatus = 'none' | 'submitted' | 'approved' | 'rejected';
export type RewardFlag = 'code_missing' | 'code_mismatch' | 'rushed' | 'battery_odd' | 'all_unsure' | 'after_return';

export interface Reward {
  status: RewardStatus;
  submittedAt?: string;
  flags: RewardFlag[];
  reviewedAt?: string;
  reviewNote?: string;
}

export interface Decision {
  choice: DecisionChoice;
  model?: DeviceKey; // buy_new: 새로 살 모델, buy_used: 사용하던 기기 중 구매할 쪽
  confidenceAfter: Score;
  reason: string;
  decidedAt: string;
}

export interface HistoryItem {
  at: string;
  from: ReservationStatus | null;
  to: ReservationStatus;
  actor: Actor;
  reason: string; // 고객 화면에도 보이는 문구
  internalNote?: string; // 운영자만 보는 메모 (고객 화면에 표시하지 않는다)
}

export interface Reservation {
  id: string;
  createdAt: string;
  status: ReservationStatus;
  request: RequestInfo;
  ops: Ops;
  missions: Partial<Record<MissionId, MissionAnswer>>;
  codeCheck?: CodeCheck;
  reward: Reward;
  decision?: Decision;
  history: HistoryItem[];
}

export interface DemoState {
  version: 2;
  reservations: Reservation[];
  devices: Device[];
  dealerTermsConfirmed: boolean; // 딜러 판매 조건 확정 여부 — false 면 구매 선택지 비활성
  calendarUpdatedAt: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// ───────────────────────── 표시 문구 ─────────────────────────

export const SERVICE_NAME = 'Try Before You Buy';
export const PACK_NAME = 'MacBook Air · 14형 Pro 비교팩';

export const DEMO_NOTICE =
  '시연용 데모입니다. 실제 예약·결제·연락이 일어나지 않고, 입력한 내용은 이 기기 안에만 저장됩니다.';
export const PRICE_TBD =
  '체험료·기간·보증 조건은 딜러 계약 후 정해져요. 정해지기 전에는 금액을 보여 드리지 않아요.';
export const RESPONSE_TARGET = '운영 목표: 영업일 1일 내 확인 (대표자 확인 전 제안값)';
export const PAYMENT_RULE =
  '예약은 운영자가 결제 서비스의 실제 거래내역을 확인한 뒤에만 확정돼요. 결제 화면 캡처로는 확정되지 않아요.';
export const DEALER_TERMS_TBD = '딜러 판매 조건이 정해지면 열려요. 구매·할인을 약속하지는 않아요.';

export const DEVICE_LABEL: Record<DeviceKey, string> = {
  air: 'MacBook Air',
  pro: 'MacBook Pro 14형',
};

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  requested: '요청 접수',
  operator_check: '운영 확인 중',
  payment_pending: '결제 대기',
  confirmed: '예약 확정',
  in_trial: '체험 중',
  return_received: '반납 접수',
  inspecting: '검수 중',
  completed: '완료',
  cancelled: '취소',
};

export const STATUS_HELP: Record<ReservationStatus, string> = {
  requested: '아직 확정 전이에요. 운영자가 두 기기와 픽업 일정을 확인해요.',
  operator_check: '딜러에게 Air와 Pro 두 대, 반납 뒤 검수 여유 시간까지 확인하고 있어요.',
  payment_pending: '두 기기를 잡아 뒀어요. 기한 안에 결제해 주세요. 운영자가 거래내역을 확인하면 확정돼요.',
  confirmed: '예약이 확정됐어요. 픽업 때 두 기기의 상태와 부속품을 함께 확인해요.',
  in_trial: '평소처럼 써 보면서 미션을 하나씩 해 보세요. 마지막 날 미션 답을 보고 결정해요.',
  return_received: '반납을 받았어요. 운영자가 기기별로 검수해요.',
  inspecting: '상태·부속품·로그아웃·초기화를 확인하고 있어요.',
  completed: '체험이 끝났어요. 7일·30일 뒤 짧은 후속 설문을 보내 드려요.',
  cancelled: '취소된 요청이에요.',
};

// 고객 화면 타임라인 순서 (cancelled 제외)
export const STATUS_FLOW: ReservationStatus[] = [
  'requested',
  'operator_check',
  'payment_pending',
  'confirmed',
  'in_trial',
  'return_received',
  'inspecting',
  'completed',
];

export const DEVICE_STATE_LABEL: Record<DeviceState, string> = {
  available: '요청 가능',
  held: '예약 보류',
  out: '고객 사용 중',
  inspection: '검수 대기 (재대여 불가)',
  sale_pending: '구매 선택 · 딜러 판매 확인 대기 (미확인 시 반납)',
  sold: '판매 확인 · 재고 제외',
};

export const SALE_LABEL: Record<SaleStatus, string> = {
  none: '딜러 판매 확인 전 (구매 의향만 있음)',
  confirmed: '딜러 판매 확인 완료',
  failed: '판매 불성립 · 반납·검수 대상',
};

export const DECISION_LABEL: Record<DecisionChoice, string> = {
  return_both: '두 대 모두 반납',
  buy_new: '새 제품 구매',
  buy_used: '체험한 기기 그대로 구매',
  undecided: '아직 결정 못 함',
};

export const LEANING_LABEL: Record<Leaning, string> = {
  air: 'Air 쪽',
  pro: 'Pro 쪽',
  unsure: '모르겠음',
};

export const INSPECTION_LABEL: Record<keyof Inspection, string> = {
  condition: '외관·작동 상태 확인',
  accessories: '부속품 확인',
  signedOut: '고객 로그아웃 · 나의 찾기 해제 확인',
  erased: '초기화 · 재활성화 가능 확인',
};

export const PICKUP_STORES = ['제휴 매장 A (계약 전 · 위치 미정)', '제휴 매장 B (계약 전 · 위치 미정)'];

export const USAGE_LABEL: Record<Usage, string> = {
  unsure: '잘 모르겠어요',
  watch: '유튜브·넷플릭스·웹서핑',
  school: '과제·문서',
  photo: '사진·영상 조금',
  dev: '코딩',
  other: '기타',
};

export const PICK_LABEL: Record<Pick, string> = {
  air: 'Air가 나았어요',
  same: '비슷했어요',
  pro: 'Pro가 나았어요',
  unsure: '잘 모르겠어요',
};

export interface MissionDef {
  id: MissionId;
  title: string;
  how: string; // 무엇을 하면 되는지 — 맥을 처음 쓰는 사람 기준
  question: string;
  followUps: string[];
  input?: 'battery' | 'minutes' | 'daily';
  optional?: boolean;
}

export const DAILY_OPTIONS = ['영상 보기', '과제·문서', '쇼핑·검색', '웹툰·SNS', '사진 정리', '기타'];

export const MISSIONS: MissionDef[] = [
  {
    id: 'carry',
    title: '들고 나가 보기',
    how: '하루 한 번은 가방에 넣고 평소처럼 나가 보세요. 학교, 회사, 카페 어디든 괜찮아요.',
    question: '들고 다니기 편했던 쪽은?',
    followUps: ['가방이 가벼웠어요', '한 손으로 들기 편했어요', '두께가 신경 쓰였어요', '무게 차이는 잘 몰랐어요'],
  },
  {
    id: 'video',
    title: '같은 영상 틀어 보기',
    how: '두 맥에서 같은 유튜브 영상을 틀어 보세요. 짧게 봐도 괜찮아요. 30분쯤 틀어 두고 배터리 %를 적어 주면 더 정확해요 (선택).',
    question: '화면과 소리가 더 좋았던 쪽은?',
    followUps: ['화면이 더 선명했어요', '소리가 더 꽉 찼어요', '배터리가 덜 닳았어요', '차이를 못 느꼈어요'],
    input: 'battery',
  },
  {
    id: 'screen',
    title: '밝은 곳·어두운 곳에서 보기',
    how: '창가처럼 밝은 곳과 불 끈 방에서 각각 화면을 봐 주세요. 스크롤도 해 보세요.',
    question: '보기 편했던 쪽은?',
    followUps: ['밝은 곳에서 잘 보였어요', '어두운 곳에서 눈이 편했어요', '스크롤이 부드러웠어요', '차이를 못 느꼈어요'],
  },
  {
    id: 'typing',
    title: '메모 5분 쓰기',
    how: '메모 앱에 아무 글이나 5분 써 보세요. 오늘 일기도 좋아요. 트랙패드로 이것저것 눌러 보세요.',
    question: '손에 잘 맞았던 쪽은?',
    followUps: ['키보드 느낌이 좋았어요', '트랙패드가 편했어요', '손목이 편했어요', '차이를 못 느꼈어요'],
  },
  {
    id: 'daily',
    title: '평소 폰으로 오래 하는 일',
    how: '평소 폰으로 가장 오래 하는 일을 맥으로 해 보세요. 쇼핑, 웹툰, 과제 검색 무엇이든요.',
    question: '계속 쓰고 싶었던 쪽은?',
    followUps: ['큰 화면이 좋았어요', '가벼워서 자주 열었어요', '빨라서 답답하지 않았어요', '둘 다 비슷했어요'],
    input: 'daily',
  },
  {
    id: 'heavy',
    title: '무거운 작업 (해 본 사람만)',
    how: '사진 여러 장 편집이나 영상 내보내기를 해 봤다면, 두 맥에서 같은 작업에 걸린 시간을 적어 주세요.',
    question: '더 빨랐던 쪽은?',
    followUps: ['끝까지 속도가 유지됐어요', '팬 소리가 났어요', '뜨거워졌어요', '차이를 못 느꼈어요'],
    input: 'minutes',
    optional: true,
  },
];

export const CORE_MISSIONS: MissionId[] = MISSIONS.filter((m) => !m.optional).map((m) => m.id);

export const REWARD_AMOUNT_LABEL = '1,000원 (가정 · 금액 미정)';
export const REWARD_RULE =
  '체험 건당 한 번, 반납 검수 뒤 운영자가 확인하고 드려요. 데모에서는 실제 지급이 없어요. 비슷함·모르겠음도 정직한 답이면 괜찮아요.';
export const REWARD_REJECT_NOTE_VISIBLE = '거절 사유는 고객에게 보여요. 승인 메모는 운영자만 봐요.';
export const REWARD_STATUS_LABEL: Record<RewardStatus, string> = {
  none: '아직 신청 전',
  submitted: '운영자 확인 대기',
  approved: '확인 완료 · 지급 예정',
  rejected: '지급 안 함',
};
export const REWARD_FLAG_LABEL: Record<RewardFlag, string> = {
  code_missing: '바탕화면 코드 미입력',
  code_mismatch: '바탕화면 코드 불일치',
  rushed: '모든 미션을 10분 안에 몰아서 답함',
  battery_odd: '배터리 기록이 이상함',
  all_unsure: '모든 답이 모르겠음',
  after_return: '반납 뒤 기억으로 답한 미션 있음',
};

// 미션·코드·리워드 신청은 체험 중부터 검수 중까지 가능 — 반납 뒤 기억으로 쓴 답도 받되 검토 표시만 한다
export const MISSION_OPEN: ReservationStatus[] = ['in_trial', 'return_received', 'inspecting'];
export const RUSHED_MINUTES = 10;

// 기기를 고를 때 같은 기준으로 확인할 점 — 수치 없이 확인 포인트만 제시
export const COMPARE_POINTS: { title: string; air: string; pro: string }[] = [
  { title: '칩·메모리·저장공간', air: '딜러 재고 확정 후 기기별 표시', pro: '딜러 재고 확정 후 기기별 표시' },
  { title: '긴 작업 중 발열·소음', air: '팬이 없는 설계 — 무거운 작업을 오래 돌려 확인', pro: '팬이 있는 설계 — 같은 작업으로 속도 유지 비교' },
  { title: '화면', air: '같은 문서·영상으로 가독성 확인', pro: '고주사율(ProMotion) 화면 — 스크롤 체감 비교' },
  { title: '포트', air: '필요한 주변기기 연결 방식 확인', pro: 'HDMI·SD 카드 슬롯 필요 여부 확인' },
  { title: '휴대성', air: '하루 들고 다녀 보기', pro: '같은 가방·동선으로 비교' },
  { title: '배터리 상태·외관', air: '픽업 때 기기별로 기록', pro: '픽업 때 기기별로 기록' },
];

// ───────────────────────── 초기 데이터 ─────────────────────────

export const STORAGE_KEY = 'tbyb-miku-demo-v2';

export function createInitialState(now: Date = new Date()): DemoState {
  return {
    version: 2,
    reservations: [],
    devices: [
      { id: 'AIR-01', kind: 'air', state: 'available' },
      { id: 'AIR-02', kind: 'air', state: 'available' },
      { id: 'PRO-01', kind: 'pro', state: 'available' },
      { id: 'PRO-02', kind: 'pro', state: 'available' },
    ],
    dealerTermsConfirmed: false,
    calendarUpdatedAt: now.toISOString(),
  };
}

function emptyInspection(): Inspection {
  return { condition: false, accessories: false, signedOut: false, erased: false };
}

export function newReservationId(state: DemoState): string {
  const n = state.reservations.length + 1;
  return `TB-${String(n).padStart(4, '0')}`;
}

export function createReservation(state: DemoState, request: RequestInfo, now: Date = new Date()): Result<DemoState> {
  if (!request.startDate) return { ok: false, error: '희망 시작일을 골라 주세요.' };
  if (!request.pickupStore) return { ok: false, error: '픽업 매장을 골라 주세요.' };
  if (!(request.usage in USAGE_LABEL)) return { ok: false, error: '주로 할 일을 다시 골라 주세요.' };
  if (!(request.leaningBefore in LEANING_LABEL)) return { ok: false, error: '지금 기울어진 쪽을 골라 주세요.' };
  if (![1, 2, 3, 4, 5].includes(request.confidenceBefore)) return { ok: false, error: '체험 전 확신을 1–5 중에서 골라 주세요.' };
  const days = calendarDays(state, now, CALENDAR_DAYS);
  const day = days.find((d) => d.date === request.startDate);
  if (!day) return { ok: false, error: `오늘부터 ${CALENDAR_DAYS}일 안의 날짜를 골라 주세요.` };
  if (day.status === 'closed') return { ok: false, error: '마감된 날짜입니다. 다른 날짜를 골라 주세요.' };
  const at = now.toISOString();
  const r: Reservation = {
    id: newReservationId(state),
    createdAt: at,
    status: 'requested',
    request: { ...request, question: request.question.trim() },
    ops: {
      deviceIds: {},
      demoTxId: '',
      txMatched: false,
      checkout: { air: false, pro: false },
      inspection: { air: emptyInspection(), pro: emptyInspection() },
      sale: 'none',
    },
    missions: {},
    reward: { status: 'none', flags: [] },
    history: [{ at, from: null, to: 'requested', actor: 'customer', reason: '데모 일정 요청' }],
  };
  return { ok: true, value: { ...state, reservations: [r, ...state.reservations] } };
}

// ───────────────────────── 상태 전이 ─────────────────────────

// 허용된 다음 상태만 이동 가능 — 단계 건너뛰기 차단
export const NEXT: Record<ReservationStatus, ReservationStatus[]> = {
  requested: ['operator_check', 'cancelled'],
  operator_check: ['payment_pending', 'cancelled'],
  payment_pending: ['confirmed', 'cancelled'],
  confirmed: ['in_trial', 'cancelled'],
  in_trial: ['return_received'],
  return_received: ['inspecting'],
  inspecting: ['completed'],
  completed: [],
  cancelled: [],
};

// 출고 전까지만 취소. 출고 후 환불·사고는 계약 기준 수동 처리(데모 범위 밖).
export const CANCELLABLE: ReservationStatus[] = ['requested', 'operator_check', 'payment_pending', 'confirmed'];

export const PAYMENT_WINDOW_HOURS = 24; // 데모 결제 기한 — 실제 기한은 운영 정책 확정 후

// 구매 선택과 무관하게 반드시 반납하는 기기 (buy_used 면 나머지 한 대, 그 외 두 대)
export function devicesToReturn(decision: Decision | undefined): DeviceKey[] {
  if (decision && decision.choice === 'buy_used' && decision.model) {
    return decision.model === 'air' ? ['pro'] : ['air'];
  }
  return ['air', 'pro'];
}

// 고객이 그대로 구매하겠다고 고른 체험 기기 — 딜러 판매 확인 전까지는 판매가 아니다
export function saleDevice(decision: Decision | undefined): DeviceKey | undefined {
  return decision && decision.choice === 'buy_used' ? decision.model : undefined;
}

// 검수해야 하는 기기: 반드시 반납하는 기기 + 판매 불성립으로 돌아온 구매 선택 기기
export function requiredInspections(r: Reservation): DeviceKey[] {
  const keys = devicesToReturn(r.decision);
  const sd = saleDevice(r.decision);
  if (sd && r.ops.sale === 'failed' && !keys.includes(sd)) keys.push(sd);
  return keys;
}

export function isInspectionDone(i: Inspection): boolean {
  return i.condition && i.accessories && i.signedOut && i.erased;
}

// 해당 종류에서 새 예약에 배정할 수 있는 기기 (검수 대기·보류·사용 중·구매 대기는 제외)
export function availableDevices(state: DemoState, kind: DeviceKey): Device[] {
  return state.devices.filter((d) => d.kind === kind && d.state === 'available');
}

function findRes(state: DemoState, id: string): Reservation | undefined {
  return state.reservations.find((r) => r.id === id);
}

function replaceRes(state: DemoState, r: Reservation): DemoState {
  return { ...state, reservations: state.reservations.map((x) => (x.id === r.id ? r : x)) };
}

// 상태가 바뀌지 않는 운영자 조작도 이력에 남긴다 (from === to)
function note(r: Reservation, reason: string, now: Date, internalNote?: string): Reservation {
  const item: HistoryItem = { at: now.toISOString(), from: r.status, to: r.status, actor: 'operator', reason };
  if (internalNote) item.internalNote = internalNote;
  return { ...r, history: [...r.history, item] };
}

function setDevices(devices: Device[], ids: string[], patch: Partial<Device>): Device[] {
  return devices.map((d) => {
    if (!ids.includes(d.id)) return d;
    const next: Device = { ...d, ...patch };
    if (patch.state === 'available') delete next.heldBy;
    return next;
  });
}

export function canTransition(
  state: DemoState,
  id: string,
  to: ReservationStatus,
  now: Date = new Date(),
): Result<true> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (!NEXT[r.status].includes(to)) {
    return { ok: false, error: `'${STATUS_LABEL[r.status]}'에서 '${STATUS_LABEL[to]}'(으)로 바로 갈 수 없습니다.` };
  }
  if (to === 'payment_pending') {
    if (!r.ops.deviceIds.air || !r.ops.deviceIds.pro) {
      return { ok: false, error: 'Air와 Pro 두 대를 모두 확보해야 결제 요청을 보낼 수 있습니다.' };
    }
  }
  if (to === 'confirmed') {
    if (!r.ops.demoTxId.trim()) return { ok: false, error: '데모 거래 식별자를 입력해야 합니다.' };
    if (!r.ops.txMatched) return { ok: false, error: '거래내역과 예약ID 대조를 완료해야 확정할 수 있습니다.' };
    if (r.ops.paymentDeadline && new Date(r.ops.paymentDeadline).getTime() < now.getTime()) {
      return { ok: false, error: '결제 기한이 지났습니다. 자동 확정하지 않습니다 — 취소·환불 또는 대체 일정으로 처리하세요.' };
    }
  }
  if (to === 'in_trial') {
    if (!r.ops.checkout.air || !r.ops.checkout.pro) {
      return { ok: false, error: '두 기기의 출고 기록(상태·부속품)을 마쳐야 체험을 시작할 수 있습니다.' };
    }
  }
  if (to === 'return_received') {
    if (!r.decision) return { ok: false, error: '마지막 날 결정(아직 결정 못 함 포함)을 먼저 남겨 주세요.' };
  }
  if (to === 'completed') {
    if (saleDevice(r.decision) && r.ops.sale === 'none') {
      return { ok: false, error: '구매 선택 기기의 딜러 판매 확인 또는 판매 불성립(반납) 처리가 먼저 필요합니다.' };
    }
    const pending = requiredInspections(r).filter((k) => !isInspectionDone(r.ops.inspection[k]));
    if (pending.length) {
      return { ok: false, error: `${pending.map((k) => DEVICE_LABEL[k]).join(', ')} 검수를 모두 마쳐야 완료할 수 있습니다.` };
    }
  }
  return { ok: true, value: true };
}

export function transition(
  state: DemoState,
  id: string,
  to: ReservationStatus,
  actor: Actor,
  reason: string,
  now: Date = new Date(),
): Result<DemoState> {
  if (actor === 'operator' && !reason.trim()) return { ok: false, error: '운영자 상태 변경에는 사유가 필요합니다.' };
  // 고객은 출고 전 취소만 직접 한다. 나머지 단계는 운영자(데모에서는 운영 시뮬레이터)가 바꾼다.
  if (actor === 'customer' && to !== 'cancelled') {
    return { ok: false, error: '이 단계는 운영자만 변경할 수 있습니다.' };
  }
  const check = canTransition(state, id, to, now);
  if (!check.ok) return check;
  const r = findRes(state, id)!;
  const at = now.toISOString();
  let devices = state.devices;
  const ops: Ops = { ...r.ops };
  const ids = [r.ops.deviceIds.air, r.ops.deviceIds.pro].filter((x): x is string => Boolean(x));

  if (to === 'payment_pending') {
    ops.paymentDeadline = new Date(now.getTime() + PAYMENT_WINDOW_HOURS * 3600_000).toISOString();
  }
  // 예약 확정 때 코드를 만든다 — 운영자가 출고 전에 두 맥 바탕화면에 띄워 둘 수 있게
  if (to === 'confirmed') ops.wallCodes = { air: wallCode(r.id, 'air', now), pro: wallCode(r.id, 'pro', now) };
  if (to === 'in_trial') devices = setDevices(devices, ids, { state: 'out' });
  if (to === 'return_received') {
    const back = devicesToReturn(r.decision);
    for (const k of ['air', 'pro'] as DeviceKey[]) {
      const devId = r.ops.deviceIds[k];
      if (!devId) continue;
      devices = setDevices(devices, [devId], { state: back.includes(k) ? 'inspection' : 'sale_pending' });
    }
  }
  if (to === 'completed') {
    const back = requiredInspections(r)
      .map((k) => r.ops.deviceIds[k])
      .filter((x): x is string => Boolean(x));
    devices = setDevices(devices, back, { state: 'available' });
  }
  if (to === 'cancelled') devices = setDevices(devices, ids, { state: 'available' });

  const next: Reservation = {
    ...r,
    status: to,
    ops,
    history: [...r.history, { at, from: r.status, to, actor, reason: reason.trim() || STATUS_LABEL[to] }],
  };
  return { ok: true, value: { ...replaceRes(state, next), devices } };
}

// ───────────────────────── 운영자 조작 ─────────────────────────

export function assignDevice(
  state: DemoState,
  id: string,
  kind: DeviceKey,
  deviceId: string,
  now: Date = new Date(),
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.status !== 'operator_check') return { ok: false, error: "기기 확보는 '운영 확인 중' 단계에서만 합니다." };
  const d = state.devices.find((x) => x.id === deviceId);
  if (!d || d.kind !== kind) return { ok: false, error: '기기 종류가 맞지 않습니다.' };
  if (d.state !== 'available') {
    return { ok: false, error: `${d.id}: '${DEVICE_STATE_LABEL[d.state]}' 상태라 배정할 수 없습니다.` };
  }
  let devices = state.devices;
  const prev = r.ops.deviceIds[kind];
  if (prev) devices = setDevices(devices, [prev], { state: 'available' });
  devices = setDevices(devices, [deviceId], { state: 'held', heldBy: id });
  const next = note({ ...r, ops: { ...r.ops, deviceIds: { ...r.ops.deviceIds, [kind]: deviceId } } }, `${DEVICE_LABEL[kind]} ${deviceId} 확보`, now);
  return { ok: true, value: { ...replaceRes(state, next), devices } };
}

export function setPaymentCheck(
  state: DemoState,
  id: string,
  demoTxId: string,
  txMatched: boolean,
  now: Date = new Date(),
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.status !== 'payment_pending') return { ok: false, error: "거래 대조는 '결제 대기' 단계에서만 합니다." };
  if (txMatched && !demoTxId.trim()) return { ok: false, error: '거래 식별자 없이 대조 완료로 표시할 수 없습니다.' };
  let next: Reservation = { ...r, ops: { ...r.ops, demoTxId, txMatched } };
  if (txMatched !== r.ops.txMatched) {
    next = note(next, txMatched ? `거래 ${demoTxId.trim()} 대조 완료` : '거래 대조 취소', now);
  }
  return { ok: true, value: replaceRes(state, next) };
}

export function setCheckout(state: DemoState, id: string, kind: DeviceKey, done: boolean): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.status !== 'confirmed') return { ok: false, error: "출고 기록은 '예약 확정' 단계에서만 합니다." };
  return { ok: true, value: replaceRes(state, { ...r, ops: { ...r.ops, checkout: { ...r.ops.checkout, [kind]: done } } }) };
}

export function setInspection(
  state: DemoState,
  id: string,
  kind: DeviceKey,
  field: keyof Inspection,
  value: boolean,
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.status !== 'inspecting') return { ok: false, error: "검수 체크는 '검수 중' 단계에서만 합니다." };
  if (!requiredInspections(r).includes(kind)) {
    return { ok: false, error: `${DEVICE_LABEL[kind]}: 구매 선택 기기라 딜러 판매 확인·불성립 처리 전에는 검수 대상이 아닙니다.` };
  }
  const inspection = { ...r.ops.inspection, [kind]: { ...r.ops.inspection[kind], [field]: value } };
  return { ok: true, value: replaceRes(state, { ...r, ops: { ...r.ops, inspection } }) };
}

// 구매 선택 기기의 판매 결과를 운영자가 기록한다. confirmed → 재고 제외, failed → 반납·검수 대상
export function setSaleResult(
  state: DemoState,
  id: string,
  result: 'confirmed' | 'failed',
  now: Date = new Date(),
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  const sd = saleDevice(r.decision);
  if (!sd) return { ok: false, error: '체험 기기 구매를 선택한 예약이 아닙니다.' };
  if (!(r.status === 'return_received' || r.status === 'inspecting')) {
    return { ok: false, error: "판매 결과는 '반납 접수' 또는 '검수 중' 단계에서 기록합니다." };
  }
  if (r.ops.sale !== 'none') return { ok: false, error: `이미 기록됨: ${SALE_LABEL[r.ops.sale]}` };
  if (result === 'confirmed' && !state.dealerTermsConfirmed) return { ok: false, error: DEALER_TERMS_TBD };
  const devId = r.ops.deviceIds[sd];
  const devices = devId ? setDevices(state.devices, [devId], { state: result === 'confirmed' ? 'sold' : 'inspection' }) : state.devices;
  const next = note({ ...r, ops: { ...r.ops, sale: result } }, `${DEVICE_LABEL[sd]} ${SALE_LABEL[result]}`, now);
  return { ok: true, value: { ...replaceRes(state, next), devices } };
}

export function isPaymentExpired(r: Reservation, now: Date = new Date()): boolean {
  return r.status === 'payment_pending' && !!r.ops.paymentDeadline && new Date(r.ops.paymentDeadline).getTime() < now.getTime();
}

// ───────────────────────── 고객 조작 ─────────────────────────

// 예약·기기·시각으로 만든 4자리 코드. 헷갈리는 글자(0·O·1·I)는 뺀다.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function wallCode(id: string, kind: DeviceKey, now: Date): string {
  let h = 2166136261;
  for (const ch of `${id}:${kind}:${now.getTime()}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += CODE_CHARS[h % CODE_CHARS.length];
    h = (Math.floor(h / CODE_CHARS.length) ^ Math.imul(h, 2654435761)) >>> 0;
  }
  return out;
}

function missionDef(id: MissionId): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}

const validPct = (n: number) => Number.isInteger(n) && n >= 0 && n <= 100;

export function answerMission(
  state: DemoState,
  id: string,
  answer: Omit<MissionAnswer, 'answeredAt'>,
  now: Date = new Date(),
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (!MISSION_OPEN.includes(r.status)) return { ok: false, error: '미션은 픽업한 뒤부터 검수가 끝나기 전까지 할 수 있어요.' };
  if (r.reward.status !== 'none') return { ok: false, error: '리워드를 신청한 뒤에는 답을 바꿀 수 없어요.' };
  const def = missionDef(answer.id);
  if (!def) return { ok: false, error: '없는 미션입니다.' };
  if (!(answer.pick in PICK_LABEL)) return { ok: false, error: '어느 쪽이었는지 골라 주세요. 모르겠으면 "잘 모르겠어요"도 괜찮아요.' };
  if (answer.followUp !== undefined && !def.followUps.includes(answer.followUp)) {
    return { ok: false, error: '후속 선택지를 다시 골라 주세요.' };
  }
  const a: MissionAnswer = { id: def.id, pick: answer.pick, answeredAt: now.toISOString() };
  if (answer.followUp) a.followUp = answer.followUp;
  if (def.input === 'battery' && answer.battery) {
    // 선택 입력 — 적었다면 두 맥 모두 올바른 값이어야 한다
    const b = answer.battery;
    for (const k of ['air', 'pro'] as DeviceKey[]) {
      if (!validPct(b[k].before) || !validPct(b[k].after)) return { ok: false, error: '배터리는 0–100 사이 정수로 적어 주세요.' };
      if (b[k].after > b[k].before) return { ok: false, error: `${DEVICE_LABEL[k]}: 끝 배터리가 시작보다 높아요. 충전 중이었다면 충전기를 빼고 다시 해 주세요.` };
    }
    a.battery = { air: { ...b.air }, pro: { ...b.pro } };
  }
  if (def.input === 'minutes') {
    const m = answer.minutes;
    if (!m || ![m.air, m.pro].every((x) => x > 0 && x <= 1440)) {
      return { ok: false, error: '두 맥에서 걸린 시간을 0분보다 크고 1,440분 이하로 적어 주세요.' };
    }
    a.minutes = { air: m.air, pro: m.pro };
  }
  if (def.input === 'daily') {
    if (!answer.daily || !DAILY_OPTIONS.includes(answer.daily)) return { ok: false, error: '무엇을 해 봤는지 골라 주세요.' };
    a.daily = answer.daily;
  }
  return { ok: true, value: replaceRes(state, { ...r, missions: { ...r.missions, [def.id]: a } }) };
}

export function setCodeCheck(state: DemoState, id: string, air: string, pro: string, now: Date = new Date()): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (!MISSION_OPEN.includes(r.status)) return { ok: false, error: '코드는 픽업한 뒤부터 검수가 끝나기 전까지 적을 수 있어요.' };
  if (r.reward.status !== 'none') return { ok: false, error: '리워드를 신청한 뒤에는 바꿀 수 없어요.' };
  const norm = (x: string) => x.trim().toUpperCase().replace(/\s+/g, '');
  if (!norm(air) || !norm(pro)) return { ok: false, error: '두 맥의 바탕화면 코드를 모두 적어 주세요.' };
  return { ok: true, value: replaceRes(state, { ...r, codeCheck: { air: norm(air), pro: norm(pro), at: now.toISOString() } }) };
}

export function missionProgress(r: Reservation): { done: number; total: number; missing: MissionId[] } {
  const missing = CORE_MISSIONS.filter((m) => !r.missions[m]);
  return { done: CORE_MISSIONS.length - missing.length, total: CORE_MISSIONS.length, missing };
}

// 운영자 검토용 신호. 자동으로 거절하지 않는다.
export function rewardFlags(r: Reservation): RewardFlag[] {
  const flags: RewardFlag[] = [];
  const codes = r.ops.wallCodes;
  if (!r.codeCheck) flags.push('code_missing');
  else if (!codes || r.codeCheck.air !== codes.air || r.codeCheck.pro !== codes.pro) flags.push('code_mismatch');
  const answers = Object.values(r.missions).filter((a): a is MissionAnswer => Boolean(a));
  const times = answers.map((a) => new Date(a.answeredAt).getTime());
  if (answers.length >= CORE_MISSIONS.length && Math.max(...times) - Math.min(...times) < RUSHED_MINUTES * 60_000) {
    flags.push('rushed');
  }
  const b = r.missions.video?.battery;
  if (b) {
    const drops = [b.air.before - b.air.after, b.pro.before - b.pro.after];
    if (drops.some((d) => d > 40) || drops.every((d) => d === 0)) flags.push('battery_odd');
  }
  if (answers.length && answers.every((a) => a.pick === 'unsure')) flags.push('all_unsure');
  const returnedAt = r.history.find((h) => h.to === 'return_received')?.at;
  if (returnedAt && answers.some((a) => a.answeredAt > returnedAt)) flags.push('after_return');
  return flags;
}

export function submitReward(state: DemoState, id: string, now: Date = new Date()): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (!MISSION_OPEN.includes(r.status)) return { ok: false, error: '리워드는 픽업한 뒤부터 검수가 끝나기 전까지 신청할 수 있어요.' };
  if (r.reward.status !== 'none') return { ok: false, error: '리워드는 체험 건당 한 번만 신청할 수 있어요.' };
  const p = missionProgress(r);
  if (p.missing.length) {
    const names = p.missing.map((m) => missionDef(m)!.title).join(', ');
    return { ok: false, error: `남은 미션을 먼저 해 주세요: ${names}` };
  }
  if (!r.codeCheck) return { ok: false, error: '두 맥의 바탕화면 코드를 먼저 적어 주세요.' };
  const reward: Reward = { status: 'submitted', submittedAt: now.toISOString(), flags: rewardFlags(r) };
  return { ok: true, value: replaceRes(state, { ...r, reward }) };
}

// 운영자 검토 — 반납 검수 단계 이후에만 (기기 사용 흔적을 함께 대조하기 위해)
export function reviewReward(
  state: DemoState,
  id: string,
  result: 'approved' | 'rejected',
  reviewNote: string,
  now: Date = new Date(),
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.reward.status !== 'submitted') return { ok: false, error: '확인 대기 중인 리워드가 아닙니다.' };
  if (!(r.status === 'inspecting' || r.status === 'completed')) {
    return { ok: false, error: '리워드 확인은 반납 검수 단계부터 합니다 (기기 사용 흔적과 함께 대조).' };
  }
  if (!reviewNote.trim() && (result === 'rejected' || r.reward.flags.length)) {
    return { ok: false, error: '거절하거나 표시가 있는 건을 승인할 때는 확인 메모가 필요합니다.' };
  }
  const reward: Reward = { ...r.reward, status: result, reviewedAt: now.toISOString(), reviewNote: reviewNote.trim() };
  // 검토 메모는 운영자 전용 — 판별 기준이 고객에게 드러나지 않게. 거절 사유는 reward.reviewNote 로 고객에게 보인다.
  const next = note({ ...r, reward }, `리워드 ${REWARD_STATUS_LABEL[result]}`, now, reviewNote.trim() || undefined);
  return { ok: true, value: replaceRes(state, next) };
}

export function missionSummary(r: Reservation): Record<Pick, number> {
  const out: Record<Pick, number> = { air: 0, same: 0, pro: 0, unsure: 0 };
  for (const a of Object.values(r.missions)) if (a) out[a.pick] += 1;
  return out;
}

export function setDecision(state: DemoState, id: string, d: Omit<Decision, 'decidedAt'>, now: Date = new Date()): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.status !== 'in_trial') return { ok: false, error: '결정은 체험 중(마지막 날)에 남깁니다.' };
  if ((d.choice === 'buy_new' || d.choice === 'buy_used') && !state.dealerTermsConfirmed) {
    return { ok: false, error: DEALER_TERMS_TBD };
  }
  if ((d.choice === 'buy_new' || d.choice === 'buy_used') && !d.model) {
    return { ok: false, error: '어느 모델인지 골라 주세요.' };
  }
  if (!d.reason.trim()) return { ok: false, error: '선택한 이유를 한 줄 남겨 주세요. 아직 결정 못 했다면 그 이유도 좋아요.' };
  const decision: Decision = {
    choice: d.choice,
    model: d.choice === 'buy_new' || d.choice === 'buy_used' ? d.model : undefined,
    confidenceAfter: d.confidenceAfter,
    reason: d.reason.trim(),
    decidedAt: now.toISOString(),
  };
  return { ok: true, value: replaceRes(state, { ...r, decision }) };
}

// ───────────────────────── 요약·캘린더 ─────────────────────────

export type DayStatus = 'open' | 'closed' | 'check';
export const CALENDAR_DAYS = 14;
export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  open: '요청 가능',
  closed: '마감',
  check: '확인 필요',
};

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 운영자가 수동 갱신하는 표시값을 흉내낸 데모 캘린더. 확정 재고가 아니다.
export function calendarDays(state: DemoState, from: Date, n = 14): { date: string; status: DayStatus }[] {
  const freeAir = availableDevices(state, 'air').length;
  const freePro = availableDevices(state, 'pro').length;
  const out: { date: string; status: DayStatus }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const dow = d.getDay();
    let status: DayStatus = 'open';
    if (freeAir === 0 || freePro === 0) status = 'check';
    if (dow === 0) status = 'closed'; // 일요일 픽업 없음(데모 가정)
    else if (dow === 6) status = 'check'; // 토요일은 매장 확인 필요(데모 가정)
    out.push({ date: toDateKey(d), status });
  }
  return out;
}

export const STORAGE_READ_ERROR =
  '저장된 데모 데이터를 읽을 수 없어요. 원본은 지우지 않았어요. 원본을 복사해 둔 뒤 직접 초기화해 주세요.';
export const STORAGE_WRITE_ERROR = '이 기기에 저장하지 못했어요. 방금 변경은 저장되지 않았을 수 있어요.';

// 저장본 읽기. 비어 있으면 초기 상태, 손상됐으면 오류 — 호출 측은 오류일 때 그 키에 쓰지 말고(원본 보존)
// 오류를 보여 준 뒤 사용자가 명시적으로 초기화할 때만 덮어쓴다.
export function readSaved(raw: string | null | undefined): Result<DemoState> {
  if (!raw) return { ok: true, value: createInitialState() };
  try {
    const s = JSON.parse(raw) as DemoState;
    if (s && s.version === 2 && Array.isArray(s.reservations) && Array.isArray(s.devices)) return { ok: true, value: s };
  } catch {
    // 아래 오류로 알린다
  }
  return { ok: false, error: STORAGE_READ_ERROR };
}

// 테스트·내부용: 손상 시 초기 상태. UI 저장소는 readSaved 를 쓴다.
export function restoreState(raw: string | null | undefined): DemoState {
  const r = readSaved(raw);
  return r.ok ? r.value : createInitialState();
}
