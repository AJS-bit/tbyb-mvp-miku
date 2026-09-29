"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SERVICE_NAME } from "@/lib/domain";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "소개" },
  { href: "/pack/", label: "비교팩" },
  { href: "/request/", label: "일정 요청" },
  { href: "/my/", label: "내 체험" },
  { href: "/ops/", label: "운영 시뮬레이터" },
];

function norm(p: string): string {
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

function isActive(pathname: string, href: string): boolean {
  const p = norm(pathname);
  const h = norm(href);
  if (h === "/") return p === "/";
  return p === h || p.startsWith(`${h}/`);
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("relative flex h-6 w-9 shrink-0 items-center", className)}>
      <span className="absolute left-0 h-5 w-5 rounded-full bg-air" />
      {/* 라이트는 곱하기로 겹친 부분이 짙어지고, 다크는 스크린으로 겹친 부분이 밝아진다 (어두운 바탕에 곱하면 사라짐) */}
      <span className="absolute left-3.5 h-5 w-5 rounded-full bg-pro/90 mix-blend-multiply dark:mix-blend-screen" />
      <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-coral" />
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/85 backdrop-blur-md">
      {/* 좁은 화면: [로고 · 테마] 한 줄 + 메뉴 한 줄 (grid 자리 지정). lg 부터: 로고 · 메뉴 · 테마 한 줄.
          DOM 순서는 로고 → 메뉴 → 테마라 키보드 초점 순서가 넓은 화면의 보이는 순서와 같다. */}
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 pt-3 pb-2 sm:px-8 lg:flex lg:gap-6 lg:py-3.5">
        <Link
          href="/"
          className="col-start-1 row-start-1 flex min-w-0 items-center gap-2.5 justify-self-start rounded-lg lg:mr-auto"
          aria-label={`${SERVICE_NAME} 소개로`}
        >
          <BrandMark />
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">{SERVICE_NAME}</span>
          <span className="hidden text-xs font-semibold text-sub md:inline lg:hidden xl:inline">MacBook 비교 체험</span>
        </Link>
        <nav aria-label="주 메뉴" className="col-span-2 row-start-2 -mx-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:min-w-0 lg:px-0">
          <ul className="flex min-w-max items-center gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition-colors sm:px-3.5 sm:text-sm",
                      active ? "bg-ink text-ivory" : "text-sub hover:bg-cream hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <ThemeSwitcher className="col-start-2 row-start-1" />
      </div>
    </header>
  );
}
