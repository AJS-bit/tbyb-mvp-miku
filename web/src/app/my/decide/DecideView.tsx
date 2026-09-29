"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  DEALER_TERMS_TBD,
  DECISION_LABEL,
  DEVICE_LABEL,
  LEANING_LABEL,
  STATUS_LABEL,
  WORK_TYPES,
  devicesToReturn,
  saleDevice,
  setDecision,
  type Decision,
  type DecisionChoice,
  type DemoState,
  type DeviceKey,
  type Reservation,
  type Score,
} from "@/lib/domain";
import { apply, useDemo } from "@/lib/store";
import { fmtDateTime } from "@/lib/format";
import { CompareSummary } from "@/components/compare";
import { ScorePicker } from "@/components/ScorePicker";
import { BackLink, NotFound, decisionText, useIdParam } from "@/components/reservation";
import {
  Card,
  CardTitle,
  DeviceName,
  ErrorText,
  Notice,
  PageHeader,
  Skeleton,
  SuccessText,
  btn,
  cx,
  inputClass,
} from "@/components/ui";

const CHOICES: DecisionChoice[] = ["return_both", "buy_new", "buy_used", "undecided"];
const KEYS: DeviceKey[] = ["air", "pro"];
const isBuy = (c: DecisionChoice | "") => c === "buy_new" || c === "buy_used";

const CHOICE_HELP: Record<DecisionChoice, string> = {
  return_both: "두 기기 모두 돌려주고 체험을 마칩니다.",
  buy_new: "체험한 두 대는 모두 반납하고, 고른 모델을 새 제품으로 사겠다고 알립니다.",
  buy_used: "사용하던 두 대 중 한 대를 그대로 사겠다고 고르고, 나머지 한 대만 반납합니다. 딜러 판매가 확인돼야 구매로 확정됩니다.",
  undecided: "결정하지 못해도 괜찮습니다. 두 기기는 모두 반납합니다.",
};

const RETURN_PREP = [
  { key: "backup", label: "내 파일을 내 저장공간으로 백업했어요" },
  { key: "signout", label: "Apple 계정·사용한 서비스에서 로그아웃했어요" },
  { key: "findmy", label: "‘나의 찾기’를 해제했어요" },
];

export function DecideView() {
  const snap = useDemo();
  const id = useIdParam();
  if (!snap) return <Skeleton />;
  if (!id) return <NotFound id="(예약 ID 없음)" />;
  const r = snap.state.reservations.find((x) => x.id === id);
  if (!r) return <NotFound id={id} />;
  return <Decide r={r} state={snap.state} />;
}

function Decide({ r, state }: { r: Reservation; state: DemoState }) {
  const locked = r.status !== "in_trial";
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={`/my/?id=${encodeURIComponent(r.id)}`}>{r.id} 내 체험</BackLink>
      <PageHeader eyebrow={`${r.id} · ${WORK_TYPES[r.request.workType].label}`} title="마지막 날 결정">
        두 기기로 남긴 기록을 나란히 보고 결정합니다. 결정은 반납 접수 전까지 바꿀 수 있습니다.
      </PageHeader>

      <div className="space-y-5">
        <Card aria-labelledby="sum">
          <CardTitle id="sum">내 비교 기록 요약</CardTitle>
          {r.logs.length ? (
            <CompareSummary logs={r.logs} />
          ) : (
            <Notice tone="info">
              아직 비교 기록이 없습니다. 기록 없이도 결정할 수 있지만, 같은 작업을 두 기기에서 해 보고 적으면 더 분명해집니다.{" "}
              {!locked ? (
                <Link href={`/my/record/?id=${encodeURIComponent(r.id)}`} className="font-semibold text-primary-ink underline underline-offset-2">
                  비교 기록하러 가기
                </Link>
              ) : null}
            </Notice>
          )}
        </Card>

        {locked ? (
          <>
            <Notice tone="warn" title="지금은 결정을 남기거나 바꿀 수 없습니다">
              결정은 &lsquo;{STATUS_LABEL.in_trial}&rsquo; 단계(마지막 날)에 남깁니다. 지금은 &lsquo;{STATUS_LABEL[r.status]}&rsquo;
              단계입니다.
            </Notice>
            {r.decision ? <SavedDecision r={r} decision={r.decision} /> : null}
          </>
        ) : (
          <DecisionForm key={r.id} r={r} dealerTermsConfirmed={state.dealerTermsConfirmed} />
        )}
      </div>
    </div>
  );
}

function SavedDecision({ r, decision }: { r: Reservation; decision: Decision }) {
  return (
    <Card aria-labelledby="saved">
      <CardTitle id="saved" sub={`저장 ${fmtDateTime(decision.decidedAt)}`}>
        남긴 결정
      </CardTitle>
      <p className="text-[15px] font-semibold text-ink">{decisionText(decision)}</p>
      {decision.reason ? <p className="mt-1 text-sm text-sub">이유: {decision.reason}</p> : null}
      <BeforeAfter r={r} after={decision.confidenceAfter} choiceText={decisionText(decision)} />
    </Card>
  );
}

function BeforeAfter({ r, after, choiceText }: { r: Reservation; after: Score | null; choiceText: string }) {
  const before = r.request.confidenceBefore;
  const delta = after === null ? null : after - before;
  return (
    <div data-testid="before-after" className="mt-4 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-sm">
      <div className="rounded-xl bg-bg p-3">
        <p className="text-xs font-medium text-sub">체험 전</p>
        <p className="mt-1 font-semibold text-ink">{LEANING_LABEL[r.request.leaningBefore]}</p>
        <p className="tabular text-sub">확신 {before}/5</p>
      </div>
      <div aria-hidden className="flex items-center text-sub">
        →
      </div>
      <div className="rounded-xl bg-primary-soft p-3">
        <p className="text-xs font-medium text-primary-ink">체험 후</p>
        <p className="mt-1 font-semibold text-ink">{choiceText}</p>
        <p className="tabular text-sub">
          확신 {after ?? "–"}/5
          {delta !== null && delta !== 0 ? (
            <span className={cx("ml-1 font-semibold", delta > 0 ? "text-success-ink" : "text-danger")}>
              ({delta > 0 ? `+${delta}` : delta})
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function DecisionForm({ r, dealerTermsConfirmed }: { r: Reservation; dealerTermsConfirmed: boolean }) {
  const d0 = r.decision;
  const [choice, setChoice] = useState<DecisionChoice | "">(d0?.choice ?? "");
  const [model, setModel] = useState<DeviceKey | "">(d0?.model ?? "");
  const [confidence, setConfidence] = useState<Score | null>(d0?.confidenceAfter ?? null);
  const [reason, setReason] = useState(d0?.reason ?? "");
  const [prep, setPrep] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  // 반납 계획 미리보기 — domain 의 devicesToReturn 에 작성 중인 결정을 넘겨 계산한다.
  const preview: Decision | undefined = choice
    ? {
        choice,
        model: isBuy(choice) && model ? model : undefined,
        confidenceAfter: confidence ?? 3,
        reason,
        decidedAt: "",
      }
    : undefined;
  const back = devicesToReturn(preview);
  const sale = saleDevice(preview);
  const choiceText = choice ? decisionText(preview) : "아직 고르지 않음";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    if (!choice) return setError("결정을 하나 골라 주세요.");
    if (confidence === null) return setError("체험 후 확신(1–5)을 골라 주세요.");
    const res = apply((s, now) =>
      setDecision(s, r.id, { choice, model: model || undefined, confidenceAfter: confidence, reason }, now),
    );
    if (!res.ok) return setError(res.error);
    setError("");
    setSaved("결정을 저장했습니다. 반납 날 운영자가 확인합니다. 반납 접수 전까지는 바꿀 수 있습니다.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Card>
        <fieldset>
          <legend className="mb-1 text-[17px] font-semibold tracking-tight text-ink">어떻게 할까요?</legend>
          {!dealerTermsConfirmed ? (
            <p className="mb-3 text-sm text-warn" id="dealer-tbd">
              구매 선택지: {DEALER_TERMS_TBD}
            </p>
          ) : (
            <p className="mb-3 text-sm text-sub">딜러 판매 조건이 확정되어 구매 선택지가 열려 있습니다(데모 설정).</p>
          )}
          <div className="space-y-2">
            {CHOICES.map((c) => {
              const disabled = isBuy(c) && !dealerTermsConfirmed;
              return (
                <label
                  key={c}
                  className={cx(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                    disabled
                      ? "cursor-not-allowed border-line bg-bg opacity-70"
                      : "cursor-pointer border-line bg-surface hover:border-sub/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                  )}
                >
                  <input
                    type="radio"
                    name="choice"
                    value={c}
                    checked={choice === c}
                    disabled={disabled}
                    aria-describedby={disabled ? "dealer-tbd" : undefined}
                    onChange={() => {
                      setChoice(c);
                      setSaved("");
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{DECISION_LABEL[c]}</span>
                    <span className="mt-0.5 block text-sm text-sub">{disabled ? DEALER_TERMS_TBD : CHOICE_HELP[c]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {isBuy(choice) ? (
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-ink">
              {choice === "buy_used" ? "사용하던 기기 중 구매할 쪽" : "새로 살 모델"}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {KEYS.map((k) => (
                <label
                  key={k}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border border-line bg-surface px-2 py-2 text-center text-sm font-semibold text-ink sm:text-[15px] has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                    k === "air" ? "has-[:checked]:border-air-ink has-[:checked]:bg-air-ink" : "has-[:checked]:border-pro has-[:checked]:bg-pro",
                  )}
                >
                  <input
                    type="radio"
                    name="model"
                    value={k}
                    checked={model === k}
                    onChange={() => {
                      setModel(k);
                      setSaved("");
                    }}
                    className="sr-only"
                  />
                  {DEVICE_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="mt-5">
          <ScorePicker
            name="confidenceAfter"
            legend="체험 후, 이 결정에 얼마나 확신하나요?"
            value={confidence}
            onChange={(v) => {
              setConfidence(v);
              setSaved("");
            }}
            lowLabel="전혀 모르겠음"
            highLabel="매우 확신"
          />
        </div>

        <label htmlFor="reason" className="mt-5 mb-1.5 block text-sm font-medium text-ink">
          선택 이유 <span className="font-normal text-danger">(필수)</span>
        </label>
        <p id="reason-help" className="mb-1.5 text-xs text-sub">
          한 줄이면 충분합니다. 아직 결정하지 못했다면 그 이유도 좋아요.
        </p>
        <textarea
          id="reason"
          required
          aria-required="true"
          aria-describedby="reason-help"
          rows={3}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setSaved("");
          }}
          className={inputClass}
          maxLength={500}
          placeholder="예: 긴 렌더링에서 Pro가 끝까지 속도를 유지했다"
        />

        <BeforeAfter r={r} after={confidence} choiceText={choiceText} />
      </Card>

      <Card aria-labelledby="plan">
        <CardTitle id="plan">반납 계획</CardTitle>
        {choice ? (
          <div data-testid="return-plan">
            <p className="text-[15px] text-ink">
              반납할 기기:{" "}
              <strong className="font-semibold">{back.map((k) => DEVICE_LABEL[k]).join(", ")}</strong>
            </p>
            <ul className="mt-3 space-y-2">
              {KEYS.map((k) => (
                <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2.5 text-sm">
                  <DeviceName kind={k} />
                  <span className={cx("font-medium", back.includes(k) ? "text-ink" : "text-warn")}>
                    {back.includes(k) ? "반납 · 검수" : k === sale ? "구매 선택 · 딜러 판매 확인 전" : "반납 · 검수"}
                  </span>
                </li>
              ))}
            </ul>
            {choice === "buy_used" ? (
              <div className="mt-3 space-y-1 text-sm text-ink">
                <p>
                  {model
                    ? "나머지 한 대와 부속품은 반납·검수합니다."
                    : "구매할 기기를 고르면, 나머지 한 대와 부속품은 반납·검수합니다."}
                </p>
                <p className="text-warn">
                  선택한 기기는 딜러 판매가 확인돼야 구매로 확정됩니다. 확인되지 않으면 그 기기도 반납·검수합니다.
                </p>
              </div>
            ) : null}
            {choice === "buy_new" ? (
              <p className="mt-3 text-sm text-ink">체험한 두 대와 부속품은 모두 반납합니다. 새 제품은 딜러 판매 조건에 따라 안내합니다.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-sub">결정을 고르면 반납할 기기를 보여 드립니다.</p>
        )}

        <fieldset className="mt-5 rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">반납 전 개인정보 체크</legend>
          <div className="space-y-2">
            {RETURN_PREP.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={!!prep[p.key]}
                  onChange={(e) => setPrep((x) => ({ ...x, [p.key]: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                {p.label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-sub">
            초기화(데이터 삭제)는 운영자가 반납 검수 때 기기에서 직접 확인합니다. 이 체크박스는 준비 확인용이며, 체크했다고
            데이터가 지워졌다는 뜻은 아닙니다. (이 체크는 저장되지 않습니다.)
          </p>
        </fieldset>
      </Card>

      <div>
        <ErrorText>{error}</ErrorText>
        <SuccessText>{saved}</SuccessText>
        <button type="submit" className={cx(btn.primary, "mt-3 w-full sm:w-auto sm:px-8")}>
          결정 저장
        </button>
        {saved ? (
          <p className="mt-3 text-sm">
            <Link href={`/my/?id=${encodeURIComponent(r.id)}`} className="font-semibold text-primary-ink underline underline-offset-2">
              내 체험으로 돌아가기
            </Link>
          </p>
        ) : null}
      </div>
    </form>
  );
}
