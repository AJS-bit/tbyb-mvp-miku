import { useState } from 'react';
import { View } from 'react-native';

import { FollowUpNotice, ReturnOutcome, ReturnPlan } from '@/components/outcome';
import { EmptyState, LeaningTag, ReservationSwitcher, SummaryBars } from '@/components/shared';
import {
  Button,
  Card,
  CheckRow,
  DeviceTag,
  ErrorText,
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
import { Screen } from '@/components/screen';
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

export default function DecideScreen() {
  const { app, current } = useCurrent();

  if (!current) {
    return (
      <Screen>
        <EmptyState
          title="체험 마지막 날 여기서 결정합니다"
          body="체험 중 남긴 기록을 나란히 보고 반납·구매를 고르는 화면입니다. 먼저 데모 일정을 요청하세요."
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
        <Card style={{ gap: 12, paddingVertical: 20 }}>
          <Row gap={8}>
            <Icon ios="lock" web="lock" size={18} color={C.sub} />
            <T variant="title3">체험 중에 열립니다</T>
          </Row>
          <Row gap={8}>
            <T variant="footnote">지금 상태</T>
            <StatusChip status={current.status} />
          </Row>
          <T variant="callout" color={C.sub}>
            체험 마지막 날, 비교 기록을 나란히 보고 반납·구매를 고릅니다. 구매 선택지는 딜러 판매 조건이 확정된 경우에만 열립니다.
          </T>
        </Card>
      ) : current.status === 'cancelled' ? (
        <Notice tone="info" title="취소된 요청입니다">취소된 요청에는 결정을 남기지 않습니다.</Notice>
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
      <Section title="기록 나란히 보기" caption={`비교 기록 ${r.logs.length}건`}>
        <Card>
          <SummaryBars logs={r.logs} />
        </Card>
      </Section>

      <Section title="결정" caption="마지막 날, 기록을 보고 고르세요. 체험 중에는 다시 바꿀 수 있습니다.">
        {buyLocked ? (
          <Notice tone="warn" title="구매 선택지는 아직 닫혀 있습니다">
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

      <Section title="확신 변화">
        <Card style={{ gap: 14 }}>
          <Row gap={10} style={{ flexWrap: 'wrap' }}>
            <View style={{ gap: 4 }}>
              <T variant="caption">체험 전</T>
              <Row gap={6}>
                <LeaningTag leaning={r.request.leaningBefore} />
                <T variant="title3">{r.request.confidenceBefore}</T>
              </Row>
            </View>
            <Icon ios="arrow.right" web="arrow_forward" size={18} color={C.sub} style={{ marginTop: 16 }} />
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
              <T variant="footnote" style={{ marginTop: 18 }}>
                {confidence - r.request.confidenceBefore === 0
                  ? '변화 없음'
                  : `${confidence - r.request.confidenceBefore > 0 ? '+' : ''}${confidence - r.request.confidenceBefore}`}
              </T>
            ) : null}
          </Row>
          <ScorePicker label="체험 후 확신 (1 전혀 모르겠음 · 5 확실함)" value={confidence} onChange={setConfidence} a11yPrefix="체험 후 " />
          <Field label="이유" required hint="한 줄이면 충분합니다. 아직 결정 못 했다면 그 이유도 좋아요.">
            <Input
              multiline
              value={reason}
              onChangeText={setReason}
              placeholder="예: 같은 4K 내보내기에서 Pro가 빨랐고, 긴 렌더링에도 속도가 유지됐다"
              accessibilityLabel="결정 이유, 필수"
            />
          </Field>
        </Card>
      </Section>

      <Section title="반납 계획" caption="지금 고른 결정 기준으로 계산했습니다">
        <Card>
          {choice ? (
            <ReturnPlan decision={{ choice, model: isBuy ? (model ?? undefined) : undefined }} />
          ) : (
            <T variant="callout" color={C.sub}>
              결정을 고르면 반납할 기기가 여기에 표시됩니다.
            </T>
          )}
        </Card>
      </Section>

      <View style={{ gap: 10 }}>
        <ErrorText message={error} />
        {saved && !dirty ? (
          <Notice tone="done" title="결정이 저장됐습니다">
            {`${formatDateTime(saved.decidedAt)} · 반납 접수 때 운영자가 이 결정을 기준으로 처리합니다.`}
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
    <Section title="반납 준비" caption={r.decision ? '반납할 기기마다 확인하세요' : '결정을 저장하면 반납할 기기에 맞춰집니다'}>
      {devices.map((k) => (
        <Card key={k} style={{ gap: 2, paddingVertical: 12, borderLeftWidth: 4, borderLeftColor: DEVICE_COLOR[k].main }}>
          <DeviceTag kind={k} full style={{ marginBottom: 4 }} />
          {RETURN_ITEMS.map((it) => {
            const key = `${k}:${it.key}`;
            return (
              <CheckRow
                key={key}
                checked={checked.includes(key)}
                label={it.label}
                color={DEVICE_COLOR[k].main}
                onToggle={() => toggle(key)}
              />
            );
          })}
        </Card>
      ))}
      <Notice tone="info" title="체크는 기억용입니다">
        데이터 삭제(초기화)는 운영자가 검수 때 직접 확인합니다. 여기서 체크한다고 삭제가 증명되지는 않습니다.
      </Notice>
    </Section>
  );
}

// ───────── 반납 이후 ─────────

function AfterReturn({ r }: { r: Reservation }) {
  const d = r.decision;
  return (
    <>
      <Section title="반납·구매 결과">
        <Card>
          <ReturnOutcome r={r} />
        </Card>
      </Section>
      {d ? (
        <Section title="남긴 결정">
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
      <Section title="기록 나란히 보기">
        <Card>
          <SummaryBars logs={r.logs} />
        </Card>
      </Section>
      <FollowUpNotice />
    </>
  );
}
