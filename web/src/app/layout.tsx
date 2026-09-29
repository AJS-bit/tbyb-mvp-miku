import type { Metadata, Viewport } from "next";
import { DEMO_NOTICE, PACK_NAME, PRICE_TBD, SERVICE_NAME } from "@/lib/domain";
import { SiteHeader } from "@/components/SiteHeader";
import { StorageBanner } from "@/components/StorageBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME} — ${PACK_NAME}`, template: `%s · ${SERVICE_NAME}` },
  description: "MacBook Air와 14형 Pro를 내 작업으로 먼저 비교해 보고 결정하는 비교 체험 서비스 (시연용 데모).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

const UNDECIDED = ["체험료", "체험 기간", "보증", "할인", "제휴 매장 위치", "계약 주체"];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <div role="note" aria-label="데모 안내" className="border-b border-warn-line bg-warn-bg">
          <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs leading-relaxed text-warn sm:px-6">
            <span className="font-semibold">데모</span> · {DEMO_NOTICE}
          </p>
        </div>
        <SiteHeader />
        <StorageBanner />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-sub sm:px-6">
            <p className="font-semibold text-ink">아직 정해지지 않은 것</p>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="미확정 항목">
              {UNDECIDED.map((x) => (
                <li key={x} className="rounded-full border border-warn-line bg-warn-bg px-2.5 py-1 text-xs font-medium text-warn">
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-3 leading-relaxed">{PRICE_TBD} 위 항목은 모두 딜러 계약 후 확정합니다.</p>
            <p className="mt-4 text-xs leading-relaxed">
              {SERVICE_NAME} · {PACK_NAME} · 시연용 데모 — 서버·분석 도구·실제 결제·문자 발송이 없습니다. Apple, MacBook은
              Apple Inc.의 상표이며 이 데모는 Apple과 관련이 없습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
