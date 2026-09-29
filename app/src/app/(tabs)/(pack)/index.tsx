import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Legend } from '@/components/shared';
import {
  Button,
  Card,
  DeviceTag,
  ErrorText,
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
import { Screen } from '@/components/screen';
import {
  CALENDAR_DAYS,
  COMPARE_POINTS,
  DAY_STATUS_LABEL,
  DEMO_NOTICE,
  PACK_NAME,
  PICKUP_STORES,
  PRICE_TBD,
  RESPONSE_TARGET,
  WORK_TYPES,
  calendarDays,
  createReservation,
  parseDate,
  type DayStatus,
  type Leaning,
  type Score,
  type WorkType,
} from '@/domain';
import { formatDateKey, formatDateTime, weekday } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply, selectReservation, useApp } from '@/lib/store';
import { C, DEVICE_COLOR, RADIUS } from '@/lib/theme';

export default function PackScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [formY, setFormY] = useState(0);
  const { section } = useLocalSearchParams<{ section?: string }>();

  useEffect(() => {
    if (section === 'form' && formY > 0) scrollRef.current?.scrollTo({ y: formY, animated: true });
  }, [section, formY]);

  return (
    <Screen scrollRef={scrollRef}>
      <Hero onRequest={() => scrollRef.current?.scrollTo({ y: formY, animated: true })} />
      <ComparePoints />
      <Notice tone="warn" title="요금·기간·보증은 아직 정해지지 않았습니다">
        {PRICE_TBD}
      </Notice>
      <View onLayout={(e) => setFormY(e.nativeEvent.layout.y)}>
        <RequestForm />
      </View>
    </Screen>
  );
}

// ───────── 소개 ─────────

const STEPS = [
  ['데모 일정 요청', '작업 유형·희망일·비교하고 싶은 점만 남깁니다'],
  ['두 대 함께 픽업', '운영자가 Air·Pro 두 대를 확보하고 결제를 확인한 뒤 확정'],
  ['같은 작업, 같은 기준', '평소 작업을 두 기기에서 똑같이 해 보고 앱에 기록'],
  ['마지막 날 결정', '기록을 보고 결정 — 한 대를 사기로 하면 나머지 한 대만 반납'],
] as const;

function Hero({ onRequest }: { onRequest: () => void }) {
  return (
    <Card style={{ gap: 14, paddingVertical: 20 }}>
      <Row gap={6}>
        <DeviceTag kind="air" full />
        <DeviceTag kind="pro" full />
      </Row>
      <T variant="title">{'사기 전에,\n내 작업으로 두 대를 비교해 보세요'}</T>
      <T variant="callout" color={C.sub}>
        스펙표로는 알기 어려운 차이 — 발열, 무게, 화면, 내 작업의 속도 — 를 며칠 동안 직접 써 보며 확인합니다. {PACK_NAME}은
        두 기기를 함께 빌려 같은 기준으로 비교하는 체험입니다.
      </T>
      <View style={{ gap: 10, marginTop: 2 }}>
        {STEPS.map(([title, body], i) => (
          <Row key={title} gap={12} style={{ alignItems: 'flex-start' }}>
            <View style={styles.stepNum}>
              <T variant="caption" weight="700" color={C.primary}>
                {i + 1}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T variant="callout" weight="700">
                {title}
              </T>
              <T variant="footnote">{body}</T>
            </View>
          </Row>
        ))}
      </View>
      <Button label="데모 일정 요청하기" icon={['calendar', 'event']} onPress={onRequest} style={{ marginTop: 4 }} />
    </Card>
  );
}

// ───────── 비교 포인트 ─────────

function ComparePoints() {
  return (
    <Section title="두 기기, 같은 기준으로" caption="수치 대신 체험 때 직접 확인할 점입니다">
      <Card style={{ paddingHorizontal: 0, paddingVertical: 4, gap: 0 }}>
        <View style={[styles.cmpHead]}>
          <Legend />
        </View>
        {COMPARE_POINTS.map((p, i) => (
          <View key={p.title} style={[styles.cmpRow, i > 0 && styles.cmpDivider]}>
            <T variant="callout" weight="700">
              {p.title}
            </T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['air', 'pro'] as const).map((k) => (
                <View
                  key={k}
                  style={[styles.cmpCell, { backgroundColor: DEVICE_COLOR[k].soft, borderLeftColor: DEVICE_COLOR[k].main }]}
                  accessible
                  accessibilityLabel={`${p.title}, ${DEVICE_COLOR[k].short}: ${p[k]}`}>
                  <T variant="caption" weight="700" color={C.ink}>
                    {DEVICE_COLOR[k].short}
                  </T>
                  <T variant="footnote" color={C.ink}>
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

const DAY_TONE: Record<DayStatus, { fg: string; bg: string; border: string }> = {
  open: { fg: C.doneText, bg: C.surface, border: C.line },
  check: { fg: C.warnText, bg: C.warnBg, border: C.warnLine },
  closed: { fg: C.muted, bg: '#F2F4F7', border: '#F2F4F7' },
};

function RequestForm() {
  const { demo } = useApp();
  const [startDate, setStartDate] = useState('');
  const [pickupStore, setPickupStore] = useState('');
  const [workType, setWorkType] = useState<WorkType | null>(null);
  const [wantToCompare, setWantToCompare] = useState('');
  const [leaning, setLeaning] = useState<Leaning | null>(null);
  const [confidence, setConfidence] = useState<Score | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 입력을 고치면 이전 오류는 지운다
  useEffect(() => {
    setError(null);
  }, [startDate, pickupStore, workType, wantToCompare, leaning, confidence]);

  const days = calendarDays(demo, new Date(), CALENDAR_DAYS);
  const selectedDay = days.find((d) => d.date === startDate);

  const submit = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    // 선택하지 않은 값은 그대로 넘겨 domain.createReservation 이 오류를 알려 준다
    const r = await apply((s) =>
      createReservation(s, {
        startDate,
        pickupStore,
        workType: workType as WorkType,
        wantToCompare,
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
    setWorkType(null);
    setWantToCompare('');
    setLeaning(null);
    setConfidence(null);
    router.navigate('/my');
  };


  return (
    <Section title="데모 일정 요청" caption="요청은 예약 확정이 아닙니다. 운영자가 두 기기를 확인한 뒤에만 확정됩니다.">
      <Card style={{ gap: 22 }}>
        <Field label="희망 시작일" hint="표시는 운영자가 수동으로 갱신하는 안내값이며 확정 재고가 아닙니다.">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingHorizontal: 16 }}>
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
                  accessibilityState={{ selected, disabled: closed }}
                  accessibilityLabel={`${formatDateKey(d.date)}, ${DAY_STATUS_LABEL[d.status]}`}
                  onPress={() => {
                    haptic.select();
                    setStartDate(d.date);
                  }}
                  style={({ pressed }) => [
                    styles.day,
                    { backgroundColor: tone.bg, borderColor: tone.border },
                    selected && { backgroundColor: C.primary, borderColor: C.primary },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <T variant="caption" color={selected ? '#DCE4FF' : closed ? C.muted : C.sub}>
                    {weekday(date)}
                  </T>
                  <T
                    variant="headline"
                    weight="700"
                    color={selected ? '#FFFFFF' : closed ? C.muted : C.ink}
                    style={closed ? { textDecorationLine: 'line-through' } : null}>
                    {date.getMonth() + 1}/{date.getDate()}
                  </T>
                  <T variant="caption" weight="600" color={selected ? '#FFFFFF' : tone.fg} numberOfLines={1}>
                    {DAY_STATUS_LABEL[d.status]}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Row gap={6}>
              <Icon ios="clock" web="schedule" size={13} color={C.sub} />
              <T variant="caption">마지막 갱신 {formatDateTime(demo.calendarUpdatedAt)}</T>
            </Row>
            <T variant="caption">일요일 픽업 없음 (데모 가정)</T>
          </Row>
          {selectedDay?.status === 'check' ? (
            <Notice tone="warn">확인이 필요한 날짜입니다. 운영자가 매장·기기를 확인한 뒤 가능 여부를 알려 드립니다.</Notice>
          ) : null}
        </Field>

        <Field label="픽업 매장">
          <View style={{ gap: 8 }}>
            {PICKUP_STORES.map((store) => (
              <RadioRow key={store} selected={pickupStore === store} label={store} onPress={() => setPickupStore(store)} />
            ))}
          </View>
        </Field>

        <Field label="작업 유형" hint="체험 때 볼 체크리스트가 작업 유형에 맞춰집니다.">
          <View style={styles.chips}>
            {(Object.keys(WORK_TYPES) as WorkType[]).map((w) => {
              const selected = workType === w;
              return (
                <Pressable
                  key={w}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic.select();
                    setWorkType(w);
                  }}
                  style={({ pressed }) => [styles.choice, selected && styles.choiceOn, pressed && { opacity: 0.7 }]}>
                  <T variant="callout" weight={selected ? '700' : '500'} color={selected ? '#FFFFFF' : C.ink}>
                    {WORK_TYPES[w].label}
                  </T>
                </Pressable>
              );
            })}
          </View>
          {workType ? (
            <View style={styles.preview}>
              <T variant="caption" weight="700" color={C.sub}>
                체험 때 확인할 점 (미리보기)
              </T>
              {WORK_TYPES[workType].checklist.map((c) => (
                <T key={c} variant="footnote" color={C.ink}>
                  · {c}
                </T>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="비교하고 싶은 점" optional>
          <Input
            multiline
            value={wantToCompare}
            onChangeText={setWantToCompare}
            placeholder="예: 4K 영상 내보내기 시간, 하루 들고 다닐 때 무게"
            accessibilityLabel="비교하고 싶은 점"
          />
        </Field>

        <Field label="체험 전 기울기" hint="지금 어느 쪽으로 마음이 기울어 있나요? 체험 뒤 결정과 비교합니다.">
          <Segmented<Leaning>
            accessibilityLabel="체험 전 기울기"
            value={leaning}
            onChange={(v) => v && setLeaning(v)}
            options={[
              { value: 'air', label: 'Air 쪽', color: C.air },
              { value: 'pro', label: 'Pro 쪽', color: C.pro },
              { value: 'unsure', label: '모르겠음' },
            ]}
          />
          <ScorePicker
            label="확신 정도 (1 전혀 모르겠음 · 5 확실함)"
            value={confidence}
            onChange={(v) => setConfidence(v)}
            a11yPrefix="체험 전 "
          />
        </Field>

        <Notice tone="info" title="이름·전화번호를 받지 않습니다">
          {DEMO_NOTICE}
        </Notice>

        <View style={{ gap: 10 }}>
          <ErrorText message={error} />
          <Button label={saving ? '저장 중…' : '데모 일정 요청'} onPress={submit} disabled={saving} accessibilityHint="요청을 이 기기에 저장하고 내 체험 탭으로 이동합니다" />
          <Row gap={6} style={{ justifyContent: 'center' }}>
            <Icon ios="clock" web="schedule" size={13} color={C.sub} />
            <T variant="caption">{RESPONSE_TARGET}</T>
          </Row>
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  cmpHead: { paddingHorizontal: 16, paddingVertical: 12 },
  cmpRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  cmpDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  cmpCell: {
    flex: 1,
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
  },
  day: {
    width: 68,
    paddingVertical: 10,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  choiceOn: { backgroundColor: C.ink, borderColor: C.ink },
  preview: { backgroundColor: C.bg, borderRadius: 10, padding: 12, gap: 3 },
});
