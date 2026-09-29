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
  WORK_TYPES,
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
  if (!d) return "아직 남기지 않음";
  const model = d.model ? ` — ${DEVICE_LABEL[d.model]}` : "";
  return `${DECISION_LABEL[d.choice]}${model}`;
}

export function RequestSummary({ r }: { r: Reservation }) {
  return (
    <DefList
      items={[
        { label: "희망 시작일", value: fmtDateKey(r.request.startDate) },
        { label: "픽업 매장", value: r.request.pickupStore },
        { label: "작업 유형", value: WORK_TYPES[r.request.workType].label },
        {
          label: "체험 전 생각",
          value: `${LEANING_LABEL[r.request.leaningBefore]} · 확신 ${r.request.confidenceBefore}/5`,
        },
        { label: "비교하고 싶은 점", value: r.request.wantToCompare || <span className="text-sub">적지 않음</span> },
        { label: "요청 시각", value: fmtDateTime(r.createdAt) },
      ]}
    />
  );
}

function lastAt(history: HistoryItem[], to: string): string | undefined {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].to === to) return history[i].at;
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
        <Notice tone="info" className="mb-4 bg-muted-soft" title="취소된 요청입니다">
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
            <li key={s} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
              {!last ? (
                <span
                  aria-hidden
                  className={cx("absolute top-6 left-[11px] h-[calc(100%-20px)] w-0.5", i < reached ? "bg-primary" : "bg-line")}
                />
              ) : null}
              <span
                aria-hidden
                className={cx(
                  "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done && (cancelled ? "bg-sub text-white" : "bg-primary text-white"),
                  current && "bg-surface text-primary ring-[5px] ring-primary/25 outline-2 outline-primary",
                  !done && !current && "bg-surface text-sub ring-1 ring-line",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={cx("text-[15px] leading-snug", current ? "font-bold text-ink" : done ? "font-medium text-ink" : "text-sub")}>
                  {STATUS_LABEL[s]}
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

export function HistoryList({ history }: { history: HistoryItem[] }) {
  return (
    <ol className="space-y-2">
      {[...history].reverse().map((h, i) => (
        <li key={`${h.at}-${i}`} className="rounded-lg bg-bg px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className="font-medium text-ink">
              {h.from === h.to
                ? `${STATUS_LABEL[h.to]} · 운영 기록`
                : `${h.from ? STATUS_LABEL[h.from] : "시작"} → ${STATUS_LABEL[h.to]}`}
            </span>
            <span className="tabular text-xs text-sub">{fmtDateTime(h.at)}</span>
          </div>
          <p className="mt-0.5 text-sub">
            {ACTOR_LABEL[h.actor]} · {h.reason}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function NotFound({ id }: { id: string }) {
  return (
    <Notice tone="warn" title={`${id} 예약을 이 기기에서 찾을 수 없습니다`}>
      <p>데모 데이터는 이 브라우저 안에만 저장됩니다. 다른 기기·브라우저에서 만든 요청은 보이지 않습니다.</p>
      <p className="mt-2">
        <Link href="/my/" className="font-semibold underline underline-offset-2">
          내 체험 목록
        </Link>
        으로 돌아가기
      </p>
    </Notice>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex min-h-9 items-center gap-1 rounded-lg text-sm font-medium text-primary-ink hover:underline">
      <span aria-hidden>←</span> {children}
    </Link>
  );
}
