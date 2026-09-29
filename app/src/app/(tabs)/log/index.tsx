import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState, Legend, ReservationSwitcher, SummaryBars } from '@/components/shared';
import {
  Button,
  Card,
  CheckRow,
  DeviceTag,
  ErrorText,
  Field,
  Icon,
  Input,
  Notice,
  Pill,
  Row,
  ScorePicker,
  Section,
  StatusChip,
  T,
} from '@/components/ui';
import { Screen } from '@/components/screen';
import {
  STATUS_FLOW,
  STATUS_LABEL,
  WORK_TYPES,
  addCompareLog,
  toDateKey,
  type CompareLog,
  type DeviceEntry,
  type DeviceKey,
  type Reservation,
  type Score,
} from '@/domain';
import { formatDateKey, formatDateTime, formatScore, formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { clearFor, scheduleFor } from '@/lib/reminder-actions';
import { lastDayOptions, planReminders, trialStartDate } from '@/lib/reminder-plan';
import { REMINDERS_SUPPORTED, listScheduledReminders } from '@/lib/reminders';
import { apply, updateUi, useApp, useCurrent } from '@/lib/store';
import { C, DEVICE_COLOR, RADIUS } from '@/lib/theme';

export default function CompareLogScreen() {
  const { app, current } = useCurrent();

  if (!current) {
    return (
      <Screen>
        <EmptyState
          title="체험을 시작하면 열립니다"
          body="비교 기록은 두 기기를 받은 뒤 체험 기간에 쓰는 도구입니다. 먼저 비교팩 탭에서 데모 일정을 요청하세요."
          cta={{ label: '데모 일정 요청하러 가기', href: '/' }}
        />
      </Screen>
    );
  }

  const idx = STATUS_FLOW.indexOf(current.status);
  const before = current.status !== 'cancelled' && idx < STATUS_FLOW.indexOf('in_trial');
  const after = idx > STATUS_FLOW.indexOf('in_trial');

  return (
    <Screen>
      <ReservationSwitcher list={app.demo.reservations} currentId={current.id} />
      {current.status === 'in_trial' ? (
        <>
          <ReminderCard r={current} />
          <Checklist r={current} />
          <LogForm key={`${current.id}-${current.logs.length}`} r={current} />
          <Section title="나란히 보기" caption="지금까지 기록의 평균입니다">
            <Card>
              <SummaryBars logs={current.logs} />
            </Card>
          </Section>
          <LogList logs={current.logs} />
        </>
      ) : before ? (
        <Card style={{ gap: 12, paddingVertical: 20 }}>
          <Row gap={8}>
            <Icon ios="lock" web="lock" size={18} color={C.sub} />
            <T variant="title3">체험 중에만 열립니다</T>
          </Row>
          <Row gap={8}>
            <T variant="footnote">지금 상태</T>
            <StatusChip status={current.status} />
          </Row>
          <T variant="callout" color={C.sub}>
            운영자가 두 기기의 출고 기록(상태·부속품)을 마치고 체험을 시작하면, 이 탭에서 작업 유형별 체크리스트와 두 기기 같은 기준 기록을 쓸 수
            있습니다. 체험이 시작되면 둘째 날과 마지막 날 전날 리마인드도 받을 수 있습니다.
          </T>
          <View style={styles.preview}>
            <T variant="caption" weight="700" color={C.sub}>
              {WORK_TYPES[current.request.workType].label} 체크리스트 미리보기
            </T>
            {WORK_TYPES[current.request.workType].checklist.map((c) => (
              <T key={c} variant="footnote" color={C.ink}>
                · {c}
              </T>
            ))}
          </View>
        </Card>
      ) : (
        <>
          <Notice tone="info" title={current.status === 'cancelled' ? '취소된 요청입니다' : '체험이 끝났습니다'}>
            {current.status === 'cancelled'
              ? '취소된 요청에는 기록을 남길 수 없습니다.'
              : `'${STATUS_LABEL[current.status]}' 단계라 새 기록은 남길 수 없습니다. 남긴 기록은 아래에서 볼 수 있습니다.`}
          </Notice>
          {after ? (
            <>
              <Section title="나란히 보기">
                <Card>
                  <SummaryBars logs={current.logs} />
                </Card>
              </Section>
              <LogList logs={current.logs} />
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

// ───────── 리마인드 ─────────

function ReminderCard({ r }: { r: Reservation }) {
  const { ui } = useApp();
  const rec = ui.reminders[r.id];
  const start = trialStartDate(r);
  const options = lastDayOptions(start);
  const [draftLast, setDraftLast] = useState<string | null>(rec?.lastDay ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [osList, setOsList] = useState<{ id: string; title: string; date: string | null }[] | null | undefined>(undefined);

  const refreshOs = useCallback(() => {
    if (!REMINDERS_SUPPORTED) return;
    listScheduledReminders().then(setOsList);
  }, []);
  useFocusEffect(refreshOs);


  const plan = draftLast ? planReminders(start, draftLast) : [];
  const scheduled = rec?.status === 'scheduled';

  const schedule = async () => {
    if (!draftLast) {
      setError('운영자가 안내한 마지막 날(반납일)을 골라 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await scheduleFor(r, draftLast);
    setBusy(false);
    if (!res.ok) {
      haptic.error();
      setError(res.error);
    } else haptic.success();
    refreshOs();
  };


  const off = async () => {
    setBusy(true);
    await clearFor(r.id);
    setBusy(false);
    refreshOs();
  };

  return (
    <Section title="리마인드" caption={`체험 시작 ${formatDateKey(toDateKey(start))} · D+1과 마지막 날 전날`}>
      <Card style={{ gap: 14 }}>
        <T variant="callout">
          체험 둘째 날(D+1)과 마지막 날 전날 오전 10시에 알려 드립니다. 두 날이 겹치면 한 번만 보냅니다.
        </T>
        <Field label="마지막 날 (반납일)" hint="체험 기간은 딜러 계약 후 확정됩니다. 운영자가 안내한 날짜를 고르세요.">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {options.map((d) => {
              const selected = draftLast === d;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`마지막 날 ${formatDateKey(d)}`}
                  onPress={() => {
                    haptic.select();
                    setDraftLast(d);
                    setError(null);
                  }}
                  style={({ pressed }) => [styles.dayChip, selected && styles.dayChipOn, pressed && { opacity: 0.7 }]}>
                  <T variant="footnote" weight="700" color={selected ? '#FFFFFF' : C.ink}>
                    {formatDateKey(d)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>
        {plan.length ? (
          <View style={{ gap: 8 }}>
            <T variant="footnote" weight="700" color={C.sub}>
              {plan.length === 1 ? '알림 1번 (두 날이 겹쳐 하나로 합침)' : '알림 2번'}
            </T>
            {plan.map((p) => (
              <Row key={p.key} gap={10} style={{ alignItems: 'flex-start' }}>
                <Icon ios="bell" web="notifications" size={16} color={C.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <T variant="callout" weight="700">
                    {formatDateTime(p.at)}
                  </T>
                  <T variant="footnote">{p.title}</T>
                </View>
              </Row>
            ))}
          </View>
        ) : null}

        {scheduled ? (
          <Notice tone="done" title={`이 기기에 알림 ${rec.notificationIds.length}건 예약됨`}>
            <T variant="footnote" color={C.doneText}>
              {rec.mode === 'provisional'
                ? '조용한 알림으로 예약했습니다 — 알림 센터로 전달됩니다. 배너로 받으려면 설정 앱에서 알림을 켜 주세요.'
                : '배너 알림으로 예약했습니다.'}
              {rec.note ? ` ${rec.note}` : ''}
              {rec.lastDay !== draftLast ? ' 날짜를 바꿨다면 다시 예약하세요.' : ''}
            </T>
            {osList !== undefined ? (
              <T variant="caption" color={C.doneText}>
                {osList === null
                  ? '기기 알림 목록은 이 환경에서 확인하지 못했습니다.'
                  : `기기 확인: iOS에 예약된 이 앱의 알림 ${osList.length}건`}
              </T>
            ) : null}
          </Notice>
        ) : rec?.status === 'planned' ? (
          <Notice tone="warn" title="알림은 예약되지 않았습니다">
            {rec.note ?? '이 환경에서는 계획만 표시합니다.'}
          </Notice>
        ) : null}

        <ErrorText message={error} />
        {REMINDERS_SUPPORTED ? (
          <Row gap={8}>
            <Button
              label={scheduled ? '다시 예약' : '알림 예약'}
              icon={['bell.badge', 'notifications_active']}
              onPress={schedule}
              disabled={busy}
              style={{ flex: 1 }}
            />
            {scheduled ? <Button variant="secondary" label="끄기" onPress={off} disabled={busy} /> : null}
          </Row>
        ) : (
          <Button variant="secondary" label="계획 저장 (웹: 알림 없음)" onPress={schedule} disabled={busy} />
        )}
      </Card>
    </Section>
  );
}

// ───────── 작업 유형 체크리스트 ─────────

function Checklist({ r }: { r: Reservation }) {
  const { ui } = useApp();
  const done = ui.checklist[r.id] ?? [];
  const items = WORK_TYPES[r.request.workType].checklist;
  const toggle = (i: number) =>
    updateUi((u) => {
      const cur = u.checklist[r.id] ?? [];
      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
      return { ...u, checklist: { ...u.checklist, [r.id]: next } };
    });
  return (
    <Section
      title={`${WORK_TYPES[r.request.workType].label} 체크리스트`}
      caption="두 기기에서 모두 해 봤다면 체크하세요"
      right={<Pill label={`${done.length}/${items.length}`} bg={C.primarySoft} fg={C.primary} />}>
      <Card style={{ gap: 0, paddingVertical: 8 }}>
        {items.map((c, i) => (
          <CheckRow key={c} checked={done.includes(i)} label={c} onToggle={() => toggle(i)} />
        ))}
      </Card>
    </Section>
  );
}

// ───────── 같은 작업 기록 ─────────

type Draft = { minutes: string; portability: Score | null; display: Score | null; feel: Score | null };
const emptyDraft = (): Draft => ({ minutes: '', portability: null, display: null, feel: null });

function LogForm({ r }: { r: Reservation }) {
  const [task, setTask] = useState('');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<Record<DeviceKey, Draft>>({ air: emptyDraft(), pro: emptyDraft() });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const suggestions = WORK_TYPES[r.request.workType].checklist;

  const set = (k: DeviceKey, patch: Partial<Draft>) => setEntries((e) => ({ ...e, [k]: { ...e[k], ...patch } }));


  const save = async () => {
    if (saving) return;
    setError(null);
    const toEntry = (d: Draft): DeviceEntry | string => {
      const t = d.minutes.trim().replace(',', '.');
      let minutes: number | null = null;
      if (t) {
        const n = Number(t);
        if (!Number.isFinite(n)) return '소요 시간은 숫자(분)로 적어 주세요.';
        minutes = n; // 범위(0 초과 1,440 이하)는 domain.addCompareLog 가 검사한다
      }
      return { minutes, portability: d.portability, display: d.display, feel: d.feel };
    };
    const air = toEntry(entries.air);
    const pro = toEntry(entries.pro);
    setSaving(true);
    const res = await apply((s) =>
      typeof air === 'string' || typeof pro === 'string'
        ? { ok: false, error: (typeof air === 'string' ? air : pro) as string }
        : addCompareLog(s, r.id, { task, note: note.trim(), entries: { air, pro } }),
    );
    setSaving(false);
    if (!res.ok) {
      // 저장 실패 포함 — 입력값은 그대로 두고 다시 누를 수 있다
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
    // 저장 성공 → key 가 바뀌어 폼이 새로 그려진다
  };

  return (
    <Section title="같은 작업 기록" caption="두 기기에서 똑같이 해 본 작업 하나를 같은 기준으로 적습니다">
      <Card style={{ gap: 16 }}>
        <Field label="작업" required>
          <Input value={task} onChangeText={setTask} placeholder="예: 같은 4K 영상 내보내기" accessibilityLabel="두 기기에서 해 본 작업" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>
            {suggestions.map((sug) => (
              <Pressable
                key={sug}
                accessibilityRole="button"
                accessibilityLabel={`작업 이름으로 쓰기: ${sug}`}
                onPress={() => {
                  haptic.select();
                  setTask(sug);
                }}
                style={({ pressed }) => [styles.sugChip, pressed && { opacity: 0.7 }]}>
                <T variant="caption" color={C.ink} numberOfLines={1}>
                  {sug}
                </T>
              </Pressable>
            ))}
          </ScrollView>
        </Field>

        <View style={styles.cols}>
          {(['air', 'pro'] as DeviceKey[]).map((k) => (
            <View key={k} style={[styles.col, { borderColor: DEVICE_COLOR[k].main, backgroundColor: DEVICE_COLOR[k].soft }]}>
              <DeviceTag kind={k} style={{ backgroundColor: C.surface }} />
              <View style={{ gap: 6 }}>
                <T variant="footnote" weight="600" color={C.sub}>
                  소요 시간(분)
                </T>
                <Input
                  value={entries[k].minutes}
                  onChangeText={(v) => set(k, { minutes: v })}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  placeholder="선택"
                  accessibilityLabel={`${DEVICE_COLOR[k].short} 소요 시간(분)`}
                  style={{ paddingVertical: 9 }}
                />
              </View>
              <ScorePicker label="휴대성" value={entries[k].portability} onChange={(v) => set(k, { portability: v })} color={DEVICE_COLOR[k].main} a11yPrefix={`${DEVICE_COLOR[k].short} `} />
              <ScorePicker label="화면" value={entries[k].display} onChange={(v) => set(k, { display: v })} color={DEVICE_COLOR[k].main} a11yPrefix={`${DEVICE_COLOR[k].short} `} />
              <ScorePicker label="사용감" value={entries[k].feel} onChange={(v) => set(k, { feel: v })} color={DEVICE_COLOR[k].main} a11yPrefix={`${DEVICE_COLOR[k].short} `} />
            </View>
          ))}
        </View>
        <T variant="caption">
          같은 항목을 두 기기 모두 적어야 비교에 들어갑니다. 1 아쉬움 · 5 아주 좋음. 사용감은 키보드·트랙패드·발열·소음을 함께 봅니다. 다시
          누르면 선택이 풀립니다.
        </T>

        <Field label="메모" optional>
          <Input multiline value={note} onChangeText={setNote} placeholder="예: Pro는 팬 소리가 났지만 속도가 끝까지 유지됨" accessibilityLabel="메모" />
        </Field>

        <ErrorText message={error} />
        <Button label={saving ? '저장 중…' : '기록 저장'} icon={['tray.and.arrow.down', 'save']} onPress={save} disabled={saving} />
      </Card>
    </Section>
  );
}

// ───────── 기록 목록 ─────────

const ROWS: { key: keyof DeviceEntry; label: string; unit: string }[] = [
  { key: 'minutes', label: '소요 시간', unit: '분' },
  { key: 'portability', label: '휴대성', unit: '' },
  { key: 'display', label: '화면', unit: '' },
  { key: 'feel', label: '사용감', unit: '' },
];

function LogList({ logs }: { logs: CompareLog[] }) {
  if (!logs.length) return null;
  return (
    <Section title={`기록 ${logs.length}건`}>
      {[...logs].reverse().map((l) => (
        <Card key={l.id} style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T variant="headline" style={{ flex: 1 }}>
              {l.task}
            </T>
            <T variant="caption">{formatShortDateTime(l.createdAt)}</T>
          </Row>
          <View style={styles.table}>
            <View style={styles.tr}>
              <View style={{ flex: 1.2 }} />
              {(['air', 'pro'] as DeviceKey[]).map((k) => (
                <View key={k} style={styles.td}>
                  <DeviceTag kind={k} style={{ alignSelf: 'center' }} />
                </View>
              ))}
            </View>
            {ROWS.map((row) => (
              <View key={row.key} style={[styles.tr, styles.trLine]}>
                <T variant="footnote" style={{ flex: 1.2 }}>
                  {row.label}
                </T>
                {(['air', 'pro'] as DeviceKey[]).map((k) => {
                  const v = l.entries[k][row.key];
                  return (
                    <View key={k} style={styles.td}>
                      <T variant="callout" weight="600" color={v === null ? C.muted : C.ink} style={{ fontVariant: ['tabular-nums'] }}>
                        {v === null ? '—' : `${formatScore(v)}${row.unit}`}
                      </T>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          {l.note ? (
            <T variant="footnote" color={C.ink}>
              {l.note}
            </T>
          ) : null}
        </Card>
      ))}
      <Row style={{ justifyContent: 'center' }}>
        <Legend />
      </Row>
      <Button variant="ghost" label="결정·반납으로" onPress={() => router.navigate('/decide')} />
    </Section>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: C.bg, borderRadius: 10, padding: 12, gap: 3 },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  dayChipOn: { backgroundColor: C.primary, borderColor: C.primary },
  sugChip: {
    maxWidth: 240,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.chip,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.line,
  },
  cols: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, borderRadius: RADIUS.card, borderWidth: 1.5, padding: 10, gap: 12 },
  table: { gap: 0 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  trLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  td: { flex: 1, alignItems: 'center' },
});
