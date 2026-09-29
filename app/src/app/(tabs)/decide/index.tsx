import { useState } from 'react';
import { View } from 'react-native';

import { MissionDigest } from '@/components/mission';
import { FollowUpNotice, ReturnOutcome, ReturnPlan } from '@/components/outcome';
import { Screen } from '@/components/screen';
import { EmptyState, LeaningTag, ReservationSwitcher } from '@/components/shared';
import {
  Button,
  Card,
  CheckRow,
  ChoiceChip,
  DeviceTag,
  ErrorText,
  Eyebrow,
  Field,
  Icon,
  Input,
  KeyValue,
  Notice,
  RadioRow,
  Row,
  ScorePicker,
  Section,
  Segmented,
  StatusChip,
  T,
} from '@/components/ui';
import {
  DEALER_TERMS_TBD,
  DECISION_LABEL,
  DEVICE_LABEL,
  STATUS_FLOW,
  devicesToReturn,
  setDecision,
  type DecisionChoice,
  type DeviceKey,
  type Reservation,
  type Score,
} from '@/domain';
import { formatDateTime } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { apply, updateUi, useApp, useCurrent } from '@/lib/store';
import { C, DEVICE_COLOR } from '@/lib/theme';

const CHOICES: DecisionChoice[] = ['return_both', 'buy_used', 'buy_new', 'undecided'];
const CHOICE_SUB: Record<DecisionChoice, string> = {
  return_both: '두 대와 부속품을 모두 반납합니다',
  buy_used: '쓰던 두 대 중 한 대를 사고, 나머지 한 대만 반납합니다',
  buy_new: '고른 모델을 새 제품으로 사고, 체험한 두 대는 반납합니다',
  undecided: '두 대 모두 반납하고 나중에 결정합니다',
};

// 이유를 쓰기 어려운 사람을 위한 빠른 이유 — 눌러서 넣고 다시 누르면 뺀다 (직접 고쳐 써도 된다)
const QUICK_REASONS = [
  '가벼운 게 제일 중요했어요',
  '영상·웹서핑엔 Air로 충분했어요',
  'Pro 화면이 더 부드러웠어요',
  '무거운 작업엔 Pro가 필요해요',
  '둘 다 지금은 필요 없어요',
  '조금 더 생각해 볼래요',
];
const SEP = ' · ';

export default function DecideScreen() {
  const { app, current } = useCurrent();

  if (!current) {
    return (
      <Screen>
        <EmptyState
          eyebrow="Decide"
          title="체험 마지막 날 여기서 골라요"
          body="미션 답을 모아 보고 반납·구매를 고르는 화면이에요. 먼저 비교팩 탭에서 데모 일정을 요청해 주세요."
          cta={{ label: '데모 일정 요청하러 가기', href: '/' }}
        />
      </Screen>
    );
  }

  const idx = STATUS_FLOW.indexOf(current.status);
  const before = current.status !== 'cancelled' && idx < STATUS_FLOW.indexOf('in_trial');

  return (
    <Screen>
      <ReservationSwitcher list={app.demo.reservations} currentId={current.id} />
      {current.status === 'in_trial' ? (
        <DecisionForm key={current.id} r={current} dealerTermsConfirmed={app.demo.dealerTermsConfirmed} />
      ) : before ? (
        <Card style={{ gap: 12, paddingVertical: 22 }}>
          <Row gap={10}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.sunk, alignItems: 'center', justifyContent: 'center' }}>
              <Icon ios="lock.fill" web="lock" size={16} color={C.sub} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Eyebrow>Opens during trial</Eyebrow>
              <T variant="title3">체험 중에 열려요</T>
            </View>
          </Row>
          <Row gap={8}>
            <T variant="footnote">지금 상태</T>
            <StatusChip status={current.status} />
          </Row>
          <T variant="body" color={C.sub}>
            체험 마지막 날, 미션 답을 모아 보고 반납·구매를 골라요. 구매 선택지는 딜러 판매 조건이 확정된 경우에만 열려요.
          </T>
        </Card>
      ) : current.status === 'cancelled' ? (
        <Notice tone="info" title="취소된 요청이에요">
          취소된 요청에는 결정을 남기지 않아요.
        </Notice>
      ) : (
        <AfterReturn r={current} />
      )}
    </Screen>
  );
}

// ───────── 체험 중: 결정 ─────────

function DecisionForm({ r, dealerTermsConfirmed }: { r: Reservation; dealerTermsConfirmed: boolean }) {
  const saved = r.decision;
  const [choice, setChoice] = useState<DecisionChoice | null>(saved?.choice ?? null);
  const [model, setModel] = useState<DeviceKey | null>(saved?.model ?? null);
  const [confidence, setConfidence] = useState<Score | null>(saved?.confidenceAfter ?? null);
  const [reason, setReason] = useState(saved?.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isBuy = choice === 'buy_new' || choice === 'buy_used';
  const buyLocked = !dealerTermsConfirmed;
  const dirty =
    !saved ||
    saved.choice !== choice ||
    (saved.model ?? null) !== (isBuy ? model : null) ||
    saved.confidenceAfter !== confidence ||
    saved.reason !== reason.trim();

  const reasonParts = reason
    .split(SEP)
    .map((x) => x.trim())
    .filter(Boolean);
  const toggleReason = (q: string) => {
    setError(null);
    setReason(reasonParts.includes(q) ? reasonParts.filter((x) => x !== q).join(SEP) : [...reasonParts, q].join(SEP));
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    const res = await apply((s) =>
      !choice
        ? { ok: false, error: '결정을 하나 골라 주세요.' }
        : !confidence
          ? { ok: false, error: '체험 후 확신(1–5)을 골라 주세요.' }
          : setDecision(s, r.id, { choice, model: isBuy ? (model ?? undefined) : undefined, confidenceAfter: confidence, reason }),
    );
    setSaving(false);
    // 저장 실패면 r.decision 이 바뀌지 않아 버튼은 계속 '결정 저장'으로 남고 입력값도 유지된다
    if (!res.ok) {
      haptic.error();
      setError(res.error);
      return;
    }
    haptic.success();
  };

  return (
    <>
      <Section eyebrow="Your picks" title="미션 답 모아 보기" caption="어느 쪽이 나았는지 고른 답이에요">
        <Card>
          <MissionDigest r={r} />
        </Card>
      </Section>

      <Section eyebrow="Decide" title="결정" caption="마지막 날, 미션 답을 보고 골라요. 체험 중에는 다시 바꿀 수 있어요.">
        {buyLocked ? (
          <Notice tone="warn" title="구매 선택지는 아직 닫혀 있어요">
            {DEALER_TERMS_TBD}
          </Notice>
        ) : null}
        <View style={{ gap: 8 }}>
          {CHOICES.map((c) => {
            const locked = (c === 'buy_new' || c === 'buy_used') && buyLocked;
            return (
              <RadioRow
                key={c}
                selected={choice === c}
                disabled={locked}
                label={DECISION_LABEL[c]}
                sub={locked ? `${CHOICE_SUB[c]} · 딜러 조건 확정 후 열림` : CHOICE_SUB[c]}
                onPress={() => {
                  setChoice(c);
                  setError(null);
                }}
              />
            );
          })}
        </View>
        {isBuy ? (
          <Card style={{ gap: 10 }}>
            <Field label={choice === 'buy_used' ? '구매할 기기 (쓰던 두 대 중)' : '새로 살 모델'}>
              <Segmented<DeviceKey>
                accessibilityLabel="모델 선택"
                value={model}
                onChange={(v) => v && setModel(v)}
                options={[
                  { value: 'air', label: DEVICE_LABEL.air, color: C.air },
                  { value: 'pro', label: DEVICE_LABEL.pro, color: C.pro },
                ]}
              />
            </Field>
          </Card>
        ) : null}
      </Section>

      <Section eyebrow="Before → after" title="마음이 얼마나 정해졌나요?">
        <Card style={{ gap: 16 }}>
          <Row gap={10} style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <View style={{ gap: 4 }}>
              <T variant="caption">체험 전</T>
              <Row gap={6}>
                <LeaningTag leaning={r.request.leaningBefore} />
                <T variant="title3">{r.request.confidenceBefore}</T>
              </Row>
            </View>
            <Icon ios="arrow.right" web="arrow_forward" size={18} color={C.sub} style={{ marginTop: 29 }} />
            <View style={{ gap: 4 }}>
              <T variant="caption">체험 후</T>
              <Row gap={6}>
                {choice && (choice === 'buy_new' || choice === 'buy_used') && model ? <DeviceTag kind={model} /> : null}
                <T variant="title3" color={confidence ? C.ink : C.muted}>
                  {confidence ?? '—'}
                </T>
              </Row>
            </View>
            {confidence ? (
              <T variant="footnote" weight="700" color={C.coralInk} style={{ marginTop: 28 }}>
                {confidence - r.request.confidenceBefore === 0
                  ? '변화 없음'
                  : `${confidence - r.request.confidenceBefore > 0 ? '+' : ''}${confidence - r.request.confidenceBefore}`}
              </T>
            ) : null}
          </Row>
          <ScorePicker label="체험 후 확신 (1 전혀 모르겠음 · 5 확실함)" value={confidence} onChange={setConfidence} a11yPrefix="체험 후 " />
          <Field label="이유" required hint="한 줄이면 충분해요. 아래에서 골라 넣어도 되고, 아직 결정 못 했다면 그 이유도 좋아요.">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_REASONS.map((q) => (
                <ChoiceChip key={q} small role="checkbox" label={q} selected={reasonParts.includes(q)} onPress={() => toggleReason(q)} a11y={`빠른 이유: ${q}`} />
              ))}
            </View>
            <Input
              multiline
              value={reason}
              onChangeText={(v) => {
                setReason(v);
                setError(null);
              }}
              placeholder="예: 유튜브·과제 정도라 Air로 충분했어요"
              accessibilityLabel="결정 이유, 필수"
            />
          </Field>
        </Card>
      </Section>

      <Section eyebrow="Return plan" title="반납 계획" caption="지금 고른 결정 기준으로 계산했어요">
        <Card>
          {choice ? (
            <ReturnPlan decision={{ choice, model: isBuy ? (model ?? undefined) : undefined }} />
          ) : (
            <T variant="callout" color={C.sub}>
              결정을 고르면 반납할 기기가 여기에 표시돼요.
            </T>
          )}
        </Card>
      </Section>

      <View style={{ gap: 10 }}>
        <ErrorText message={error} />
        {saved && !dirty ? (
          <Notice tone="done" title="결정이 저장됐습니다">
            {`${formatDateTime(saved.decidedAt)} · 반납 접수 때 운영자가 이 결정을 기준으로 처리해요.`}
          </Notice>
        ) : null}
        <Button
          label={saving ? '저장 중…' : saved ? (dirty ? '바뀐 결정 저장' : '저장됨') : '결정 저장'}
          onPress={save}
          disabled={saving || (!!saved && !dirty)}
        />
      </View>

      <ReturnChecklist r={r} devices={devicesToReturn(saved)} />
    </>
  );
}

// ───────── 반납 준비 체크리스트 ─────────

const RETURN_ITEMS = [
  { key: 'backup', label: '내 데이터 백업' },
  { key: 'signout', label: '계정 로그아웃' },
  { key: 'findmy', label: '나의 찾기 해제' },
] as const;

function ReturnChecklist({ r, devices }: { r: Reservation; devices: DeviceKey[] }) {
  const { ui } = useApp();
  const checked = ui.returnChecklist[r.id] ?? [];
  const toggle = (key: string) =>
    updateUi((u) => {
      const cur = u.returnChecklist[r.id] ?? [];
      const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key];
      return { ...u, returnChecklist: { ...u.returnChecklist, [r.id]: next } };
    });
  return (
    <Section eyebrow="Before return" title="반납 준비" caption={r.decision ? '반납할 기기마다 확인해 주세요' : '결정을 저장하면 반납할 기기에 맞춰져요'}>
      {devices.map((k) => (
        <Card key={k} style={{ gap: 2, paddingVertical: 12, borderLeftWidth: 5, borderLeftColor: DEVICE_COLOR[k].main }}>
          <DeviceTag kind={k} full style={{ marginBottom: 4 }} />
          {RETURN_ITEMS.map((it) => {
            const key = `${k}:${it.key}`;
            return <CheckRow key={key} checked={checked.includes(key)} label={it.label} color={DEVICE_COLOR[k].main} onToggle={() => toggle(key)} />;
          })}
        </Card>
      ))}
      <Notice tone="info" title="체크는 기억용이에요">
        데이터 삭제(초기화)는 운영자가 검수 때 직접 확인해요. 여기서 체크해도 삭제된 것으로 처리되지는 않아요.
      </Notice>
    </Section>
  );
}

// ───────── 반납 이후 ─────────

function AfterReturn({ r }: { r: Reservation }) {
  const d = r.decision;
  return (
    <>
      <Section eyebrow="Return" title="반납·구매 결과">
        <Card>
          <ReturnOutcome r={r} />
        </Card>
      </Section>
      {d ? (
        <Section eyebrow="Decision" title="남긴 결정">
          <Card style={{ gap: 10 }}>
            <KeyValue k="결정" v={`${DECISION_LABEL[d.choice]}${d.model ? ` · ${DEVICE_LABEL[d.model]}` : ''}`} />
            <KeyValue k="확신">
              <Row gap={6}>
                <LeaningTag leaning={r.request.leaningBefore} />
                <T variant="callout">
                  {r.request.confidenceBefore} → {d.confidenceAfter}
                </T>
              </Row>
            </KeyValue>
            {d.reason ? <KeyValue k="이유" v={d.reason} /> : null}
            <KeyValue k="결정 시각" v={formatDateTime(d.decidedAt)} />
          </Card>
        </Section>
      ) : null}
      <Section eyebrow="Your picks" title="미션 답 모아 보기">
        <Card>
          <MissionDigest r={r} />
        </Card>
      </Section>
      <FollowUpNotice />
    </>
  );
}
