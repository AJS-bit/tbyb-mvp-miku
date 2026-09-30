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
import { RADIUS } from '@/lib/theme';
import { themed, useTheme } from '@/lib/theme-context';

import { Button, Card, ErrorText, Field, Icon, Notice, Row, Section, T } from './ui';

export function ReminderCard({ r }: { r: Reservation }) {
  const { ui } = useApp();
  const { c } = useTheme();
  const styles = useStyles();
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
      setError('운영자가 안내한 마지막 날을 골라 주세요.');
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
    <Section eyebrow="Nudge" title="미션 알림" caption={`${formatDateKey(toDateKey(start))}에 체험을 시작했어요`}>
      <Card style={{ gap: 16 }}>
        {/* 약속은 이 환경에서 참인 것만: iOS 는 이 기기의 로컬 알림을 실제로 예약하고, 웹은 계획만 저장한다 */}
        <T variant="callout">
          {REMINDERS_SUPPORTED
            ? '알림 받기를 누르면 이 기기에서 살짝 알려 드려요. 둘째 날에는 쉬운 미션 하나를, 마지막 날 전날에는 남은 미션과 리워드 신청을 챙겨 드려요. 두 날이 겹치면 한 번만 보내요.'
            : '웹 미리보기에서는 알림을 보내지 않아요. 둘째 날과 마지막 날 전날, 언제 알려 드릴지 계획만 이 기기에 저장돼요.'}
        </T>
        <Field label="마지막 날 (반납하는 날)" hint="운영자가 안내한 반납 날짜를 골라 주세요. 체험 기간은 딜러와 계약한 뒤에 정해져요.">
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
                  <T variant="footnote" weight="700" color={selected ? c.ivory : c.ink}>
                    {formatDateKey(d)}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>
        {plan.length ? (
          <View style={styles.plan}>
            <T variant="footnote" weight="700" color={c.sub}>
              {plan.length === 1 ? '두 날이 겹쳐서 한 번만 알려 드려요' : '두 번 알려 드려요'}
            </T>
            {plan.map((p) => (
              <Row key={p.key} gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={styles.bell}>
                  <Icon ios="bell.fill" web="notifications" size={13} color={c.coralInk} />
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
          <Notice tone="done" title={`이 기기에 알림 ${rec.notificationIds.length}건을 예약했어요`}>
            <T variant="footnote" color={c.doneText}>
              {rec.mode === 'provisional'
                ? '조용한 알림으로 예약했어요. 알림 센터에서 볼 수 있고, 배너로 받으려면 설정 앱에서 알림을 켜 주세요.'
                : '배너 알림으로 예약했어요.'}
              {rec.note ? ` ${rec.note}` : ''}
              {rec.lastDay !== draftLast ? ' 날짜를 바꿨다면 다시 예약해 주세요.' : ''}
            </T>
            {osList !== undefined ? (
              <T variant="caption" color={c.doneText}>
                {osList === null ? '이 기기의 알림 목록은 확인하지 못했어요.' : `iOS에 실제로 예약된 알림: ${osList.length}건`}
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
              label={scheduled ? '다시 예약하기' : '알림 받기'}
              icon={['bell.badge', 'notifications_active']}
              onPress={schedule}
              disabled={busy}
              style={{ flex: 1 }}
            />
            {scheduled ? <Button variant="secondary" label="알림 끄기" onPress={off} disabled={busy} /> : null}
          </Row>
        ) : (
          <Button variant="secondary" label="계획만 저장하기 (웹은 알림 없음)" onPress={schedule} disabled={busy} />
        )}
      </Card>
    </Section>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    dayChip: {
      paddingVertical: 9,
      paddingHorizontal: 13,
      borderRadius: RADIUS.chip,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.surface,
    },
    dayChipOn: { backgroundColor: c.ink, borderColor: c.ink },
    plan: { backgroundColor: c.sunk, borderRadius: 14, padding: 12, gap: 10 },
    bell: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.coralSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  }),
);
