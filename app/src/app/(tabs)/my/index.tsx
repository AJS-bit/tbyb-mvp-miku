import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { HeroIllustration } from '@/components/illustrations';
import { MissionProgressCard } from '@/components/mission';
import { FollowUpNotice, ReturnOutcome } from '@/components/outcome';
import { Screen, ScrollTarget } from '@/components/screen';
import { EmptyState, RequestSummary, ReservationSwitcher, Timeline } from '@/components/shared';
import { ThemePicker } from '@/components/theme-picker';
import { Button, Card, ErrorText, Eyebrow, FadeUp, Icon, KeyValue, Notice, Row, Section, StatusChip, T } from '@/components/ui';
import {
  CANCELLABLE,
  DECISION_LABEL,
  DEMO_NOTICE,
  DEVICE_LABEL,
  MISSION_OPEN,
  PAYMENT_RULE,
  RESPONSE_TARGET,
  STATUS_HELP,
  isPaymentExpired,
  transition,
  type Reservation,
  type ReservationStatus,
} from '@/domain';
import { formatDateKey, formatDateTime, formatRemaining } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply, useCurrent } from '@/lib/store';
import { useTheme } from '@/lib/theme-context';

// 상태 칩(공식 이름) 옆에 크게 보여 줄 따뜻한 한 줄 — 바로 아래 STATUS_HELP 첫 문장과 겹치지 않게 (웹 COPY_CHANGES #51–56 과 같은 말)
const HEADLINE: Record<ReservationStatus, string> = {
  requested: '요청이 잘 도착했어요',
  operator_check: '두 대를 준비하고 있어요',
  payment_pending: '결제를 기다리고 있어요',
  confirmed: '이제 픽업만 하면 돼요',
  in_trial: '두 맥을 써 보고 있어요',
  return_received: '돌려주셔서 고마워요',
  inspecting: '마무리하고 있어요',
  completed: '함께해 주셔서 고마워요',
  cancelled: '요청이 취소됐어요',
};

export default function MyTrialScreen() {
  const { app, current } = useCurrent();
  const list = app.demo.reservations;

  return (
    <Screen>
      {!current ? (
        <>
          <FadeUp>
            <EmptyState
              eyebrow="My trial"
              title="아직 요청한 체험이 없어요"
              body="비교팩 탭에서 데모 일정을 요청하면, 이곳에서 진행 상황과 다음 할 일을 한눈에 볼 수 있어요."
              art={<HeroIllustration style={{ maxWidth: 300, alignSelf: 'center' }} />}
              cta={{ label: '데모 일정 요청하러 가기', href: '/' }}
            />
          </FadeUp>
          <Notice tone="info">{DEMO_NOTICE}</Notice>
          <ScrollTarget name="appearance">
            <ThemePicker />
          </ScrollTarget>
        </>
      ) : (
        <>
          <ReservationSwitcher list={list} currentId={current.id} />
          <FadeUp>
            <StatusCard r={current} />
          </FadeUp>
          {MISSION_OPEN.includes(current.status) ? <MissionProgressCard r={current} /> : null}
          <NextAction r={current} />
          {['return_received', 'inspecting', 'completed'].includes(current.status) ? (
            <Section eyebrow="Return" title="기기별 결과">
              <Card>
                <ReturnOutcome r={current} />
              </Card>
              {/* 완료 상태는 상태 카드 설명이 이미 설문을 안내한다 */}
              {current.status !== 'completed' ? <FollowUpNotice /> : null}
            </Section>
          ) : null}
          <Section eyebrow="Timeline" title="진행 단계">
            <Card>
              <Timeline r={current} />
            </Card>
          </Section>
          <Section eyebrow="Request" title="요청 내용">
            <Card>
              <RequestSummary r={current} />
            </Card>
          </Section>
          {CANCELLABLE.includes(current.status) ? <CancelBlock r={current} /> : null}
          <ScrollTarget name="appearance">
            <ThemePicker />
          </ScrollTarget>
        </>
      )}
    </Screen>
  );
}

function StatusCard({ r }: { r: Reservation }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: 12, paddingVertical: 20 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Eyebrow>{`My trial · ${r.id}`}</Eyebrow>
        <StatusChip status={r.status} large />
      </Row>
      <T variant="display" accessibilityRole="header">
        {HEADLINE[r.status]}
      </T>
      <T variant="body" color={c.sub}>
        {STATUS_HELP[r.status]}
      </T>
      <T variant="caption">{formatDateTime(r.createdAt)}에 요청했어요</T>
    </Card>
  );
}

function NextAction({ r }: { r: Reservation }) {
  const [payNote, setPayNote] = useState(false);
  const { c } = useTheme();
  // 상태 카드(HEADLINE·STATUS_HELP)가 이미 말한 내용은 되풀이하지 않고, 손님이 지금 할 일만 적는다
  switch (r.status) {
    case 'requested':
      return (
        <ActionCard title="지금은 기다리면 돼요">
          <T variant="callout">확인이 끝나면 결제 방법을 안내해 드릴게요.</T>
          <T variant="footnote">{RESPONSE_TARGET}</T>
        </ActionCard>
      );
    case 'operator_check':
      return (
        <ActionCard title="지금은 기다리면 돼요">
          <T variant="callout">Air와 Pro가 모두 준비되면 결제를 안내해 드릴게요.</T>
        </ActionCard>
      );
    case 'payment_pending': {
      const expired = isPaymentExpired(r);
      return (
        <ActionCard title={expired ? '결제 기한이 지났어요' : '이렇게 결제해요'} tone={expired ? 'error' : 'warn'}>
          <KeyValue k="결제 기한">
            <T variant="callout" weight="700">
              {formatDateTime(r.ops.paymentDeadline)}
            </T>
            <T variant="footnote" color={expired ? c.error : c.warnText}>
              {formatRemaining(r.ops.paymentDeadline)}
            </T>
          </KeyValue>
          {expired ? (
            <Notice tone="error">예약은 확정되지 않았어요. 운영자가 환불이나 다른 일정을 안내해 드릴게요.</Notice>
          ) : null}
          <Notice tone="info">{PAYMENT_RULE}</Notice>
          <Button
            variant="secondary"
            icon={['creditcard', 'credit_card']}
            label="결제하러 가기 (데모 · 실제 결제 없음)"
            accessibilityHint="데모라서 결제 화면으로 넘어가지 않아요"
            onPress={() => setPayNote(true)}
          />
          {payNote ? (
            <T variant="footnote">데모라서 결제 화면은 열리지 않고 돈도 오가지 않아요. 운영 시뮬레이터에서 결제 확인 단계를 이어서 해 보세요.</T>
          ) : null}
        </ActionCard>
      );
    }
    case 'confirmed':
      return (
        <ActionCard title="픽업 날 만나요">
          <KeyValue k="픽업" v={`${formatDateKey(r.request.startDate)} · ${r.request.pickupStore}`} />
          <T variant="callout">두 맥 바탕화면에 뜬 4자리 코드를 봐 두세요. 나중에 미션 탭에 적으면 돼요.</T>
        </ActionCard>
      );
    case 'in_trial':
      return (
        <ActionCard title="지금 할 일" tone="ink">
          <T variant="callout">하루에 미션 하나, 쉬운 것부터 해도 충분해요.</T>
          <KeyValue
            k="결정"
            v={r.decision ? `${DECISION_LABEL[r.decision.choice]}${r.decision.model ? ` · ${DEVICE_LABEL[r.decision.model]}` : ''}` : '마지막 날 남기면 돼요'}
          />
          <Button small variant="secondary" label="결정·반납 보기" icon={['checkmark.seal', 'verified']} onPress={() => router.navigate('/decide')} />
        </ActionCard>
      );
    case 'return_received':
    case 'inspecting':
      return (
        <ActionCard title="점검이 끝나면 알려 드릴게요">
          <T variant="callout">
            {r.reward.status === 'none' ? '그 전까지는 남은 미션을 마치고 리워드도 신청할 수 있어요.' : '따로 하실 일은 없어요.'}
          </T>
        </ActionCard>
      );
    case 'completed':
      return (
        <ActionCard title="모두 끝났어요" tone="done">
          <T variant="callout">기기별 결과는 아래에서 볼 수 있어요.</T>
        </ActionCard>
      );
    case 'cancelled':
      return (
        <ActionCard title="다시 써 보고 싶다면">
          <T variant="callout">비교팩 탭에서 새 일정을 요청해 주세요.</T>
          <Button small variant="secondary" label="다시 요청하기" onPress={() => router.navigate({ pathname: '/', params: { section: 'form' } })} />
        </ActionCard>
      );
  }
}

function ActionCard({
  title,
  tone = 'info',
  children,
}: {
  title: string;
  tone?: 'info' | 'warn' | 'error' | 'ink' | 'done';
  children: ReactNode;
}) {
  const { c } = useTheme();
  const accent = { info: c.line, warn: c.warnLine, error: c.errorLine, ink: c.lineStrong, done: c.doneLine }[tone];
  const fg = { info: c.ink, warn: c.warnText, error: c.error, ink: c.ink, done: c.doneText }[tone];
  return (
    <Card accent={accent}>
      <Row gap={7}>
        <Icon ios="arrow.right.circle.fill" web="arrow_circle_right" size={18} color={tone === 'ink' ? c.coral : fg} />
        <T variant="headline" color={fg}>
          {title}
        </T>
      </Row>
      {children}
    </Card>
  );
}

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
    <Section title="요청을 취소하고 싶다면" caption="픽업 전까지는 여기서 바로 취소할 수 있어요.">
      {!confirming ? (
        <Button variant="danger" label="이 요청 취소하기" onPress={() => setConfirming(true)} />
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
    </Section>
  );
}
