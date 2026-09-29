// node --test shared/  (Node 24 type stripping)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  answerMission,
  assignDevice,
  availableDevices,
  calendarDays,
  createInitialState,
  createReservation,
  devicesToReturn,
  missionProgress,
  missionSummary,
  readSaved,
  restoreState,
  setCheckout,
  setDecision,
  setInspection,
  setPaymentCheck,
  setSaleResult,
  reviewReward,
  setCodeCheck,
  submitReward,
  wallCode,
  CORE_MISSIONS,
  type MissionId,
  transition,
  type DemoState,
  type RequestInfo,
  type Result,
} from './domain.ts';

const T0 = new Date(2026, 8, 29, 10, 0, 0); // 화요일
const req: RequestInfo = {
  startDate: '2026-10-01',
  pickupStore: '제휴 매장 A (계약 전 · 위치 미정)',
  usage: 'unsure',
  question: '유튜브만 보는데 Pro가 필요할까',
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

function answerCore(s: DemoState, at: (i: number) => Date): DemoState {
  const ids: MissionId[] = ['carry', 'video', 'screen', 'typing', 'daily'];
  ids.forEach((m, i) => {
    const extra =
      m === 'video'
        ? { battery: { air: { before: 90, after: 82 }, pro: { before: 90, after: 84 } } }
        : m === 'daily'
          ? { daily: '쇼핑·검색' }
          : {};
    s = ok(answerMission(s, 'TB-0001', { id: m, pick: i % 2 ? 'same' : 'air', ...extra }, at(i)));
  });
  return s;
}

test('미션: 체험 중에만, 비슷함·모르겠음도 유효, 입력값 검증', () => {
  const s = toTrial();
  assert.equal(answerMission(s, 'TB-0001', { id: 'carry', pick: 'unsure' }, T0).ok, true);
  assert.equal(answerMission(s, 'TB-0001', { id: 'carry', pick: 'same', followUp: '없는 선택지' }, T0).ok, false);
  assert.equal(answerMission(s, 'TB-0001', { id: 'video', pick: 'air' }, T0).ok, true); // 배터리는 선택 (숙제처럼 만들지 않기)
  assert.equal(
    answerMission(s, 'TB-0001', { id: 'video', pick: 'air', battery: { air: { before: 50, after: 60 }, pro: { before: 90, after: 80 } } }, T0).ok,
    false,
  ); // 끝이 더 높음
  assert.equal(answerMission(s, 'TB-0001', { id: 'daily', pick: 'pro', daily: '아무거나' }, T0).ok, false);
  assert.equal(answerMission(s, 'TB-0001', { id: 'heavy', pick: 'pro', minutes: { air: 0, pro: 3 } }, T0).ok, false);
  const before = ok(createReservation(createInitialState(T0), req, T0));
  assert.equal(answerMission(before, 'TB-0001', { id: 'carry', pick: 'air' }, T0).ok, false); // 픽업 전
});

test('리워드: 핵심 미션 5개 + 코드 입력 후 1회만 신청, 자동 거절 없이 표시만', () => {
  let s = toTrial();
  const codes = s.reservations[0].ops.wallCodes!;
  assert.match(codes.air, /^[A-Z2-9]{4}$/);
  assert.notEqual(codes.air, codes.pro);
  assert.equal(submitReward(s, 'TB-0001', T0).ok, false); // 미션 없음
  s = answerCore(s, (i) => new Date(T0.getTime() + i * 3600_000)); // 몇 시간에 걸쳐 답함
  assert.equal(missionProgress(s.reservations[0]).done, CORE_MISSIONS.length);
  assert.equal(submitReward(s, 'TB-0001', T0).ok, false); // 코드 없음
  s = ok(setCodeCheck(s, 'TB-0001', codes.air.toLowerCase(), ` ${codes.pro} `, T0));
  s = ok(submitReward(s, 'TB-0001', T0));
  assert.equal(s.reservations[0].reward.status, 'submitted');
  assert.deepEqual(s.reservations[0].reward.flags, []);
  assert.equal(submitReward(s, 'TB-0001', T0).ok, false); // 1회만
  assert.equal(answerMission(s, 'TB-0001', { id: 'carry', pick: 'pro' }, T0).ok, false); // 신청 후 잠김
  assert.deepEqual(missionSummary(s.reservations[0]), { air: 3, same: 2, pro: 0, unsure: 0 });
});

test('리워드 표시: 몰아서 답함·코드 불일치·배터리 이상·전부 모르겠음', () => {
  let s = toTrial();
  const ids: MissionId[] = ['carry', 'video', 'screen', 'typing', 'daily'];
  for (const m of ids) {
    const extra = m === 'video' ? { battery: { air: { before: 90, after: 30 }, pro: { before: 90, after: 88 } } } : m === 'daily' ? { daily: '기타' } : {};
    s = ok(answerMission(s, 'TB-0001', { id: m, pick: 'unsure', ...extra }, T0));
  }
  s = ok(setCodeCheck(s, 'TB-0001', 'ZZZZ', 'YYYY', T0));
  s = ok(submitReward(s, 'TB-0001', T0));
  assert.deepEqual([...s.reservations[0].reward.flags].sort(), ['all_unsure', 'battery_odd', 'code_mismatch', 'rushed']);
});

test('리워드 검토: 반납 검수 단계부터, 거절·표시 있는 승인은 메모 필수, 이력 남음', () => {
  let s = toTrial();
  const codes = s.reservations[0].ops.wallCodes!;
  s = answerCore(s, (i) => new Date(T0.getTime() + i * 3600_000));
  s = ok(setCodeCheck(s, 'TB-0001', 'WRNG', codes.pro, T0));
  s = ok(submitReward(s, 'TB-0001', T0));
  assert.equal(reviewReward(s, 'TB-0001', 'approved', '', T0).ok, false); // 체험 중
  s = ok(setDecision(s, 'TB-0001', { choice: 'return_both', confidenceAfter: 4, reason: '유튜브면 Air로 충분' }, T0));
  s = ok(transition(s, 'TB-0001', 'return_received', 'operator', '반납', T0));
  s = ok(transition(s, 'TB-0001', 'inspecting', 'operator', '검수', T0));
  assert.equal(reviewReward(s, 'TB-0001', 'approved', '', T0).ok, false); // 표시(code_mismatch) 있음 → 메모 필요
  assert.equal(reviewReward(s, 'TB-0001', 'rejected', ' ', T0).ok, false);
  s = ok(reviewReward(s, 'TB-0001', 'approved', '코드 오타. 두 기기 스크린 타임 사용 기록 확인', T0));
  assert.equal(s.reservations[0].reward.status, 'approved');
  const h = s.reservations[0].history.find((x) => x.reason.includes('리워드 확인 완료'))!;
  assert.equal(h.reason, '리워드 확인 완료 · 지급 예정'); // 고객에게 보이는 문구엔 메모 없음
  assert.equal(h.internalNote, '코드 오타. 두 기기 스크린 타임 사용 기록 확인');
  assert.equal(reviewReward(s, 'TB-0001', 'rejected', '중복', T0).ok, false);
});

test('바탕화면 코드는 예약·기기마다 다르다', () => {
  const a = wallCode('TB-0001', 'air', T0);
  assert.notEqual(a, wallCode('TB-0002', 'air', T0));
  assert.notEqual(a, wallCode('TB-0001', 'pro', T0));
  assert.equal(a, wallCode('TB-0001', 'air', T0));
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
  // v1(이전 버전) 저장본은 다른 키를 쓰고, 이 키에 들어와도 손상으로 보고 덮어쓰지 않는다
  assert.equal(readSaved(JSON.stringify({ ...JSON.parse(saved), version: 1 })).ok, false);
});

test('결정 이유는 필수', () => {
  const s = toTrial();
  assert.equal(setDecision(s, 'TB-0001', { choice: 'undecided', confidenceAfter: 2, reason: '  ' }).ok, false);
});

test('손상된 저장본은 오류로 알리고 조용히 초기화하지 않는다', () => {
  assert.equal(readSaved('{broken').ok, false);
  assert.equal(readSaved('{"version":2}').ok, false);
  const empty = readSaved(null);
  assert.equal(empty.ok && empty.value.reservations.length, 0);
});

test('요청 입력 검증: 용도(선택)·확신·14일 범위', () => {
  const s = createInitialState(T0);
  assert.equal(createReservation(s, { ...req, usage: 'x' as never }, T0).ok, false);
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

test('반납 뒤 기억으로 쓴 답도 받고 리워드 신청 가능, 검토 표시만 붙는다', () => {
  let s = toTrial();
  const codes = s.reservations[0].ops.wallCodes!;
  s = ok(answerMission(s, 'TB-0001', { id: 'carry', pick: 'air' }, T0));
  s = ok(setDecision(s, 'TB-0001', { choice: 'undecided', confidenceAfter: 2, reason: '아직 모르겠음' }, T0));
  const T1 = new Date(T0.getTime() + 48 * 3600_000);
  s = ok(transition(s, 'TB-0001', 'return_received', 'operator', '반납', T1));
  const later = (i: number) => new Date(T1.getTime() + (i + 1) * 3600_000);
  for (const [i, m] of (['video', 'screen', 'typing'] as MissionId[]).entries()) {
    s = ok(answerMission(s, 'TB-0001', { id: m, pick: 'same' }, later(i)));
  }
  s = ok(answerMission(s, 'TB-0001', { id: 'daily', pick: 'unsure', daily: '영상 보기' }, later(3)));
  s = ok(setCodeCheck(s, 'TB-0001', codes.air, codes.pro, later(4)));
  s = ok(submitReward(s, 'TB-0001', later(4)));
  assert.deepEqual(s.reservations[0].reward.flags, ['after_return']);
  assert.equal(answerMission(s, 'TB-0001', { id: 'carry', pick: 'pro' }, later(5)).ok, false); // 신청 뒤 잠김
});
