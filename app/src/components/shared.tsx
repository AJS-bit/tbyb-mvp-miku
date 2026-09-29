// 여러 화면이 함께 쓰는 조각: 예약 전환, 타임라인, 요약 막대, 요청 요약, 잠금 안내
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  DEVICE_LABEL,
  LEANING_LABEL,
  STATUS_FLOW,
  STATUS_LABEL,
  METRICS,
  METRIC_LABEL,
  WORK_TYPES,
  pairedCounts,
  summarize,
  type CompareLog,
  type Metric,
  type DeviceKey,
  type Reservation,
} from '@/domain';
import { formatDateKey, formatDateTime, formatScore, formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { selectReservation } from '@/lib/store';
import { C, DEVICE_COLOR, STATUS_TONE } from '@/lib/theme';

import { Button, Card, Icon, KeyValue, Row, StatusChip, T } from './ui';

// ───────── 예약 전환 (여러 건일 때) ─────────

export function ReservationSwitcher({ list, currentId }: { list: Reservation[]; currentId?: string }) {
  if (list.length < 2) return null;
  return (
    <View style={{ gap: 8 }}>
      <T variant="footnote" weight="600">
        요청 {list.length}건 — 볼 요청을 고르세요
      </T>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {list.map((r) => {
          const selected = r.id === currentId;
          const tone = STATUS_TONE[r.status];
          return (
            <Pressable
              key={r.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${r.id}, ${STATUS_LABEL[r.status]}`}
              onPress={() => {
                haptic.select();
                selectReservation(r.id);
              }}
              style={({ pressed }) => [sw.item, selected && sw.itemSelected, pressed && { opacity: 0.7 }]}>
              <T variant="callout" weight="700" color={selected ? C.surface : C.ink}>
                {r.id}
              </T>
              <Row gap={5}>
                <View style={[sw.dot, { backgroundColor: selected ? C.surface : tone.dot }]} />
                <T variant="caption" color={selected ? '#DDE3EA' : C.sub}>
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

const sw = StyleSheet.create({
  item: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    gap: 2,
  },
  itemSelected: { backgroundColor: C.ink, borderColor: C.ink },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

// ───────── 요청 요약 ─────────

export function RequestSummary({ r, compact }: { r: Reservation; compact?: boolean }) {
  const q = r.request;
  return (
    <View style={{ gap: 8 }}>
      <KeyValue k="희망 시작일" v={formatDateKey(q.startDate)} />
      <KeyValue k="픽업 매장" v={q.pickupStore} />
      <KeyValue k="작업 유형" v={WORK_TYPES[q.workType].label} />
      {!compact ? <KeyValue k="비교할 점" v={q.wantToCompare || '—'} /> : null}
      <KeyValue k="체험 전">
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          <LeaningTag leaning={q.leaningBefore} />
          <T variant="callout">확신 {q.confidenceBefore}/5</T>
        </Row>
      </KeyValue>
    </View>
  );
}

export function LeaningTag({ leaning }: { leaning: Reservation['request']['leaningBefore'] }) {
  const color = leaning === 'unsure' ? C.muted : DEVICE_COLOR[leaning].main;
  const soft = leaning === 'unsure' ? C.greySoft : DEVICE_COLOR[leaning].soft;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: soft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <T variant="footnote" weight="700" color={C.ink}>
        {LEANING_LABEL[leaning]}
      </T>
    </View>
  );
}

// ───────── 타임라인 ─────────

export function Timeline({ r }: { r: Reservation }) {
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
        const dotColor = done ? C.done : current ? STATUS_TONE[st].dot : stoppedHere ? C.grey : '#D0D5DD';
        return (
          <View
            key={st}
            style={tl.row}
            accessibilityLabel={`${STATUS_LABEL[st]}${done ? ', 완료' : current ? ', 현재 단계' : ''}${at ? `, ${formatDateTime(at)}` : ''}`}>
            <View style={tl.rail}>
              <View style={[tl.dot, { borderColor: dotColor }, (done || current || stoppedHere) && { backgroundColor: dotColor }]}>
                {done ? <Icon ios="checkmark" web="check" size={10} color="#FFFFFF" /> : null}
              </View>
              {!last ? <View style={[tl.line, { backgroundColor: i < currentIdx ? C.done : C.line }]} /> : null}
            </View>
            <View style={[tl.body, last && { paddingBottom: 0 }]}>
              <Row gap={8}>
                <T variant="callout" weight={current ? '700' : '500'} color={done || current ? C.ink : C.muted}>
                  {STATUS_LABEL[st]}
                </T>
                {current ? <T variant="caption" weight="700" color={STATUS_TONE[st].fg}>지금</T> : null}
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

const tl = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 18 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 2, borderRadius: 1 },
  body: { flex: 1, paddingBottom: 12, marginTop: -2 },
});

// ───────── 요약 막대 (Air·Pro 나란히) ─────────
// 같은 기록에서 두 기기 모두 측정한 항목만 평균 (domain.summarize / pairedCounts)

const METRIC_HINT: Record<Metric, string> = {
  minutes: '짧을수록 빠름',
  portability: '1–5',
  display: '1–5',
  feel: '키보드·트랙패드·발열·소음 · 1–5',
};
const SUMMARY_KEY: Record<Metric, 'avgMinutes' | 'portability' | 'display' | 'feel'> = {
  minutes: 'avgMinutes',
  portability: 'portability',
  display: 'display',
  feel: 'feel',
};

export function Legend() {
  return (
    <Row gap={14}>
      {(['air', 'pro'] as DeviceKey[]).map((k) => (
        <Row key={k} gap={6}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: DEVICE_COLOR[k].main }} />
          <T variant="footnote" color={C.ink}>
            {DEVICE_LABEL[k]}
          </T>
        </Row>
      ))}
    </Row>
  );
}

export function SummaryBars({ logs }: { logs: CompareLog[] }) {
  if (!logs.length) {
    return (
      <T variant="callout" color={C.sub}>
        아직 기록이 없습니다. 같은 작업을 두 기기에서 해 보고 기록하면 여기에 나란히 모입니다.
      </T>
    );
  }
  const sum = summarize(logs);
  const counts = pairedCounts(logs);
  return (
    <View style={{ gap: 16 }}>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Legend />
        <T variant="caption">전체 기록 {logs.length}건</T>
      </Row>
      {METRICS.map((m) => {
        const a = sum.air[SUMMARY_KEY[m]];
        const p = sum.pro[SUMMARY_KEY[m]];
        const n = counts[m];
        const unit = m === 'minutes' ? '분' : '점';
        const label = m === 'minutes' ? '같은 작업 소요 시간' : METRIC_LABEL[m];
        const max = m === 'minutes' ? Math.max(a ?? 0, p ?? 0, 1) : 5;
        return (
          <View key={m} style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexShrink: 1 }}>
                <T variant="callout" weight="600">
                  {label}
                </T>
                <T variant="caption">{METRIC_HINT[m]}</T>
              </View>
              <T variant="caption" weight="600" color={n ? C.sub : C.muted}>
                {n ? `${n}개 기록 기준` : ''}
              </T>
            </Row>
            {n === 0 ? (
              <T variant="footnote" color={C.muted}>
                두 기기 모두 측정한 기록 없음
              </T>
            ) : (
              (['air', 'pro'] as DeviceKey[]).map((k) => {
                const v = k === 'air' ? a : p;
                return (
                  <View
                    key={k}
                    style={bars.row}
                    accessible
                    accessibilityLabel={`${label}, ${DEVICE_LABEL[k]}: ${v === null ? '기록 없음' : `평균 ${formatScore(v)}${unit}`}, ${n}개 기록 기준`}>
                    <T variant="caption" weight="700" color={C.ink} style={{ width: 28 }}>
                      {DEVICE_COLOR[k].short}
                    </T>
                    <View style={bars.track}>
                      {v !== null ? (
                        <View style={[bars.fill, { width: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: DEVICE_COLOR[k].main }]} />
                      ) : null}
                    </View>
                    <T variant="footnote" color={v === null ? C.muted : C.ink} style={bars.value}>
                      {v === null ? '—' : `${formatScore(v)}${unit}`}
                    </T>
                  </View>
                );
              })
            )}
          </View>
        );
      })}
    </View>
  );
}

const bars = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 10, borderRadius: 3, backgroundColor: '#F0F2F5', overflow: 'hidden' },
  fill: { height: 10, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  value: { width: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
});

// ───────── 잠금 안내 / 빈 상태 ─────────

export function EmptyState({ title, body, cta }: { title: string; body: string; cta?: { label: string; href: '/' | '/my' | '/log' | '/decide' } }) {
  return (
    <Card style={{ alignItems: 'flex-start', gap: 10, paddingVertical: 22 }}>
      <T variant="title3">{title}</T>
      <T variant="callout" color={C.sub}>
        {body}
      </T>
      {cta ? (
        <Button
          small
          variant="secondary"
          label={cta.label}
          onPress={() => router.navigate(cta.href)}
          style={{ marginTop: 4 }}
        />
      ) : null}
    </Card>
  );
}
