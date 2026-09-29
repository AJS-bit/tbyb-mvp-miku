import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MissionIcon } from '@/components/illustrations';
import { PickChip, RewardStatusPill } from '@/components/mission';
import { RequestSummary, ReservationSwitcher } from '@/components/shared';
import {
  Button,
  Card,
  DeviceTag,
  Divider,
  ErrorText,
  Eyebrow,
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
  MISSIONS,
  MISSION_OPEN,
  NEXT,
  PAYMENT_RULE,
  REWARD_AMOUNT_LABEL,
  REWARD_FLAG_LABEL,
  REWARD_REJECT_NOTE_VISIBLE,
  REWARD_STATUS_LABEL,
  SALE_LABEL,
  STATUS_LABEL,
  assignDevice,
  availableDevices,
  canTransition,
  isInspectionDone,
  isPaymentExpired,
  missionProgress,
  requiredInspections,
  reviewReward,
  rewardFlags,
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
  type MissionAnswer,
  type Reservation,
  type ReservationStatus,
  type Result,
} from '@/domain';
import { formatDateTime, formatRemaining, formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { clearFor } from '@/lib/reminder-actions';
import { cancelAllReminders } from '@/lib/reminders';
import { apply, resetAll, setDealerTermsConfirmed, useCurrent } from '@/lib/store';
import { MONO_FAMILY, RADIUS } from '@/lib/theme';
import { themed, useTheme } from '@/lib/theme-context';

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
  const { c } = useTheme();
  const styles = useStyles();
  const demo = app.demo;
  const scrollRef = useRef<ScrollView>(null);
  const [rewardY, setRewardY] = useState(0);
  const { section } = useLocalSearchParams<{ section?: string }>();

  // ?section=reward 로 열면 리워드 확인으로 바로 내려간다
  useEffect(() => {
    if (section === 'reward' && rewardY > 0) scrollRef.current?.scrollTo({ y: rewardY - 12, animated: false });
  }, [section, rewardY]);

  const showReward = !!current && (MISSION_OPEN.includes(current.status) || current.status === 'completed');

  return (
    <Screen scrollRef={scrollRef}>
      <View style={styles.banner} accessibilityRole="summary">
        <Icon ios="exclamationmark.triangle.fill" web="warning" size={18} color={c.ivory} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline" color={c.ivory}>
            데모 — 실제 운영자 기능 아님
          </T>
          <T variant="footnote" color={c.onInkSub}>
            운영자 인증 없이 이 기기에 저장된 데모 데이터만 바꿉니다. 고객 흐름을 끝까지 시연하기 위한 화면입니다.
          </T>
        </View>
      </View>

      {!current ? (
        <Card style={{ gap: 10 }}>
          <T variant="title3">진행할 요청이 없습니다</T>
          <T variant="callout" color={c.sub}>
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
          {current.ops.wallCodes ? <WallCodes r={current} /> : null}
          <NextStep key={`next-${current.id}-${current.status}`} r={current} demo={demo} />
          {showReward ? (
            <View onLayout={(e) => setRewardY(e.nativeEvent.layout.y)}>
              <RewardReview key={`reward-${current.id}-${current.reward.status}`} r={current} />
            </View>
          ) : null}
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
  const t = useTheme();
  const { c } = t;
  const styles = useStyles();
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
                  <T variant="footnote" weight="700" color={assigned ? c.ink : c.sub}>
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
                      style={({ pressed }) => [styles.devChip, { borderColor: t.device[k].main }, pressed && { opacity: 0.7 }]}>
                      <T variant="callout" weight="700" color={c.ink}>
                        {d.id} 배정
                      </T>
                    </Pressable>
                  ))}
                  {!options.length && !assigned ? (
                    <T variant="footnote" color={c.error}>
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
            <T variant="footnote" color={expired ? c.error : c.warnText}>
              {formatRemaining(r.ops.paymentDeadline)}
            </T>
          </KeyValue>
          {expired ? <Notice tone="error">기한이 지났습니다. 자동 확정하지 않습니다 — 취소·환불 또는 대체 일정으로 처리하세요.</Notice> : null}
          <T variant="footnote">{PAYMENT_RULE}</T>
          <View style={{ gap: 6 }}>
            <T variant="footnote" weight="700" color={c.ink}>
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
              color={t.device[k].main}
              onColor={c.onMark}
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
          <KeyValue k="핵심 미션" v={`${missionProgress(r).done}/${missionProgress(r).total}`} />
          <KeyValue k="리워드" v={REWARD_STATUS_LABEL[r.reward.status]} />
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
              <View key={k} style={[styles.inspectBox, { borderLeftColor: t.device[k].main }]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row gap={6}>
                    <DeviceTag kind={k} full />
                    <T variant="caption">{r.ops.deviceIds[k]}</T>
                  </Row>
                  {inspect ? (
                    <Pill label={done ? '검수 완료' : `${count}/4`} bg={done ? c.doneSoft : c.proSoft} fg={done ? c.doneText : c.proInk} />
                  ) : null}
                </Row>
                {inspect ? (
                  r.status === 'inspecting' ? (
                    (Object.keys(INSPECTION_LABEL) as (keyof Inspection)[]).map((f) => (
                      <SwitchRow
                        key={f}
                        label={INSPECTION_LABEL[f]}
                        color={t.device[k].main}
                        onColor={c.onMark}
                        value={r.ops.inspection[k][f]}
                        onValueChange={(v) => run((s) => setInspection(s, r.id, k, f, v)).then(setError)}
                      />
                    ))
                  ) : (
                    <T variant="footnote">반납 기기 — &lsquo;검수 중&rsquo;으로 넘기면 검수 항목이 열립니다.</T>
                  )
                ) : (
                  <T variant="footnote" color={c.warnText}>
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
  const { c } = useTheme();
  const styles = useStyles();
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
          bg={r.ops.sale === 'confirmed' ? c.doneSoft : r.ops.sale === 'failed' ? c.greySoft : c.warnBg}
          fg={r.ops.sale === 'confirmed' ? c.doneText : r.ops.sale === 'failed' ? c.grey : c.warnText}
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

// ───────── 바탕화면 코드 (운영자만 봄) ─────────

function WallCodes({ r }: { r: Reservation }) {
  const t = useTheme();
  const styles = useStyles();
  const codes = r.ops.wallCodes!;
  return (
    <Section eyebrow="Wallpaper codes" title="출고 때 바탕화면에 띄울 코드" caption="예약·기기마다 다른 4자리 — 고객 화면에는 보이지 않아요">
      <Card style={{ gap: 12 }}>
        <Row gap={10}>
          {KINDS.map((k) => (
            <View key={k} style={[styles.codeBox, { backgroundColor: t.device[k].soft }]} accessible accessibilityLabel={`${DEVICE_LABEL[k]} 바탕화면 코드 ${codes[k].split('').join(' ')}`}>
              <Row gap={6}>
                <View style={[styles.dot, { backgroundColor: t.device[k].main }]} />
                <T variant="footnote" weight="800" color={t.device[k].ink}>
                  {t.device[k].short} {r.ops.deviceIds[k] ?? ''}
                </T>
              </Row>
              <T variant="title" style={styles.codeText}>
                {codes[k]}
              </T>
            </View>
          ))}
        </Row>
        <T variant="footnote">
          픽업 전에 두 맥 바탕화면에 크게 띄워 두세요. 고객은 미션 탭에서 이 코드를 적고, 리워드 확인 때 참고 단서로만 봐요.
        </T>
      </Card>
    </Section>
  );
}

// ───────── 리워드 확인 ─────────

function answerExtras(a: MissionAnswer): string {
  const parts: string[] = [];
  if (a.battery) parts.push(`배터리 Air ${a.battery.air.before}→${a.battery.air.after}% · Pro ${a.battery.pro.before}→${a.battery.pro.after}%`);
  if (a.minutes) parts.push(`걸린 시간 Air ${a.minutes.air}분 · Pro ${a.minutes.pro}분`);
  if (a.daily) parts.push(`해 본 일: ${a.daily}`);
  return parts.join('\n');
}

function RewardReview({ r }: { r: Reservation }) {
  const [note, setNote] = useState(r.reward.reviewNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { c } = useTheme();
  const styles = useStyles();
  const status = r.reward.status;
  const flags = status === 'none' ? rewardFlags(r) : r.reward.flags;
  const p = missionProgress(r);
  const codes = r.ops.wallCodes;

  const review = async (result: 'approved' | 'rejected') => {
    if (busy) return;
    setBusy(true);
    setError(await run((s) => reviewReward(s, r.id, result, note)));
    setBusy(false);
  };

  return (
    <Section
      eyebrow="Reward review"
      title="리워드 확인"
      caption="표시는 자동 거절이 아니라 검토 신호예요. 고객 화면에는 상태만 보이고 표시 내용은 보이지 않아요.">
      <Card style={{ gap: 16 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }} gap={8}>
          <Row gap={8}>
            <T variant="footnote" weight="700">
              상태
            </T>
            <RewardStatusPill status={status} />
          </Row>
          <T variant="caption">{REWARD_AMOUNT_LABEL}</T>
        </Row>
        <T variant="footnote">
          {`핵심 미션 ${p.done}/${p.total}`}
          {r.reward.submittedAt ? ` · 신청 ${formatShortDateTime(r.reward.submittedAt)}` : ''}
        </T>

        <View style={{ gap: 8 }}>
          <Eyebrow>{status === 'none' ? 'Flags · 신청 전 미리보기' : 'Flags · 신청 시점'}</Eyebrow>
          {flags.length ? (
            <View style={{ gap: 6 }}>
              {flags.map((f) => (
                <Row key={f} gap={8} style={styles.flag}>
                  <Icon ios="flag.fill" web="flag" size={13} color={c.warnText} />
                  <T variant="footnote" weight="700" color={c.warnText} style={{ flex: 1 }}>
                    {REWARD_FLAG_LABEL[f]}
                  </T>
                </Row>
              ))}
            </View>
          ) : (
            <T variant="footnote">표시 없음</T>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Eyebrow>Wallpaper code · 참고</Eyebrow>
          <View style={styles.codeTable}>
            <Row style={styles.codeRowHead}>
              <T variant="caption" style={{ flex: 1 }}>
                기기
              </T>
              <T variant="caption" style={styles.codeCell}>
                고객 입력
              </T>
              <T variant="caption" style={styles.codeCell}>
                출고 코드
              </T>
              <View style={{ width: 22 }} />
            </Row>
            {KINDS.map((k) => {
              const typed = r.codeCheck?.[k];
              const expected = codes?.[k];
              const same = !!typed && typed === expected;
              return (
                <Row key={k} style={styles.codeRow}>
                  <View style={{ flex: 1 }}>
                    <DeviceTag kind={k} />
                  </View>
                  <T variant="callout" weight="700" color={typed ? c.ink : c.sub} style={[styles.codeCell, styles.mono]}>
                    {typed ?? '—'}
                  </T>
                  <T variant="callout" weight="700" style={[styles.codeCell, styles.mono]}>
                    {expected ?? '—'}
                  </T>
                  <View style={{ width: 22, alignItems: 'center' }}>
                    {typed ? (
                      <Icon ios={same ? 'checkmark.circle.fill' : 'xmark.circle.fill'} web={same ? 'check_circle' : 'cancel'} size={17} color={same ? c.doneText : c.error} />
                    ) : null}
                  </View>
                </Row>
              );
            })}
          </View>
        </View>

        {status === 'submitted' ? (
          <View style={{ gap: 10 }}>
            <Divider />
            <View style={{ gap: 6 }}>
              <T variant="footnote" weight="700" color={c.ink}>
                확인 메모 {flags.length ? '(필수 — 표시 있음)' : '(거절 시 필수)'}
              </T>
              <Input
                multiline
                value={note}
                onChangeText={(v) => {
                  setNote(v);
                  setError(null);
                }}
                placeholder="예: 두 기기 스크린 타임·배터리 사용 기록 확인"
                accessibilityLabel="리워드 확인 메모"
              />
              <T variant="caption">{REWARD_REJECT_NOTE_VISIBLE}</T>
            </View>
            <Row gap={8}>
              <Button small label="승인 · 지급 예정" onPress={() => review('approved')} disabled={busy} style={{ flex: 1 }} />
              <Button small variant="danger" label="거절" onPress={() => review('rejected')} disabled={busy} style={{ flex: 0.6 }} />
            </Row>
            <T variant="caption">반납 검수 단계부터 확인해요 (기기 사용 흔적과 함께 대조). 한 번 정하면 바꿀 수 없어요.</T>
          </View>
        ) : status === 'approved' || status === 'rejected' ? (
          <View style={styles.reviewed}>
            <T variant="footnote" weight="700" color={c.ink}>
              {`${REWARD_STATUS_LABEL[status]} · ${formatShortDateTime(r.reward.reviewedAt)}`}
            </T>
            {r.reward.reviewNote ? <T variant="footnote">{r.reward.reviewNote}</T> : null}
          </View>
        ) : (
          <T variant="footnote">고객이 핵심 미션과 바탕화면 코드를 채우고 신청하면 여기서 확인해요.</T>
        )}
        <ErrorText message={error} />
        <View style={{ gap: 0 }}>
          <Eyebrow>Answers · 참고</Eyebrow>
          {MISSIONS.map((m, i) => {
            const a = r.missions[m.id];
            const extra = a ? answerExtras(a) : '';
            return (
              <View key={m.id} style={[styles.ansRow, i > 0 && styles.histLine]}>
                <MissionIcon id={m.id} size={30} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }} gap={6}>
                    <T variant="footnote" weight="700" color={c.ink} style={{ flexShrink: 1 }}>
                      {m.title}
                    </T>
                    {a ? <T variant="caption">{formatShortDateTime(a.answeredAt)}</T> : null}
                  </Row>
                  {a ? (
                    <Row gap={6} style={{ flexWrap: 'wrap' }}>
                      <PickChip pick={a.pick} />
                      {a.followUp ? <T variant="caption">{a.followUp}</T> : null}
                    </Row>
                  ) : (
                    <T variant="caption">
                      답 없음
                    </T>
                  )}
                  {extra ? (
                    <T variant="caption" color={c.ink}>
                      {extra}
                    </T>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    </Section>
  );
}

// ───────── 다음 단계 ─────────

function NextStep({ r, demo }: { r: Reservation; demo: DemoState }) {
  const targets = NEXT[r.status];
  const forward = targets.find((t) => t !== 'cancelled');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { c } = useTheme();
  const styles = useStyles();

  if (!targets.length) {
    return (
      <Section title="다음 단계">
        <Card>
          <T variant="callout" color={c.sub}>
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
          <T variant="footnote" weight="700" color={c.ink}>
            변경 사유 (필수)
          </T>
          <Input value={reason} onChangeText={setReason} placeholder="이력에 남는 사유" accessibilityLabel="상태 변경 사유" />
          {forward && SUGGESTED_REASON[forward] ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`추천 사유 넣기: ${SUGGESTED_REASON[forward]}`}
              onPress={() => setReason(SUGGESTED_REASON[forward] ?? '')}
              style={({ pressed }) => [styles.suggest, pressed && { opacity: 0.7 }]}>
              <Icon ios="text.badge.plus" web="add_notes" size={14} color={c.coralInk} />
              <T variant="footnote" weight="600" color={c.coralInk}>
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
                  <Icon ios="lock.fill" web="lock" size={13} color={c.sub} style={{ marginTop: 3 }} />
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
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Section title="이력" caption="최근 순">
      <Card style={{ gap: 0, paddingVertical: 6 }}>
        {[...r.history].reverse().map((h, i) => (
          <View key={`${h.at}-${i}`} style={[styles.hist, i > 0 && styles.histLine]}>
            <Row style={{ justifyContent: 'space-between' }}>
              {h.from === h.to ? (
                <Row gap={6} style={{ flexShrink: 1 }}>
                  <Icon ios="note.text" web="description" size={12} color={c.sub} />
                  <T variant="footnote">운영 기록 · {STATUS_LABEL[h.to]} 단계</T>
                </Row>
              ) : (
                <Row gap={6} style={{ flexShrink: 1, flexWrap: 'wrap' }}>
                  {h.from ? (
                    <>
                      <T variant="footnote">{STATUS_LABEL[h.from]}</T>
                      <Icon ios="arrow.right" web="arrow_forward" size={11} color={c.sub} />
                    </>
                  ) : null}
                  <T variant="footnote" weight="700" color={c.ink}>
                    {STATUS_LABEL[h.to]}
                  </T>
                </Row>
              )}
              <Pill
                label={h.actor === 'operator' ? '운영자' : '고객'}
                bg={h.actor === 'operator' ? c.greySoft : c.coralSoft}
                fg={h.actor === 'operator' ? c.sub : c.coralInk}
              />
            </Row>
            <T variant="callout">{h.reason}</T>
            {h.internalNote ? (
              <T variant="footnote" color={c.warnText}>
                운영 메모: {h.internalNote}
              </T>
            ) : null}
            <T variant="caption">{formatShortDateTime(h.at)}</T>
          </View>
        ))}
      </Card>
    </Section>
  );
}

// ───────── 기기 보드 ─────────

const useStateTone = themed(({ c }): Record<DeviceState, { bg: string; fg: string }> => ({
  available: { bg: c.doneSoft, fg: c.doneText },
  held: { bg: c.warnBg, fg: c.warnText },
  out: { bg: c.coralSoft, fg: c.coralInk },
  inspection: { bg: c.proSoft, fg: c.proInk },
  sale_pending: { bg: c.warnBg, fg: c.warnText },
  sold: { bg: c.greySoft, fg: c.grey },
}));

function DeviceBoard({ demo }: { demo: DemoState }) {
  const t = useTheme();
  const styles = useStyles();
  const STATE_TONE = useStateTone();
  return (
    <Section title="기기 보드" caption="검수를 마치기 전 기기는 다시 배정할 수 없습니다">
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {demo.devices.map((d, i) => {
          const tone = STATE_TONE[d.state];
          return (
            <View key={d.id} style={[styles.devRow, i > 0 && styles.histLine]}>
              <View style={[styles.devBar, { backgroundColor: t.device[d.kind].main }]} />
              <View style={{ width: 70 }}>
                <T variant="callout" weight="700" style={{ fontVariant: ['tabular-nums'] }}>
                  {d.id}
                </T>
                <T variant="caption">{t.device[d.kind].short}</T>
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
  const { c } = useTheme();
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
        <Card accent={c.errorLine}>
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

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: c.ink,
      borderRadius: RADIUS.card,
      padding: 14,
    },
    devChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: RADIUS.chip,
      borderWidth: 1.5,
      backgroundColor: c.surface,
    },
    inspectBox: { borderLeftWidth: 4, paddingLeft: 12, gap: 4 },
    saleBox: { backgroundColor: c.warnBg, borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: c.warnLine },
    suggest: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
    hist: { paddingVertical: 10, gap: 3 },
    histLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    devRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    devBar: { width: 4, height: 32, borderRadius: 2 },
    stateChip: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, maxWidth: 220 },
    codeBox: { flex: 1, borderRadius: 16, padding: 14, gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    codeText: { fontFamily: MONO_FAMILY, letterSpacing: 6, fontSize: 28, lineHeight: 36 },
    ansRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
    codeTable: { borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' },
    codeRowHead: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.sunk },
    codeRow: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    codeCell: { width: 82, textAlign: 'center' },
    mono: { fontFamily: MONO_FAMILY, letterSpacing: 2 },
    flag: { backgroundColor: c.warnBg, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
    reviewed: { backgroundColor: c.sunk, borderRadius: 12, padding: 12, gap: 4 },
  }),
);

