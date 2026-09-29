"use client";

import type { Score } from "@/lib/domain";
import { cx } from "./ui";

const SCORES: Score[] = [1, 2, 3, 4, 5];

const accent = {
  primary: "has-[:checked]:bg-primary has-[:checked]:border-primary",
  air: "has-[:checked]:bg-air-ink has-[:checked]:border-air-ink",
  pro: "has-[:checked]:bg-pro has-[:checked]:border-pro",
};

/** 1–5 점수 고르기 (라디오 그룹). allowClear 이면 '선택 안 함'으로 되돌릴 수 있다. */
export function ScorePicker({
  name,
  legend,
  value,
  onChange,
  allowClear,
  tone = "primary",
  lowLabel = "낮음",
  highLabel = "높음",
  compact,
}: {
  name: string;
  legend: string;
  value: Score | null;
  onChange: (v: Score | null) => void;
  allowClear?: boolean;
  tone?: keyof typeof accent;
  lowLabel?: string;
  highLabel?: string;
  compact?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={cx("text-sm font-medium text-ink", compact ? "mb-1.5" : "mb-2")}>{legend}</legend>
      <div className="flex items-center gap-1.5">
        {SCORES.map((s) => (
          <label
            key={s}
            className={cx(
              "relative flex h-10 min-w-10 flex-1 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-[15px] font-semibold text-ink transition-colors hover:border-sub/50 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
              accent[tone],
            )}
          >
            <input
              type="radio"
              name={name}
              value={s}
              checked={value === s}
              onChange={() => onChange(s)}
              className="sr-only"
              aria-label={`${legend} ${s}점`}
            />
            {s}
          </label>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-sub">
        <span>1 {lowLabel}</span>
        {allowClear && value !== null ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded px-1 text-xs font-medium text-primary-ink underline-offset-2 hover:underline"
          >
            선택 지우기
          </button>
        ) : null}
        <span>5 {highLabel}</span>
      </div>
    </fieldset>
  );
}
