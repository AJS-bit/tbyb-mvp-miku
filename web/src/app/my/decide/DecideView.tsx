"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  DEALER_TERMS_TBD,
  DECISION_LABEL,
  DEVICE_LABEL,
  LEANING_LABEL,
  MISSION_OPEN,
  STATUS_LABEL,
  devicesToReturn,
  missionSummary,
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
import { MissionPickList, MissionSummary } from "@/components/mission";
import { ScorePicker } from "@/components/ScorePicker";
import { BackLink, NotFound, decisionText, myHref, useIdParam } from "@/components/reservation";
import {
  Card,
  CardTitle,
  DeviceName,
  ErrorText,
  Notice,
  PageHeader,
  Skeleton,
  StatusChip,
  SuccessText,
  btn,
  cx,
  inputClass,
} from "@/components/ui";

const CHOICES: DecisionChoice[] = ["return_both", "buy_new", "buy_used", "undecided"];
const KEYS: DeviceKey[] = ["air", "pro"];
const isBuy = (c: DecisionChoice | "") => c === "buy_new" || c === "buy_used";

const CHOICE_HELP: Record<DecisionChoice, string> = {
  return_both: "두 기기 모두 돌려주고 체험을 마쳐요.",
  buy_new: "체험한 두 대는 모두 반납하고, 고른 모델을 새 제품으로 사겠다고 알려요.",
  buy_used: "쓰던 두 대 중 한 대를 그대로 사겠다고 고르고, 나머지 한 대만 반납해요. 딜러 판매가 확인돼야 구매로 확정돼요.",
  undecided: "결정하지 못해도 괜찮아요. 두 기기는 모두 반납해요.",
};

/** 이유 빠른 선택 — 누르면 입력칸에 채워진다 (고쳐 써도 된다) */
const REASON_CHIPS = [
  "가벼워서 들고 다니기 편했어요",
  "영상·과제엔 Air로 충분했어요",
  "화면이 커서 오래 봐도 편했어요",
  "무거운 작업에서 Pro가 빨랐어요",
  "둘 다 비슷해서 아직 모르겠어요",
  "지금은 살 때가 아닌 것 같아요",
];

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
  const answered = Object.values(missionSummary(r)).reduce((a, b) => a + b, 0);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={myHref(r.id)}>{r.id} 내 체험</BackLink>
      <PageHeader eyebrow={`Last day · ${r.id}`} title="마지막 날, 어떻게 할까요?" aside={<StatusChip status={r.status} className="text-[13px]" />}>
        미션에서 고른 답을 나란히 보고 정해요. 아직 모르겠어도 괜찮아요. 결정은 반납 접수 전까지 바꿀 수 있어요.
      </PageHeader>

      <div className="space-y-5">
        <Card aria-labelledby="sum">
          <CardTitle id="sum" eyebrow="What you picked">
            내가 고른 답
          </CardTitle>
          {answered ? (
            <>
              <MissionSummary r={r} />
              <div className="mt-6 border-t border-line pt-5">
                <MissionPickList r={r} />
              </div>
            </>
          ) : (
            <Notice>
              아직 답한 미션이 없어요. 미션 없이도 결정할 수 있지만, 두 맥으로 몇 가지를 해 보고 고르면 더 분명해져요.{" "}
              {MISSION_OPEN.includes(r.status) ? (
                <Link href={myHref(r.id, "missions/")} className="font-bold text-ink underline underline-offset-2">
                  미션 하러 가기
                </Link>
              ) : null}
            </Notice>
          )}
        </Card>

        {locked ? (
          <>
            <Notice tone="warn" title="지금은 결정을 남기거나 바꿀 수 없어요">
              결정은 &lsquo;{STATUS_LABEL.in_trial}&rsquo; 단계(마지막 날)에 남겨요. 지금은 &lsquo;{STATUS_LABEL[r.status]}&rsquo;
              단계예요.
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
      <p className="text-[16px] font-bold text-ink">{decisionText(decision)}</p>
      {decision.reason ? <p className="mt-1 text-[15px] text-sub">이유: {decision.reason}</p> : null}
      <BeforeAfter r={r} after={decision.confidenceAfter} choiceText={decisionText(decision)} />
    </Card>
  );
}

function BeforeAfter({ r, after, choiceText }: { r: Reservation; after: Score | null; choiceText: string }) {
  const before = r.request.confidenceBefore;
  const delta = after === null ? null : after - before;
  return (
    <div data-testid="before-after" className="mt-5 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-sm">
      <div className="rounded-2xl bg-bg p-4">
        <p className="eyebrow text-sub">Before</p>
        <p className="mt-1.5 font-bold text-ink">{LEANING_LABEL[r.request.leaningBefore]}</p>
        <p className="tabular text-sub">확신 {before}/5</p>
      </div>
      <div aria-hidden className="flex items-center text-lg text-sub">
        →
      </div>
      <div className="rounded-2xl bg-coral-soft p-4">
        <p className="eyebrow text-coral-ink">After</p>
        <p className="mt-1.5 font-bold text-ink">{choiceText}</p>
        <p className="tabular text-sub">
          확신 {after ?? "–"}/5
          {delta !== null && delta !== 0 ? (
            <span className={cx("ml-1 font-bold", delta > 0 ? "text-success-ink" : "text-danger-ink")}>({delta > 0 ? `+${delta}` : delta})</span>
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
    ? { choice, model: isBuy(choice) && model ? model : undefined, confidenceAfter: confidence ?? 3, reason, decidedAt: "" }
    : undefined;
  const back = devicesToReturn(preview);
  const sale = saleDevice(preview);
  const choiceText = choice ? decisionText(preview) : "아직 고르지 않음";

  function addReason(text: string) {
    setSaved("");
    setReason((cur) => {
      const t = cur.trim();
      if (!t) return text;
      if (t.includes(text)) return cur;
      return `${t.replace(/[.\s]+$/, "")}. ${text}`;
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    if (!choice) return setError("결정을 하나 골라 주세요.");
    if (confidence === null) return setError("체험 후 확신(1–5)을 골라 주세요.");
    const res = apply((s, now) => setDecision(s, r.id, { choice, model: model || undefined, confidenceAfter: confidence, reason }, now));
    if (!res.ok) return setError(res.error);
    setError("");
    setSaved("결정을 저장했어요. 반납 날 운영자가 확인해요. 반납 접수 전까지는 바꿀 수 있어요.");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Card>
        <fieldset>
          <legend className="text-[19px] font-bold text-ink">어떻게 할까요?</legend>
          {!dealerTermsConfirmed ? (
            <p className="mt-1 mb-4 text-sm text-warn" id="dealer-tbd">
              구매 선택지: {DEALER_TERMS_TBD}
            </p>
          ) : (
            <p className="mt-1 mb-4 text-sm text-sub">딜러 판매 조건이 확정되어 구매 선택지가 열려 있어요(데모 설정).</p>
          )}
          <div className="space-y-2">
            {CHOICES.map((c) => {
              const disabled = isBuy(c) && !dealerTermsConfirmed;
              return (
                <label
                  key={c}
                  className={cx(
                    "flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
                    disabled
                      ? "cursor-not-allowed border-line bg-bg opacity-70"
                      : "cursor-pointer border-line-strong bg-surface hover:bg-cream has-[:checked]:border-ink has-[:checked]:bg-cream",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
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
                    className="mt-1.5 h-4 w-4 shrink-0 accent-ink"
                  />
                  <span>
                    <span className="block text-[16px] font-bold text-ink">{DECISION_LABEL[c]}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-sub">{disabled ? DEALER_TERMS_TBD : CHOICE_HELP[c]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {isBuy(choice) ? (
          <fieldset className="mt-6">
            <legend className="mb-2.5 text-[15px] font-bold text-ink">{choice === "buy_used" ? "쓰던 기기 중 구매할 쪽" : "새로 살 모델"}</legend>
            <div className="grid grid-cols-2 gap-2">
              {KEYS.map((k) => (
                <label
                  key={k}
                  className={cx(
                    "flex min-h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-2xl border border-line-strong bg-surface px-2 py-2 text-center text-sm font-bold text-ink sm:text-[15px] has-[:checked]:text-ivory has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
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

        <div className="mt-6">
          <ScorePicker
            name="confidenceAfter"
            legend="체험 후, 이 결정에 얼마나 확신하나요?"
            value={confidence}
            onChange={(v) => {
              setConfidence(v);
              setSaved("");
            }}
            lowLabel="전혀 모르겠음"
            highLabel="아주 확실"
          />
        </div>

        <div className="mt-6">
          <label htmlFor="reason" className="block text-[15px] font-bold text-ink">
            고른 이유 <span className="font-semibold text-coral-ink">(필수)</span>
          </label>
          <p id="reason-help" className="mt-0.5 text-sm text-sub">
            한 줄이면 충분해요. 아래에서 눌러 채우고 고쳐 써도 돼요. 아직 모르겠다면 그 이유도 좋아요.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="이유 빠른 선택">
            {REASON_CHIPS.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => addReason(c)}
                  className="min-h-9 rounded-full border border-line-strong bg-surface px-3.5 py-1 text-[13px] font-semibold text-ink transition-colors hover:bg-cream"
                >
                  + {c}
                </button>
              </li>
            ))}
          </ul>
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
            className={cx(inputClass, "mt-3")}
            maxLength={500}
            placeholder="예: 들고 다니기엔 Air가 편했는데, 영상 편집은 Pro가 확실히 빨랐어요"
          />
        </div>

        <BeforeAfter r={r} after={confidence} choiceText={choiceText} />
      </Card>

      <Card aria-labelledby="plan">
        <CardTitle id="plan" eyebrow="Return plan">
          반납 계획
        </CardTitle>
        {choice ? (
          <div data-testid="return-plan">
            <p className="text-[16px] text-ink">
              반납할 기기: <strong className="font-bold">{back.map((k) => DEVICE_LABEL[k]).join(", ")}</strong>
            </p>
            <ul className="mt-3 space-y-2">
              {KEYS.map((k) => (
                <li key={k} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-4 py-3 text-[15px]">
                  <DeviceName kind={k} />
                  <span className={cx("font-semibold", back.includes(k) ? "text-ink" : "text-warn")}>
                    {back.includes(k) ? "반납 · 검수" : k === sale ? "구매 선택 · 딜러 판매 확인 전" : "반납 · 검수"}
                  </span>
                </li>
              ))}
            </ul>
            {choice === "buy_used" ? (
              <div className="mt-3 space-y-1 text-[15px] text-ink">
                <p>{model ? "나머지 한 대와 부속품은 반납·검수해요." : "구매할 기기를 고르면, 나머지 한 대와 부속품은 반납·검수해요."}</p>
                <p className="text-warn">고른 기기는 딜러 판매가 확인돼야 구매로 확정돼요. 확인되지 않으면 그 기기도 반납·검수해요.</p>
              </div>
            ) : null}
            {choice === "buy_new" ? (
              <p className="mt-3 text-[15px] text-ink">체험한 두 대와 부속품은 모두 반납해요. 새 제품은 딜러 판매 조건에 따라 안내해요.</p>
            ) : null}
          </div>
        ) : (
          <p className="text-[15px] text-sub">결정을 고르면 반납할 기기를 보여 드려요.</p>
        )}

        <fieldset className="mt-6 rounded-2xl border border-line p-4 sm:p-5">
          <legend className="px-1 text-[15px] font-bold text-ink">반납 전 개인정보 체크</legend>
          <div className="space-y-2.5">
            {RETURN_PREP.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-start gap-3 text-[15px] text-ink">
                <input
                  type="checkbox"
                  checked={!!prep[p.key]}
                  onChange={(e) => setPrep((x) => ({ ...x, [p.key]: e.target.checked }))}
                  className="mt-1 h-4 w-4 shrink-0 accent-ink"
                />
                {p.label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-sub">
            초기화(데이터 삭제)는 운영자가 반납 검수 때 기기에서 직접 확인해요. 이 체크는 준비 확인용이며, 체크했다고 데이터가
            지워졌다는 뜻은 아니에요. (이 체크는 저장되지 않아요.)
          </p>
        </fieldset>
      </Card>

      <div>
        <ErrorText>{error}</ErrorText>
        <SuccessText>{saved}</SuccessText>
        <button type="submit" className={cx(btn.primary, "mt-4 w-full sm:w-auto sm:px-10")}>
          결정 저장
        </button>
        {saved ? (
          <p className="mt-3 text-sm">
            <Link href={myHref(r.id)} className="font-bold text-ink underline underline-offset-2">
              내 체험으로 돌아가기
            </Link>
          </p>
        ) : null}
      </div>
    </form>
  );
}
