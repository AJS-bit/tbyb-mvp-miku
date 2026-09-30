"use client";

import {
  MISSIONS,
  PICK_LABEL,
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

