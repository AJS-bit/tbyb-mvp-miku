// 미션 한 개: 큰 선택 버튼 4개 + 후속 칩 + (미션별) 선택 입력. 시트(iOS 페이지 시트)로 뜬다.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MissionIcon } from '@/components/illustrations';
import { PICKS, PickMark, missionsEditable } from '@/components/mission';
import { StorageBanner } from '@/components/storage-banner';
import { Button, ChoiceChip, ErrorText, Eyebrow, Field, Icon, Input, Notice, Row, T } from '@/components/ui';
import {
  CORE_MISSIONS,
  DAILY_OPTIONS,
  MISSIONS,
  MISSION_OPEN,
  PICK_LABEL,
  answerMission,
  type DeviceKey,
  type MissionAnswer,
  type MissionDef,
  type Pick,
  type Reservation,
} from '@/domain';
import { formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply, useCurrent } from '@/lib/store';
import { MAX_WIDTH } from '@/lib/theme';
import { themed, useTheme } from '@/lib/theme-context';

// 웹 정적 내보내기: 미션 6개 페이지를 미리 만든다 (mission/carry.html …)
export async function generateStaticParams(): Promise<Record<string, string>[]> {
  return MISSIONS.map((m) => ({ id: m.id }));
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/missions');
}

export default function MissionSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { app, current } = useCurrent();
  const t = useTheme();
  const styles = useStyles();
  const index = MISSIONS.findIndex((m) => m.id === id);
  const def = MISSIONS[index];

  return (
    <View style={styles.sheet}>
      <ScrollView
        style={{ flex: 1 }}
        indicatorStyle={t.scheme === 'dark' ? 'white' : 'black'}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.inner}>
          {Platform.OS === 'ios' ? <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no" /> : null}
          <Row style={{ justifyContent: 'flex-end', marginTop: Platform.OS === 'ios' ? -18 : 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={10}
              onPress={close}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
              <Icon ios="xmark" web="close" size={14} color={t.c.ink} />
            </Pressable>
          </Row>
          {!app.ready ? null : !def ? (
            <Notice tone="info" title="없는 미션이에요">
              미션 탭에서 다시 골라 주세요.
            </Notice>
          ) : (
            <>
              <StorageBanner />
              <Header def={def} index={index} />
              {current ? (
                <MissionForm key={`${current.id}-${def.id}-${current.missions[def.id]?.answeredAt ?? ''}`} r={current} def={def} />
              ) : (
                <Notice tone="info" title="아직 체험 전이에요">
                  비교팩 탭에서 데모 일정을 요청하고 픽업하면 이 미션을 할 수 있어요.
                </Notice>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Header({ def, index }: { def: MissionDef; index: number }) {
  const { c } = useTheme();
  const styles = useStyles();
  const optional = !CORE_MISSIONS.includes(def.id);
  return (
    <View style={{ gap: 14 }}>
      <Row gap={14}>
        <MissionIcon id={def.id} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow color={optional ? c.sub : c.coralInk}>{`Mission 0${index + 1} · ${optional ? 'optional' : 'core'}`}</Eyebrow>
          <T variant="title" accessibilityRole="header">
            {def.title}
          </T>
        </View>
      </Row>
      <View style={styles.how}>
        <T variant="footnote" weight="700" color={c.sub}>
          이렇게 해 보세요
        </T>
        <T variant="body">{def.how}</T>
      </View>
    </View>
  );
}

type Pct = { before: string; after: string };
const toStr = (n: number | undefined) => (n === undefined ? '' : String(n));

function MissionForm({ r, def }: { r: Reservation; def: MissionDef }) {
  const t = useTheme();
  const styles = useStyles();
  const saved = r.missions[def.id];
  const editable = missionsEditable(r);
  const [pick, setPick] = useState<Pick | null>(saved?.pick ?? null);
  const [followUp, setFollowUp] = useState<string | null>(saved?.followUp ?? null);
  const [battery, setBattery] = useState<Record<DeviceKey, Pct>>({
    air: { before: toStr(saved?.battery?.air.before), after: toStr(saved?.battery?.air.after) },
    pro: { before: toStr(saved?.battery?.pro.before), after: toStr(saved?.battery?.pro.after) },
  });
  const [minutes, setMinutes] = useState<Record<DeviceKey, string>>({
    air: toStr(saved?.minutes?.air),
    pro: toStr(saved?.minutes?.pro),
  });
  const [daily, setDaily] = useState<string | null>(saved?.daily ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const touch = () => setError(null);

  // 입력값 → 도메인에 넘길 답. 숫자 형식만 여기서 보고, 범위·필수 여부는 domain.answerMission 이 판단한다.
  const build = (): Omit<MissionAnswer, 'answeredAt'> | string => {
    if (!pick) return '어느 쪽이었는지 골라 주세요. 모르겠으면 "잘 모르겠어요"도 괜찮아요.';
    const a: Omit<MissionAnswer, 'answeredAt'> = { id: def.id, pick };
    if (followUp) a.followUp = followUp;
    const num = (x: string) => (x.trim() === '' ? null : Number(x.trim().replace(',', '.')));
    if (def.input === 'battery') {
      const vals = [battery.air.before, battery.air.after, battery.pro.before, battery.pro.after];
      const filled = vals.filter((v) => v.trim() !== '').length;
      if (filled > 0 && filled < 4) return '배터리는 두 맥의 시작과 끝을 모두 적어 주세요. 적지 않으려면 네 칸을 모두 비워 두면 돼요.';
      if (filled === 4) {
        const n = vals.map(num);
        if (n.some((x) => x === null || !Number.isFinite(x))) return '배터리는 숫자(%)로 적어 주세요.';
        a.battery = { air: { before: n[0]!, after: n[1]! }, pro: { before: n[2]!, after: n[3]! } };
      }
    }
    if (def.input === 'minutes') {
      const m = { air: num(minutes.air), pro: num(minutes.pro) };
      if (m.air === null || m.pro === null) return '두 맥에서 걸린 시간을 분으로 적어 주세요.';
      if (!Number.isFinite(m.air) || !Number.isFinite(m.pro)) return '걸린 시간은 숫자(분)로 적어 주세요.';
      a.minutes = { air: m.air, pro: m.pro };
    }
    if (def.input === 'daily' && daily) a.daily = daily;
    return a;
  };

  // 저장된 답과 같은지 — 같으면 '닫기'만 보여 준다
  const draft = build();
  const dirty =
    !saved ||
    typeof draft === 'string' ||
    draft.pick !== saved.pick ||
    (draft.followUp ?? null) !== (saved.followUp ?? null) ||
    (draft.daily ?? null) !== (saved.daily ?? null) ||
    JSON.stringify(draft.battery ?? null) !== JSON.stringify(saved.battery ?? null) ||
    JSON.stringify(draft.minutes ?? null) !== JSON.stringify(saved.minutes ?? null);

  const save = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    const answer = build();
    const res = await apply((s) => (typeof answer === 'string' ? { ok: false, error: answer } : answerMission(s, r.id, answer)));
    setSaving(false);
    if (!res.ok) {
      // 저장 실패 포함 — 고른 답과 입력값은 그대로 두고 다시 누를 수 있다
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
    close();
  };

  const open = MISSION_OPEN.includes(r.status);
  const lockedReason = !open
    ? r.status === 'completed'
      ? '체험이 끝나 미션이 닫혔어요.'
      : r.status === 'cancelled'
        ? '취소된 요청이에요.'
        : '미션은 픽업한 날부터 답할 수 있어요. 어떤 미션인지 먼저 둘러보세요.'
    : r.reward.status !== 'none'
      ? '리워드를 신청한 뒤라 답을 더 바꿀 수 없어요.'
      : null;

  return (
    <View style={{ gap: 26 }}>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <T variant="title3">{def.question}</T>
          <T variant="callout" color={t.c.sub}>
            비슷했거나 잘 모르겠다면, 그것도 좋은 답이에요.
          </T>
        </View>
        <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={def.question}>
          {PICKS.map((k) => (
            <PickButton
              key={k}
              pick={k}
              selected={pick === k}
              disabled={!editable}
              onPress={() => {
                touch();
                setPick(k);
              }}
            />
          ))}
        </View>
      </View>

      <Field label="하나 더 고른다면" optional hint="딱 맞는 게 없으면 건너뛰어도 돼요. 다시 누르면 선택이 풀려요.">
        <View style={styles.chips}>
          {def.followUps.map((f) => (
            <ChoiceChip
              key={f}
              label={f}
              selected={followUp === f}
              disabled={!editable}
              onPress={() => {
                touch();
                setFollowUp(followUp === f ? null : f);
              }}
            />
          ))}
        </View>
      </Field>

      {def.input === 'battery' ? (
        <View style={styles.optBox}>
          <Field label="배터리 % 적기" optional hint="영상을 틀기 전과 끝낸 뒤, 두 맥의 배터리 %를 적어 주세요.">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['air', 'pro'] as DeviceKey[]).map((k) => (
                <View key={k} style={[styles.devCol, { backgroundColor: t.device[k].soft }]}>
                  <DevLabel kind={k} />
                  <NumberInput
                    label="시작 %"
                    a11y={`${t.device[k].short} 시작 배터리 %`}
                    value={battery[k].before}
                    editable={editable}
                    onChange={(v) => {
                      touch();
                      setBattery((b) => ({ ...b, [k]: { ...b[k], before: v } }));
                    }}
                  />
                  <NumberInput
                    label="끝 %"
                    a11y={`${t.device[k].short} 끝 배터리 %`}
                    value={battery[k].after}
                    editable={editable}
                    onChange={(v) => {
                      touch();
                      setBattery((b) => ({ ...b, [k]: { ...b[k], after: v } }));
                    }}
                  />
                </View>
              ))}
            </View>
          </Field>
        </View>
      ) : null}

      {def.input === 'daily' ? (
        <Field label="무엇을 해 봤나요?" required hint="맥으로 해 본 일을 하나 골라 주세요.">
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="무엇을 해 봤나요">
            {DAILY_OPTIONS.map((o) => (
              <ChoiceChip
                key={o}
                label={o}
                selected={daily === o}
                disabled={!editable}
                onPress={() => {
                  touch();
                  setDaily(o);
                }}
              />
            ))}
          </View>
        </Field>
      ) : null}

      {def.input === 'minutes' ? (
        <Field label="같은 작업, 몇 분 걸렸나요?" required hint="두 맥에서 같은 사진·영상 작업을 했을 때 걸린 시간을 분으로 적어 주세요. 대충이어도 괜찮아요.">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(['air', 'pro'] as DeviceKey[]).map((k) => (
              <View key={k} style={[styles.devCol, { backgroundColor: t.device[k].soft }]}>
                <DevLabel kind={k} />
                <NumberInput
                  label="분"
                  a11y={`${t.device[k].short} 걸린 시간(분)`}
                  value={minutes[k]}
                  editable={editable}
                  decimal
                  onChange={(v) => {
                    touch();
                    setMinutes((m) => ({ ...m, [k]: v }));
                  }}
                />
              </View>
            ))}
          </View>
        </Field>
      ) : null}

      <View style={{ gap: 10 }}>
        {lockedReason ? <Notice tone="info">{lockedReason}</Notice> : null}
        <ErrorText message={error} />
        {editable ? (
          <>
            {saved && !dirty ? (
              <Button variant="secondary" label="닫기" onPress={close} />
            ) : (
              <Button label={saving ? '저장 중…' : saved ? '바꾼 답 저장' : '답 저장'} icon={['checkmark', 'check']} onPress={save} disabled={saving} />
            )}
            <T variant="caption" style={{ textAlign: 'center' }}>
              {saved ? `${formatShortDateTime(saved.answeredAt)}에 답했어요 · ` : ''}리워드를 신청하기 전까지 언제든 바꿀 수 있어요.
            </T>
          </>
        ) : (
          <Button variant="secondary" label="닫기" onPress={close} />
        )}
      </View>
    </View>
  );
}

function PickButton({ pick, selected, disabled, onPress }: { pick: Pick; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  const t = theme.pick[pick];
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      aria-selected={selected}
      aria-disabled={!!disabled}
      accessibilityLabel={PICK_LABEL[pick]}
      disabled={disabled}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pick,
        selected && { backgroundColor: t.soft, borderColor: t.main, borderWidth: 2 },
        disabled && !selected && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <PickMark pick={pick} size={30} />
        {selected ? (
          <View style={[styles.pickCheck, { backgroundColor: t.main }]}>
            <Icon ios="checkmark" web="check" size={12} color={theme.c.onMark} />
          </View>
        ) : null}
      </Row>
      <T variant="headline" weight="800" color={selected ? t.ink : theme.c.ink}>
        {PICK_LABEL[pick]}
      </T>
    </Pressable>
  );
}

function DevLabel({ kind }: { kind: DeviceKey }) {
  const d = useTheme().device[kind];
  return (
    <Row gap={6}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.main }} />
      <T variant="footnote" weight="800" color={d.ink}>
        {d.short}
      </T>
    </Row>
  );
}

function NumberInput({
  label,
  a11y,
  value,
  onChange,
  editable,
  decimal,
}: {
  label: string;
  a11y: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  decimal?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <T variant="caption" weight="600">
        {label}
      </T>
      <Input
        value={value}
        onChangeText={onChange}
        editable={editable}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputMode={decimal ? 'decimal' : 'numeric'}
        placeholder="—"
        maxLength={5}
        accessibilityLabel={a11y}
        style={{ paddingVertical: 10, borderColor: 'transparent', fontWeight: '700', fontSize: 18 }} // 연한 기기 색 칸 위 — 테두리 없음
      />
    </View>
  );
}

const useStyles = themed(({ c }) =>
  StyleSheet.create({
    sheet: { flex: 1, backgroundColor: c.bg },
    handle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: c.lineStrong, marginTop: -4 },
    content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48 },
    inner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: 22 },
    close: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.sunk, alignItems: 'center', justifyContent: 'center' },
    how: { backgroundColor: c.surface, borderRadius: 18, padding: 16, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    pick: {
      flexBasis: '46%',
      flexGrow: 1,
      minHeight: 104,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: c.line,
      backgroundColor: c.surface,
      padding: 14,
      justifyContent: 'space-between',
      gap: 10,
    },
    pickCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optBox: { backgroundColor: c.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.line, borderStyle: 'dashed' },
    devCol: { flex: 1, borderRadius: 16, padding: 12, gap: 10 },
  }),
);
