// 미션 알림 (체험 둘째 날 · 마지막 날 전날) — iOS 에서는 기기 로컬 알림을 실제로 예약한다
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { toDateKey, type Reservation } from '@/domain';
import { formatDateKey, formatDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { clearFor, scheduleFor } from '@/lib/reminder-actions';
import { lastDayOptions, planReminders, trialStartDate } from '@/lib/reminder-plan';
import { REMINDERS_SUPPORTED, listScheduledReminders } from '@/lib/reminders';
import { useApp } from '@/lib/store';
import { C, RADIUS } from '@/lib/theme';

import { Button, Card, ErrorText, Field, Icon, Notice, Row, Section, T } from './ui';

export function ReminderCard({ r }: { r: Reservation }) {
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
  // 예약 기록이 바뀌면(다른 곳에서 다시 예약·끄기 포함) 고른 날짜와 기기 알림 목록을 맞춘다
  useEffect(() => {
    if (rec?.lastDay) setDraftLast(rec.lastDay);
    refreshOs();
  }, [rec?.lastDay, rec?.updatedAt, rec?.status, refreshOs]);

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
    <Section eyebrow="Nudge" title="미션 알림" caption={`체험 시작 ${formatDateKey(toDateKey(start))} · 둘째 날과 마지막 날 전날`}>
      <Card style={{ gap: 16 }}>
        <T variant="callout">
          잊지 않게 살짝 알려 드릴게요. 둘째 날엔 쉬운 미션 하나, 마지막 날 전날엔 남은 미션과 리워드 신청을 챙겨요. 두 날이 겹치면 한 번만
          보내요.
        </T>
        <Field label="마지막 날 (반납일)" hint="체험 기간은 딜러 계약 후 확정돼요. 운영자가 안내한 날짜를 골라 주세요.">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -18 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 18 }}>
            {options.map((d) => {
              const selected = draftLast === d;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="radio"
                  aria-checked={selected}
                  aria-selected={selected}
                  accessibilityLabel={`마지막 날 ${formatDateKey(d)}`}
                  onPress={() => {
                    haptic.select();
                    setDraftLast(d);
                    setError(null);
                  }}
                  style={({ pressed }) => [styles.dayChip, selected && styles.dayChipOn, pressed && { opacity: 0.7 }]}>
                  <T variant="footnote" weight="700" color={selected ? C.ivory : C.ink}>
                    {formatDateKey(d)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>
        {plan.length ? (
          <View style={styles.plan}>
            <T variant="footnote" weight="700" color={C.sub}>
              {plan.length === 1 ? '알림 1번 (두 날이 겹쳐 하나로 합쳤어요)' : '알림 2번'}
            </T>
            {plan.map((p) => (
              <Row key={p.key} gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={styles.bell}>
                  <Icon ios="bell.fill" web="notifications" size={13} color={C.coralInk} />
                </View>
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
                ? '조용한 알림으로 예약했어요 — 알림 센터로 전달돼요. 배너로 받으려면 설정 앱에서 알림을 켜 주세요.'
                : '배너 알림으로 예약했어요.'}
              {rec.note ? ` ${rec.note}` : ''}
              {rec.lastDay !== draftLast ? ' 날짜를 바꿨다면 다시 예약해 주세요.' : ''}
            </T>
            {osList !== undefined ? (
              <T variant="caption" color={C.doneText}>
                {osList === null ? '기기 알림 목록은 이 환경에서 확인하지 못했어요.' : `기기 확인: iOS에 예약된 이 앱의 알림 ${osList.length}건`}
              </T>
            ) : null}
          </Notice>
        ) : rec?.status === 'planned' ? (
          <Notice tone="warn" title="알림은 예약되지 않았어요">
            {rec.note ?? '이 환경에서는 계획만 보여 드려요.'}
          </Notice>
        ) : null}

        <ErrorText message={error} />
        {REMINDERS_SUPPORTED ? (
          <Row gap={8}>
            <Button
              label={scheduled ? '다시 예약' : '알림 받기'}
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

const styles = StyleSheet.create({
  dayChip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    borderColor: C.lineStrong,
    backgroundColor: C.surface,
  },
  dayChipOn: { backgroundColor: C.ink, borderColor: C.ink },
  plan: { backgroundColor: C.sunk, borderRadius: 14, padding: 12, gap: 10 },
  bell: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.coralSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
