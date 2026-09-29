import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HeroIllustration } from '@/components/illustrations';
import { Screen } from '@/components/screen';
import {
  Button,
  Card,
  ChoiceChip,
  DeviceTag,
  ErrorText,
  Eyebrow,
  FadeUp,
  Field,
  Icon,
  Input,
  Notice,
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
      <Notice tone="warn" title="요금·기간·보증은 아직 정해지지 않았어요">
        {PRICE_TBD}
      </Notice>
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
      <HeroIllustration style={{ marginHorizontal: -6 }} />
      <View style={{ gap: 10 }}>
        <Eyebrow color={c.coralInk}>Try before you buy · 01</Eyebrow>
        <T variant="display" accessibilityRole="header">
          {'맥은 처음이어도\n괜찮아요'}
        </T>
        <T variant="body" color={c.sub}>
          가볍게 들고 다니는 Air, 끝까지 힘 있는 Pro. 두 대를 함께 빌려 평소처럼 써 보고 내 생활에 맞는 쪽을 고르세요. 어려운 기록 대신 쉬운
          미션 몇 개면 충분해요.
        </T>
      </View>
      <Row gap={6}>
        <DeviceTag kind="air" full />
        <DeviceTag kind="pro" full />
      </Row>
      <Button label="데모 일정 요청하기" icon={['calendar', 'event']} onPress={onRequest} />
    </View>
  );
}

const STEPS: { title: string; body: string }[] = [
  { title: '일정만 골라요', body: '이름·전화번호 없이 희망 날짜와 픽업 매장만 남겨요.' },
  { title: '두 대를 함께 받아요', body: '운영자가 Air·Pro 두 대를 확보하고 결제를 확인하면 예약이 확정돼요.' },
  { title: '쉬운 미션을 해 봐요', body: `가방에 넣고 나가 보기, 같은 영상 틀어 보기처럼 평소 하던 일이에요. 다 하면 리워드 ${REWARD_AMOUNT_LABEL}.` },
  { title: '마지막 날 골라요', body: '한 대를 사기로 하면 나머지 한 대만 반납해요. 둘 다 반납해도 괜찮아요.' },
];

function Story() {
  const { c } = useTheme();
  const styles = useStyles();
  return (
    <Section eyebrow="How it works · 02" title="이렇게 진행돼요">
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
    <Section eyebrow="Compare · 03" title="두 맥, 이렇게 비교해요" caption="숫자 대신 직접 느껴 볼 점이에요">
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
    <Section eyebrow="Request · 04" title="데모 일정 요청" caption="요청은 예약 확정이 아니에요. 운영자가 두 기기를 확인한 뒤에만 확정돼요.">
      <Card style={{ gap: 26, paddingVertical: 22 }}>
        <Field label="희망 시작일" required hint="운영자가 손으로 갱신하는 안내값이라 확정 재고는 아니에요.">
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
              <T variant="caption">마지막 갱신 {formatDateTime(demo.calendarUpdatedAt)}</T>
            </Row>
            <T variant="caption">일요일 픽업 없음 (데모 가정)</T>
          </Row>
          {selectedDay?.status === 'check' ? (
            <Notice tone="warn">확인이 필요한 날짜예요. 운영자가 매장·기기를 확인한 뒤 가능 여부를 알려 드려요.</Notice>
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

        <Field label="지금 마음" required hint="지금은 어느 쪽에 마음이 가나요? 체험이 끝나면 그때 마음과 나란히 볼게요.">
          <Segmented<Leaning>
            accessibilityLabel="지금 마음"
            value={leaning}
            onChange={(v) => v && setLeaning(v)}
            options={[
              { value: 'air', label: 'Air 쪽', color: c.air, fg: c.onAir },
              { value: 'pro', label: 'Pro 쪽', color: c.pro, fg: c.onPro },
              { value: 'unsure', label: '모르겠음' },
            ]}
          />
          <ScorePicker label="얼마나 확신해요? (1 전혀 모르겠음 · 5 확실함)" value={confidence} onChange={(v) => setConfidence(v)} a11yPrefix="체험 전 " />
        </Field>

        <Notice tone="info" title="이름·전화번호를 받지 않아요">
          {DEMO_NOTICE}
        </Notice>

        <View style={{ gap: 10 }}>
          <ErrorText message={error} />
          <Button
            label={saving ? '저장 중…' : '데모 일정 요청'}
            onPress={submit}
            disabled={saving}
            accessibilityHint="요청을 이 기기에 저장하고 내 체험 탭으로 이동합니다"
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
