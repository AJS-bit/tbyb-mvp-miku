// 미션 · 바탕화면 코드 · 리워드 (미션 탭 · 내 체험 · 결정·반납 공용)
// 고객 화면에는 리워드 검토 표시(flag)와 운영자용 정답 코드를 절대 보여 주지 않는다 — 상태만.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  CORE_MISSIONS,
  DEVICE_LABEL,
  MISSIONS,
  MISSION_OPEN,
  PICK_LABEL,
  REWARD_AMOUNT_LABEL,
  REWARD_RULE,
  REWARD_STATUS_LABEL,
  missionProgress,
  missionSummary,
  setCodeCheck,
  submitReward,
  type DeviceKey,
  type Pick,
  type Reservation,
  type RewardStatus,
} from '@/domain';
import { formatShortDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply } from '@/lib/store';
import { C, DEVICE_COLOR, MONO_FAMILY, PICK_COLOR, SOFT_SHADOW } from '@/lib/theme';

import { GiftEnvelope, MissionIcon, ProgressRing } from './illustrations';
import { Button, Card, ErrorText, Eyebrow, Icon, Input, Notice, Pill, Row, T } from './ui';

export const PICKS: Pick[] = ['air', 'same', 'pro', 'unsure'];

/** 미션 답을 쓰거나 고칠 수 있나 — 체험 중~검수 중, 리워드 신청 전 */
export function missionsEditable(r: Reservation): boolean {
  return MISSION_OPEN.includes(r.status) && r.reward.status === 'none';
}

export function missionHref(id: string) {
  return { pathname: '/mission/[id]' as const, params: { id } };
}

// ───────── 답 표시 ─────────

export function PickMark({ pick, size = 22, inverted }: { pick: Pick; size?: number; inverted?: boolean }) {
  const t = PICK_COLOR[pick];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: inverted ? '#FFFFFF' : t.main,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <T variant="caption" weight="800" color={inverted ? t.ink : '#FFFFFF'} style={{ fontSize: size * 0.52, lineHeight: size * 0.7 }}>
        {t.mark}
      </T>
    </View>
  );
}

export function PickChip({ pick }: { pick: Pick }) {
  const t = PICK_COLOR[pick];
  return (
    <View style={[styles.pickChip, { backgroundColor: t.soft }]}>
      <PickMark pick={pick} size={16} />
      <T variant="footnote" weight="700" color={t.ink}>
        {PICK_LABEL[pick]}
      </T>
    </View>
  );
}

const REWARD_TONE: Record<RewardStatus, { bg: string; fg: string }> = {
  none: { bg: C.greySoft, fg: C.sub },
  submitted: { bg: C.coralSoft, fg: C.coralInk },
  approved: { bg: C.doneSoft, fg: C.doneText },
  rejected: { bg: C.greySoft, fg: C.grey },
};

export function RewardStatusPill({ status }: { status: RewardStatus }) {
  const t = REWARD_TONE[status];
  return <Pill label={REWARD_STATUS_LABEL[status]} bg={t.bg} fg={t.fg} />;
}

// ───────── 리워드 카드 ─────────

export function RewardCard({ r }: { r: Reservation }) {
  const p = missionProgress(r);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = r.reward.status;
  const open = MISSION_OPEN.includes(r.status);
  const missionsDone = p.done === p.total;
  const codeDone = !!r.codeCheck;
  const ready = open && status === 'none' && missionsDone && codeDone;

  const submit = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    const res = await apply((s) => submitReward(s, r.id));
    setSaving(false);
    if (!res.ok) {
      // 저장 실패 포함 — 상태는 그대로, 다시 누를 수 있다
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
  };

  return (
    <View style={styles.reward}>
      <GiftEnvelope size={58} style={styles.rewardArt} />
      <Row gap={16} style={{ alignItems: 'center' }}>
        <ProgressRing done={p.done} total={p.total} complete={missionsDone} />
        <View style={{ flex: 1, gap: 3, paddingRight: 44 }}>
          <Eyebrow color={C.coralInk}>Mission reward</Eyebrow>
          <T variant="title3">미션 리워드</T>
          <T variant="headline" color={C.coralInk}>
            {REWARD_AMOUNT_LABEL}
          </T>
        </View>
      </Row>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <T variant="footnote" weight="600">
          지금 상태
        </T>
        <RewardStatusPill status={status} />
      </Row>

      {status === 'none' ? (
        <>
          <View style={styles.reqBox}>
            <Requirement done={missionsDone} label={`핵심 미션 ${p.total}개`} detail={`${p.done}/${p.total}`} />
            <Requirement done={codeDone} label="바탕화면 코드 두 개" detail={codeDone ? '적음' : '아직'} />
          </View>
          <T variant="footnote">{REWARD_RULE}</T>
          <ErrorText message={error} />
          {open ? (
            <>
              <Button
                variant="coral"
                icon={['gift', 'redeem']}
                label={saving ? '신청 중…' : '리워드 신청'}
                onPress={submit}
                disabled={!ready || saving}
                accessibilityHint={ready ? '신청하면 미션 답과 코드를 더 바꿀 수 없어요' : '핵심 미션과 바탕화면 코드를 먼저 채워 주세요'}
              />
              <T variant="caption" style={{ textAlign: 'center' }}>
                {ready
                  ? '신청하면 미션 답과 코드는 그대로 잠겨요.'
                  : !missionsDone
                    ? `미션 ${p.total - p.done}개만 더 하면 신청할 수 있어요.`
                    : '바탕화면 코드를 적으면 신청할 수 있어요.'}
              </T>
            </>
          ) : (
            <Notice tone="info">리워드 신청은 검수가 끝나기 전까지만 할 수 있어요.</Notice>
          )}
        </>
      ) : status === 'submitted' ? (
        <Notice tone="coral" title="신청했어요. 고마워요!">
          {`${formatShortDateTime(r.reward.submittedAt)} 신청 · 반납 검수가 끝나면 운영자가 확인해요. 데모에서는 실제 지급이 없어요.`}
        </Notice>
      ) : status === 'approved' ? (
        // 승인 메모는 운영자 전용이라 보여 주지 않는다
        <Notice tone="done" title="확인이 끝났어요">
          지급 예정으로 확인됐어요. 데모에서는 실제 지급이 없어요.
        </Notice>
      ) : (
        <Notice tone="info" title="이번에는 지급하지 않아요">
          {r.reward.reviewNote ? `거절 사유: ${r.reward.reviewNote}` : '운영자가 확인한 결과 이번 체험에는 지급하지 않기로 했어요.'}
        </Notice>
      )}
    </View>
  );
}

function Requirement({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <Row gap={10}>
      <View style={[styles.reqDot, done && { backgroundColor: C.coral, borderColor: C.coral }]}>
        {done ? <Icon ios="checkmark" web="check" size={11} color="#FFFFFF" /> : null}
      </View>
      <T variant="callout" weight={done ? '700' : '500'} style={{ flex: 1 }}>
        {label}
      </T>
      <T variant="footnote" weight="700" color={done ? C.coralInk : C.muted}>
        {detail}
      </T>
    </Row>
  );
}

// ───────── 바탕화면 코드 ─────────

export function CodeCard({ r }: { r: Reservation }) {
  const saved = r.codeCheck;
  const [air, setAir] = useState(saved?.air ?? '');
  const [pro, setPro] = useState(saved?.pro ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = missionsEditable(r);
  const norm = (x: string) => x.trim().toUpperCase().replace(/\s+/g, '');
  const dirty = !saved || saved.air !== norm(air) || saved.pro !== norm(pro);

  const save = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    const res = await apply((s) => setCodeCheck(s, r.id, air, pro));
    setSaving(false);
    if (!res.ok) {
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
  };

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ gap: 3 }}>
        <Eyebrow>Wallpaper code</Eyebrow>
        <T variant="title3">바탕화면 코드</T>
        <T variant="callout" color={C.sub}>
          픽업할 때 두 맥 바탕화면에 적힌 4자리 코드를 적어 주세요. 운영자가 리워드를 확인할 때 참고해요.
        </T>
      </View>
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        {(['air', 'pro'] as DeviceKey[]).map((k) => (
          <View key={k} style={[styles.codeCol, { backgroundColor: DEVICE_COLOR[k].soft }]}>
            <Row gap={6}>
              <View style={[styles.codeDot, { backgroundColor: DEVICE_COLOR[k].main }]} />
              <T variant="footnote" weight="700" color={C.ink}>
                {DEVICE_COLOR[k].short} 바탕화면
              </T>
            </Row>
            <Input
              value={k === 'air' ? air : pro}
              onChangeText={(v) => {
                setError(null);
                if (k === 'air') setAir(v);
                else setPro(v);
              }}
              editable={editable}
              placeholder="····"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              accessibilityLabel={`${DEVICE_LABEL[k]} 바탕화면 코드`}
              style={styles.codeInput}
            />
          </View>
        ))}
      </Row>
      <ErrorText message={error} />
      {editable ? (
        <Button
          variant={saved && !dirty ? 'secondary' : 'primary'}
          small
          label={saving ? '저장 중…' : saved && !dirty ? '적어 두었어요' : saved ? '바뀐 코드 저장' : '코드 저장'}
          icon={saved && !dirty ? ['checkmark', 'check'] : undefined}
          onPress={save}
          disabled={saving || (!!saved && !dirty)}
        />
      ) : saved ? (
        <T variant="footnote">리워드를 신청해서 적은 코드가 그대로 잠겼어요.</T>
      ) : null}
      <T variant="caption">코드가 잘 안 보이면 맥을 켜고 바탕화면을 확인해 보세요. 헷갈리는 글자(0·O·1·I)는 쓰지 않아요.</T>
    </Card>
  );
}

// ───────── 미션 목록 ─────────

export function MissionList({ r, preview }: { r: Reservation; preview?: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      {MISSIONS.map((m, i) => {
        const a = r.missions[m.id];
        const optional = !CORE_MISSIONS.includes(m.id);
        return (
          <Pressable
            key={m.id}
            disabled={preview}
            accessibilityRole={preview ? undefined : 'button'}
            accessibilityLabel={`미션 ${i + 1}. ${m.title}${optional ? ', 선택 미션' : ''}. ${a ? `내 답: ${PICK_LABEL[a.pick]}` : '아직 안 함'}`}
            accessibilityHint={preview ? undefined : '미션 자세히 보기'}
            onPress={() => {
              haptic.select();
              router.push(missionHref(m.id));
            }}
            style={({ pressed }) => [styles.mCard, a && styles.mCardDone, preview && { opacity: 0.85 }, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}>
            <MissionIcon id={m.id} size={60} />
            <View style={{ flex: 1, gap: 3 }}>
              <Row gap={6}>
                <Eyebrow>{`Mission 0${i + 1}`}</Eyebrow>
                {optional ? <Pill label="선택" style={{ paddingVertical: 1, paddingHorizontal: 7 }} /> : null}
              </Row>
              <T variant="headline">{m.title}</T>
              {!preview ? (
                <T variant="footnote" numberOfLines={2}>
                  {m.how}
                </T>
              ) : null}
              {a ? (
                <Row gap={6} style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  <PickChip pick={a.pick} />
                  {a.followUp ? (
                    <T variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {a.followUp}
                    </T>
                  ) : null}
                </Row>
              ) : null}
            </View>
            {!preview ? (
              a ? (
                <View style={styles.doneBadge}>
                  <Icon ios="checkmark" web="check" size={13} color={C.ivory} />
                </View>
              ) : (
                <Icon ios="chevron.right" web="chevron_right" size={14} color={C.muted} />
              )
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ───────── 내 체험: 미션 진행 요약 ─────────

export function MissionProgressCard({ r }: { r: Reservation }) {
  const p = missionProgress(r);
  return (
    <Card style={{ gap: 14 }}>
      <Row gap={14}>
        <ProgressRing done={p.done} total={p.total} size={66} stroke={7} complete={p.done === p.total} />
        <View style={{ flex: 1, gap: 4 }}>
          <Eyebrow color={C.coralInk}>Missions</Eyebrow>
          <T variant="headline">
            {p.done === p.total ? '핵심 미션을 모두 했어요' : p.done === 0 ? '쉬운 미션부터 시작해 볼까요?' : `핵심 미션 ${p.done}개 했어요`}
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            <T variant="caption">리워드</T>
            <RewardStatusPill status={r.reward.status} />
          </Row>
        </View>
      </Row>
      <View style={{ gap: 2 }}>
        <T variant="footnote">{`핵심 미션 ${p.total}개와 바탕화면 코드를 채우면 리워드를 신청할 수 있어요.`}</T>
        <T variant="footnote" weight="700" color={C.coralInk}>
          {REWARD_AMOUNT_LABEL}
        </T>
      </View>
      <Button small label="미션 하러 가기" icon={['checklist', 'checklist']} onPress={() => router.navigate('/missions')} />
    </Card>
  );
}

// ───────── 결정·반납: 미션 답 모아 보기 ─────────

export function MissionDigest({ r }: { r: Reservation }) {
  const sum = missionSummary(r);
  const total = PICKS.reduce((n, k) => n + sum[k], 0);
  if (!total) {
    return (
      <View style={{ gap: 10 }}>
        <T variant="callout" color={C.sub}>
          아직 미션 답이 없어요. 미션 탭에서 쉬운 것부터 해 보면 여기에 모여요.
        </T>
        {MISSION_OPEN.includes(r.status) ? (
          <Button small variant="secondary" label="미션 하러 가기" onPress={() => router.navigate('/missions')} />
        ) : null}
      </View>
    );
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.bar} accessible accessibilityLabel={PICKS.map((k) => `${PICK_LABEL[k]} ${sum[k]}개`).join(', ')}>
        {PICKS.filter((k) => sum[k] > 0).map((k) => (
          <View key={k} style={{ flex: sum[k], backgroundColor: PICK_COLOR[k].main }} />
        ))}
      </View>
      <View style={styles.legend}>
        {PICKS.map((k) => (
          <View key={k} style={[styles.legendItem, { backgroundColor: PICK_COLOR[k].soft }]}>
            <PickMark pick={k} size={18} />
            <T variant="footnote" weight="700" color={PICK_COLOR[k].ink} style={{ flex: 1 }} numberOfLines={1}>
              {PICK_LABEL[k]}
            </T>
            <T variant="headline" color={C.ink} style={{ fontVariant: ['tabular-nums'] }}>
              {sum[k]}
            </T>
          </View>
        ))}
      </View>
      <View style={{ gap: 0 }}>
        {MISSIONS.map((m, i) => {
          const a = r.missions[m.id];
          return (
            <View key={m.id} style={[styles.digestRow, i > 0 && styles.digestLine]}>
              <MissionIcon id={m.id} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="callout" weight="600">
                  {m.title}
                </T>
                {a?.followUp ? <T variant="caption">{a.followUp}</T> : null}
              </View>
              {a ? <PickChip pick={a.pick} /> : <T variant="caption" color={C.muted}>아직</T>}
            </View>
          );
        })}
      </View>
      <T variant="caption">{`미션 답 ${total}개 기준 · 비슷함·모르겠음도 그대로 셌어요`}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  pickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 999,
  },
  reward: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#FFD5C8',
    padding: 18,
    gap: 14,
    overflow: 'hidden',
    ...SOFT_SHADOW,
  },
  rewardArt: { position: 'absolute', top: 12, right: 12 },
  reqBox: { backgroundColor: '#FFF8F4', borderRadius: 14, padding: 12, gap: 10 },
  reqDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E9C9BD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCol: { flex: 1, borderRadius: 16, padding: 12, gap: 8 },
  codeDot: { width: 8, height: 8, borderRadius: 4 },
  codeInput: {
    fontFamily: MONO_FAMILY,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 10,
    borderColor: 'transparent',
  },
  mCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: 14,
    ...SOFT_SHADOW,
  },
  mCardDone: { borderColor: C.lineStrong },
  doneBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2, backgroundColor: C.sunk },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  digestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  digestLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
