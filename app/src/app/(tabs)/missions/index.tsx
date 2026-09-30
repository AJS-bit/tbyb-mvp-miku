import { StyleSheet, View } from 'react-native';

import { GiftEnvelope, MissionIcon } from '@/components/illustrations';
import { CodeCard, MissionList, RewardCard } from '@/components/mission';
import { ReminderCard } from '@/components/reminder-card';
import { Screen, ScrollTarget } from '@/components/screen';
import { EmptyState, ReservationSwitcher } from '@/components/shared';
import { Card, Eyebrow, FadeUp, Notice, Row, Section, StatusChip, T } from '@/components/ui';
import { CORE_MISSIONS, MISSIONS, MISSION_OPEN, REWARD_AMOUNT_LABEL, type Reservation } from '@/domain';
import { useSerifFamily } from '@/lib/fonts';
import { useCurrent } from '@/lib/store';
import { themed, useTheme } from '@/lib/theme-context';

export default function MissionsScreen() {
  const { app, current } = useCurrent();

  if (!current) {
    return (
      <Screen>
        <FadeUp>
          <EmptyState
            eyebrow="Easy missions"
            title="미션은 픽업한 날부터 열려요"
            body={`맥이 처음이어도 할 수 있는 일상 미션 ${MISSIONS.length}개가 기다리고 있어요. 먼저 비교팩 탭에서 데모 일정을 요청해 주세요.`}
            art={<GiftEnvelope size={72} />}
            cta={{ label: '데모 일정 요청하러 가기', href: '/' }}>
            <MissionPreview />
          </EmptyState>
        </FadeUp>
      </Screen>
    );
  }

  const open = MISSION_OPEN.includes(current.status);

  return (
    <Screen>
      <ReservationSwitcher list={app.demo.reservations} currentId={current.id} />
      {open ? (
        <OpenMissions r={current} />
      ) : current.status === 'completed' ? (
        <>
          <Notice tone="info" title="체험이 끝나 미션이 닫혔어요">
            남긴 답과 리워드 상태는 아래에서 볼 수 있어요.
          </Notice>
          <RewardCard r={current} />
          <Section eyebrow="Missions" title="내가 한 미션">
            <MissionList r={current} />
          </Section>
        </>
      ) : current.status === 'cancelled' ? (
        <Notice tone="info" title="취소된 요청이에요">
          새 일정을 요청하면 그때 미션이 다시 열려요.
        </Notice>
      ) : (
        <FadeUp>
          <Locked r={current} />
        </FadeUp>
      )}
    </Screen>
  );
}

function OpenMissions({ r }: { r: Reservation }) {
  const { c } = useTheme();
  const serif = useSerifFamily();
  const styles = useStyles();
  const afterReturn = r.status !== 'in_trial';
  return (
    <>
      <FadeUp>
        <View style={{ gap: 6, paddingHorizontal: 2 }}>
          <Eyebrow color={c.coralInk}>{`Easy missions · ${MISSIONS.length}`}</Eyebrow>
          <T variant="body" color={c.sub}>
            숙제처럼 할 필요 없어요. 평소 하던 대로 써 보고 더 나았던 쪽을 고르면 끝이에요.
          </T>
          <T variant="title3" color={c.ink} style={[styles.quote, serif ? { fontFamily: serif, fontWeight: 'normal' } : null]}>
            비슷했다면, 그것도 좋은 답이에요.
          </T>
        </View>
      </FadeUp>
      {afterReturn && r.reward.status === 'none' ? (
        <Notice tone="coral" title="반납했어도 괜찮아요">
          점검이 끝나기 전까지는 기억나는 대로 남은 미션을 하고 리워드를 신청할 수 있어요.
        </Notice>
      ) : null}
      <FadeUp delay={80}>
        <RewardCard r={r} />
      </FadeUp>
      <CodeCard key={`${r.id}-${r.codeCheck?.at ?? ''}`} r={r} />
      {/* ?section=list · ?section=nudge 로 바로 내려갈 수 있다 */}
      <ScrollTarget name="list">
        <Section
          eyebrow="Missions"
          title={`미션 ${MISSIONS.length}개`}
          caption={`핵심 미션 ${CORE_MISSIONS.length}개에, 해 본 사람만 하는 미션 ${MISSIONS.length - CORE_MISSIONS.length}개가 더 있어요. 눌러서 답해 주세요.`}>
          <MissionList r={r} />
        </Section>
      </ScrollTarget>
      {r.status === 'in_trial' ? (
        <ScrollTarget name="nudge">
          <ReminderCard r={r} />
        </ScrollTarget>
      ) : null}
    </>
  );
}

function Locked({ r }: { r: Reservation }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: 16, paddingVertical: 22 }}>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <GiftEnvelope size={68} />
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow>Opens at pickup</Eyebrow>
          <T variant="title">픽업한 날부터 열려요</T>
        </View>
      </Row>
      <Row gap={8}>
        <T variant="footnote">지금 상태</T>
        <StatusChip status={r.status} />
      </Row>
      <View style={{ gap: 4 }}>
        <T variant="body" color={c.sub}>
          {/* \u2060: 숫자와 '개' 사이에서 줄이 끊기지 않게 */}
          {`두 맥을 받는 날 일상 미션 ${MISSIONS.length}\u2060개가 열려요. 핵심 미션 ${CORE_MISSIONS.length}\u2060개를 하고 바탕화면 코드를 적으면 리워드를 신청할 수 있어요.`}
        </T>
        <T variant="headline" color={c.coralInk}>
          {`리워드 ${REWARD_AMOUNT_LABEL}`}
        </T>
      </View>
      <View style={{ gap: 8 }}>
        <T variant="footnote" weight="700" color={c.sub}>
          미리 보기
        </T>
        <MissionPreview />
      </View>
    </Card>
  );
}

function MissionPreview() {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignSelf: 'stretch' }}>
      {MISSIONS.map((m) => (
        <View key={m.id} style={{ width: '30%', flexGrow: 1, alignItems: 'center', gap: 6 }}>
          <MissionIcon id={m.id} size={52} />
          <T variant="caption" color={c.ink} numberOfLines={2} style={{ textAlign: 'center' }}>
            {m.title}
          </T>
        </View>
      ))}
    </View>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    // 안내 문장 아래 한 줄 인용 — 고운바탕 (불러오기 전·실패 시 시스템 글꼴 굵게)
    quote: { marginTop: 4, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: c.coral, fontSize: 18, lineHeight: 26, letterSpacing: -0.3 },
  }),
);
