import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FollowUpNotice, ReturnOutcome } from '@/components/outcome';
import { EmptyState, RequestSummary, ReservationSwitcher, Timeline } from '@/components/shared';
import { Button, Card, ErrorText, Icon, KeyValue, Notice, Row, Section, StatusChip, T } from '@/components/ui';
import { Screen } from '@/components/screen';
import {
  CANCELLABLE,
  DECISION_LABEL,
  DEMO_NOTICE,
  DEVICE_LABEL,
  PAYMENT_RULE,
  RESPONSE_TARGET,
  STATUS_HELP,
  isPaymentExpired,
  transition,
  type Reservation,
} from '@/domain';
import { formatDateKey, formatDateTime, formatRemaining } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply, useCurrent } from '@/lib/store';
import { C } from '@/lib/theme';

export default function MyTrialScreen() {
  const { app, current } = useCurrent();
  const list = app.demo.reservations;

  return (
    <Screen>
      {!current ? (
        <>
          <EmptyState
            title="아직 요청한 체험이 없습니다"
            body="비교팩 탭에서 데모 일정을 요청하면 이곳에서 진행 상태와 다음 할 일을 확인할 수 있습니다."
            cta={{ label: '데모 일정 요청하러 가기', href: '/' }}
          />
          <Notice tone="info">{DEMO_NOTICE}</Notice>
        </>
      ) : (
        <>
          <ReservationSwitcher list={list} currentId={current.id} />
          <StatusCard r={current} />
          <NextAction r={current} />
          {['return_received', 'inspecting', 'completed'].includes(current.status) ? (
            <Section title="반납·구매 결과">
              <Card>
                <ReturnOutcome r={current} />
              </Card>
              <FollowUpNotice />
            </Section>
          ) : null}
          <Section title="진행 단계">
            <Card>
              <Timeline r={current} />
            </Card>
          </Section>
          <Section title="요청 내용">
            <Card>
              <RequestSummary r={current} />
            </Card>
          </Section>
          {CANCELLABLE.includes(current.status) ? <CancelBlock r={current} /> : null}
        </>
      )}
    </Screen>
  );
}

function StatusCard({ r }: { r: Reservation }) {
  return (
    <Card style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <T variant="caption">요청 번호</T>
          <T variant="title3" style={{ fontVariant: ['tabular-nums'] }}>
            {r.id}
          </T>
        </View>
        <StatusChip status={r.status} large />
      </Row>
      <T variant="callout">{STATUS_HELP[r.status]}</T>
      <T variant="caption">요청 {formatDateTime(r.createdAt)}</T>
    </Card>
  );
}

function NextAction({ r }: { r: Reservation }) {
  const [payNote, setPayNote] = useState(false);
  const title = '다음 할 일';

  switch (r.status) {
    case 'requested':
      return (
        <ActionCard title={title}>
          <T variant="callout">운영자가 두 기기와 픽업 일정을 확인할 때까지 기다려 주세요. 요청만으로는 예약이 확정되지 않습니다.</T>
          <T variant="footnote">{RESPONSE_TARGET}</T>
        </ActionCard>
      );
    case 'operator_check':
      return (
        <ActionCard title={title}>
          <T variant="callout">운영자가 Air·Pro 두 대를 모두 확보하면 결제 요청이 옵니다. 한 대만으로는 진행하지 않습니다.</T>
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
            <T variant="footnote" color={expired ? C.error : C.warnText}>
              {formatRemaining(r.ops.paymentDeadline)}
            </T>
          </KeyValue>
          {expired ? (
            <Notice tone="error">결제 기한이 지났습니다. 자동으로 확정되지 않으며, 운영자가 취소·환불 또는 대체 일정을 안내합니다.</Notice>
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
            <T variant="footnote">데모에서는 결제 화면으로 이동하지 않고 돈도 오가지 않습니다. 운영 시뮬레이터에서 거래 대조를 진행해 보세요.</T>
          ) : null}
        </ActionCard>
      );
    }
    case 'confirmed':
      return (
        <ActionCard title="다음 할 일: 픽업">
          <KeyValue k="픽업" v={`${formatDateKey(r.request.startDate)} · ${r.request.pickupStore}`} />
          <T variant="callout">픽업 때 두 기기의 상태와 부속품을 함께 확인하고 기록합니다.</T>
        </ActionCard>
      );
    case 'in_trial':
      return (
        <ActionCard title="체험 중 — 지금 할 일" tone="primary">
          <T variant="callout">같은 작업을 두 기기에서 해 보고 같은 기준으로 기록하세요. 마지막 날 기록을 보고 결정합니다.</T>
          <KeyValue k="비교 기록" v={`${r.logs.length}건`} />
          <KeyValue
            k="결정"
            v={r.decision ? `${DECISION_LABEL[r.decision.choice]}${r.decision.model ? ` · ${DEVICE_LABEL[r.decision.model]}` : ''}` : '아직 없음'}
          />
          <Row gap={8}>
            <Button small label="비교 기록" icon={['square.and.pencil', 'edit_note']} onPress={() => router.navigate('/log')} style={{ flex: 1 }} />
            <Button
              small
              variant="secondary"
              label="결정·반납"
              icon={['checkmark.seal', 'verified']}
              onPress={() => router.navigate('/decide')}
              style={{ flex: 1 }}
            />
          </Row>
        </ActionCard>
      );
    case 'return_received':
    case 'inspecting':
      return (
        <ActionCard title="반납 처리 중">
          <T variant="callout">운영자가 반납한 기기를 기기별로 검수합니다. 검수가 끝나기 전에는 그 기기를 다른 사람에게 빌려주지 않습니다.</T>
        </ActionCard>
      );
    case 'completed':
      return (
        <ActionCard title="체험 완료" tone="done">
          <T variant="callout">함께해 주셔서 고맙습니다. 아래에서 기기별 결과를 확인하세요.</T>
        </ActionCard>
      );
    case 'cancelled':
      return (
        <ActionCard title="취소된 요청">
          <T variant="callout">새 일정이 필요하면 비교팩 탭에서 다시 요청하세요.</T>
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
  tone?: 'info' | 'warn' | 'error' | 'primary' | 'done';
  children: React.ReactNode;
}) {
  const accent = { info: C.line, warn: C.warnLine, error: '#FECDCA', primary: '#C9D5FF', done: '#ABEFC6' }[tone];
  const fg = { info: C.ink, warn: C.warnText, error: C.error, primary: C.primary, done: C.doneText }[tone];
  return (
    <Card accent={accent} style={{ borderWidth: 1.5 }}>
      <Row gap={6}>
        <Icon ios="arrow.right.circle.fill" web="arrow_circle_right" size={17} color={fg} />
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
    <Section title="요청 취소" caption="출고(픽업) 전까지만 직접 취소할 수 있습니다. 보류된 기기는 바로 풀립니다.">
      {!confirming ? (
        <Button variant="danger" label="이 요청 취소하기" onPress={() => setConfirming(true)} />
      ) : (
        <Card accent="#FECDCA" style={{ borderWidth: 1.5 }}>
          <T variant="callout" weight="700">
            {r.id} 요청을 취소할까요?
          </T>
          <T variant="footnote">취소하면 되돌릴 수 없고, 다시 요청해야 합니다.</T>
          <Row gap={8}>
            <Button small variant="danger" label="취소하기" onPress={cancel} style={{ flex: 1 }} />
            <Button small variant="secondary" label="돌아가기" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}
      <ErrorText message={error} />
    </Section>
  );
}
