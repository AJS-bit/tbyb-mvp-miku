import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BrandLockup } from '@/components/brand';
import { HeroIllustration } from '@/components/illustrations';
import { Screen } from '@/components/screen';
import {
  Button,
  Card,
  ChoiceChip,
  DeviceTag,
  ErrorText,
  FadeUp,
  Field,
  Icon,
  Input,
  Notice,
  Pill,
  RadioRow,
  Row,
  ScorePicker,
  Section,
  Segmented,
  T,
} from '@/components/ui';
import {
  CALENDAR_DAYS,
  COMPARE_POINTS,
  DAY_STATUS_LABEL,
  DEMO_NOTICE,
  LEANING_LABEL,
  PICKUP_STORES,
  PRICE_TBD,
  RESPONSE_TARGET,
  REWARD_AMOUNT_LABEL,
  USAGE_LABEL,
  calendarDays,
  createReservation,
  parseDate,
  type DayStatus,
  type Leaning,
  type Score,
  type Usage,
} from '@/domain';
import { FIRST_PACK } from '@/lib/brand';
import { formatDateKey, formatDateTime, weekday } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply, selectReservation, useApp } from '@/lib/store';
import { themed, useTheme } from '@/lib/theme-context';

export default function PackScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [formY, setFormY] = useState(0);
  const { section } = useLocalSearchParams<{ section?: string }>();

  useEffect(() => {
    if (section === 'form' && formY > 0) scrollRef.current?.scrollTo({ y: formY, animated: true });
  }, [section, formY]);

  return (
    <Screen scrollRef={scrollRef}>
      <FadeUp>
        <Hero onRequest={() => scrollRef.current?.scrollTo({ y: formY, animated: true })} />
      </FadeUp>
      <FadeUp delay={120}>
        <Story />
      </FadeUp>
      <ComparePoints />
      <Notice tone="warn">{PRICE_TBD}</Notice>
      <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)}>
        <RequestForm />
      </View>
    </Screen>
  );
}

// ───────── 소개 ─────────

function Hero({ onRequest }: { onRequest: () => void }) {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <BrandLockup />
      <HeroIllustration style={{ marginHorizontal: -6 }} />
      <View style={{ gap: 10 }}>
        {/* 플랫폼(tbyb) 아래 첫 비교팩 — MacBook 은 플랫폼 이름이 아니라 첫 번째 비교팩이다 */}
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Pill label={FIRST_PACK} bg={c.coralSoft} fg={c.coralInk} />
          <T variant="footnote" weight="600">
            MacBook Air · MacBook Pro 14형
          </T>
        </Row>
        <T variant="display" accessibilityRole="header">
          {'맥은 처음이어도\n괜찮아요'}
        </T>
        <T variant="body" color={c.sub}>
          가볍게 들고 다니는 Air, 무거운 작업도 끝까지 해내는 Pro. 두 대를 함께 빌려 평소처럼 써 보고, 내 생활에 맞는 쪽을 골라 보세요. 어려운
          기록 대신 쉬운 미션 몇 개면 충분해요.
        </T>
      </View>
      <Row gap={6}>
        <DeviceTag kind="air" full />
        <DeviceTag kind="pro" full />
      </Row>
      <View style={{ gap: 10 }}>
        <Button label="데모 일정 요청하기" icon={['calendar', 'event']} onPress={onRequest} />
        <T variant="footnote" style={{ textAlign: 'center' }}>
          이름이나 전화번호 없이 요청할 수 있어요
        </T>
      </View>
    </View>
  );
}

// 소개 페이지 확정 문구(SPEC.md 「다듬기 · 소개 페이지 문구」)와 같은 내용 — 제목만 앱에 맞게 해요체로
const STEPS: { title: string; body: string; extra?: string; extraSub?: string }[] = [
  { title: '일정만 골라요', body: '희망 날짜와 픽업 매장만 고르면 돼요. 이름이나 전화번호는 받지 않아요.' },
  { title: '두 대가 준비되면 결제해요', body: '운영자가 Air와 Pro를 함께 준비하면 결제를 안내해 드려요. 결제가 확인되면 예약이 확정돼요.' },
  {
    title: '평소처럼 쓰면서 미션을 해요',
    body: '가방에 넣고 나가 보고, 영상도 틀어 보고, 메모도 써 보세요. 더 마음에 든 쪽을 고르기만 하면 돼요.',
    // 리워드는 정해진 약속처럼 보이지 않게: 금액 미정을 먼저, 검토 흐름(미션 → 반납 점검 → 운영자 확인)을 함께
    extra: `미션 리워드 · ${REWARD_AMOUNT_LABEL}`,
    extraSub: '미션을 마치고 신청하면, 반납한 기기를 점검한 뒤 운영자가 확인해요.',
  },
  {
    title: '마지막 날 정해요',
    body: '둘 다 돌려줘도, 한 대를 사도, 아직 못 정해도 괜찮아요. 한 대를 사기로 하면 나머지 한 대만 돌려주면 돼요. 구매는 딜러가 판매를 확인하면 확정돼요.',
  },
];

function Story() {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Section eyebrow="How it works · 02" title="이렇게 진행돼요" caption="요청부터 결정까지, 딱 네 단계예요.">
      <Card style={{ gap: 0, paddingVertical: 8 }}>
        {STEPS.map((st, i) => (
          <Row key={st.title} gap={14} style={[styles.step, i > 0 && styles.stepLine]}>
            <View style={[styles.stepNum, i === 2 && { backgroundColor: c.coralSoft }]}>
              <T variant="footnote" weight="800" color={i === 2 ? c.coralInk : c.ink}>
                {`0${i + 1}`}
              </T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="headline">{st.title}</T>
              <T variant="footnote">{st.body}</T>
              {st.extra ? (
                <T variant="footnote" weight="700" color={c.coralInk} style={{ marginTop: 2 }}>
                  {st.extra}
                </T>
              ) : null}
              {st.extraSub ? <T variant="caption">{st.extraSub}</T> : null}
            </View>
          </Row>
        ))}
      </Card>
    </Section>
  );
}

// ───────── 비교 포인트 ─────────

function ComparePoints() {
  const t = useTheme();
  const styles = useStyles();
  return (
    <Section eyebrow="Compare · 03" title="두 맥, 이렇게 비교해 보세요" caption="스펙 숫자보다 직접 써 보면 알게 되는 차이예요">
      <Card style={{ paddingHorizontal: 0, paddingVertical: 6, gap: 0 }}>
        {COMPARE_POINTS.map((p, i) => (
          <View key={p.title} style={[styles.cmpRow, i > 0 && styles.stepLine]}>
            <T variant="headline">{p.title}</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['air', 'pro'] as const).map((k) => (
                <View
                  key={k}
                  style={[styles.cmpCell, { backgroundColor: t.device[k].soft }]}
                  accessible
                  accessibilityLabel={`${p.title}, ${t.device[k].short}: ${p[k]}`}>
                  <Row gap={5}>
                    <View style={[styles.cmpDot, { backgroundColor: t.device[k].main }]} />
                    <T variant="caption" weight="800" color={t.device[k].ink}>
                      {t.device[k].short}
                    </T>
                  </Row>
                  <T variant="footnote" color={t.c.ink}>
                    {p[k]}
                  </T>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Card>
    </Section>
  );
}

// ───────── 데모 일정 요청 ─────────

const useDayTone = themed(({ c }): Record<DayStatus, { fg: string; bg: string; border: string }> => ({
  open: { fg: c.doneText, bg: c.surface, border: c.lineStrong },
  check: { fg: c.warnText, bg: c.warnBg, border: c.warnLine },
  closed: { fg: c.muted, bg: c.sunk, border: c.sunk }, // 고를 수 없는 날(비활성)
}));

const USAGES = Object.keys(USAGE_LABEL) as Usage[];

function RequestForm() {
  const { demo } = useApp();
  const t = useTheme();
  const { c } = t;
  const styles = useStyles();
  const DAY_TONE = useDayTone();
  const [startDate, setStartDate] = useState('');
  const [pickupStore, setPickupStore] = useState('');
  const [usage, setUsage] = useState<Usage>('unsure');
  const [question, setQuestion] = useState('');
  const [leaning, setLeaning] = useState<Leaning | null>(null);
  const [confidence, setConfidence] = useState<Score | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 입력을 고치면 이전 오류는 지운다
  useEffect(() => {
    setError(null);
  }, [startDate, pickupStore, usage, question, leaning, confidence]);

  const days = calendarDays(demo, new Date(), CALENDAR_DAYS);
  const selectedDay = days.find((d) => d.date === startDate);

  const submit = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    // 고르지 않은 값은 그대로 넘겨 domain.createReservation 이 오류를 알려 준다
    const r = await apply((s) =>
      createReservation(s, {
        startDate,
        pickupStore,
        usage,
        question,
        leaningBefore: leaning as Leaning,
        confidenceBefore: confidence as Score,
      }),
    );
    setSaving(false);
    if (!r.ok) {
      // 저장 실패 포함 — 입력값은 그대로 두고 다시 누를 수 있다
      haptic.error();
      setError(r.error);
      return;
    }
    haptic.success();
    const created = r.value.reservations[0];
    if (created) void selectReservation(created.id);
    setStartDate('');
    setPickupStore('');
    setUsage('unsure');
    setQuestion('');
    setLeaning(null);
    setConfidence(null);
    router.navigate('/my');
  };

  return (
    <Section eyebrow="Request · 04" title="언제부터 써 볼까요?" caption="요청은 이 기기에 저장돼요. 진행 상황은 내 체험에서 이어서 볼 수 있어요.">
      <Card style={{ gap: 26, paddingVertical: 22 }}>
        <Field label="희망 시작일" required hint="운영자가 직접 고쳐 두는 달력이라 실제 재고와 다를 수 있어요.">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -18 }}
            contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 18 }}>
            {days.map((d) => {
              const date = parseDate(d.date);
              const selected = d.date === startDate;
              const closed = d.status === 'closed';
              const tone = DAY_TONE[d.status];
              return (
                <Pressable
                  key={d.date}
                  disabled={closed}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  aria-selected={selected}
                  aria-disabled={closed}
                  accessibilityLabel={`${formatDateKey(d.date)}, ${DAY_STATUS_LABEL[d.status]}`}
                  onPress={() => {
                    haptic.select();
                    setStartDate(d.date);
                  }}
                  style={({ pressed }) => [
                    styles.day,
                    { backgroundColor: tone.bg, borderColor: tone.border },
                    selected && { backgroundColor: c.ink, borderColor: c.ink },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <T variant="caption" color={selected ? c.onInkSub : closed ? c.muted : c.sub}>
                    {weekday(date)}
                  </T>
                  <T
                    variant="headline"
                    weight="800"
                    color={selected ? c.ivory : closed ? c.muted : c.ink}
                    style={closed ? { textDecorationLine: 'line-through' } : null}>
                    {date.getMonth() + 1}/{date.getDate()}
                  </T>
                  <T variant="caption" weight="700" color={selected ? c.ivory : tone.fg} numberOfLines={1}>
                    {DAY_STATUS_LABEL[d.status]}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Row gap={6}>
              <Icon ios="clock" web="schedule" size={13} color={c.sub} />
              <T variant="caption">{formatDateTime(demo.calendarUpdatedAt)} 기준</T>
            </Row>
            <T variant="caption">일요일에는 픽업이 없어요 (데모 가정)</T>
          </Row>
          {selectedDay?.status === 'check' ? (
            <Notice tone="warn">확인이 필요한 날짜예요. 운영자가 매장과 기기를 확인하면, 결과는 내 체험에서 이어서 볼 수 있어요.</Notice>
          ) : null}
        </Field>

        <Field label="픽업 매장" required>
          <View style={{ gap: 8 }}>
            {PICKUP_STORES.map((store) => (
              <RadioRow key={store} selected={pickupStore === store} label={store} onPress={() => setPickupStore(store)} />
            ))}
          </View>
        </Field>

        <Field label="주로 뭘 할 것 같아요?" optional hint="몰라도 괜찮아요. 체험하면서 알게 되는 게 더 많아요.">
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="주로 할 것 같은 일">
            {USAGES.map((u) => (
              <ChoiceChip key={u} label={USAGE_LABEL[u]} selected={usage === u} onPress={() => setUsage(u)} />
            ))}
          </View>
        </Field>

        <Field label="궁금한 점" optional>
          <Input
            multiline
            value={question}
            onChangeText={setQuestion}
            placeholder="예: 유튜브만 보는데 Pro가 필요할까요?"
            accessibilityLabel="궁금한 점, 선택"
          />
        </Field>

        <Field label="지금은 어느 쪽에 마음이 가나요?" required hint="체험이 끝나면 그때 마음과 나란히 놓고 볼게요.">
          <Segmented<Leaning>
            accessibilityLabel="지금은 어느 쪽에 마음이 가나요"
            value={leaning}
            onChange={(v) => v && setLeaning(v)}
            options={[
              { value: 'air', label: 'Air 쪽', color: c.air, fg: c.onAir, a11y: LEANING_LABEL.air },
              { value: 'pro', label: 'Pro 쪽', color: c.pro, fg: c.onPro, a11y: LEANING_LABEL.pro },
              { value: 'unsure', label: '모르겠어요', a11y: LEANING_LABEL.unsure },
            ]}
          />
          <ScorePicker label="얼마나 확실해요? (1 전혀 모르겠어요 · 5 아주 확실해요)" value={confidence} onChange={(v) => setConfidence(v)} a11yPrefix="체험 전 " />
        </Field>

        <Notice tone="info">{DEMO_NOTICE}</Notice>

        <View style={{ gap: 10 }}>
          <ErrorText message={error} />
          <Button
            label={saving ? '저장 중…' : '이대로 요청하기'}
            onPress={submit}
            disabled={saving}
            accessibilityHint="요청을 이 기기에 저장하고 내 체험 탭으로 이동해요"
          />
          <Row gap={6} style={{ justifyContent: 'center' }}>
            <Icon ios="clock" web="schedule" size={13} color={c.sub} />
            <T variant="caption">{RESPONSE_TARGET}</T>
          </Row>
        </View>
      </Card>
    </Section>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    hero: { gap: 18, paddingTop: 4 },
    step: { alignItems: 'flex-start', paddingVertical: 12 },
    stepLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line },
    stepNum: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: c.sunk,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cmpRow: { paddingHorizontal: 18, paddingVertical: 14, gap: 10 },
    cmpCell: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 11, gap: 4 },
    cmpDot: { width: 7, height: 7, borderRadius: 4 },
    day: {
      width: 70,
      paddingVertical: 11,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      gap: 2,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  }),
);
