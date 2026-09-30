// tbyb 플랫폼 로고 — shared/brand/tbyb/MARK.svg 의 도형을 그대로 인라인 SVG 로 그린다 (TETO 선택안 · 도형·색을 바꾸지 않는다).
// 같은 크기의 열린 프레임 두 개(왼쪽 forest · 오른쪽 apricot)가 가운데 점(나의 기준)을 마주 본다. viewBox 0 0 100 80.
// 색은 globals.css 의 --color-brand-* 토큰: 라이트는 MARK.svg 색, 다크는 MARK_DARK.svg(sage·apricot 컬러, 워드마크는 cream).
// 워드마크는 소문자 tbyb — Georgia 600, 자간 -0.06em, 심볼 높이 ≈ 글자 크기 × 0.9, 간격 ≈ 0.22em (README 비율).
import { PLATFORM_NAME, PLATFORM_TAGLINE } from "@/lib/copy";
import { cx } from "./ui";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" className={cx("shrink-0", className)} aria-hidden focusable="false">
      <path
        className="fill-brand-left"
        d="M42 8H24C13 8 4 17 4 28V52C4 63 13 72 24 72H42V56H27C23 56 20 53 20 49V31C20 27 23 24 27 24H42Z"
      />
      <path
        className="fill-brand-right"
        d="M58 8H76C87 8 96 17 96 28V52C96 63 87 72 76 72H58V56H73C77 56 80 53 80 49V31C80 27 77 24 73 24H58Z"
      />
      <circle className="fill-brand-dot" cx="50" cy="40" r="6" />
    </svg>
  );
}

/** 심볼 + 워드마크. 글자 크기와 심볼 높이는 README 비율(0.9)대로 짝을 맞춘다. */
function Mark({ size }: { size: "header" | "footer" }) {
  return (
    <span
      data-testid="brand-lockup"
      className={cx(
        "flex shrink-0 items-center",
        size === "header" ? "gap-[6px] sm:gap-[7px]" : "gap-[8px]",
      )}
    >
      <BrandMark className={size === "header" ? "h-[25px] w-[31px] sm:h-[29px] sm:w-[36px]" : "h-[32px] w-[40px]"} />
      <span
        className={cx(
          "font-wordmark font-semibold leading-none tracking-[-0.06em] text-brand-word",
          size === "header" ? "text-[28px] sm:text-[32px]" : "text-[36px]",
        )}
      >
        {PLATFORM_NAME}
      </span>
    </span>
  );
}

/**
 * 헤더 로고 — 좁은 화면은 심볼 + tbyb, sm 부터 오른쪽에 태그라인 "써 보고, 나의 기준으로."
 * (320·390px 에서는 테마 스위처와 한 줄에 들어가야 해서 태그라인을 뺀다)
 */
export function HeaderLockup() {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Mark size="header" />
      <span aria-hidden className="hidden h-6 w-px shrink-0 bg-line-strong sm:block" />
      <span className="hidden truncate text-[13px] font-semibold leading-tight text-sub sm:block">{PLATFORM_TAGLINE}</span>
    </span>
  );
}

/** 푸터 로고 — 심볼 + tbyb 아래에 태그라인 */
export function FooterLockup() {
  return (
    <div>
      <Mark size="footer" />
      <p className="mt-3 text-[15px] font-semibold text-ink">{PLATFORM_TAGLINE}</p>
    </div>
  );
}
