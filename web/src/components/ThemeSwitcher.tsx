"use client";

import { useEffect, useState } from "react";
import { setThemePref, useTheme } from "@/lib/theme";
import { THEME_LABEL, THEME_PREFS, THEME_SAVE_ERROR, type ThemePref } from "@/lib/theme-core";
import { cx } from "./ui";

// 고른 칸 모양은 <html data-theme-pref> 로 정한다 — 인라인 스크립트가 붙이므로 하이드레이션 전에도 맞다.
// (! 는 hover 색보다 우선하게)
const selectedTone: Record<ThemePref, string> = {
  system: "pref-system:bg-ink! pref-system:text-ivory!",
  light: "pref-light:bg-ink! pref-light:text-ivory!",
  dark: "pref-dark:bg-ink! pref-dark:text-ivory!",
};

const iconProps = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
  className: "h-[18px] w-[18px] shrink-0",
};

function ThemeIcon({ pref }: { pref: ThemePref }) {
  if (pref === "light") {
    return (
      <svg {...iconProps}>
        <circle cx="10" cy="10" r="3.4" />
        <path d="M10 2.5v1.6M10 15.9v1.6M2.5 10h1.6M15.9 10h1.6M4.7 4.7l1.1 1.1M14.2 14.2l1.1 1.1M4.7 15.3l1.1-1.1M14.2 5.8l1.1-1.1" />
      </svg>
    );
  }
  if (pref === "dark") {
    return (
      <svg {...iconProps}>
        <path d="M15.8 12.3A6.5 6.5 0 0 1 7.7 4.2a6.5 6.5 0 1 0 8.1 8.1Z" />
      </svg>
    );
  }
  // 시스템: 화면 반은 밝게 반은 어둡게
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="3.5" width="15" height="10" rx="2" />
      <path d="M10 3.5v10" />
      <path d="M10.6 4.2h5.1a1.1 1.1 0 0 1 1.1 1.1v6.4a1.1 1.1 0 0 1-1.1 1.1h-5.1Z" fill="currentColor" stroke="none" />
      <path d="M7 16.5h6" />
    </svg>
  );
}

/** 저장 실패 알림 — 누르는 것을 막지 않게 떠 있고, 몇 초 뒤 저절로 사라지며 닫을 수도 있다. */
function SaveNote({ failedAt }: { failedAt: number | null }) {
  const [dismissed, setDismissed] = useState<number | null>(null);
  const visible = failedAt !== null && failedAt !== dismissed;
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setDismissed(failedAt), 8000);
    return () => window.clearTimeout(t);
  }, [visible, failedAt]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute top-full right-0 z-40 mt-2 w-max max-w-[min(24rem,calc(100vw-2.5rem))]">
      {visible ? (
        <p
          data-testid="theme-save-error"
          className="flex items-start gap-2 rounded-2xl border border-warn-line bg-warn-bg py-2.5 pr-2 pl-3.5 text-[13px] font-semibold leading-snug text-warn shadow-(--shadow-lift)"
        >
          <span className="pt-0.5">{THEME_SAVE_ERROR}</span>
          <button
            type="button"
            onClick={() => setDismissed(failedAt)}
            className="pointer-events-auto -my-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[15px] leading-none hover:bg-surface/60"
          >
            <span aria-hidden>×</span>
            <span className="sr-only">알림 닫기</span>
          </button>
        </p>
      ) : null}
    </div>
  );
}

/** 상단 막대의 화면 테마 고르기 — 시스템(기본) · 라이트 · 다크. 좁은 화면에서는 아이콘만 보이고 이름은 읽어 준다. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const theme = useTheme();
  return (
    <div className={cx("relative shrink-0", className)}>
      <div role="radiogroup" aria-label="화면 테마" className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
        {THEME_PREFS.map((p) => (
          <label
            key={p}
            title={`화면 테마: ${THEME_LABEL[p]}`}
            className={cx(
              "inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-sub transition-colors hover:bg-cream hover:text-ink xl:px-3",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
              selectedTone[p],
            )}
          >
            <input
              type="radio"
              name="tbyb-theme"
              value={p}
              checked={theme?.pref === p}
              onChange={() => setThemePref(p)}
              className="sr-only"
            />
            <ThemeIcon pref={p} />
            <span className="sr-only xl:not-sr-only">{THEME_LABEL[p]}</span>
          </label>
        ))}
      </div>
      <SaveNote failedAt={theme?.saveFailedAt ?? null} />
    </div>
  );
}
