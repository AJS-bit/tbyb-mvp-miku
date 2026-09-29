// Try Before You Buy — 웹/앱 공통 도메인 규칙 (데모 MVP)
// 이 파일이 원본이다. web/src/lib/domain.ts, app/src/domain.ts 는 scripts/sync-domain.sh 로 복사한 사본이며 직접 고치지 않는다.
// 외부 import 없음 · enum 없음(Node type stripping 으로 테스트 가능하게 유지).

// ───────────────────────── 기본 타입 ─────────────────────────

export type DeviceKey = 'air' | 'pro';
export type Leaning = DeviceKey | 'unsure';
export type WorkType = 'video' | 'dev' | 'photo' | 'docs' | 'other';

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
  workType: WorkType;
  wantToCompare: string;
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
}

export interface DeviceEntry {
  minutes: number | null; // 같은 작업 소요 시간(분). 측정 안 했으면 null
  portability: Score | null; // 휴대성
  display: Score | null; // 화면
  feel: Score | null; // 사용감(키보드·트랙패드·발열·소음)
}

export interface CompareLog {
  id: string;
  createdAt: string;
  task: string; // 두 기기에서 똑같이 해 본 작업
  entries: Record<DeviceKey, DeviceEntry>;
  note: string;
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
  reason: string;
}

export interface Reservation {
  id: string;
  createdAt: string;
  status: ReservationStatus;
  request: RequestInfo;
  ops: Ops;
  logs: CompareLog[];
  decision?: Decision;
  history: HistoryItem[];
}

export interface DemoState {
  version: 1;
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
  '체험료·기간·보증 조건은 딜러 계약 후 확정합니다. 확정 전에는 금액을 표시하지 않습니다.';
export const RESPONSE_TARGET = '운영 목표: 영업일 1일 내 확인 (대표자 확인 전 제안값)';
export const PAYMENT_RULE =
  '예약은 운영자가 결제 서비스의 실제 거래내역을 확인한 뒤에만 확정됩니다. 결제 화면 캡처로는 확정되지 않습니다.';
export const DEALER_TERMS_TBD = '딜러 판매 조건이 확정되면 열립니다. 구매·할인을 보장하지 않습니다.';

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
  requested: '아직 확정되지 않았습니다. 운영자가 두 기기와 픽업 일정을 확인합니다.',
  operator_check: '딜러에게 Air와 Pro 두 대, 반납 후 검수 여유 시간까지 확인하고 있습니다.',
  payment_pending: '두 기기를 보류했습니다. 기한 안에 결제해 주세요. 운영자가 거래내역을 확인하면 확정됩니다.',
  confirmed: '예약이 확정됐습니다. 픽업 때 두 기기의 상태와 부속품을 함께 확인합니다.',
  in_trial: '두 기기로 같은 작업을 해 보고 기록하세요. 마지막 날 기록을 보고 결정합니다.',
  return_received: '반납을 접수했습니다. 운영자가 기기별로 검수합니다.',
  inspecting: '상태·부속품·로그아웃·초기화를 확인하고 있습니다.',
  completed: '체험이 끝났습니다. 7일·30일 뒤 짧은 후속 설문을 드립니다.',
  cancelled: '취소된 요청입니다.',
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

export const WORK_TYPES: Record<WorkType, { label: string; checklist: string[] }> = {
  video: {
    label: '영상 편집',
    checklist: [
      '같은 프로젝트로 타임라인 재생·스크럽이 끊기는지',
      '같은 영상 내보내기에 걸린 시간',
      '긴 렌더링 중 속도 유지·발열·소음 (Air는 팬이 없는 설계)',
      '외장 SSD·모니터 연결에 필요한 포트',
    ],
  },
  dev: {
    label: '개발',
    checklist: [
      '같은 저장소 클린 빌드에 걸린 시간',
      '에디터·브라우저·컨테이너를 함께 띄웠을 때 반응',
      '외부 모니터 연결 작업 환경',
      '전원 없이 반나절 작업 후 배터리 잔량',
    ],
  },
  photo: {
    label: '사진',
    checklist: [
      '같은 RAW 묶음 불러오기·보정·내보내기 시간',
      '화면 밝기·색이 작업에 충분한지',
      'SD 카드 등 연결 방식',
      '들고 다니며 현장에서 쓸 때 무게감',
    ],
  },
  docs: {
    label: '문서·학업',
    checklist: [
      '가방에 넣고 하루 들고 다녀 보기',
      '강의실·카페에서 배터리 지속',
      '화면 크기와 글자 가독성',
      '키보드·트랙패드 사용감',
    ],
  },
  other: {
    label: '기타',
    checklist: [
      '평소 가장 오래 하는 작업을 두 기기에서 똑같이',
      '가장 무거운 작업을 두 기기에서 똑같이',
      '들고 다닐 때 차이',
      '화면·키보드 사용감',
    ],
  },
};

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

export const STORAGE_KEY = 'tbyb-miku-demo-v1';

export function createInitialState(now: Date = new Date()): DemoState {
  return {
    version: 1,
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
  if (!WORK_TYPES[request.workType]) return { ok: false, error: '작업 유형을 골라 주세요.' };
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
    request: { ...request, wantToCompare: request.wantToCompare.trim() },
    ops: {
      deviceIds: {},
      demoTxId: '',
      txMatched: false,
      checkout: { air: false, pro: false },
      inspection: { air: emptyInspection(), pro: emptyInspection() },
      sale: 'none',
    },
    logs: [],
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
function note(r: Reservation, reason: string, now: Date): Reservation {
  return { ...r, history: [...r.history, { at: now.toISOString(), from: r.status, to: r.status, actor: 'operator', reason }] };
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

export function addCompareLog(
  state: DemoState,
  id: string,
  log: Omit<CompareLog, 'id' | 'createdAt'>,
  now: Date = new Date(),
): Result<DemoState> {
  const r = findRes(state, id);
  if (!r) return { ok: false, error: '예약을 찾을 수 없습니다.' };
  if (r.status !== 'in_trial') return { ok: false, error: '비교 기록은 체험 중에만 남길 수 있습니다.' };
  if (!log.task.trim()) return { ok: false, error: '두 기기에서 해 본 작업 이름을 적어 주세요.' };
  const paired = METRICS.some((m) => log.entries.air[m] !== null && log.entries.pro[m] !== null);
  if (!paired) {
    return { ok: false, error: '같은 기준으로 비교하려면 같은 항목을 두 기기 모두 기록해 주세요.' };
  }
  if ([log.entries.air.minutes, log.entries.pro.minutes].some((m) => m !== null && !(m > 0 && m <= 1440))) {
    return { ok: false, error: '소요 시간은 0분보다 크고 1,440분 이하로 적어 주세요.' };
  }
  const entry: CompareLog = { ...log, task: log.task.trim(), id: `${id}-L${r.logs.length + 1}`, createdAt: now.toISOString() };
  return { ok: true, value: replaceRes(state, { ...r, logs: [...r.logs, entry] }) };
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

export type Metric = 'minutes' | 'portability' | 'display' | 'feel';
export const METRICS: Metric[] = ['minutes', 'portability', 'display', 'feel'];
export const METRIC_LABEL: Record<Metric, string> = {
  minutes: '소요 시간(분)',
  portability: '휴대성',
  display: '화면',
  feel: '사용감',
};

export interface DeviceSummary {
  count: number; // 전체 기록 수
  avgMinutes: number | null;
  portability: number | null;
  display: number | null;
  feel: number | null;
}

function avg(xs: (number | null)[]): number | null {
  const v = xs.filter((x): x is number => x !== null);
  if (!v.length) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

// 같은 기록에서 두 기기 모두 측정한 항목만 평균낸다 — 서로 다른 작업의 값을 섞어 비교하지 않기 위해
function pairedLogs(logs: CompareLog[], m: Metric): CompareLog[] {
  return logs.filter((l) => l.entries.air[m] !== null && l.entries.pro[m] !== null);
}

export function summarize(logs: CompareLog[]): Record<DeviceKey, DeviceSummary> {
  const one = (k: DeviceKey): DeviceSummary => ({
    count: logs.length,
    avgMinutes: avg(pairedLogs(logs, 'minutes').map((l) => l.entries[k].minutes)),
    portability: avg(pairedLogs(logs, 'portability').map((l) => l.entries[k].portability)),
    display: avg(pairedLogs(logs, 'display').map((l) => l.entries[k].display)),
    feel: avg(pairedLogs(logs, 'feel').map((l) => l.entries[k].feel)),
  });
  return { air: one('air'), pro: one('pro') };
}

// 항목별로 몇 개 기록(두 기기 모두 측정)을 근거로 한 평균인지 — 요약 옆에 "n개 기록 기준"으로 표시
export function pairedCounts(logs: CompareLog[]): Record<Metric, number> {
  return {
    minutes: pairedLogs(logs, 'minutes').length,
    portability: pairedLogs(logs, 'portability').length,
    display: pairedLogs(logs, 'display').length,
    feel: pairedLogs(logs, 'feel').length,
  };
}

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
  '저장된 데모 데이터를 읽을 수 없습니다. 원본은 지우지 않았습니다. 원본을 복사해 둔 뒤 직접 초기화해 주세요.';
export const STORAGE_WRITE_ERROR = '이 기기에 저장하지 못했습니다. 방금 변경은 저장되지 않았을 수 있습니다.';

// 저장본 읽기. 비어 있으면 초기 상태, 손상됐으면 오류 — 호출 측은 오류일 때 그 키에 쓰지 말고(원본 보존)
// 오류를 보여 준 뒤 사용자가 명시적으로 초기화할 때만 덮어쓴다.
export function readSaved(raw: string | null | undefined): Result<DemoState> {
  if (!raw) return { ok: true, value: createInitialState() };
  try {
    const s = JSON.parse(raw) as DemoState;
    if (s && s.version === 1 && Array.isArray(s.reservations) && Array.isArray(s.devices)) {
      // 판매 상태 필드가 없던 이전 저장본 보정
      for (const r of s.reservations) if (r.ops && !r.ops.sale) r.ops.sale = 'none';
      return { ok: true, value: s };
    }
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
