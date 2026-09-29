"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  DAY_STATUS_LABEL,
  DEMO_NOTICE,
  LEANING_LABEL,
  PICKUP_STORES,
  RESPONSE_TARGET,
  WORK_TYPES,
  calendarDays,
  createReservation,
  parseDate,
  type DayStatus,
  type Leaning,
  type Score,
  type WorkType,
} from "@/lib/domain";
import { apply, demoNow, useDemo } from "@/lib/store";
import { WEEKDAY_LABELS, fmtDateKey, fmtDateTime } from "@/lib/format";
import { ScorePicker } from "@/components/ScorePicker";
import { Card, CardTitle, ErrorText, Notice, Skeleton, btn, cx, inputClass } from "@/components/ui";

const dayTone: Record<DayStatus, string> = {
  open: "bg-surface text-ink ring-1 ring-line hover:ring-primary/60",
  check: "bg-warn-bg text-warn ring-1 ring-warn-line hover:ring-warn",
  closed: "cursor-not-allowed bg-muted-soft text-sub/70",
};
const dayLabelTone: Record<DayStatus, string> = {
  open: "text-success-ink",
  check: "text-warn",
  closed: "text-sub",
};

const LEANINGS: Leaning[] = ["air", "pro", "unsure"];

const radioCard =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink transition-colors hover:border-sub/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary";
const radioDot = "mt-1 h-4 w-4 shrink-0 accent-primary";

export function RequestForm() {
  const snap = useDemo();
  const router = useRouter();
  const [date, setDate] = useState("");
  const [store, setStore] = useState("");
  const [workType, setWorkType] = useState<WorkType | "">("");
  const [want, setWant] = useState("");
  const [leaning, setLeaning] = useState<Leaning>("unsure");
  const [confidence, setConfidence] = useState<Score | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");

  if (!snap) return <Skeleton />;

  const days = calendarDays(snap.state, demoNow());
  const lead = parseDate(days[0].date).getDay();
  const selected = days.find((d) => d.date === date);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    // domain 의 RequestInfo 는 작업 유형·확신을 필수 타입으로 받으므로, 고르지 않은 경우만 화면에서 먼저 막는다.
    if (!workType) return setError("작업 유형을 골라 주세요.");
    if (confidence === null) return setError("체험 전 확신(1–5)을 골라 주세요.");
    const r = apply((s, now) =>
      createReservation(
        s,
        {
          startDate: date,
          pickupStore: store,
          workType,
          wantToCompare: want,
          leaningBefore: leaning,
          confidenceBefore: confidence,
        },
        now,
      ),
    );
    if (!r.ok) return setError(r.error);
    const id = r.value.reservations[0].id;
    setSavedId(id);
    router.push(`/my/?id=${encodeURIComponent(id)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* 1. 날짜 */}
      <Card aria-labelledby="cal-title">
        <CardTitle
          id="cal-title"
          sub={
            <>
              마지막 갱신 <span className="tabular font-medium text-ink">{fmtDateTime(snap.state.calendarUpdatedAt)}</span>{" "}
              · 확정 재고가 아닙니다. 운영자가 두 기기를 확인한 뒤에 확정됩니다.
            </>
          }
        >
          1. 희망 시작일
        </CardTitle>
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub" aria-label="날짜 상태 안내">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-surface ring-1 ring-line" />
            {DAY_STATUS_LABEL.open}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-warn-bg ring-1 ring-warn-line" />
            {DAY_STATUS_LABEL.check} — 요청은 되지만 매장·재고 확인이 더 필요
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-muted-soft" />
            {DAY_STATUS_LABEL.closed} — 고를 수 없음
          </li>
        </ul>
        <div className="grid grid-cols-7 gap-1 sm:gap-2" role="group" aria-label="희망 시작일 (앞으로 14일)">
          {WEEKDAY_LABELS.map((w, i) => (
            <div
              key={w}
              aria-hidden
              className={cx("pb-1 text-center text-xs font-medium", i === 0 ? "text-danger/80" : "text-sub")}
            >
              {w}
            </div>
          ))}
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`blank-${i}`} aria-hidden />
          ))}
          {days.map((d, i) => {
            const dt = parseDate(d.date);
            const showMonth = i === 0 || dt.getDate() === 1;
            const isSel = date === d.date;
            return (
              <button
                key={d.date}
                type="button"
                data-testid="calendar-day"
                data-status={d.status}
                disabled={d.status === "closed"}
                aria-pressed={isSel}
                aria-label={`${fmtDateKey(d.date)} ${DAY_STATUS_LABEL[d.status]}`}
                onClick={() => {
                  setDate(d.date);
                  setError("");
                }}
                className={cx(
                  "flex min-h-[64px] flex-col items-center justify-start gap-0.5 rounded-lg px-0.5 pt-2 pb-1.5 transition-shadow",
                  dayTone[d.status],
                  isSel && "bg-primary-soft ring-2 ring-primary hover:ring-primary",
                )}
              >
                <span className={cx("tabular text-[15px] font-semibold leading-none", d.status === "closed" && "line-through")}>
                  {showMonth ? `${dt.getMonth() + 1}/${dt.getDate()}` : dt.getDate()}
                </span>
                <span className={cx("mt-1 text-[10px] font-medium leading-tight", dayLabelTone[d.status])}>
                  {DAY_STATUS_LABEL[d.status]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-ink" aria-live="polite">
          {selected ? (
            <>
              선택한 날: <strong className="font-semibold">{fmtDateKey(selected.date)}</strong> ·{" "}
              {DAY_STATUS_LABEL[selected.status]}
            </>
          ) : (
            <span className="text-sub">날짜를 골라 주세요.</span>
          )}
        </p>
      </Card>

      {/* 2. 매장 */}
      <Card>
        <fieldset>
          <legend className="mb-4 text-[17px] font-semibold tracking-tight text-ink">2. 픽업 매장</legend>
          <div className="space-y-2">
            {PICKUP_STORES.map((s) => (
              <label key={s} className={radioCard}>
                <input
                  type="radio"
                  name="store"
                  value={s}
                  checked={store === s}
                  onChange={() => setStore(s)}
                  className={radioDot}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {/* 3. 작업 유형 */}
      <Card>
        <fieldset>
          <legend className="mb-1 text-[17px] font-semibold tracking-tight text-ink">3. 주로 하는 작업</legend>
          <p className="mb-4 text-sm text-sub">작업 유형에 맞춘 비교 체크리스트를 드립니다.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(Object.keys(WORK_TYPES) as WorkType[]).map((w) => (
              <label
                key={w}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-3 py-2 text-center text-[15px] font-medium text-ink hover:border-sub/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
              >
                <input
                  type="radio"
                  name="workType"
                  value={w}
                  checked={workType === w}
                  onChange={() => setWorkType(w)}
                  className="sr-only"
                />
                {WORK_TYPES[w].label}
              </label>
            ))}
          </div>
          {workType ? (
            <div className="mt-4 rounded-xl bg-bg px-4 py-3">
              <p className="text-xs font-medium text-sub">체험 중 두 기기로 똑같이 해 볼 것</p>
              <ul className="mt-2 space-y-1 text-sm text-ink">
                {WORK_TYPES[workType].checklist.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span aria-hidden className="text-sub">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </fieldset>
      </Card>

      {/* 4. 비교하고 싶은 점 */}
      <Card>
        <label htmlFor="want" className="mb-1 block text-[17px] font-semibold tracking-tight text-ink">
          4. 비교하고 싶은 점 <span className="text-sm font-normal text-sub">(선택)</span>
        </label>
        <p id="want-help" className="mb-3 text-sm text-sub">
          예: 4K 영상 내보내기 시간, 하루 종일 들고 다닐 때 무게감
        </p>
        <textarea
          id="want"
          aria-describedby="want-help"
          value={want}
          onChange={(e) => setWant(e.target.value)}
          rows={3}
          maxLength={500}
          className={inputClass}
        />
      </Card>

      {/* 5. 체험 전 생각 */}
      <Card>
        <CardTitle sub="체험이 끝난 뒤 생각이 어떻게 바뀌었는지 함께 봅니다.">5. 체험 전 생각</CardTitle>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">지금은 어느 쪽에 기울어 있나요?</legend>
          <div className="grid grid-cols-3 gap-2">
            {LEANINGS.map((l) => (
              <label
                key={l}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-2 text-center text-[15px] font-medium text-ink hover:border-sub/40 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                  l === "air" && "has-[:checked]:border-air-ink has-[:checked]:bg-air-ink",
                  l === "pro" && "has-[:checked]:border-pro has-[:checked]:bg-pro",
                  l === "unsure" && "has-[:checked]:border-ink has-[:checked]:bg-ink",
                )}
              >
                <input
                  type="radio"
                  name="leaning"
                  value={l}
                  checked={leaning === l}
                  onChange={() => setLeaning(l)}
                  className="sr-only"
                />
                {LEANING_LABEL[l]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5">
          <ScorePicker
            name="confidenceBefore"
            legend="그 생각에 얼마나 확신하나요?"
            value={confidence}
            onChange={setConfidence}
            lowLabel="전혀 모르겠음"
            highLabel="매우 확신"
          />
        </div>
      </Card>

      <Notice tone="primary" title="이름·전화번호를 받지 않습니다">
        작업 유형·희망일·비교하고 싶은 점만 받습니다. {DEMO_NOTICE}
      </Notice>

      <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
        <p className="text-sm text-sub">{RESPONSE_TARGET}</p>
        <p className="mt-1 text-sm text-sub">요청을 보내도 아직 확정이 아닙니다. 운영자가 두 기기를 확보하면 결제 기한을 안내합니다.</p>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={!!savedId} className={cx(btn.primary, "mt-4 w-full sm:w-auto sm:px-8")}>
          데모 일정 요청 보내기
        </button>
        {savedId && (
          // 요청은 이미 저장됨 — 화면 이동이 늦어지면 직접 열 수 있게 한다
          <p role="status" className="mt-3 text-sm text-sub">
            {savedId} 요청을 이 기기에 저장했습니다. 내 체험으로 이동 중…{" "}
            <Link href={`/my/?id=${encodeURIComponent(savedId)}`} className="font-medium text-primary underline">
              바로 열기
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
