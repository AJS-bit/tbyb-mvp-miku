// 로고 — shared/brand/logo-mark.svg 와 같은 그림을 인라인 SVG 로 그린다(색은 globals.css 의 --brand-* 변수라 테마를 따라간다).
// 앞 왼쪽의 얇은 Air(청록) · 뒤 오른쪽의 Pro(보라) · 코랄 반짝임. 겹친 곳의 틈은 마스크로 비워 어느 바탕에서도 보인다.
// 헤더·푸터에 동시에 나오므로 그라데이션·마스크 id 는 uid 로 나눈다.
import { SERVICE_NAME } from "@/lib/domain";
import { cx } from "./ui";

const b = (name: string) => `var(--brand-${name})`;

export function BrandMark({ uid, className }: { uid: string; className?: string }) {
  const air = `${uid}-air`;
  const pro = `${uid}-pro`;
  const gap = `${uid}-gap`;
  return (
    <svg viewBox="0 0 64 64" className={cx("shrink-0", className)} aria-hidden focusable="false">
      <defs>
        <linearGradient id={air} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: b("air-a") }} />
          <stop offset="1" style={{ stopColor: b("air-b") }} />
        </linearGradient>
        <linearGradient id={pro} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: b("pro-a") }} />
          <stop offset="1" style={{ stopColor: b("pro-b") }} />
        </linearGradient>
        <mask id={gap} maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">
          <rect x="-8" y="-8" width="80" height="80" fill="#fff" />
          <g fill="#000" stroke="#000" strokeWidth="4.8" strokeLinejoin="round">
            <rect x="5" y="24" width="33" height="23" rx="3.4" />
            <rect x="1" y="48.2" width="41" height="3" />
          </g>
        </mask>
      </defs>
      <g transform="translate(0 2.2)">
        <g mask={`url(#${gap})`}>
          <rect x="23" y="10" width="36" height="25" rx="3.6" fill={`url(#${pro})`} />
          <circle cx="41" cy="11.9" r="0.75" style={{ fill: b("cam"), fillOpacity: 0.55 }} />
          <path d="M19 36.2H63L61.6 39Q61.2 40.6 60 40.6H22Q20.8 40.6 20.4 39Z" style={{ fill: b("base") }} />
        </g>
        <rect x="5" y="24" width="33" height="23" rx="3.4" fill={`url(#${air})`} />
        <circle cx="21.5" cy="25.8" r="0.7" style={{ fill: b("cam"), fillOpacity: 0.5 }} />
        <path d="M1 48.2H42L41 49.7Q40.6 51.2 39.5 51.2H3.5Q2.4 51.2 2 49.7Z" style={{ fill: b("base") }} />
        <path
          d="M13.5 8Q15.04 11.96 19 13.5Q15.04 15.04 13.5 19Q11.96 15.04 8 13.5Q11.96 11.96 13.5 8Z"
          style={{ fill: b("spark") }}
        />
      </g>
    </svg>
  );
}

/** 마크 + 워드마크(고운바탕) + 태그라인 "써 보고 고르는 맥북" */
export function BrandLockup({ uid, className, tagline = true }: { uid: string; className?: string; tagline?: boolean }) {
  return (
    <span className={cx("flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark uid={uid} className="h-9 w-9 sm:h-10 sm:w-10" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-serif text-[17px] font-bold leading-[1.15] tracking-[-0.005em] text-ink sm:text-[18px]">
          {SERVICE_NAME}
        </span>
        {tagline ? (
          <span className="mt-0.5 truncate text-[11.5px] font-semibold leading-tight tracking-[0.02em] text-sub">써 보고 고르는 맥북</span>
        ) : null}
      </span>
    </span>
  );
}
