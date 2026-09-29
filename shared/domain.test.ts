// node --test shared/  (Node 24 type stripping)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addCompareLog,
  assignDevice,
  availableDevices,
  calendarDays,
  createInitialState,
  createReservation,
  devicesToReturn,
  pairedCounts,
  readSaved,
  restoreState,
  setCheckout,
  setDecision,
  setInspection,
  setPaymentCheck,
  setSaleResult,
  summarize,
  transition,
  type DemoState,
  type RequestInfo,
  type Result,
} from './domain.ts';

const T0 = new Date(2026, 8, 29, 10, 0, 0); // 화요일
const req: RequestInfo = {
  startDate: '2026-10-01',
  pickupStore: '제휴 매장 A (계약 전 · 위치 미정)',
  workType: 'video',
  wantToCompare: '4K 내보내기 시간',
  leaningBefore: 'air',
  confidenceBefore: 2,
};

function ok<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

function toTrial(): DemoState {
  let s = ok(createReservation(createInitialState(T0), req, T0));
  s = ok(transition(s, 'TB-0001', 'operator_check', 'operator', '딜러 확인 시작', T0));
  s = ok(assignDevice(s, 'TB-0001', 'air', 'AIR-01'));
  s = ok(assignDevice(s, 'TB-0001', 'pro', 'PRO-01'));
  s = ok(transition(s, 'TB-0001', 'payment_pending', 'operator', '두 대 확보', T0));
  s = ok(setPaymentCheck(s, 'TB-0001', 'DEMO-TX-1', true));
  s = ok(transition(s, 'TB-0001', 'confirmed', 'operator', '거래 대조 완료', T0));
  s = ok(setCheckout(s, 'TB-0001', 'air', true));
  s = ok(setCheckout(s, 'TB-0001', 'pro', true));
  s = ok(transition(s, 'TB-0001', 'in_trial', 'operator', '픽업 완료', T0));
  return s;
}

test('요청은 요청 접수(미확정) 상태로 시작한다', () => {
  const s = ok(createReservation(createInitialState(T0), req, T0));
  assert.equal(s.reservations[0].status, 'requested');
  assert.equal(s.reservations[0].id, 'TB-0001');
});

test('단계 건너뛰기는 차단된다', () => {
  const s = ok(createReservation(createInitialState(T0), req, T0));
  const r = transition(s, 'TB-0001', 'confirmed', 'operator', '바로 확정', T0);
  assert.equal(r.ok, false);
});

test('고객은 운영 단계를 바꿀 수 없고, 운영자 변경에는 사유가 필요하다', () => {
  const s = ok(createReservation(createInitialState(T0), req, T0));
  assert.equal(transition(s, 'TB-0001', 'operator_check', 'customer', '', T0).ok, false);
  assert.equal(transition(s, 'TB-0001', 'operator_check', 'operator', '  ', T0).ok, false);
  assert.equal(transition(s, 'TB-0001', 'cancelled', 'customer', '', T0).ok, true);
});

test('두 기기를 모두 확보해야 결제 대기로 간다', () => {
  let s = ok(createReservation(createInitialState(T0), req, T0));
  s = ok(transition(s, 'TB-0001', 'operator_check', 'operator', '확인', T0));
  s = ok(assignDevice(s, 'TB-0001', 'air', 'AIR-01'));
  assert.equal(transition(s, 'TB-0001', 'payment_pending', 'operator', '결제 요청', T0).ok, false);
  s = ok(assignDevice(s, 'TB-0001', 'pro', 'PRO-01'));
  assert.equal(transition(s, 'TB-0001', 'payment_pending', 'operator', '결제 요청', T0).ok, true);
});

test('거래 대조 없이 확정할 수 없고, 기한이 지나면 자동 확정하지 않는다', () => {
  let s = ok(createReservation(createInitialState(T0), req, T0));
  s = ok(transition(s, 'TB-0001', 'operator_check', 'operator', '확인', T0));
  s = ok(assignDevice(s, 'TB-0001', 'air', 'AIR-01'));
  s = ok(assignDevice(s, 'TB-0001', 'pro', 'PRO-01'));
  s = ok(transition(s, 'TB-0001', 'payment_pending', 'operator', '결제 요청', T0));
  assert.equal(transition(s, 'TB-0001', 'confirmed', 'operator', '확정', T0).ok, false);
  assert.equal(setPaymentCheck(s, 'TB-0001', '', true).ok, false);
  s = ok(setPaymentCheck(s, 'TB-0001', 'DEMO-TX-1', true));
  const late = new Date(T0.getTime() + 25 * 3600_000);
  assert.equal(transition(s, 'TB-0001', 'confirmed', 'operator', '확정', late).ok, false);
  assert.equal(transition(s, 'TB-0001', 'confirmed', 'operator', '확정', T0).ok, true);
});

test('출고 기록 전에는 체험을 시작할 수 없다', () => {
  let s = ok(createReservation(createInitialState(T0), req, T0));
  s = ok(transition(s, 'TB-0001', 'operator_check', 'operator', '확인', T0));
  s = ok(assignDevice(s, 'TB-0001', 'air', 'AIR-01'));
  s = ok(assignDevice(s, 'TB-0001', 'pro', 'PRO-01'));
  s = ok(transition(s, 'TB-0001', 'payment_pending', 'operator', '결제 요청', T0));
  s = ok(setPaymentCheck(s, 'TB-0001', 'DEMO-TX-1', true));
  s = ok(transition(s, 'TB-0001', 'confirmed', 'operator', '확정', T0));
  s = ok(setCheckout(s, 'TB-0001', 'air', true));
  assert.equal(transition(s, 'TB-0001', 'in_trial', 'operator', '픽업', T0).ok, false);
});

test('비교 기록은 두 기기 모두 적어야 저장된다', () => {
  const s = toTrial();
  const empty = { minutes: null, portability: null, display: null, feel: null };
  const r1 = addCompareLog(s, 'TB-0001', { task: '내보내기', note: '', entries: { air: { ...empty, minutes: 12 }, pro: empty } });
  assert.equal(r1.ok, false);
  const s2 = ok(
    addCompareLog(s, 'TB-0001', { task: '내보내기', note: '', entries: { air: { ...empty, minutes: 12 }, pro: { ...empty, minutes: 7 } } }),
  );
  const sum = summarize(s2.reservations[0].logs);
  assert.equal(sum.air.avgMinutes, 12);
  assert.equal(sum.pro.avgMinutes, 7);
});

test('딜러 조건 확정 전에는 구매 선택 불가, 아직 결정 못 함은 가능', () => {
  const s = toTrial();
  assert.equal(setDecision(s, 'TB-0001', { choice: 'buy_used', model: 'pro', confidenceAfter: 4, reason: '렌더링' }).ok, false);
  assert.equal(setDecision(s, 'TB-0001', { choice: 'undecided', confidenceAfter: 2, reason: '더 써봐야' }).ok, true);
});

test('결정 없이 반납 접수 불가', () => {
  const s = toTrial();
  assert.equal(transition(s, 'TB-0001', 'return_received', 'operator', '반납', T0).ok, false);
});

function toBuyUsedReturned(): DemoState {
  let s = toTrial();
  s = { ...s, dealerTermsConfirmed: true };
  s = ok(setDecision(s, 'TB-0001', { choice: 'buy_used', model: 'pro', confidenceAfter: 5, reason: '렌더링 차이' }));
  assert.deepEqual(devicesToReturn(s.reservations[0].decision), ['air']);
  s = ok(transition(s, 'TB-0001', 'return_received', 'operator', 'Air 반납', T0));
  s = ok(transition(s, 'TB-0001', 'inspecting', 'operator', '검수 시작', T0));
  for (const f of ['condition', 'accessories', 'signedOut', 'erased'] as const) {
    s = ok(setInspection(s, 'TB-0001', 'air', f, true));
  }
  return s;
}

test('한 대 구매: 구매 의향만으로는 판매가 아니고, 판매 확인 전엔 완료 불가', () => {
  let s = toBuyUsedReturned();
  assert.equal(s.devices.find((d) => d.id === 'PRO-01')!.state, 'sale_pending');
  assert.equal(s.devices.find((d) => d.id === 'AIR-01')!.state, 'inspection');
  assert.equal(setInspection(s, 'TB-0001', 'pro', 'erased', true).ok, false);
  assert.equal(transition(s, 'TB-0001', 'completed', 'operator', '완료', T0).ok, false);
  s = ok(setSaleResult(s, 'TB-0001', 'confirmed'));
  assert.equal(s.devices.find((d) => d.id === 'PRO-01')!.state, 'sold');
  assert.equal(setSaleResult(s, 'TB-0001', 'failed').ok, false);
  s = ok(transition(s, 'TB-0001', 'completed', 'operator', '완료', T0));
  assert.equal(s.devices.find((d) => d.id === 'AIR-01')!.state, 'available');
  assert.equal(s.devices.find((d) => d.id === 'PRO-01')!.state, 'sold');
});

test('한 대 구매: 판매 불성립이면 그 기기도 반납·검수해야 완료', () => {
  let s = toBuyUsedReturned();
  s = ok(setSaleResult(s, 'TB-0001', 'failed'));
  assert.equal(s.devices.find((d) => d.id === 'PRO-01')!.state, 'inspection');
  assert.equal(transition(s, 'TB-0001', 'completed', 'operator', '완료', T0).ok, false);
  for (const f of ['condition', 'accessories', 'signedOut', 'erased'] as const) {
    s = ok(setInspection(s, 'TB-0001', 'pro', f, true));
  }
  s = ok(transition(s, 'TB-0001', 'completed', 'operator', '완료', T0));
  assert.equal(s.devices.find((d) => d.id === 'PRO-01')!.state, 'available');
});

test('판매 결과는 딜러 조건 확정 없이 confirmed 불가, 구매 선택 아닌 예약엔 불가', () => {
  let s = toBuyUsedReturned();
  s = { ...s, dealerTermsConfirmed: false };
  assert.equal(setSaleResult(s, 'TB-0001', 'confirmed').ok, false);
  let t = toTrial();
  t = ok(setDecision(t, 'TB-0001', { choice: 'return_both', confidenceAfter: 3, reason: '둘 다 과함' }));
  t = ok(transition(t, 'TB-0001', 'return_received', 'operator', '반납', T0));
  assert.equal(setSaleResult(t, 'TB-0001', 'failed').ok, false);
});

test('검수 완료 전 기기는 재대여(배정) 불가', () => {
  let s = toTrial();
  s = ok(setDecision(s, 'TB-0001', { choice: 'return_both', confidenceAfter: 4, reason: '둘 다 과함' }));
  s = ok(transition(s, 'TB-0001', 'return_received', 'operator', '반납', T0));
  s = ok(createReservation(s, { ...req, startDate: '2026-10-06' }, T0));
  s = ok(transition(s, 'TB-0002', 'operator_check', 'operator', '확인', T0));
  assert.equal(assignDevice(s, 'TB-0002', 'air', 'AIR-01').ok, false);
  assert.equal(availableDevices(s, 'air').map((d) => d.id).join(), 'AIR-02');
});

test('취소하면 보류 기기가 풀린다', () => {
  let s = ok(createReservation(createInitialState(T0), req, T0));
  s = ok(transition(s, 'TB-0001', 'operator_check', 'operator', '확인', T0));
  s = ok(assignDevice(s, 'TB-0001', 'air', 'AIR-01'));
  s = ok(transition(s, 'TB-0001', 'cancelled', 'operator', '딜러 재고 없음', T0));
  assert.equal(s.devices.find((d) => d.id === 'AIR-01')!.state, 'available');
  assert.equal(transition(toTrial(), 'TB-0001', 'cancelled', 'customer', '', T0).ok, false);
});

test('마감 날짜 요청 불가, 손상된 저장본은 초기화', () => {
  const s = createInitialState(T0);
  const sunday = calendarDays(s, T0, 7).find((d) => d.status === 'closed')!;
  assert.equal(createReservation(s, { ...req, startDate: sunday.date }, T0).ok, false);
  assert.equal(restoreState('{broken').reservations.length, 0);
  const saved = JSON.stringify(ok(createReservation(s, req, T0)));
  assert.equal(restoreState(saved).reservations[0].id, 'TB-0001');
  const legacy = JSON.parse(saved);
  delete legacy.reservations[0].ops.sale;
  assert.equal(restoreState(JSON.stringify(legacy)).reservations[0].ops.sale, 'none');
});

test('결정 이유는 필수', () => {
  const s = toTrial();
  assert.equal(setDecision(s, 'TB-0001', { choice: 'undecided', confidenceAfter: 2, reason: '  ' }).ok, false);
});

test('요약은 같은 기록에서 두 기기 모두 측정한 항목만 평균낸다 (TETO 재현 사례)', () => {
  let s = toTrial();
  const e = { minutes: null, portability: null, display: null, feel: null };
  // 두 기기 공통 항목이 없는 기록은 저장 거부
  assert.equal(addCompareLog(s, 'TB-0001', { task: '가벼운 작업', note: '', entries: { air: { ...e, minutes: 2 }, pro: { ...e, feel: 3 } } }).ok, false);
  s = ok(addCompareLog(s, 'TB-0001', { task: '가벼운 작업', note: '', entries: { air: { ...e, minutes: 2, feel: 4 }, pro: { ...e, feel: 3 } } }));
  s = ok(addCompareLog(s, 'TB-0001', { task: '무거운 작업', note: '', entries: { air: { ...e, feel: 2 }, pro: { ...e, minutes: 25, feel: 5 } } }));
  const logs = s.reservations[0].logs;
  const sum = summarize(logs);
  assert.equal(sum.air.avgMinutes, null);
  assert.equal(sum.pro.avgMinutes, null);
  assert.equal(sum.air.feel, 3);
  assert.equal(sum.pro.feel, 4);
  assert.deepEqual(pairedCounts(logs), { minutes: 0, portability: 0, display: 0, feel: 2 });
  assert.equal(addCompareLog(s, 'TB-0001', { task: 'x', note: '', entries: { air: { ...e, minutes: 0 }, pro: { ...e, minutes: 3 } } }).ok, false);
});

test('손상된 저장본은 오류로 알리고 조용히 초기화하지 않는다', () => {
  assert.equal(readSaved('{broken').ok, false);
  assert.equal(readSaved('{"version":2}').ok, false);
  const empty = readSaved(null);
  assert.equal(empty.ok && empty.value.reservations.length, 0);
});

test('요청 입력 검증: 작업 유형·확신·14일 범위', () => {
  const s = createInitialState(T0);
  assert.equal(createReservation(s, { ...req, workType: 'x' as never }, T0).ok, false);
  assert.equal(createReservation(s, { ...req, confidenceBefore: 0 as never }, T0).ok, false);
  assert.equal(createReservation(s, { ...req, startDate: '2026-09-28' }, T0).ok, false);
  assert.equal(createReservation(s, { ...req, startDate: '2026-10-30' }, T0).ok, false);
});

test('상태가 안 바뀌는 운영자 조작(기기 확보·거래 대조·판매 결과)도 이력에 남는다', () => {
  let s = toBuyUsedReturned();
  s = ok(setSaleResult(s, 'TB-0001', 'confirmed', T0));
  const reasons = s.reservations[0].history.map((h) => h.reason);
  assert.ok(reasons.some((x) => x.includes('AIR-01 확보')));
  assert.ok(reasons.some((x) => x.includes('DEMO-TX-1 대조 완료')));
  assert.ok(reasons.some((x) => x.includes('딜러 판매 확인 완료')));
});
