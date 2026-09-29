import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { HeroIllustration } from '@/components/illustrations';
import { MissionProgressCard } from '@/components/mission';
import { FollowUpNotice, ReturnOutcome } from '@/components/outcome';
import { Screen } from '@/components/screen';
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

// 상태 칩(공식 이름) 옆에 크게 보여 줄 따뜻한 한 줄
const HEADLINE: Record<ReservationStatus, string> = {
  requested: '요청을 잘 받았어요',
  operator_check: '두 대를 찾고 있어요',
  payment_pending: '결제를 기다리고 있어요',
  confirmed: '예약이 확정됐어요',
  in_trial: '두 맥과 함께하는 중',
  return_received: '반납을 받았어요',
  inspecting: '꼼꼼히 검수하고 있어요',
  completed: '체험이 끝났어요',
  cancelled: '취소된 요청이에요',
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
          <ThemePicker />
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
            <Section eyebrow="Return" title="반납·구매 결과">
              <Card>
                <ReturnOutcome r={current} />
              </Card>
              <FollowUpNotice />
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
          <ThemePicker />
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
      <T variant="caption">요청 {formatDateTime(r.createdAt)}</T>
    </Card>
  );
}

function NextAction({ r }: { r: Reservation }) {
  const [payNote, setPayNote] = useState(false);
  const { c } = useTheme();
  const title = '다음 할 일';

  switch (r.status) {
    case 'requested':
      return (
        <ActionCard title={title}>
          <T variant="callout">운영자가 두 기기와 픽업 일정을 확인할 때까지 조금만 기다려 주세요. 요청만으로는 예약이 확정되지 않아요.</T>
          <T variant="footnote">{RESPONSE_TARGET}</T>
        </ActionCard>
      );
    case 'operator_check':
      return (
        <ActionCard title={title}>
          <T variant="callout">운영자가 Air·Pro 두 대를 모두 확보하면 결제 요청이 와요. 한 대만으로는 진행하지 않아요.</T>
        </ActionCard>
      );
    case 'payment_pending': {
      const expired = isPaymentExpired(r);
      return (
        <ActionCard title="결제 대기" tone={expired ? 'error' : 'warn'}>
          <KeyValue k="결제 기한">
            <T variant="callout" weight="700">
              {formatDateTime(r.ops.paymentDeadline)}
            </T>
            <T variant="footnote" color={expired ? c.error : c.warnText}>
              {formatRemaining(r.ops.paymentDeadline)}
            </T>
          </KeyValue>
          {expired ? (
            <Notice tone="error">결제 기한이 지났어요. 자동으로 확정되지 않고, 운영자가 취소·환불 또는 대체 일정을 안내해요.</Notice>
          ) : null}
          <Notice tone="warn">{PAYMENT_RULE}</Notice>
          <Button
            variant="secondary"
            icon={['creditcard', 'credit_card']}
            label="결제 링크 (데모 — 실제 결제 없음)"
            accessibilityHint="데모에서는 결제 화면으로 이동하지 않습니다"
            onPress={() => setPayNote(true)}
          />
          {payNote ? (
            <T variant="footnote">데모에서는 결제 화면으로 이동하지 않고 돈도 오가지 않아요. 운영 시뮬레이터에서 거래 대조를 진행해 보세요.</T>
          ) : null}
        </ActionCard>
      );
    }
    case 'confirmed':
      return (
        <ActionCard title="다음 할 일: 픽업">
          <KeyValue k="픽업" v={`${formatDateKey(r.request.startDate)} · ${r.request.pickupStore}`} />
          <T variant="callout">픽업 때 두 기기의 상태와 부속품을 함께 확인해요. 두 맥 바탕화면에 적힌 4자리 코드도 봐 두세요 — 미션 탭에서 적어요.</T>
        </ActionCard>
      );
    case 'in_trial':
      return (
        <ActionCard title="체험 중 — 지금 할 일" tone="ink">
          <T variant="callout">미션은 하루에 하나씩, 쉬운 것부터 해도 충분해요. 결정은 마지막 날 미션 답을 보고 남겨요.</T>
          <KeyValue
            k="결정"
            v={r.decision ? `${DECISION_LABEL[r.decision.choice]}${r.decision.model ? ` · ${DEVICE_LABEL[r.decision.model]}` : ''}` : '마지막 날 남겨요'}
          />
          <Button small variant="secondary" label="결정·반납 보기" icon={['checkmark.seal', 'verified']} onPress={() => router.navigate('/decide')} />
        </ActionCard>
      );
    case 'return_received':
    case 'inspecting':
      return (
        <ActionCard title="반납 처리 중">
          <T variant="callout">운영자가 반납한 기기를 하나씩 검수해요. 검수가 끝나기 전에는 그 기기를 다른 사람에게 빌려주지 않아요.</T>
          {r.reward.status === 'none' ? (
            <T variant="footnote">검수가 끝나기 전까지는 남은 미션과 리워드 신청을 할 수 있어요.</T>
          ) : null}
        </ActionCard>
      );
    case 'completed':
      return (
        <ActionCard title="체험 완료" tone="done">
          <T variant="callout">함께해 주셔서 고마워요. 아래에서 기기별 결과를 확인해 주세요.</T>
        </ActionCard>
      );
    case 'cancelled':
      return (
        <ActionCard title="취소된 요청">
          <T variant="callout">새 일정이 필요하면 비교팩 탭에서 다시 요청해 주세요.</T>
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
    <Section title="요청 취소" caption="출고(픽업) 전까지만 직접 취소할 수 있어요. 보류된 기기는 바로 풀려요.">
      {!confirming ? (
        <Button variant="danger" label="이 요청 취소하기" onPress={() => setConfirming(true)} />
      ) : (
        <Card accent={c.errorLine}>
          <T variant="callout" weight="700">
            {r.id} 요청을 취소할까요?
          </T>
          <T variant="footnote">취소하면 되돌릴 수 없고, 다시 요청해야 해요.</T>
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
