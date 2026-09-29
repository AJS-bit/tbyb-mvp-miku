"use client";

import type { Score } from "@/lib/domain";
import { cx } from "./ui";

const SCORES: Score[] = [1, 2, 3, 4, 5];

/** 확신 1–5 고르기 (라디오 그룹) */
export function ScorePicker({
  name,
  legend,
  value,
  onChange,
  lowLabel = "낮음",
  highLabel = "높음",
  disabled,
}: {
  name: string;
  legend: string;
  value: Score | null;
  onChange: (v: Score) => void;
  lowLabel?: string;
  highLabel?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-2.5 text-[15px] font-bold text-ink">{legend}</legend>
      <div className="flex items-center gap-2">
        {SCORES.map((s) => (
          <label
            key={s}
            className={cx(
              "relative flex h-12 min-w-11 flex-1 cursor-pointer items-center justify-center rounded-2xl border border-line-strong bg-surface text-[16px] font-bold text-ink transition-colors hover:bg-cream",
              "has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-ivory",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink has-[:disabled]:cursor-not-allowed",
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
      <div className="mt-1.5 flex items-center justify-between text-xs font-medium text-sub">
        <span>1 · {lowLabel}</span>
        <span>5 · {highLabel}</span>
      </div>
    </fieldset>
  );
}
