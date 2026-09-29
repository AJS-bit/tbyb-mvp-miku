import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RequestSummary, ReservationSwitcher } from '@/components/shared';
import {
  Button,
  Card,
  DeviceTag,
  Divider,
  ErrorText,
  Icon,
  Input,
  KeyValue,
  Notice,
  Pill,
  Row,
  Section,
  StatusChip,
  SwitchRow,
  T,
} from '@/components/ui';
import { Screen } from '@/components/screen';
import {
  DECISION_LABEL,
  DEVICE_LABEL,
  DEVICE_STATE_LABEL,
  INSPECTION_LABEL,
  NEXT,
  PAYMENT_RULE,
  SALE_LABEL,
  STATUS_LABEL,
  assignDevice,
  availableDevices,
  canTransition,
  isInspectionDone,
  isPaymentExpired,
  requiredInspections,
  saleDevice,
  setCheckout,
  setInspection,
  setPaymentCheck,
  setSaleResult,
  transition,
  type DemoState,
  type DeviceKey,
  type DeviceState,
  type Inspection,
  type Reservation,
  type ReservationStatus,
  type Result,
} from '@/domain';
import { formatDateTime, formatRemaining, formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { clearFor } from '@/lib/reminder-actions';
import { cancelAllReminders } from '@/lib/reminders';
import { apply, resetAll, setDealerTermsConfirmed, useCurrent } from '@/lib/store';
import { C, DEVICE_COLOR, RADIUS } from '@/lib/theme';

const KINDS: DeviceKey[] = ['air', 'pro'];

const SUGGESTED_REASON: Partial<Record<ReservationStatus, string>> = {
  operator_check: '딜러에 두 기기·검수 여유 확인 시작',
  payment_pending: 'Air·Pro 두 대 확보, 결제 요청',
  confirmed: '거래내역·예약ID 대조 완료',
  in_trial: '픽업 · 두 기기 출고 기록 완료',
  return_received: '고객 반납 접수',
  inspecting: '기기별 검수 시작',
  completed: '검수 완료',
  cancelled: '운영 사정으로 취소',
};

/** 도메인 함수 실행 + 결과를 오류 문구로 */
async function run(fn: (s: DemoState) => Result<DemoState>): Promise<string | null> {
  const r = await apply(fn);
  if (!r.ok) {
    haptic.error();
    return r.error;
  }
  haptic.select();
  return null;
}

export default function SimulatorScreen() {
  const { app, current } = useCurrent();
  const demo = app.demo;

  return (
    <Screen>
      <View style={styles.banner} accessibilityRole="summary">
        <Icon ios="exclamationmark.triangle.fill" web="warning" size={18} color="#FFFFFF" style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline" color="#FFFFFF">
            데모 — 실제 운영자 기능 아님
          </T>
          <T variant="footnote" color="#D0D5DD">
            운영자 인증 없이 이 기기에 저장된 데모 데이터만 바꿉니다. 고객 흐름을 끝까지 시연하기 위한 화면입니다.
          </T>
        </View>
      </View>

      {!current ? (
        <Card style={{ gap: 10 }}>
          <T variant="title3">진행할 요청이 없습니다</T>
          <T variant="callout" color={C.sub}>
            먼저 비교팩 탭에서 데모 일정 요청을 만들면 여기서 단계를 진행할 수 있습니다.
          </T>
          <Button
            small
            variant="secondary"
            label="비교팩으로"
            onPress={() => {
              if (router.canGoBack()) router.back();
              router.navigate({ pathname: '/', params: { section: 'form' } });
            }}
          />
        </Card>
      ) : (
        <>
          <ReservationSwitcher list={demo.reservations} currentId={current.id} />
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="title3">{current.id}</T>
              <StatusChip status={current.status} large />
            </Row>
            <RequestSummary r={current} compact />
          </Card>
          <StepPanel key={`${current.id}-${current.status}`} r={current} demo={demo} />
          <NextStep key={`next-${current.id}-${current.status}`} r={current} demo={demo} />
          <History r={current} />
        </>
      )}

      <DeviceBoard demo={demo} />

      <DemoSettings dealerTermsConfirmed={demo.dealerTermsConfirmed} />

      <ResetBlock />
    </Screen>
  );
}

// ───────── 단계별 운영 조작 ─────────

function StepPanel({ r, demo }: { r: Reservation; demo: DemoState }) {
  const [error, setError] = useState<string | null>(null);
  const [txDraft, setTxDraft] = useState(r.ops.demoTxId);

  let body: React.ReactNode = null;
  let title = '이 단계에서 할 일';

  switch (r.status) {
    case 'requested':
      body = <T variant="callout">요청을 확인했다면 사유를 적고 &lsquo;운영 확인 중&rsquo;으로 넘기세요.</T>;
      break;
    case 'operator_check':
      title = '기기 확보 (Air·Pro 두 대 모두)';
      body = (
        <View style={{ gap: 14 }}>
          {KINDS.map((k) => {
            const assigned = r.ops.deviceIds[k];
            const options = availableDevices(demo, k);
            return (
              <View key={k} style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <DeviceTag kind={k} full />
                  <T variant="footnote" weight="700" color={assigned ? C.ink : C.muted}>
                    {assigned ? `확보: ${assigned}` : '미확보'}
                  </T>
                </Row>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  {options.map((d) => (
                    <Pressable
                      key={d.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.id} 배정`}
                      onPress={() => run((s) => assignDevice(s, r.id, k, d.id)).then(setError)}
                      style={({ pressed }) => [styles.devChip, { borderColor: DEVICE_COLOR[k].main }, pressed && { opacity: 0.7 }]}>
                      <T variant="callout" weight="700" color={C.ink}>
                        {d.id} 배정
                      </T>
                    </Pressable>
                  ))}
                  {!options.length && !assigned ? (
                    <T variant="footnote" color={C.error}>
                      배정 가능한 기기가 없습니다 (보류·사용 중·검수 대기·구매 대기 제외).
                    </T>
                  ) : null}
                  {!options.length && assigned ? <T variant="footnote">다른 배정 가능 기기 없음</T> : null}
                </Row>
              </View>
            );
          })}
        </View>
      );
      break;
    case 'payment_pending': {
      const expired = isPaymentExpired(r);
      title = '거래 대조';
      body = (
        <View style={{ gap: 12 }}>
          <KeyValue k="결제 기한">
            <T variant="callout" weight="700">
              {formatDateTime(r.ops.paymentDeadline)}
            </T>
            <T variant="footnote" color={expired ? C.error : C.warnText}>
              {formatRemaining(r.ops.paymentDeadline)}
            </T>
          </KeyValue>
          {expired ? <Notice tone="error">기한이 지났습니다. 자동 확정하지 않습니다 — 취소·환불 또는 대체 일정으로 처리하세요.</Notice> : null}
          <T variant="footnote">{PAYMENT_RULE}</T>
          <View style={{ gap: 6 }}>
            <T variant="footnote" weight="700" color={C.ink}>
              데모 거래 식별자
            </T>
            <Row gap={8}>
              <Input
                value={txDraft}
                onChangeText={(v) => {
                  setTxDraft(v);
                  run((s) => setPaymentCheck(s, r.id, v, r.ops.txMatched)).then(setError);
                }}
                placeholder="예: DEMO-TX-0001"
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="데모 거래 식별자"
                style={{ flex: 1 }}
              />
              <Button
                small
                variant="secondary"
                label="예시 넣기"
                onPress={() => {
                  const v = `DEMO-TX-${r.id.replace('TB-', '')}`;
                  setTxDraft(v);
                  run((s) => setPaymentCheck(s, r.id, v, r.ops.txMatched)).then(setError);
                }}
              />
            </Row>
          </View>
          <SwitchRow
            label="거래내역·예약ID 대조 완료"
            sub="결제 서비스의 실제 거래내역을 봤다는 뜻입니다 (데모에서는 흉내만)."
            value={r.ops.txMatched}
            onValueChange={(v) => run((s) => setPaymentCheck(s, r.id, txDraft, v)).then(setError)}
          />
        </View>
      );
      break;
    }
    case 'confirmed':
      title = '출고 기록 (픽업 때)';
      body = (
        <View style={{ gap: 4 }}>
          {KINDS.map((k) => (
            <SwitchRow
              key={k}
              label={`${DEVICE_LABEL[k]} 상태·부속품 기록`}
              sub={r.ops.deviceIds[k] ? `기기 ${r.ops.deviceIds[k]}` : undefined}
              color={DEVICE_COLOR[k].main}
              value={r.ops.checkout[k]}
              onValueChange={(v) => run((s) => setCheckout(s, r.id, k, v)).then(setError)}
            />
          ))}
        </View>
      );
      break;
    case 'in_trial':
      title = '체험 중';
      body = (
        <View style={{ gap: 8 }}>
          <KeyValue k="비교 기록" v={`${r.logs.length}건`} />
          <KeyValue
            k="고객 결정"
            v={r.decision ? `${DECISION_LABEL[r.decision.choice]}${r.decision.model ? ` · ${DEVICE_LABEL[r.decision.model]}` : ''}` : '아직 없음'}
          />
          {!r.decision ? (
            <T variant="footnote">반납 접수 전에 고객이 결정(아직 결정 못 함 포함)을 남겨야 합니다. 결정·반납 탭에서 남길 수 있습니다.</T>
          ) : null}
        </View>
      );
      break;
    case 'return_received':
    case 'inspecting': {
      title = r.status === 'inspecting' ? '기기별 검수' : '반납 접수됨';
      const sd = saleDevice(r.decision);
      const required = requiredInspections(r);
      body = (
        <View style={{ gap: 14 }}>
          {sd ? <SalePanel r={r} kind={sd} dealerTermsConfirmed={demo.dealerTermsConfirmed} onError={setError} /> : null}
          {KINDS.map((k) => {
            const inspect = required.includes(k);
            const done = isInspectionDone(r.ops.inspection[k]);
            const count = (Object.keys(INSPECTION_LABEL) as (keyof Inspection)[]).filter((f) => r.ops.inspection[k][f]).length;
            return (
              <View key={k} style={[styles.inspectBox, { borderLeftColor: DEVICE_COLOR[k].main }]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={6}>
                    <DeviceTag kind={k} full />
                    <T variant="caption">{r.ops.deviceIds[k]}</T>
                  </Row>
                  {inspect ? (
                    <Pill label={done ? '검수 완료' : `${count}/4`} bg={done ? C.doneSoft : C.proSoft} fg={done ? C.doneText : C.pro} />
                  ) : null}
                </Row>
                {inspect ? (
                  r.status === 'inspecting' ? (
                    (Object.keys(INSPECTION_LABEL) as (keyof Inspection)[]).map((f) => (
                      <SwitchRow
                        key={f}
                        label={INSPECTION_LABEL[f]}
                        color={DEVICE_COLOR[k].main}
                        value={r.ops.inspection[k][f]}
                        onValueChange={(v) => run((s) => setInspection(s, r.id, k, f, v)).then(setError)}
                      />
                    ))
                  ) : (
                    <T variant="footnote">반납 기기 — &lsquo;검수 중&rsquo;으로 넘기면 검수 항목이 열립니다.</T>
                  )
                ) : (
                  <T variant="footnote" color={C.warnText}>
                    {r.ops.sale === 'confirmed' ? DEVICE_STATE_LABEL.sold : DEVICE_STATE_LABEL.sale_pending}
                  </T>
                )}
              </View>
            );
          })}
        </View>
      );
      break;
    }
    case 'completed':
      title = '완료';
      body = (
        <T variant="callout">
          반납 기기는 검수를 마쳐 다시 &lsquo;요청 가능&rsquo;입니다.
          {saleDevice(r.decision) ? ` 구매 선택 기기: ${SALE_LABEL[r.ops.sale]}.` : ''}
        </T>
      );
      break;
    case 'cancelled':
      title = '취소됨';
      body = <T variant="callout">보류했던 기기는 풀렸습니다.</T>;
      break;
  }

  return (
    <Section title={title}>
      <Card>{body}</Card>
      <ErrorText message={error} />
    </Section>
  );
}

function SalePanel({
  r,
  kind,
  dealerTermsConfirmed,
  onError,
}: {
  r: Reservation;
  kind: DeviceKey;
  dealerTermsConfirmed: boolean;
  onError: (e: string | null) => void;
}) {
  const pending = r.ops.sale === 'none';
  return (
    <View style={styles.saleBox}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="callout" weight="700">
          구매 선택 기기 판매 확인
        </T>
        <DeviceTag kind={kind} />
      </Row>
      <Row gap={6}>
        <T variant="footnote">판매 상태</T>
        <Pill
          label={SALE_LABEL[r.ops.sale]}
          bg={r.ops.sale === 'confirmed' ? C.doneSoft : r.ops.sale === 'failed' ? C.greySoft : C.warnBg}
          fg={r.ops.sale === 'confirmed' ? C.doneText : r.ops.sale === 'failed' ? C.grey : C.warnText}
        />
      </Row>
      {pending ? (
        <>
          <T variant="footnote">
            고객의 구매 선택은 의향일 뿐입니다. 딜러 판매가 확인돼야 구매로 확정되고, 불성립이면 이 기기도 반납·검수합니다.
          </T>
          <Row gap={8}>
            <Button
              small
              label="딜러 판매 확인"
              onPress={() => run((s) => setSaleResult(s, r.id, 'confirmed')).then(onError)}
              style={{ flex: 1 }}
              accessibilityHint={dealerTermsConfirmed ? undefined : '딜러 판매 조건이 확정돼야 합니다'}
            />
            <Button small variant="secondary" label="판매 불성립 → 반납·검수" onPress={() => run((s) => setSaleResult(s, r.id, 'failed')).then(onError)} style={{ flex: 1.2 }} />
          </Row>
        </>
      ) : null}
    </View>
  );
}

// ───────── 다음 단계 ─────────

function NextStep({ r, demo }: { r: Reservation; demo: DemoState }) {
  const targets = NEXT[r.status];
  const forward = targets.find((t) => t !== 'cancelled');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!targets.length) {
    return (
      <Section title="다음 단계">
        <Card>
          <T variant="callout" color={C.sub}>
            더 진행할 단계가 없습니다.
          </T>
        </Card>
      </Section>
    );
  }


  const go = async (to: ReservationStatus) => {
    const res = await apply((s) => transition(s, r.id, to, 'operator', reason));
    if (!res.ok) {
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
    if (to === 'return_received' || to === 'cancelled') clearFor(r.id);
  };

  return (
    <Section title="다음 단계" caption="허용된 다음 단계만 보입니다 — 건너뛰기 불가, 사유 필수">
      <Card style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <T variant="footnote" weight="700" color={C.ink}>
            변경 사유 (필수)
          </T>
          <Input value={reason} onChangeText={setReason} placeholder="이력에 남는 사유" accessibilityLabel="상태 변경 사유" />
          {forward && SUGGESTED_REASON[forward] ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`추천 사유 넣기: ${SUGGESTED_REASON[forward]}`}
              onPress={() => setReason(SUGGESTED_REASON[forward] ?? '')}
              style={({ pressed }) => [styles.suggest, pressed && { opacity: 0.7 }]}>
              <Icon ios="text.badge.plus" web="add_notes" size={14} color={C.primary} />
              <T variant="footnote" color={C.primary}>
                {SUGGESTED_REASON[forward]}
              </T>
            </Pressable>
          ) : null}
        </View>
        <Divider />
        {targets.map((to) => {
          const check = canTransition(demo, r.id, to);
          return (
            <View key={to} style={{ gap: 6 }}>
              <Button
                variant={to === 'cancelled' ? 'danger' : 'primary'}
                label={`→ ${STATUS_LABEL[to]}`}
                disabled={!check.ok}
                onPress={() => go(to)}
                accessibilityHint={check.ok ? undefined : check.error}
              />
              {!check.ok ? (
                <Row gap={6} style={{ alignItems: 'flex-start' }}>
                  <Icon ios="lock.fill" web="lock" size={13} color={C.sub} style={{ marginTop: 3 }} />
                  <T variant="footnote" style={{ flex: 1 }}>
                    {check.error}
                  </T>
                </Row>
              ) : null}
            </View>
          );
        })}
        <ErrorText message={error} />
      </Card>
    </Section>
  );
}

// ───────── 이력 ─────────

function History({ r }: { r: Reservation }) {
  return (
    <Section title="이력" caption="최근 순">
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        {[...r.history].reverse().map((h, i) => (
          <View key={`${h.at}-${i}`} style={[styles.hist, i > 0 && styles.histLine]}>
            <Row style={{ justifyContent: 'space-between' }}>
              {h.from === h.to ? (
                <Row gap={6} style={{ flexShrink: 1 }}>
                  <Icon ios="note.text" web="description" size={12} color={C.sub} />
                  <T variant="footnote">운영 기록 · {STATUS_LABEL[h.to]} 단계</T>
                </Row>
              ) : (
                <Row gap={6} style={{ flexShrink: 1, flexWrap: 'wrap' }}>
                  {h.from ? (
                    <>
                      <T variant="footnote">{STATUS_LABEL[h.from]}</T>
                      <Icon ios="arrow.right" web="arrow_forward" size={11} color={C.sub} />
                    </>
                  ) : null}
                  <T variant="footnote" weight="700" color={C.ink}>
                    {STATUS_LABEL[h.to]}
                  </T>
                </Row>
              )}
              <Pill
                label={h.actor === 'operator' ? '운영자' : '고객'}
                bg={h.actor === 'operator' ? C.slateSoft : C.primarySoft}
                fg={h.actor === 'operator' ? C.slate : C.primary}
              />
            </Row>
            <T variant="callout">{h.reason}</T>
            <T variant="caption">{formatShortDateTime(h.at)}</T>
          </View>
        ))}
      </Card>
    </Section>
  );
}

// ───────── 기기 보드 ─────────

const STATE_TONE: Record<DeviceState, { bg: string; fg: string }> = {
  available: { bg: C.doneSoft, fg: C.doneText },
  held: { bg: C.warnBg, fg: C.warnText },
  out: { bg: C.primarySoft, fg: C.primary },
  inspection: { bg: C.proSoft, fg: C.pro },
  sale_pending: { bg: C.warnBg, fg: C.warnText },
  sold: { bg: C.greySoft, fg: C.grey },
};

function DeviceBoard({ demo }: { demo: DemoState }) {
  return (
    <Section title="기기 보드" caption="검수를 마치기 전 기기는 다시 배정할 수 없습니다">
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {demo.devices.map((d, i) => {
          const tone = STATE_TONE[d.state];
          return (
            <View key={d.id} style={[styles.devRow, i > 0 && styles.histLine]}>
              <View style={[styles.devBar, { backgroundColor: DEVICE_COLOR[d.kind].main }]} />
              <View style={{ width: 70 }}>
                <T variant="callout" weight="700" style={{ fontVariant: ['tabular-nums'] }}>
                  {d.id}
                </T>
                <T variant="caption">{DEVICE_COLOR[d.kind].short}</T>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 3 }}>
                <View style={[styles.stateChip, { backgroundColor: tone.bg }]}>
                  <T variant="caption" weight="700" color={tone.fg} style={{ textAlign: 'right' }}>
                    {DEVICE_STATE_LABEL[d.state]}
                  </T>
                </View>
                {d.heldBy ? <T variant="caption">{d.heldBy}</T> : null}
              </View>
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

// ───────── 데모 설정 ─────────

function DemoSettings({ dealerTermsConfirmed }: { dealerTermsConfirmed: boolean }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Section title="데모 설정">
      <Card style={{ gap: 4 }}>
        <SwitchRow
          label="딜러 판매 조건 확정 (데모 설정)"
          sub="켜면 고객 화면의 구매 선택지와 딜러 판매 확인이 열립니다. 실제 딜러 조건과 무관합니다."
          value={dealerTermsConfirmed}
          onValueChange={async (v) => {
            const r = await setDealerTermsConfirmed(v);
            setError(r.ok ? null : r.error);
          }}
        />
      </Card>
      <ErrorText message={error} />
    </Section>
  );
}

// ───────── 초기화 ─────────

function ResetBlock() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Section title="데모 초기화" caption="모든 요청·기록·기기 상태·예약된 알림을 지웁니다">
      {!confirming ? (
        <Button
          variant="danger"
          label="데모 초기화"
          icon={['arrow.counterclockwise', 'restart_alt']}
          onPress={() => {
            setDone(false);
            setConfirming(true);
          }}
        />
      ) : (
        <Card accent="#FECDCA" style={{ borderWidth: 1.5 }}>
          <T variant="callout" weight="700">
            정말 초기화할까요? 되돌릴 수 없습니다.
          </T>
          <Row gap={8}>
            <Button
              small
              variant="danger"
              label="초기화"
              onPress={async () => {
                await cancelAllReminders();
                const ok = await resetAll();
                setConfirming(false);
                setDone(ok);
                if (ok) haptic.success();
                else haptic.error();
              }}
              style={{ flex: 1 }}
            />
            <Button small variant="secondary" label="취소" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}
      {done ? <Notice tone="done">초기 상태로 돌렸습니다.</Notice> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.ink,
    borderRadius: RADIUS.card,
    padding: 14,
  },
  devChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.chip,
    borderWidth: 1.5,
    backgroundColor: C.surface,
  },
  inspectBox: { borderLeftWidth: 4, paddingLeft: 12, gap: 4 },
  saleBox: { backgroundColor: C.warnBg, borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: C.warnLine },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  hist: { paddingVertical: 10, gap: 3 },
  histLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  devBar: { width: 4, height: 32, borderRadius: 2 },
  stateChip: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, maxWidth: 220 },
});

