// 반납·구매 결과 (내 체험 · 결정·반납 공용) — 구매 의향을 완료된 구매처럼 보이지 않게 한다
import { View } from 'react-native';

import {
  DECISION_LABEL,
  DEVICE_LABEL,
  devicesToReturn,
  isInspectionDone,
  requiredInspections,
  saleDevice,
  type Decision,
  type DeviceKey,
  type Reservation,
} from '@/domain';
import { themed, useTheme } from '@/lib/theme-context';

import { DeviceTag, Notice, Pill, Row, T } from './ui';

export const SALE_PENDING_COPY = '고른 기기는 딜러가 판매를 확인하면 구매가 확정돼요. 판매가 이뤄지지 않으면 그 기기도 반납하면 돼요.';

/** 결정 초안/저장본으로 계산한 반납 계획 (체험 중 미리보기) */
export function ReturnPlan({ decision }: { decision: Pick<Decision, 'choice' | 'model'> | undefined }) {
  const { c } = useTheme();
  const d = decision as Decision | undefined;
  const back = devicesToReturn(d);
  const buy = saleDevice(d);
  return (
    <View style={{ gap: 10 }}>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        <T variant="callout" weight="700">
          반납할 기기
        </T>
        {back.map((k) => (
          <DeviceTag key={k} kind={k} full />
        ))}
      </Row>
      {buy ? (
        <>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            <T variant="callout" weight="700">
              살 기기
            </T>
            <DeviceTag kind={buy} full />
            <Pill label="딜러 확인 전" bg={c.warnBg} fg={c.warnText} />
          </Row>
          <T variant="callout" color={c.sub}>
            나머지 한 대는 구성품과 함께 반납해 주세요.
          </T>
          <Notice tone="warn">{SALE_PENDING_COPY}</Notice>
        </>
      ) : decision?.choice === 'buy_new' ? (
        <T variant="callout" color={c.sub}>
          새 제품은 딜러의 판매 조건에 따라 사게 돼요. 써 본 두 대는 구성품과 함께 모두 반납해 주세요.
        </T>
      ) : decision?.choice === 'undecided' ? (
        <T variant="callout" color={c.sub}>
          아직 못 정했어도 괜찮아요. 두 대 모두 구성품과 함께 반납해 주세요.
        </T>
      ) : (
        <T variant="callout" color={c.sub}>
          두 대 모두 구성품과 함께 반납해 주세요.
        </T>
      )}
    </View>
  );
}

function deviceLine(r: Reservation, k: DeviceKey): { text: string; tone: 'done' | 'warn' | 'pro' | 'grey' } {
  const buy = saleDevice(r.decision);
  const inspect = requiredInspections(r);
  // 손님 화면 말: 검수 → 점검, 판매 확인 → 구매 확정 (운영 시뮬레이터는 SALE_LABEL 등 운영 용어 그대로)
  if (k === buy && r.ops.sale === 'none') return { text: '구매 예정 · 딜러 확인 전', tone: 'warn' };
  if (k === buy && r.ops.sale === 'confirmed') return { text: '구매 확정', tone: 'done' };
  if (inspect.includes(k)) {
    const prefix = k === buy ? '판매 안 됨 · ' : '';
    if (r.status === 'completed' || isInspectionDone(r.ops.inspection[k])) return { text: `${prefix}반납 · 점검 완료`, tone: 'done' };
    if (r.status === 'inspecting') return { text: `${prefix}반납 · 점검 중`, tone: 'pro' };
    return { text: `${prefix}반납 접수`, tone: 'pro' };
  }
  return { text: '—', tone: 'grey' };
}

const useLineTone = themed(({ c }) => ({
  done: { bg: c.doneSoft, fg: c.doneText },
  warn: { bg: c.warnBg, fg: c.warnText },
  pro: { bg: c.proSoft, fg: c.proInk },
  grey: { bg: c.greySoft, fg: c.grey },
}));

/** 반납 이후: 기기별로 반납 / 구매(판매 확인 여부) 표시 */
export function ReturnOutcome({ r }: { r: Reservation }) {
  const LINE_TONE = useLineTone();
  const buy = saleDevice(r.decision);
  return (
    <View style={{ gap: 12 }}>
      {r.decision ? (
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <T variant="footnote">내 결정</T>
          <T variant="callout" weight="700">
            {DECISION_LABEL[r.decision.choice]}
            {r.decision.model ? ` · ${DEVICE_LABEL[r.decision.model]}` : ''}
          </T>
        </Row>
      ) : null}
      {(['air', 'pro'] as DeviceKey[]).map((k) => {
        const line = deviceLine(r, k);
        const t = LINE_TONE[line.tone];
        return (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <DeviceTag kind={k} full />
            <Pill label={line.text} bg={t.bg} fg={t.fg} />
          </View>
        );
      })}
      {buy && r.ops.sale === 'none' ? <Notice tone="warn">{SALE_PENDING_COPY}</Notice> : null}
      {buy && r.ops.sale === 'failed' ? (
        <Notice tone="info">딜러 판매가 이뤄지지 않아 고른 기기도 반납으로 처리했어요. 구매는 되지 않았어요.</Notice>
      ) : null}
    </View>
  );
}

export function FollowUpNotice() {
  return (
    // 로컬 데모에서 참인 말만: 설문은 실제 서비스의 계획이고, 데모는 연락처를 받지 않으니 보내지 않는다
    <Notice tone="info" title="써 본 뒤의 마음도 궁금해요">
      실제 서비스에서는 체험이 끝나고 7일 뒤와 30일 뒤에 짧은 설문을 드릴 계획이에요. 이 데모는 연락처를 받지 않아서 보내지 않아요.
    </Notice>
  );
}
