"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  DECISION_LABEL,
  DEVICE_LABEL,
  LEANING_LABEL,
  STATUS_FLOW,
  STATUS_LABEL,
  USAGE_LABEL,
  type Decision,
  type HistoryItem,
  type Reservation,
} from "@/lib/domain";
import { fmtDateKey, fmtDateTime } from "@/lib/format";
import { DefList, Notice, cx } from "./ui";

/** ?id=TB-0001 — useSearchParams 를 쓰므로 호출하는 컴포넌트는 <Suspense> 안에 있어야 한다. */
export function useIdParam(): string | null {
  const sp = useSearchParams();
  return sp.get("id");
}

export const ACTOR_LABEL = { customer: "고객", operator: "운영자" } as const;

export function decisionText(d: Decision | undefined): string {
  if (!d) return "아직 남기지 않았어요";
  // DECISION_LABEL 은 문장('…살게요')이라 모델은 괄호로 덧붙인다
  const model = d.model ? ` (${DEVICE_LABEL[d.model]})` : "";
  return `${DECISION_LABEL[d.choice]}${model}`;
}

export const myHref = (id: string, page: "" | "missions/" | "decide/" = "") => `/my/${page}?id=${encodeURIComponent(id)}`;

export function RequestSummary({ r }: { r: Reservation }) {
  return (
    <DefList
      items={[
        { label: "희망 시작일", value: fmtDateKey(r.request.startDate) },
        { label: "픽업 매장", value: r.request.pickupStore },
        { label: "주로 할 것 같은 일", value: USAGE_LABEL[r.request.usage] },
        {
          label: "체험 전 마음",
          value: `${LEANING_LABEL[r.request.leaningBefore]} · 확신 ${r.request.confidenceBefore}/5`,
        },
        { label: "궁금한 점", value: r.request.question || <span className="text-sub">적지 않았어요</span> },
        { label: "요청 시각", value: fmtDateTime(r.createdAt) },
      ]}
    />
  );
}

function lastAt(history: HistoryItem[], to: string): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].to === to && history[i].from !== to) return history[i].at;
  return undefined;
}

/** STATUS_FLOW 세로 타임라인. 취소는 타임라인 밖에 따로 표시한다. */
export function Timeline({ r }: { r: Reservation }) {
  const cancelled = r.status === "cancelled";
  const cancelItem = cancelled ? [...r.history].reverse().find((h) => h.to === "cancelled") : undefined;
  const reachedStatus = cancelled ? cancelItem?.from ?? "requested" : r.status;
  const reached = STATUS_FLOW.indexOf(reachedStatus);
  return (
    <div>
      {cancelled ? (
        <Notice tone="info" className="mb-5" title="취소한 때와 이유">
          {fmtDateTime(cancelItem?.at)} · {cancelItem ? ACTOR_LABEL[cancelItem.actor] : ""} · 사유: {cancelItem?.reason}
        </Notice>
      ) : null}
      <ol aria-label="진행 단계" className="relative">
        {STATUS_FLOW.map((s, i) => {
          const done = i < reached || (i === reached && (s === "completed" || cancelled));
          const current = !cancelled && i === reached && s !== "completed";
          const at = i <= reached ? lastAt(r.history, s) : undefined;
          const last = i === STATUS_FLOW.length - 1;
          return (
            <li key={s} className="relative flex gap-3.5 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
              {!last ? (
                <span
                  aria-hidden
                  className={cx("absolute top-7 left-[13px] h-[calc(100%-24px)] w-0.5 rounded-full", i < reached ? "bg-ink" : "bg-line")}
                />
              ) : null}
              <span
                aria-hidden
                className={cx(
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done && (cancelled ? "bg-sub text-ivory" : "bg-ink text-ivory"),
                  current && "bg-coral text-on-coral ring-[6px] ring-coral/20",
                  !done && !current && "bg-surface text-sub ring-1 ring-line-strong",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={cx("text-[15px] leading-snug", current ? "font-extrabold text-ink" : done ? "font-semibold text-ink" : "text-sub")}>
                  {STATUS_LABEL[s]}
                  {current ? <span className="ml-2 text-xs font-bold text-coral-ink">지금</span> : null}
                  {current ? <span className="sr-only"> (현재 단계)</span> : null}
                </p>
                {at ? <p className="tabular mt-0.5 text-xs text-sub">{fmtDateTime(at)}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** 고객 화면용 변경 이력 (운영 화면은 전체 사유를 표로 보여 준다) */
export function HistoryList({ history }: { history: HistoryItem[] }) {
  return (
    <ol className="space-y-2">
      {[...history].reverse().map((h, i) => (
        <li key={`${h.at}-${i}`} className="rounded-2xl bg-bg px-4 py-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="font-semibold text-ink">
              {h.from === h.to
                ? `${STATUS_LABEL[h.to]} · 운영 기록`
                : `${h.from ? STATUS_LABEL[h.from] : "시작"} → ${STATUS_LABEL[h.to]}`}
            </span>
            <span className="tabular text-xs text-sub">{fmtDateTime(h.at)}</span>
          </div>
          <p className="mt-0.5 text-sub">
            {ACTOR_LABEL[h.actor]} · {h.reason /* internalNote 는 운영자 전용 — 고객 화면에 표시하지 않는다 */}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function NotFound({ id }: { id: string }) {
  return (
    <Notice tone="warn" title={`${id} 예약을 이 기기에서 찾을 수 없어요`}>
      <p>데모 데이터는 이 브라우저에만 저장돼요. 다른 기기나 브라우저에서 만든 요청은 여기서 보이지 않아요.</p>
      <p className="mt-2">
        <Link href="/my/" className="font-bold underline underline-offset-2">
          내 체험 목록
        </Link>
        으로 돌아가기
      </p>
    </Notice>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex min-h-9 items-center gap-1.5 rounded-full text-sm font-semibold text-sub hover:text-ink"
    >
      <span aria-hidden>←</span> {children}
    </Link>
  );
}
