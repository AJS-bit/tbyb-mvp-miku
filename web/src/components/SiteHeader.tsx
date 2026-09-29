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

export function SiteHeader() {
  const pathname = usePathname() || "/";
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-3 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-3">
        <Link href="/" className="flex items-center gap-2 self-start rounded-lg sm:self-auto" aria-label={`${SERVICE_NAME} 소개로`}>
          <span aria-hidden className="relative flex h-6 w-9 items-center">
            <span className="absolute left-0 h-5 w-5 rounded-full bg-air" />
            <span className="absolute left-3.5 h-5 w-5 rounded-full bg-pro/90 mix-blend-multiply" />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-ink">{SERVICE_NAME}</span>
          <span className="hidden text-xs font-medium text-sub md:inline">MacBook 비교 체험</span>
        </Link>
        <nav aria-label="주 메뉴" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex min-w-max items-center gap-0.5 sm:gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium transition-colors sm:px-3 sm:text-sm",
                      active ? "bg-ink text-white" : "text-sub hover:bg-bg hover:text-ink",
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
