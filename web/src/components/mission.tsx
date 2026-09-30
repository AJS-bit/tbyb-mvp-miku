"use client";

import {
  MISSIONS,
  PICK_LABEL,
  REWARD_AMOUNT_LABEL,
  REWARD_STATUS_LABEL,
  missionProgress,
  missionSummary,
  type DeviceKey,
  type MissionAnswer,
  type MissionDef,
  type Pick,
  type Reservation,
  type RewardStatus,
} from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { REWARD_STEPS } from "@/lib/copy";
import { MissionIcon } from "./illustrations";
import { cx, shortName } from "./ui";

const KEYS: DeviceKey[] = ["air", "pro"];
export const PICKS: Pick[] = ["air", "same", "pro", "unsure"];

/** 답 칩 색 — Air 청록 · Pro 보라 · 비슷 회갈색 · 모르겠음 테두리 */
export const pickChipTone: Record<Pick, string> = {
  air: "bg-air-soft text-air-ink",
  same: "bg-mute-soft text-mute-ink",
  pro: "bg-pro-soft text-pro-ink",
  unsure: "bg-surface text-mute-ink ring-1 ring-inset ring-line-strong",
};

/** 큰 답 버튼이 골라졌을 때 색 */
export const pickSolidTone: Record<Pick, string> = {
  air: "has-[:checked]:border-air-ink has-[:checked]:bg-air-ink",
  same: "has-[:checked]:border-ink has-[:checked]:bg-ink",
  pro: "has-[:checked]:border-pro has-[:checked]:bg-pro",
  unsure: "has-[:checked]:border-mute-ink has-[:checked]:bg-mute-ink",
};

export const PICK_SHORT: Record<Pick, string> = { air: "Air", same: "비슷", pro: "Pro", unsure: "모르겠음" };

export function missionTitle(def: MissionDef): string {
  return def.title.replace(" (해 본 사람만)", "");
}

export function PickChip({ pick, className }: { pick: Pick; className?: string }) {
  return (
    <span
      data-testid="pick-chip"
      className={cx("inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold leading-4", pickChipTone[pick], className)}
    >
      {PICK_LABEL[pick]}
    </span>
  );
}

/** 답 한 개 요약 — 후속 선택·배터리·시간·해 본 일 */
export function AnswerDetails({ a, className }: { a: MissionAnswer; className?: string }) {
  const lines: string[] = [];
  if (a.followUp) lines.push(a.followUp);
  if (a.daily) lines.push(`해 본 일: ${a.daily}`);
  if (a.battery) lines.push(`배터리 ${KEYS.map((k) => `${shortName(k)} ${a.battery![k].before}→${a.battery![k].after}%`).join(" · ")}`);
  if (a.minutes) lines.push(`걸린 시간 ${KEYS.map((k) => `${shortName(k)} ${a.minutes![k]}분`).join(" · ")}`);
  if (!lines.length) return null;
  return (
    <ul className={cx("space-y-0.5 text-sm text-sub", className)}>
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}

const rewardTone: Record<RewardStatus, string> = {
  none: "bg-surface text-mute-ink ring-1 ring-inset ring-coral/30",
  submitted: "bg-coral text-on-coral",
  approved: "bg-success-soft text-success-ink",
  rejected: "bg-mute-soft text-mute-ink",
};

export function RewardStatusChip({ status }: { status: RewardStatus }) {
  return (
    <span
      data-testid="reward-status"
      className={cx("inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold leading-4", rewardTone[status])}
    >
      {REWARD_STATUS_LABEL[status]}
    </span>
  );
}

// ───────── 리워드: 금액 미정 · 확인 순서 (미션 기록 → 반납 점검 → 운영자 확인) ─────────

/**
 * 리워드 금액 — REWARD_AMOUNT_LABEL('금액 미정 (검토 중인 예: 1,000원)')에서 '금액 미정'을 앞세우고,
 * 괄호 속 예시는 작게 붙인다. 1,000원은 항상 '검토 중인 예'와 한 문장으로만 보인다.
 */
export function RewardAmount({ className, pill }: { className?: string; pill?: boolean }) {
  const cut = REWARD_AMOUNT_LABEL.indexOf(" (");
  const lead = cut > 0 ? REWARD_AMOUNT_LABEL.slice(0, cut) : REWARD_AMOUNT_LABEL;
  const note = cut > 0 ? REWARD_AMOUNT_LABEL.slice(cut + 1) : "";
  return (
    <p
      data-testid="reward-amount"
      className={cx(
        "flex-wrap items-baseline gap-x-2 gap-y-0.5 text-coral-ink",
        pill ? "inline-flex rounded-full bg-surface px-4 py-2 ring-1 ring-coral/30" : "flex",
        className,
      )}
    >
      <strong className="font-extrabold">{lead}</strong>
      {note ? <span className="text-[0.8em] font-semibold">{note}</span> : null}
    </p>
  );
}

/** 지금 리워드가 어느 단계인지: 0 미션 기록 · 1 반납 점검 · 2 운영자 확인 · 3 모두 끝남 (reviewReward 는 검수 단계부터) */
export function rewardStep(r: Reservation): 0 | 1 | 2 | 3 {
  const { status } = r.reward;
  if (status === "approved" || status === "rejected") return 3;
  if (status === "submitted") return r.status === "inspecting" || r.status === "completed" ? 2 : 1;
  return 0;
}

/** 소개 화면용 — 세 단계와 한 줄 설명 */
export function RewardFlowIntro({ className }: { className?: string }) {
  return (
    <ol aria-label="리워드 확인 순서" data-testid="reward-flow" className={cx("grid gap-2.5 sm:grid-cols-3 sm:gap-4", className)}>
      {REWARD_STEPS.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 rounded-2xl bg-surface/85 p-4 sm:flex-col sm:gap-2.5">
          {/* 넓은 화면: 카드 사이 화살표로 순서를 보여 준다 */}
          {i < REWARD_STEPS.length - 1 ? (
            <span
              aria-hidden
              className="absolute top-1/2 -right-5 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-coral-soft text-coral-ink sm:flex"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </span>
          ) : null}
          <span
            aria-hidden
            className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-on-coral"
          >
            {i + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold leading-snug text-ink">
              <span className="sr-only">{i + 1}단계 </span>
              {s.label}
            </span>
            <span className="mt-0.5 block text-sm leading-relaxed text-sub">{s.body}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** 내 체험 · 미션 화면용 — 지금 단계가 보이는 가로 진행 표시 */
export function RewardFlow({ r, className }: { r: Reservation; className?: string }) {
  const cur = rewardStep(r);
  return (
    <ol aria-label="리워드 확인 순서" data-testid="reward-flow" className={cx("grid grid-cols-3", className)}>
      {REWARD_STEPS.map((s, i) => {
        const done = i < cur;
        const now = i === cur;
        return (
          <li key={s.label} aria-current={now ? "step" : undefined} className="relative flex flex-col items-center px-1 text-center">
            {i < REWARD_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cx(
                  "absolute top-[13px] right-[calc(-50%+18px)] left-[calc(50%+18px)] h-0.5 rounded-full",
                  done ? "bg-coral" : "bg-ink/15",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cx(
                "tabular relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                done && "bg-coral text-on-coral",
                now && "bg-surface text-coral-ink ring-2 ring-coral-ink",
                !done && !now && "bg-surface text-sub ring-1 ring-line-strong",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={cx("mt-1.5 text-[13px] leading-tight", now ? "font-extrabold text-ink" : done ? "font-semibold text-ink" : "font-semibold text-sub")}>
              {s.label}
              <span className="sr-only">{done ? " — 끝났어요" : now ? " — 지금 단계" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** 미션 여섯 개 작은 아이콘 줄 — 답한 미션은 체크 */
export function MissionDots({ r }: { r: Reservation }) {
  return (
    <ul className="grid max-w-[360px] grid-cols-6 gap-1.5 sm:gap-2" aria-label="미션별 진행">
      {MISSIONS.map((m) => {
        const a = r.missions[m.id];
        return (
          <li key={m.id} className="relative" title={missionTitle(m)}>
            <span className={cx("flex aspect-square w-full items-center justify-center rounded-2xl", a ? "bg-cream" : "opacity-45")}>
              <MissionIcon id={m.id} className="h-3/4 w-3/4" />
            </span>
            {a ? (
              <span aria-hidden className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-ivory ring-2 ring-surface">
                ✓
              </span>
            ) : null}
            <span className="sr-only">
              {missionTitle(m)}: {a ? PICK_LABEL[a.pick] : "아직"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Air n · 비슷 n · Pro n · 모르겠음 n */
export function MissionSummary({ r }: { r: Reservation }) {
  const sum = missionSummary(r);
  const total = PICKS.reduce((n, p) => n + sum[p], 0);
  // 모르겠음은 칸(테두리만 있는 칩)과 같게 테두리 조각으로 — 채운 색으로는 막대 바탕과 구분되지 않았다
  const bar: Record<Pick, string> = {
    air: "bg-air",
    same: "bg-line-strong",
    pro: "bg-pro",
    unsure: "rounded-r-full bg-surface ring-1 ring-sub/60 ring-inset",
  };
  return (
    <div data-testid="mission-summary">
      <div className="grid grid-cols-4 gap-2">
        {PICKS.map((p) => (
          <div key={p} data-testid={`summary-${p}`} className={cx("rounded-2xl px-2 py-3 text-center", pickChipTone[p])}>
            <p className="tabular text-[28px] font-extrabold leading-none">{sum[p]}</p>
            <p className="mt-1.5 text-xs font-bold">{PICK_SHORT[p]}</p>
          </div>
        ))}
      </div>
      {total ? (
        <div aria-hidden className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-cream">
          {PICKS.map((p) => (sum[p] ? <span key={p} className={bar[p]} style={{ width: `${(sum[p] / total) * 100}%` }} /> : null))}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-sub">답한 미션 {total}개 기준이에요. 비슷했다는 답, 모르겠다는 답도 그대로 셌어요.</p>
    </div>
  );
}

/** 미션별 고른 답 목록 */
export function MissionPickList({ r }: { r: Reservation }) {
  return (
    <ul className="divide-y divide-line" data-testid="mission-pick-list">
      {MISSIONS.map((m) => {
        const a = r.missions[m.id];
        return (
          <li key={m.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <MissionIcon id={m.id} className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-[15px] font-semibold text-ink">{missionTitle(m)}</p>
                {a ? <PickChip pick={a.pick} /> : <span className="text-xs font-semibold text-sub">{m.optional ? "선택 · 안 했어요" : "아직 안 했어요"}</span>}
              </div>
              {a ? <AnswerDetails a={a} className="mt-0.5" /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 운영 화면용: 미션 답 표 (시각 포함) */
export function MissionAnswerTable({ r }: { r: Reservation }) {
  return (
    <ul className="space-y-2">
      {MISSIONS.map((m) => {
        const a = r.missions[m.id];
        return (
          <li key={m.id} className="flex items-start gap-3 rounded-2xl bg-bg px-3 py-2.5">
            <MissionIcon id={m.id} className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-ink">{missionTitle(m)}</span>
                {a ? <PickChip pick={a.pick} /> : <span className="text-xs text-sub">답 없음</span>}
              </div>
              {a ? (
                <>
                  <AnswerDetails a={a} />
                  <p className="tabular text-xs text-sub">{fmtDateTime(a.answeredAt)}</p>
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function progressText(r: Reservation): string {
  const p = missionProgress(r);
  return `${p.done}/${p.total}`;
}

