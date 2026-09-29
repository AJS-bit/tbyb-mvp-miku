"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  DAY_STATUS_LABEL,
  DEMO_NOTICE,
  LEANING_LABEL,
  PICKUP_STORES,
  RESPONSE_TARGET,
  USAGE_LABEL,
  calendarDays,
  createReservation,
  parseDate,
  type DayStatus,
  type Leaning,
  type Score,
  type Usage,
} from "@/lib/domain";
import { apply, demoNow, useDemo } from "@/lib/store";
import { WEEKDAY_LABELS, fmtDateKey, fmtDateTime } from "@/lib/format";
import { ScorePicker } from "@/components/ScorePicker";
import { Card, ErrorText, Notice, Skeleton, Tag, btn, chipLabel, cx, inputClass } from "@/components/ui";

const dayTone: Record<DayStatus, string> = {
  open: "bg-surface text-ink ring-1 ring-line-strong hover:bg-cream",
  check: "bg-warn-bg text-warn ring-1 ring-warn-line hover:ring-warn",
  closed: "cursor-not-allowed bg-mute-soft/70 text-sub/70",
};
const dayLabelTone: Record<DayStatus, string> = {
  open: "text-success-ink",
  check: "text-warn",
  closed: "text-sub",
};

const LEANINGS: Leaning[] = ["air", "unsure", "pro"];
const USAGES = Object.keys(USAGE_LABEL) as Usage[];

const radioCard =
  "flex cursor-pointer items-center gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-3.5 text-[15px] text-ink transition-colors hover:bg-cream has-[:checked]:border-ink has-[:checked]:bg-cream has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink";

function Step({ n, title, tag, sub, children, id }: { n: number; title: string; tag: "필수" | "선택"; sub?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <Card aria-labelledby={id}>
      <div className="mb-5 flex gap-3.5">
        <span
          aria-hidden
          className="tabular mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-ivory"
        >
          {n}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="flex flex-wrap items-center gap-2 text-[19px] font-bold leading-snug text-ink">
            {title}
            <Tag tone={tag === "필수" ? "ink" : "mute"}>{tag}</Tag>
          </h2>
          {sub ? <div className="mt-1 text-[15px] leading-relaxed text-sub">{sub}</div> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}

export function RequestForm() {
  const snap = useDemo();
  const router = useRouter();
  const [date, setDate] = useState("");
  const [store, setStore] = useState("");
  const [usage, setUsage] = useState<Usage>("unsure");
  const [question, setQuestion] = useState("");
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
    const r = apply((s, now) =>
      createReservation(
        s,
        {
          startDate: date,
          pickupStore: store,
          usage,
          question,
          leaningBefore: leaning,
          // 고르지 않았으면 0 을 넘겨 domain 이 순서대로(날짜 → 매장 → 확신) 오류 문구를 돌려주게 한다
          confidenceBefore: confidence ?? (0 as Score),
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
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* 1. 날짜 */}
      <Step
        n={1}
        id="cal-title"
        title="언제부터 써 볼까요?"
        tag="필수"
        sub={
          <>
            마지막 갱신 <span className="tabular font-semibold text-ink">{fmtDateTime(snap.state.calendarUpdatedAt)}</span> · 확정
            재고가 아니에요. 운영자가 두 기기를 확인한 뒤에 확정돼요.
          </>
        }
      >
        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-sub" aria-label="날짜 상태 안내">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-surface ring-1 ring-line-strong" />
            {DAY_STATUS_LABEL.open}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-warn-bg ring-1 ring-warn-line" />
            {DAY_STATUS_LABEL.check} — 요청은 되지만 매장·재고 확인이 더 필요
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mute-soft" />
            {DAY_STATUS_LABEL.closed} — 고를 수 없음
          </li>
        </ul>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="희망 시작일 (앞으로 14일)">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={w} aria-hidden className={cx("pb-1 text-center text-xs font-semibold", i === 0 ? "text-danger-ink/80" : "text-sub")}>
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
                  "flex min-h-[64px] flex-col items-center justify-start gap-0.5 rounded-2xl px-0.5 pt-2.5 pb-1.5 transition-colors",
                  dayTone[d.status],
                  isSel && "bg-ink! text-ivory! ring-ink!",
                )}
              >
                <span className={cx("tabular text-[15px] font-bold leading-none", d.status === "closed" && "line-through")}>
                  {showMonth ? `${dt.getMonth() + 1}/${dt.getDate()}` : dt.getDate()}
                </span>
                <span className={cx("mt-1 text-[10px] font-semibold leading-tight", isSel ? "text-ivory/80" : dayLabelTone[d.status])}>
                  {DAY_STATUS_LABEL[d.status]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[15px] text-ink" aria-live="polite">
          {selected ? (
            <>
              고른 날: <strong className="font-bold">{fmtDateKey(selected.date)}</strong> · {DAY_STATUS_LABEL[selected.status]}
            </>
          ) : (
            <span className="text-sub">날짜를 골라 주세요.</span>
          )}
        </p>
      </Step>

      {/* 2. 매장 */}
      <Step n={2} id="store-title" title="어디서 받을까요?" tag="필수">
        <fieldset>
          <legend className="sr-only">픽업 매장</legend>
          <div className="space-y-2">
            {PICKUP_STORES.map((s) => (
              <label key={s} className={radioCard}>
                <input
                  type="radio"
                  name="store"
                  value={s}
                  checked={store === s}
                  onChange={() => setStore(s)}
                  className="h-4 w-4 shrink-0 accent-ink"
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Step>

      {/* 3. 용도 (선택) */}
      <Step
        n={3}
        id="usage-title"
        title="주로 뭘 할 것 같아요?"
        tag="선택"
        sub="맥이 처음이라 잘 모르겠다면 그대로 두세요. 미션은 누구에게나 같아요."
      >
        <fieldset>
          <legend className="sr-only">주로 할 것 같은 일</legend>
          <div className="flex flex-wrap gap-2">
            {USAGES.map((u) => (
              <label key={u} className={chipLabel}>
                <input type="radio" name="usage" value={u} checked={usage === u} onChange={() => setUsage(u)} className="sr-only" />
                {USAGE_LABEL[u]}
              </label>
            ))}
          </div>
        </fieldset>
      </Step>

      {/* 4. 궁금한 점 (선택) */}
      <Step n={4} id="question-title" title="궁금한 점이 있나요?" tag="선택">
        <label htmlFor="question" className="sr-only">
          궁금한 점
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          maxLength={500}
          className={inputClass}
          placeholder="예: 유튜브랑 과제 정도인데 Pro까지 필요할까요?"
        />
      </Step>

      {/* 5. 지금 마음 */}
      <Step
        n={5}
        id="mind-title"
        title="지금 마음은 어느 쪽이에요?"
        tag="필수"
        sub="체험이 끝난 뒤 마음이 어떻게 바뀌었는지 함께 봐요. 모르겠음도 좋아요."
      >
        <fieldset>
          <legend className="mb-2.5 text-[15px] font-bold text-ink">지금 끌리는 쪽</legend>
          <div className="grid grid-cols-3 gap-2">
            {LEANINGS.map((l) => (
              <label
                key={l}
                className={cx(
                  "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border border-line-strong bg-surface px-2 text-center text-[15px] font-bold text-ink transition-colors hover:bg-cream has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  l === "air" && "has-[:checked]:border-air-ink has-[:checked]:bg-air-ink",
                  l === "pro" && "has-[:checked]:border-pro has-[:checked]:bg-pro",
                  l === "unsure" && "has-[:checked]:border-ink has-[:checked]:bg-ink",
                )}
              >
                <input type="radio" name="leaning" value={l} checked={leaning === l} onChange={() => setLeaning(l)} className="sr-only" />
                {LEANING_LABEL[l]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-6">
          <ScorePicker
            name="confidenceBefore"
            legend="그 마음, 얼마나 확실해요?"
            value={confidence}
            onChange={setConfidence}
            lowLabel="전혀 모르겠음"
            highLabel="아주 확실"
          />
        </div>
      </Step>

      <Notice title="이름·전화번호를 받지 않아요">
        날짜·픽업 매장과 고른 답만 이 기기에 저장해요. {DEMO_NOTICE}
      </Notice>

      <div className="rounded-3xl bg-cream/70 p-5 sm:p-7">
        <p className="text-sm text-sub">{RESPONSE_TARGET}</p>
        <p className="mt-1 text-sm text-sub">요청을 보내도 아직 확정이 아니에요. 운영자가 두 기기를 확보하면 결제 기한을 알려 드려요.</p>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={!!savedId} className={cx(btn.primary, "mt-5 w-full sm:w-auto sm:px-10")}>
          데모 일정 요청 보내기
        </button>
        {savedId && (
          // 요청은 이미 저장됨 — 화면 이동이 늦어지면 직접 열 수 있게 한다
          <p role="status" className="mt-3 text-sm text-sub">
            {savedId} 요청을 이 기기에 저장했어요. 내 체험으로 이동 중…{" "}
            <Link href={`/my/?id=${encodeURIComponent(savedId)}`} className="font-bold text-ink underline underline-offset-2">
              바로 열기
            </Link>
          </p>
        )}
      </div>
    </form>
  );
}
