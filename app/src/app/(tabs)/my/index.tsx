// 내 체험 — 첫 화면은 "인사 + 다음 행동 하나"(교차 리뷰에서 가져온 구성, 스타일은 우리 것):
//   ① 저장소 오류 카드(있을 때, Screen 이 맨 위에 둔다) ② 상태에 맞는 인사 ③ 버튼이 하나뿐인 다음 행동 카드
//   ④ 첫 비교팩 요약(Air·Pro 칩 + 날짜) ⑤ 접어 둔 "진행 상황 자세히"(설명·진행 단계·요청 내용) ⑥ 취소 · 화면 모드
// 약속은 로컬 데모에서 참인 것만: 연락·알림 대신 "여기(내 체험)에서 이어서 볼 수 있어요".
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand';
import { HeroIllustration, MissionIcon } from '@/components/illustrations';
import { RewardStatusPill, missionHref } from '@/components/mission';
import { FollowUpNotice, ReturnOutcome } from '@/components/outcome';
import { Screen, ScrollTarget } from '@/components/screen';
import { EmptyState, RequestSummary, ReservationSwitcher, Timeline } from '@/components/shared';
import { ThemePicker } from '@/components/theme-picker';
import { Button, Card, DeviceTag, Divider, ErrorText, Eyebrow, FadeUp, Icon, KeyValue, Notice, Row, StatusChip, T, type IconPair } from '@/components/ui';
import {
  CANCELLABLE,
  DECISION_LABEL,
  DEMO_NOTICE,
  DEVICE_LABEL,
  MISSIONS,
  MISSION_OPEN,
  PAYMENT_RULE,
  RESPONSE_TARGET,
  REWARD_AMOUNT_LABEL,
  STATUS_HELP,
  isPaymentExpired,
  missionProgress,
  toDateKey,
  transition,
  type MissionId,
  type Reservation,
  type ReservationStatus,
} from '@/domain';
import { FIRST_PACK } from '@/lib/brand';
import { formatDateKey, formatDateTime, formatRemaining } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { trialStartDate } from '@/lib/reminder-plan';
import { apply, useCurrent } from '@/lib/store';
import { themed, useTheme } from '@/lib/theme-context';

// 상태에 맞는 인사 두 줄 — 첫 줄은 따뜻한 말, 둘째 줄은 지금 상태 (상태 칩의 공식 이름과 겹치지 않게)
const GREETING: Record<ReservationStatus, [string, string]> = {
  requested: ['반가워요,', '요청이 잘 도착했어요'],
  operator_check: ['반가워요,', '두 대를 준비하고 있어요'],
  payment_pending: ['거의 다 왔어요,', '결제만 남았어요'],
  confirmed: ['곧 만나요,', '이제 픽업만 하면 돼요'],
  in_trial: ['반가워요,', '오늘의 두 맥은 어땠나요?'],
  return_received: ['돌려주셔서 고마워요,', '곧 점검을 시작해요'],
  inspecting: ['돌려주셔서 고마워요,', '지금 점검하고 있어요'],
  completed: ['함께해 주셔서', '고마워요'],
  cancelled: ['요청이', '취소됐어요'],
};

// "진행 상황 자세히" 첫 줄. 완료 문구(STATUS_HELP.completed)는 설문을 보내 준다고 약속해서, 데모에서 참인 말로 바꿔 쓴다.
const DETAIL_HELP: Partial<Record<ReservationStatus, string>> = {
  completed: '체험이 끝났어요. 남긴 결정과 미션 답, 기기별 결과는 결정·반납 탭에서 이어서 볼 수 있어요.',
};

const RETURN_PHASE: ReservationStatus[] = ['return_received', 'inspecting'];

export default function MyTrialScreen() {
  const { app, current } = useCurrent();
  const list = app.demo.reservations;
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!current) {
    return (
      <Screen>
        <FadeUp>
          <EmptyState
            eyebrow="My trial"
            title="반가워요, 아직 요청한 체험이 없어요"
            body="비교팩 탭에서 데모 일정을 요청하면, 진행 상황과 다음 할 일을 여기에서 이어서 볼 수 있어요. 요청은 이 기기에 저장돼요."
            art={<HeroIllustration style={{ maxWidth: 300, alignSelf: 'center' }} />}
            cta={{ label: '데모 일정 요청하러 가기', href: '/' }}
          />
        </FadeUp>
        <Notice tone="info">{DEMO_NOTICE}</Notice>
        <ScrollTarget name="appearance">
          <ThemePicker />
        </ScrollTarget>
      </Screen>
    );
  }

  const showDetails = () => {
    setDetailsOpen(true);
    router.setParams({ section: 'details' });
  };

  return (
    <Screen>
      <ReservationSwitcher list={list} currentId={current.id} />
      <FadeUp>
        <Greeting r={current} />
      </FadeUp>
      <FadeUp delay={80}>
        <NextAction key={current.id} r={current} onShowDetails={showDetails} />
      </FadeUp>
      <PackSummary r={current} />
      <ScrollTarget name="details">
        <Details r={current} open={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)} />
      </ScrollTarget>
      {CANCELLABLE.includes(current.status) ? <CancelBlock r={current} /> : null}
      <ScrollTarget name="appearance">
        <ThemePicker />
      </ScrollTarget>
    </Screen>
  );
}

// ───────── ② 인사 ─────────

function Greeting({ r }: { r: Reservation }) {
  const { c } = useTheme();
  const expired = r.status === 'payment_pending' && isPaymentExpired(r);
  const [first, second] = expired ? ['결제 기한이', '지났어요'] : GREETING[r.status];
  return (
    <View style={{ gap: 10, paddingHorizontal: 2, paddingTop: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>{`My trial · ${r.id}`}</Eyebrow>
        <StatusChip status={r.status} />
      </Row>
      <T variant="display" accessibilityRole="header">
        <T variant="display" color={c.coralInk}>
          {first}
        </T>
        {`\n${second}`}
      </T>
    </View>
  );
}

// ───────── ③ 다음 행동 하나 ─────────

type Next = {
  title: string;
  body?: ReactNode;
  action: { label: string; icon?: IconPair; hint?: string; onPress: () => void };
  tone?: 'ink' | 'warn' | 'error' | 'done';
};

/** 체험 중: 아직 답하지 않은 첫 핵심 미션 → 코드 → 리워드 신청 → 결정 → 반납 준비 순서로 하나만 */
function trialStep(r: Reservation): { kind: 'mission'; id: MissionId } | { kind: 'code' | 'reward' | 'decide' | 'return' } {
  const p = missionProgress(r);
  if (p.missing.length) return { kind: 'mission', id: p.missing[0] };
  if (r.reward.status === 'none') return { kind: r.codeCheck ? 'reward' : 'code' };
  return { kind: r.decision ? 'return' : 'decide' };
}

function NextAction({ r, onShowDetails }: { r: Reservation; onShowDetails: () => void }) {
  const { c } = useTheme();
  const [payNote, setPayNote] = useState(false);
  const toMissions = () => router.navigate('/missions');
  let next: Next;

  switch (r.status) {
    case 'requested':
    case 'operator_check':
      next = {
        title: '지금은 기다리면 돼요',
        body: (
          <>
            <T variant="callout">
              {r.status === 'requested'
                ? '운영자가 Air와 Pro, 픽업 일정을 확인하고 있어요. 결제 안내는 준비가 끝나면 여기에 나와요.'
                : 'Air와 Pro가 모두 준비되면 결제 안내가 여기에 나와요.'}
            </T>
            {r.status === 'requested' ? <T variant="footnote">{RESPONSE_TARGET}</T> : null}
          </>
        ),
        action: { label: '그동안 미션 미리 둘러보기', icon: ['gift', 'redeem'], onPress: toMissions },
      };
      break;
    case 'payment_pending': {
      const expired = isPaymentExpired(r);
      next = expired
        ? {
            title: '예약은 확정되지 않았어요',
            tone: 'error',
            body: (
              <>
                <KeyValue k="결제 기한">
                  <T variant="callout" weight="700">
                    {formatDateTime(r.ops.paymentDeadline)}
                  </T>
                  <T variant="footnote" color={c.error}>
                    {formatRemaining(r.ops.paymentDeadline)}
                  </T>
                </KeyValue>
                <T variant="callout">운영자가 요청을 취소하거나 다른 일정을 정하면, 여기에서 이어서 볼 수 있어요.</T>
              </>
            ),
            action: { label: '진행 상황 자세히 보기', icon: ['list.bullet', 'list'], onPress: onShowDetails },
          }
        : {
            title: '기한 안에 결제해 주세요',
            tone: 'warn',
            body: (
              <>
                <KeyValue k="결제 기한">
                  <T variant="callout" weight="700">
                    {formatDateTime(r.ops.paymentDeadline)}
                  </T>
                  <T variant="footnote" color={c.warnText}>
                    {formatRemaining(r.ops.paymentDeadline)}
                  </T>
                </KeyValue>
                <Notice tone="info">{PAYMENT_RULE}</Notice>
                {payNote ? (
                  <T variant="footnote">데모라서 결제 화면은 열리지 않고 돈도 오가지 않아요. 운영 시뮬레이터에서 결제 확인 단계를 이어서 해 보세요.</T>
                ) : null}
              </>
            ),
            action: {
              label: '결제하러 가기 (데모 · 실제 결제 없음)',
              icon: ['creditcard', 'credit_card'],
              hint: '데모라서 결제 화면으로 넘어가지 않아요',
              onPress: () => setPayNote(true),
            },
          };
      break;
    }
    case 'confirmed':
      next = {
        title: '픽업 날 이것만 챙겨요',
        body: (
          <>
            <KeyValue k="픽업" v={`${formatDateKey(r.request.startDate)} · ${r.request.pickupStore}`} />
            <View style={{ gap: 6 }}>
              <Bullet>두 맥의 상태와 구성품을 운영자와 함께 확인해요.</Bullet>
              <Bullet>바탕화면에 뜬 4자리 코드를 봐 두세요. 나중에 미션 탭에 적으면 돼요.</Bullet>
              <Bullet>가방을 챙겨 가면 첫 미션 ‘들고 나가 보기’를 바로 할 수 있어요.</Bullet>
            </View>
          </>
        ),
        action: { label: '픽업 뒤에 할 미션 미리 보기', icon: ['gift', 'redeem'], onPress: toMissions },
      };
      break;
    case 'in_trial': {
      const step = trialStep(r);
      const p = missionProgress(r);
      if (step.kind === 'mission') {
        const i = MISSIONS.findIndex((m) => m.id === step.id);
        const m = MISSIONS[i];
        next = {
          title: '오늘 해 볼 미션 하나',
          body: (
            <>
              <MissionPeek id={m.id} index={i} title={m.title} how={m.how} />
              <MiniProgress done={p.done} total={p.total} note="하루에 하나씩 해도 충분해요" />
            </>
          ),
          action: {
            label: '이 미션 하러 가기',
            icon: ['arrow.right.circle', 'arrow_circle_right'],
            hint: `${m.title} 미션을 열어요`,
            onPress: () => {
              haptic.select();
              router.push(missionHref(m.id));
            },
          },
        };
      } else if (step.kind === 'code') {
        next = {
          title: '바탕화면 코드만 남았어요',
          body: (
            <>
              <T variant="callout">핵심 미션을 모두 했어요. 두 맥 바탕화면에 뜬 4자리 코드를 적으면 리워드를 신청할 수 있어요.</T>
              <MiniProgress done={p.done} total={p.total} />
            </>
          ),
          action: { label: '코드 적으러 가기', icon: ['keyboard', 'keyboard'], onPress: toMissions },
        };
      } else if (step.kind === 'reward') {
        next = {
          title: '리워드를 신청할 수 있어요',
          body: (
            <>
              <T variant="callout">신청하면 반납한 기기를 점검한 뒤 운영자가 확인해요. 신청한 뒤에는 미션 답을 바꿀 수 없어요.</T>
              <T variant="footnote" weight="700" color={c.coralInk}>
                {`미션 리워드 · ${REWARD_AMOUNT_LABEL}`}
              </T>
            </>
          ),
          action: { label: '리워드 신청하러 가기', icon: ['gift', 'redeem'], onPress: toMissions },
        };
      } else if (step.kind === 'decide') {
        next = {
          title: '마지막 날 결정만 남았어요',
          body: <T variant="callout">미션 답을 모아 보며 반납할지 살지 골라요. 체험하는 동안에는 몇 번이든 바꿀 수 있어요.</T>,
          action: {
            label: '결정하러 가기',
            icon: ['checkmark.seal', 'verified'],
            onPress: () => router.navigate({ pathname: '/decide', params: { section: 'choice' } }),
          },
        };
      } else {
        const d = r.decision!;
        next = {
          title: '반납 준비만 확인하면 돼요',
          body: (
            <KeyValue k="내 결정" v={`${DECISION_LABEL[d.choice]}${d.model ? ` · ${DEVICE_LABEL[d.model]}` : ''}`} />
          ),
          action: { label: '반납 준비 확인하기', icon: ['checklist', 'checklist'], onPress: () => router.navigate('/decide') },
        };
      }
      break;
    }
    case 'return_received':
    case 'inspecting': {
      const canStillApply = r.reward.status === 'none';
      next = {
        title: '반납 안내',
        body: (
          <>
            <ReturnOutcome r={r} />
            <T variant="footnote">
              {canStillApply
                ? '점검이 끝나기 전까지는 기억나는 대로 남은 미션을 하고 리워드를 신청할 수 있어요.'
                : '따로 하실 일은 없어요. 점검 결과는 여기에서 이어서 볼 수 있어요.'}
            </T>
          </>
        ),
        action: canStillApply
          ? { label: '남은 미션 이어서 하기', icon: ['gift', 'redeem'], onPress: toMissions }
          : { label: '반납 결과 자세히 보기', icon: ['shippingbox', 'inventory_2'], onPress: () => router.navigate('/decide') },
      };
      break;
    }
    case 'completed':
      next = {
        title: '모두 끝났어요',
        tone: 'done',
        body: <T variant="callout">기기별 결과와 남긴 결정, 미션 답을 한곳에 모아 뒀어요.</T>,
        action: { label: '결과 보기', icon: ['checkmark.seal', 'verified'], onPress: () => router.navigate('/decide') },
      };
      break;
    case 'cancelled':
      next = {
        title: '다시 써 보고 싶다면',
        body: <T variant="callout">비교팩 탭에서 새 일정을 요청할 수 있어요.</T>,
        action: {
          label: '다시 요청하기',
          icon: ['calendar', 'event'],
          onPress: () => router.navigate({ pathname: '/', params: { section: 'form' } }),
        },
      };
      break;
  }

  return <NextCard {...next} />;
}

function NextCard({ title, body, action, tone = 'ink' }: Next) {
  const { c } = useTheme();
  const s = useStyles();
  const border = { ink: c.lineStrong, warn: c.warnLine, error: c.errorLine, done: c.doneLine }[tone];
  const fg = { ink: c.coralInk, warn: c.warnText, error: c.error, done: c.doneText }[tone];
  return (
    <View style={[s.next, { borderColor: border }]}>
      <Row gap={6}>
        <Icon ios="arrow.right.circle.fill" web="arrow_circle_right" size={16} color={fg} />
        <T variant="footnote" weight="800" color={fg}>
          지금 할 일
        </T>
      </Row>
      <T variant="title" accessibilityRole="header" style={{ marginTop: -4 }}>
        {title}
      </T>
      {body}
      <Button label={action.label} icon={action.icon} accessibilityHint={action.hint} onPress={action.onPress} style={{ marginTop: 2 }} />
    </View>
  );
}

function MissionPeek({ id, index, title, how }: { id: MissionId; index: number; title: string; how: string }) {
  const s = useStyles();
  return (
    <View style={s.peek}>
      <MissionIcon id={id} size={56} />
      <View style={{ flex: 1, gap: 2 }}>
        <Eyebrow>{`Mission 0${index + 1}`}</Eyebrow>
        <T variant="headline">{title}</T>
        <T variant="footnote" numberOfLines={3}>
          {how}
        </T>
      </View>
    </View>
  );
}

/** 핵심 미션 n/5 — 칸 다섯 개 */
function MiniProgress({ done, total, note }: { done: number; total: number; note?: string }) {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`핵심 미션 ${total}개 중 ${done}개 했어요`}>
      <View style={s.bars}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[s.bar, i < done && { backgroundColor: c.coral }]} />
        ))}
      </View>
      <T variant="caption">{`핵심 미션 ${done}/${total}${note ? ` · ${note}` : ''}`}</T>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <Row gap={8} style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.coral, marginTop: 9 }} />
      <T variant="callout" style={{ flex: 1 }}>
        {children}
      </T>
    </Row>
  );
}

// ───────── ④ 첫 비교팩 요약 ─────────

function PackSummary({ r }: { r: Reservation }) {
  const { c } = useTheme();
  const s = useStyles();
  const started = ['in_trial', 'return_received', 'inspecting', 'completed'].includes(r.status) || (r.status === 'cancelled' && r.history.some((h) => h.to === 'in_trial'));
  const date = started
    ? `${formatDateKey(toDateKey(trialStartDate(r)))}부터 체험`
    : `${formatDateKey(r.request.startDate)} 픽업${r.status === 'confirmed' ? '' : ' 희망'}`;
  const showMissions = MISSION_OPEN.includes(r.status) || r.status === 'completed';
  const p = missionProgress(r);
  return (
    <View style={s.pack} accessibilityLabel={`${FIRST_PACK}: ${DEVICE_LABEL.air}, ${DEVICE_LABEL.pro}. ${date}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={7}>
          <BrandMark height={14} />
          <T variant="footnote" weight="800" color={c.ink}>
            {FIRST_PACK}
          </T>
        </Row>
        <Row gap={5}>
          <Icon ios="calendar" web="event" size={13} color={c.sub} />
          <T variant="footnote" weight="600">
            {date}
          </T>
        </Row>
      </Row>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        <DeviceTag kind="air" full />
        <T variant="footnote" color={c.sub}>
          +
        </T>
        <DeviceTag kind="pro" full />
      </Row>
      <T variant="caption" numberOfLines={1}>
        {r.request.pickupStore}
      </T>
      {showMissions ? (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <T variant="caption" weight="700" color={c.ink}>{`미션 ${p.done}/${p.total}`}</T>
          <T variant="caption">리워드</T>
          <RewardStatusPill status={r.reward.status} />
        </Row>
      ) : null}
    </View>
  );
}

// ───────── ⑤ 진행 상황 자세히 (접어 둔다) ─────────

function Details({ r, open, onToggle }: { r: Reservation; open: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <Card style={{ gap: 0, paddingVertical: 4 }}>
      <Pressable
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityState={{ expanded: open }}
        accessibilityLabel="진행 상황 자세히"
        accessibilityHint={open ? '진행 단계와 요청 내용을 접어요' : '진행 단계와 요청 내용을 펼쳐요'}
        onPress={() => {
          haptic.select();
          onToggle();
        }}
        style={({ pressed }) => [s.detailsHead, pressed && { opacity: 0.7 }]}>
        <Icon ios="list.bullet" web="list" size={16} color={c.sub} />
        <View style={{ flex: 1, gap: 1 }}>
          <T variant="headline">진행 상황 자세히</T>
          <T variant="caption">진행 단계 · 요청 내용</T>
        </View>
        <Icon ios={open ? 'chevron.up' : 'chevron.down'} web={open ? 'expand_less' : 'expand_more'} size={14} color={c.sub} />
      </Pressable>
      {open ? (
        <View style={s.detailsBody}>
          <T variant="callout" color={c.sub}>
            {DETAIL_HELP[r.status] ?? STATUS_HELP[r.status]}
          </T>
          <Timeline r={r} />
          <Divider />
          <View style={{ gap: 10 }}>
            <T variant="headline">요청 내용</T>
            <RequestSummary r={r} />
            <T variant="caption">{formatDateTime(r.createdAt)}에 요청했어요</T>
          </View>
          {RETURN_PHASE.includes(r.status) || r.status === 'completed' ? <FollowUpNotice /> : null}
        </View>
      ) : null}
    </Card>
  );
}

// ───────── ⑥ 취소 ─────────

function CancelBlock({ r }: { r: Reservation }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { c } = useTheme();

  const cancel = async () => {
    const res = await apply((s) => transition(s, r.id, 'cancelled', 'customer', '고객이 요청 취소'));
    if (!res.ok) {
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
    setConfirming(false);
    setError(null);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <T variant="headline">요청을 취소하고 싶다면</T>
        <T variant="footnote">픽업 전까지는 여기서 바로 취소할 수 있어요.</T>
      </View>
      {!confirming ? (
        <Button variant="danger" small label="이 요청 취소하기" onPress={() => setConfirming(true)} />
      ) : (
        <Card accent={c.errorLine}>
          <T variant="callout" weight="700">
            {r.id} 요청을 취소할까요?
          </T>
          <T variant="footnote">취소한 요청은 되돌릴 수 없어요. 필요하면 새로 요청해 주세요.</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small variant="danger" label="취소하기" onPress={cancel} style={{ flex: 1 }} />
            <Button small variant="secondary" label="돌아가기" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
          </View>
        </Card>
      )}
      <ErrorText message={error} />
    </View>
  );
}

const useStyles = themed(({ c, shadow }) =>
  StyleSheet.create({
    next: {
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      padding: 18,
      gap: 14,
      ...shadow,
    },
    peek: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: c.sunk, borderRadius: 18, padding: 12 },
    bars: { flexDirection: 'row', gap: 4 },
    bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: c.line },
    pack: {
      backgroundColor: c.sunk,
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 9,
    },
    detailsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    detailsBody: { gap: 16, paddingTop: 4, paddingBottom: 16 },
  }),
);
