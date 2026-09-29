"use client";

import { useState, type FormEvent } from "react";
import {
  CORE_MISSIONS,
  DAILY_OPTIONS,
  DEVICE_LABEL,
  MISSIONS,
  MISSION_OPEN,
  PICK_LABEL,
  REWARD_AMOUNT_LABEL,
  REWARD_RULE,
  STATUS_FLOW,
  answerMission,
  missionProgress,
  setCodeCheck,
  submitReward,
  type BatteryReading,
  type DeviceKey,
  type MissionAnswer,
  type MissionDef,
  type Pick,
  type Reservation,
} from "@/lib/domain";
import { apply, useDemo } from "@/lib/store";
import { fmtDateTime } from "@/lib/format";
import { GiftEnvelope, MissionIcon } from "@/components/illustrations";
import { AnswerDetails, PICKS, PickChip, RewardStatusChip, missionTitle, pickSolidTone } from "@/components/mission";
import { BackLink, NotFound, myHref, useIdParam } from "@/components/reservation";
import {
  ButtonLink,
  Card,
  CardTitle,
  DeviceName,
  ErrorText,
  Eyebrow,
  Notice,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatusChip,
  SuccessText,
  Tag,
  btn,
  chipLabel,
  cx,
  inputClass,
} from "@/components/ui";

const KEYS: DeviceKey[] = ["air", "pro"];

export function MissionsView() {
  const snap = useDemo();
  const id = useIdParam();
  if (!snap) return <Skeleton />;
  if (!id) return <NotFound id="(예약 ID 없음)" />;
  const r = snap.state.reservations.find((x) => x.id === id);
  if (!r) return <NotFound id={id} />;
  return <Missions r={r} />;
}

function Missions({ r }: { r: Reservation }) {
  const open = MISSION_OPEN.includes(r.status);
  const editable = open && r.reward.status === "none";
  const beforePickup = STATUS_FLOW.indexOf(r.status) < STATUS_FLOW.indexOf("in_trial") && r.status !== "cancelled";

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={myHref(r.id)}>{r.id} 내 체험</BackLink>
      <PageHeader eyebrow={`Missions · ${r.id}`} title="오늘은 어떤 걸 해 볼까요?" aside={<StatusChip status={r.status} className="text-[13px]" />}>
        맥이 처음이어도 괜찮아요. 해 본 미션부터 편하게 골라 주세요. 비슷했거나 모르겠어도 그대로 골라 주세요 — 그것도 답이에요.
      </PageHeader>

      <div className="space-y-5">
        {!open ? (
          <Notice tone="warn" title={beforePickup ? "미션은 픽업한 뒤부터 열려요" : "미션 기간이 끝났어요"}>
            {beforePickup
              ? "미리 둘러보세요. 두 맥을 받으면 여기서 답을 고를 수 있어요."
              : "미션과 리워드 신청은 픽업한 뒤부터 반납 검수가 끝나기 전까지 할 수 있어요."}
          </Notice>
        ) : null}

        <RewardCard r={r} open={open} />
        <CodeCard r={r} editable={editable} />

        <section aria-labelledby="mission-list">
          <div className="mt-10 mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <Eyebrow className="mb-2">Six small missions</Eyebrow>
              <h2 id="mission-list" className="text-[24px] font-extrabold text-ink">
                미션 {MISSIONS.length}개
              </h2>
            </div>
            <p className="text-sm text-sub">핵심 {CORE_MISSIONS.length}개 + 해 본 사람만 1개</p>
          </div>
          <ol className="space-y-3">
            {MISSIONS.map((m, i) => (
              <MissionCard key={m.id} r={r} def={m} n={i + 1} editable={editable} />
            ))}
          </ol>
        </section>

        {r.status === "in_trial" ? (
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-ink">
              다 해 봤다면, 마지막 날 결정을 남겨 주세요. <span className="text-sub">아직 모르겠어도 괜찮아요.</span>
            </p>
            <ButtonLink href={myHref(r.id, "decide/")} variant="secondary" className="shrink-0 sm:px-6">
              마지막 날 결정
            </ButtonLink>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

// ───────── 리워드 카드 ─────────

function RewardCard({ r, open }: { r: Reservation; open: boolean }) {
  const [error, setError] = useState("");
  const p = missionProgress(r);
  const { status } = r.reward;
  const hasCode = Boolean(r.codeCheck);
  const ready = open && status === "none" && p.missing.length === 0 && hasCode;

  function submit() {
    const res = apply((s, now) => submitReward(s, r.id, now));
    setError(res.ok ? "" : res.error);
  }

  return (
    <section aria-labelledby="reward-title" data-testid="reward-card" className="fade-up rounded-3xl bg-coral-soft p-5 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-6">
        <GiftEnvelope className="h-auto w-20 shrink-0 sm:w-28" />
        <div className="min-w-0 flex-1">
          <Eyebrow tone="coral" className="mb-2">
            Reward · once per trial
          </Eyebrow>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id="reward-title" className="text-[21px] font-extrabold text-ink">
              리워드
            </h2>
            <RewardStatusChip status={status} />
          </div>
          <p className="mt-1 text-[18px] font-extrabold text-coral-ink">{REWARD_AMOUNT_LABEL}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-surface/85 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[15px] font-bold text-ink">핵심 미션</p>
          <p className="tabular text-[15px] font-extrabold text-ink" data-testid="reward-progress">
            {p.done}/{p.total}
          </p>
        </div>
        <div className="mt-2">
          <ProgressBar done={p.done} total={p.total} label="리워드 핵심 미션 진행" />
        </div>
        <ul className="mt-4 space-y-1.5 text-[15px]">
          <Check ok={p.missing.length === 0}>핵심 미션 {p.total}개 답하기</Check>
          <Check ok={hasCode}>두 맥의 바탕화면 코드 적기</Check>
        </ul>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink/75">{REWARD_RULE}</p>

      {status === "none" ? (
        <div className="mt-5">
          <button type="button" disabled={!ready} onClick={submit} className={cx(btn.primary, "w-full sm:w-auto sm:px-9")}>
            리워드 신청하기
          </button>
          <p className="mt-2 text-xs text-sub">
            {!open
              ? "미션을 할 수 있는 기간에만 신청할 수 있어요."
              : ready
                ? "신청하면 답과 코드는 더 바꿀 수 없어요."
                : `남은 것: ${[p.missing.length ? `미션 ${p.missing.length}개` : "", hasCode ? "" : "바탕화면 코드"].filter(Boolean).join(" · ")}`}
          </p>
          <ErrorText>{error}</ErrorText>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-surface/85 p-4 text-[15px] leading-relaxed text-ink" data-testid="reward-locked">
          {status === "submitted" ? (
            <p>
              <strong className="font-bold">신청했어요</strong> ({fmtDateTime(r.reward.submittedAt)}). 반납 검수 뒤 운영자가 확인해요.
              이제 답과 코드는 바꿀 수 없어요.
            </p>
          ) : status === "approved" ? (
            <p>
              <strong className="font-bold">확인이 끝났어요.</strong> 지급 예정이에요. (데모에서는 실제 지급이 없어요.)
            </p>
          ) : (
            <>
              <p>
                <strong className="font-bold">이번 체험은 지급하지 않기로 했어요.</strong>
              </p>
              {r.reward.reviewNote ? <p className="mt-1 text-sub">운영자 메모: {r.reward.reviewNote}</p> : null}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          ok ? "bg-ink text-ivory" : "bg-surface ring-1 ring-inset ring-line-strong",
        )}
      >
        {ok ? "✓" : ""}
      </span>
      <span className={ok ? "text-ink" : "text-sub"}>
        {children}
        <span className="sr-only">{ok ? " (완료)" : " (아직)"}</span>
      </span>
    </li>
  );
}

// ───────── 바탕화면 코드 ─────────

function CodeCard({ r, editable }: { r: Reservation; editable: boolean }) {
  const [codes, setCodes] = useState<Record<DeviceKey, string>>({ air: r.codeCheck?.air ?? "", pro: r.codeCheck?.pro ?? "" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    const res = apply((s, now) => setCodeCheck(s, r.id, codes.air, codes.pro, now));
    if (!res.ok) return setError(res.error);
    setError("");
    setSaved("코드를 저장했어요.");
  }

  return (
    <Card aria-labelledby="code-title" data-testid="code-card">
      <CardTitle
        id="code-title"
        eyebrow="Wallpaper code"
        sub="픽업할 때 두 맥 바탕화면에 적힌 4자리 코드를 적어 주세요. 대소문자·띄어쓰기는 신경 쓰지 않아도 돼요."
      >
        바탕화면 코드
      </CardTitle>
      <form onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-2 gap-3">
          {KEYS.map((k) => (
            <div key={k} className="min-w-0">
              <label htmlFor={`code-${k}`} className="mb-1.5 block text-sm">
                <DeviceName kind={k} short />
                <span className="sr-only"> {DEVICE_LABEL[k]} 바탕화면 코드</span>
              </label>
              <input
                id={`code-${k}`}
                value={codes[k]}
                disabled={!editable}
                onChange={(e) => {
                  setCodes((c) => ({ ...c, [k]: e.target.value }));
                  setSaved("");
                }}
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="예: AB12"
                aria-label={`${DEVICE_LABEL[k]} 바탕화면 코드`}
                className={cx(inputClass, "text-center font-mono text-[20px] font-bold tracking-[0.3em] uppercase placeholder:tracking-normal placeholder:text-[15px] placeholder:font-sans placeholder:font-normal")}
              />
            </div>
          ))}
        </div>
        {r.codeCheck ? (
          <p className="mt-3 text-sm text-sub" data-testid="code-saved">
            저장한 코드 · Air <span className="font-mono font-bold text-ink">{r.codeCheck.air}</span> · Pro{" "}
            <span className="font-mono font-bold text-ink">{r.codeCheck.pro}</span> ({fmtDateTime(r.codeCheck.at)})
          </p>
        ) : null}
        {editable ? (
          <button type="submit" className={cx(btn.secondary, "mt-4 w-full sm:w-auto sm:px-7")}>
            코드 저장
          </button>
        ) : null}
        <ErrorText>{error}</ErrorText>
        <SuccessText>{saved}</SuccessText>
      </form>
    </Card>
  );
}

// ───────── 미션 카드 ─────────

function MissionCard({ r, def, n, editable }: { r: Reservation; def: MissionDef; n: number; editable: boolean }) {
  const answer = r.missions[def.id];
  const [openForm, setOpenForm] = useState(false);
  const [saved, setSaved] = useState("");
  const formId = `mission-form-${def.id}`;

  return (
    <li
      data-testid={`mission-${def.id}`}
      className={cx(
        "rounded-3xl border bg-surface p-5 transition-colors sm:p-6",
        openForm ? "border-ink/40 shadow-(--shadow-lift)" : "border-line",
      )}
    >
      <div className="flex gap-4">
        <div className="relative shrink-0">
          <span className={cx("flex h-16 w-16 items-center justify-center rounded-2xl", answer ? "bg-cream" : "bg-bg")}>
            <MissionIcon id={def.id} className="h-12 w-12" />
          </span>
          {answer ? (
            <span aria-hidden className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-ivory ring-2 ring-surface">
              ✓
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow tabular text-sub">Mission 0{n}</p>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 text-[18px] font-bold leading-snug text-ink">
            {missionTitle(def)}
            {def.optional ? <Tag>선택 · 해 본 사람만</Tag> : null}
          </h3>
          <p className="mt-1.5 text-[15px] leading-[1.7] text-sub">{def.how}</p>
        </div>
      </div>

      {answer && !openForm ? (
        <div className="mt-4 rounded-2xl bg-bg px-4 py-3" data-testid="mission-answer">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-sub">{def.question}</span>
            <PickChip pick={answer.pick} />
          </div>
          <AnswerDetails a={answer} className="mt-1" />
          <p className="tabular mt-1 text-xs text-sub">{fmtDateTime(answer.answeredAt)}</p>
        </div>
      ) : null}

      {saved && !openForm ? (
        <p role="status" className="mt-3 text-sm font-semibold text-success-ink">
          {saved}
        </p>
      ) : null}

      {editable && !openForm ? (
        <button
          type="button"
          aria-expanded={false}
          aria-controls={formId}
          onClick={() => {
            setOpenForm(true);
            setSaved("");
          }}
          className={cx(answer ? btn.secondary : btn.primary, btn.small, answer ? "mt-3 px-5" : "mt-4 w-full sm:w-auto sm:px-6")}
        >
          {answer ? "답 바꾸기" : "답하기"}
          <span className="sr-only"> — {missionTitle(def)}</span>
        </button>
      ) : null}

      {editable && openForm ? (
        <MissionForm
          id={formId}
          r={r}
          def={def}
          answer={answer}
          onClose={() => setOpenForm(false)}
          onSaved={() => {
            setOpenForm(false);
            setSaved(`‘${missionTitle(def)}’ 답을 저장했어요.`);
          }}
        />
      ) : null}
    </li>
  );
}

type BatteryDraft = Record<DeviceKey, { before: string; after: string }>;

function MissionForm({
  id,
  r,
  def,
  answer,
  onClose,
  onSaved,
}: {
  id: string;
  r: Reservation;
  def: MissionDef;
  answer?: MissionAnswer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pick, setPick] = useState<Pick | "">(answer?.pick ?? "");
  const [followUp, setFollowUp] = useState<string>(answer?.followUp ?? "");
  const [daily, setDaily] = useState<string>(answer?.daily ?? "");
  const [battery, setBattery] = useState<BatteryDraft>({
    air: { before: String(answer?.battery?.air.before ?? ""), after: String(answer?.battery?.air.after ?? "") },
    pro: { before: String(answer?.battery?.pro.before ?? ""), after: String(answer?.battery?.pro.after ?? "") },
  });
  const [minutes, setMinutes] = useState<Record<DeviceKey, string>>({
    air: String(answer?.minutes?.air ?? ""),
    pro: String(answer?.minutes?.pro ?? ""),
  });
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const draft: Omit<MissionAnswer, "answeredAt"> = {
      id: def.id,
      // 고르지 않았으면 빈 값을 그대로 넘겨 domain 이 "어느 쪽이었는지 골라 주세요" 를 돌려주게 한다
      pick: pick as Pick,
      followUp: followUp || undefined,
    };
    if (def.input === "battery") {
      const cells = KEYS.flatMap((k) => [battery[k].before, battery[k].after]).map((x) => x.trim());
      const filled = cells.filter(Boolean).length;
      if (filled > 0 && filled < cells.length) {
        return setError("배터리를 적는다면 두 맥의 시작·끝 %를 모두 적어 주세요. 적지 않아도 괜찮아요.");
      }
      if (filled) {
        const num = (k: DeviceKey): BatteryReading => ({ before: Number(battery[k].before), after: Number(battery[k].after) });
        draft.battery = { air: num("air"), pro: num("pro") };
      }
    }
    if (def.input === "daily") draft.daily = daily || undefined;
    if (def.input === "minutes") draft.minutes = { air: Number(minutes.air), pro: Number(minutes.pro) };
    const res = apply((s, now) => answerMission(s, r.id, draft, now));
    if (!res.ok) return setError(res.error);
    setError("");
    onSaved();
  }

  return (
    <form id={id} onSubmit={onSubmit} noValidate className="mt-5 border-t border-line pt-5">
      <fieldset>
        <legend className="text-[18px] font-extrabold text-ink">{def.question}</legend>
        <p className="mt-1 text-sm text-sub">비슷했거나 모르겠어도 그대로 골라 주세요.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {PICKS.map((p) => (
            <label
              key={p}
              className={cx(
                "flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface px-3 py-3 text-center text-[16px] font-bold text-ink transition-colors hover:bg-cream has-[:checked]:text-ivory",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                pickSolidTone[p],
              )}
            >
              <input type="radio" name={`pick-${def.id}`} value={p} checked={pick === p} onChange={() => setPick(p)} className="sr-only" />
              {PICK_LABEL[p]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-[15px] font-bold text-ink">
          조금 더 말해 준다면 <span className="font-medium text-sub">(선택 · 하나만)</span>
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {def.followUps.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={followUp === f}
              onClick={() => setFollowUp((cur) => (cur === f ? "" : f))}
              className={cx(
                "min-h-10 rounded-full border px-4 py-1.5 text-[14px] font-semibold transition-colors",
                followUp === f ? "border-ink bg-ink text-ivory" : "border-line-strong bg-surface text-ink hover:bg-cream",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </fieldset>

      {def.input === "daily" ? (
        <fieldset className="mt-6">
          <legend className="text-[15px] font-bold text-ink">무엇을 해 봤어요?</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DAILY_OPTIONS.map((o) => (
              <label key={o} className={chipLabel}>
                <input type="radio" name={`daily-${def.id}`} value={o} checked={daily === o} onChange={() => setDaily(o)} className="sr-only" />
                {o}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {def.input === "battery" ? (
        <fieldset className="mt-6 rounded-2xl bg-bg p-4 sm:p-5">
          <legend className="sr-only">배터리 % (선택)</legend>
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-ink" aria-hidden>
            배터리 % <Tag>선택</Tag>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-sub">
            적지 않아도 괜찮아요. 적는다면 충전기를 빼고, 같은 영상을 틀기 전과 후의 %를 두 맥 모두 적어 주세요.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {KEYS.map((k) => (
              <div key={k}>
                <DeviceName kind={k} className="text-sm" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["before", "after"] as const).map((f) => (
                    <label key={f} className="block">
                      <span className="mb-1 block text-xs font-semibold text-sub">{f === "before" ? "시작 %" : "끝 %"}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        value={battery[k][f]}
                        onChange={(e) => setBattery((b) => ({ ...b, [k]: { ...b[k], [f]: e.target.value } }))}
                        aria-label={`${DEVICE_LABEL[k]} ${f === "before" ? "시작" : "끝"} 배터리 %`}
                        className={cx(inputClass, "tabular py-2.5")}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      {def.input === "minutes" ? (
        <fieldset className="mt-6 rounded-2xl bg-bg p-4 sm:p-5">
          <legend className="sr-only">걸린 시간 (분)</legend>
          <p className="text-[15px] font-bold text-ink" aria-hidden>
            같은 작업에 걸린 시간
          </p>
          <p className="mt-1 text-sm text-sub">해 봤다면 두 맥 모두 분 단위로 적어 주세요.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {KEYS.map((k) => (
              <label key={k} className="block">
                <DeviceName kind={k} short className="mb-1.5 text-sm" />
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={1440}
                  value={minutes[k]}
                  onChange={(e) => setMinutes((m) => ({ ...m, [k]: e.target.value }))}
                  aria-label={`${DEVICE_LABEL[k]} 걸린 시간 (분)`}
                  className={cx(inputClass, "tabular py-2.5")}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="submit" className={cx(btn.primary, "sm:px-8")}>
          이 답 저장
        </button>
        <button type="button" onClick={onClose} className={cx(btn.secondary, "sm:px-6")}>
          닫기
        </button>
      </div>
    </form>
  );
}

