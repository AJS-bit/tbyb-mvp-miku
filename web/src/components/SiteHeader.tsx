"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SERVICE_NAME } from "@/lib/domain";
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
      <span className="absolute left-3.5 h-5 w-5 rounded-full bg-pro/90 mix-blend-multiply" />
      <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-coral" />
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ivory/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 pt-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-3.5">
        <Link href="/" className="flex items-center gap-2.5 self-start rounded-lg sm:self-auto" aria-label={`${SERVICE_NAME} 소개로`}>
          <BrandMark />
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-ink">{SERVICE_NAME}</span>
          <span className="hidden text-xs font-semibold text-sub md:inline">MacBook 비교 체험</span>
        </Link>
        <nav aria-label="주 메뉴" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
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
      </div>
    </header>
  );
}
