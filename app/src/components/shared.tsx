// 여러 화면이 함께 쓰는 조각: 예약 전환, 타임라인, 요청 요약, 잠금 안내 · 빈 상태
import { router, type Href } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LEANING_LABEL, STATUS_FLOW, STATUS_LABEL, USAGE_LABEL, type Reservation } from '@/domain';
import { formatDateKey, formatDateTime, formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { selectReservation } from '@/lib/store';
import { themed, useTheme } from '@/lib/theme-context';

import { Button, Card, Eyebrow, Icon, KeyValue, Row, StatusChip, T } from './ui';

// ───────── 예약 전환 (여러 건일 때) ─────────

export function ReservationSwitcher({ list, currentId }: { list: Reservation[]; currentId?: string }) {
  const t = useTheme();
  const sw = useSwitcherStyles();
  if (list.length < 2) return null;
  return (
    <View style={{ gap: 8 }}>
      <T variant="footnote" weight="600">
        요청이 {list.length}건 있어요. 볼 요청을 골라 주세요.
      </T>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {list.map((r) => {
          const selected = r.id === currentId;
          const tone = t.status[r.status];
          return (
            <Pressable
              key={r.id}
              accessibilityRole="tab"
              aria-selected={selected}
              accessibilityLabel={`${r.id}, ${STATUS_LABEL[r.status]}`}
              onPress={() => {
                haptic.select();
                selectReservation(r.id);
              }}
              style={({ pressed }) => [sw.item, selected && sw.itemSelected, pressed && { opacity: 0.7 }]}>
              <T variant="callout" weight="700" color={selected ? t.c.ivory : t.c.ink}>
                {r.id}
              </T>
              <Row gap={5}>
                <View style={[sw.dot, { backgroundColor: selected ? t.c.coral : tone.dot }]} />
                <T variant="caption" color={selected ? t.c.onInkSub : t.c.sub}>
                  {STATUS_LABEL[r.status]}
                </T>
              </Row>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useSwitcherStyles = themed(({ c }) =>
  StyleSheet.create({
    item: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      gap: 2,
    },
    itemSelected: { backgroundColor: c.ink, borderColor: c.ink },
    dot: { width: 6, height: 6, borderRadius: 3 },
  }),
);

// ───────── 요청 요약 ─────────

export function RequestSummary({ r, compact }: { r: Reservation; compact?: boolean }) {
  const q = r.request;
  return (
    <View style={{ gap: 9 }}>
      <KeyValue k="희망 시작일" v={formatDateKey(q.startDate)} />
      <KeyValue k="픽업 매장" v={q.pickupStore} />
      <KeyValue k="주로 할 일" v={USAGE_LABEL[q.usage]} />
      {!compact || q.question ? <KeyValue k="궁금한 점" v={q.question || '—'} /> : null}
      <KeyValue k="체험 전 마음">
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <LeaningTag leaning={q.leaningBefore} />
          <T variant="callout">확신 {q.confidenceBefore}/5</T>
        </Row>
      </KeyValue>
    </View>
  );
}

export function LeaningTag({ leaning }: { leaning: Reservation['request']['leaningBefore'] }) {
  const t = useTheme();
  const color = leaning === 'unsure' ? t.c.muted : t.device[leaning].main;
  const soft = leaning === 'unsure' ? t.c.greySoft : t.device[leaning].soft;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: soft, paddingHorizontal: 9, paddingVertical: 2, borderRadius: 999 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <T variant="footnote" weight="700" color={t.c.ink}>
        {LEANING_LABEL[leaning]}
      </T>
    </View>
  );
}

// ───────── 타임라인 ─────────

export function Timeline({ r }: { r: Reservation }) {
  const { c } = useTheme();
  const tl = useTimelineStyles();
  const cancelled = r.status === 'cancelled';
  // 상태가 바뀐 이력만 (from === to 인 운영 기록은 제외)
  const reachedAt = (st: string) => [...r.history].reverse().find((h) => h.to === st && h.from !== h.to)?.at;
  const currentIdx = cancelled
    ? Math.max(...r.history.filter((h) => h.to !== 'cancelled').map((h) => STATUS_FLOW.indexOf(h.to)), 0)
    : STATUS_FLOW.indexOf(r.status);
  return (
    <View accessibilityRole="list" accessibilityLabel="진행 단계">
      {STATUS_FLOW.map((st, i) => {
        const done = i < currentIdx || (i === currentIdx && r.status === 'completed');
        const current = i === currentIdx && !cancelled && r.status !== 'completed';
        const stoppedHere = cancelled && i === currentIdx;
        const at = reachedAt(st);
        const last = i === STATUS_FLOW.length - 1;
        const dotColor = done ? c.ink : current ? c.coral : stoppedHere ? c.grey : c.railIdle;
        return (
          <View
            key={st}
            style={tl.row}
            accessibilityLabel={`${STATUS_LABEL[st]}${done ? ', 완료' : current ? ', 현재 단계' : ''}${at ? `, ${formatDateTime(at)}` : ''}`}>
            <View style={tl.rail}>
              <View style={[tl.dot, { borderColor: dotColor }, (done || current || stoppedHere) && { backgroundColor: dotColor }]}>
                {done ? <Icon ios="checkmark" web="check" size={10} color={c.ivory} /> : null}
              </View>
              {!last ? <View style={[tl.line, { backgroundColor: i < currentIdx ? c.ink : c.line }]} /> : null}
            </View>
            <View style={[tl.body, last && { paddingBottom: 0 }]}>
              <Row gap={8}>
                <T variant="callout" weight={current ? '800' : '500'} color={done || current ? c.ink : c.sub}>
                  {STATUS_LABEL[st]}
                </T>
                {current ? (
                  <T variant="caption" weight="800" color={c.coralInk}>
                    지금
                  </T>
                ) : null}
              </Row>
              {at && (done || current || stoppedHere) ? <T variant="caption">{formatShortDateTime(at)}</T> : null}
            </View>
          </View>
        );
      })}
      {cancelled ? (
        <Row gap={8} style={{ marginTop: 10 }}>
          <StatusChip status="cancelled" />
          <T variant="caption">{formatShortDateTime(reachedAt('cancelled'))}</T>
        </Row>
      ) : null}
    </View>
  );
}

const useTimelineStyles = themed(({ c }) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    rail: { alignItems: 'center', width: 18 },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    line: { width: 2, flex: 1, minHeight: 14, marginVertical: 2, borderRadius: 1 },
    body: { flex: 1, paddingBottom: 12, marginTop: -2 },
  }),
);

// ───────── 잠금 안내 / 빈 상태 ─────────

export function EmptyState({
  eyebrow,
  title,
  body,
  art,
  cta,
  children,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  art?: ReactNode;
  cta?: { label: string; href: Href };
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Card style={{ alignItems: 'flex-start', gap: 12, paddingVertical: 24 }}>
      {art}
      <View style={{ gap: 4 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <T variant="title">{title}</T>
      </View>
      <T variant="body" color={c.sub}>
        {body}
      </T>
      {children}
      {cta ? <Button small variant="secondary" label={cta.label} onPress={() => router.navigate(cta.href)} style={{ marginTop: 4 }} /> : null}
    </Card>
  );
}
