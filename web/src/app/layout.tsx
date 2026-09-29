import type { Metadata, Viewport } from "next";
import { DEMO_NOTICE, PACK_NAME, PRICE_TBD, SERVICE_NAME } from "@/lib/domain";
import { BrandMark, SiteHeader } from "@/components/SiteHeader";
import { StorageBanner } from "@/components/StorageBanner";
import { UNDECIDED } from "@/lib/copy";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME} — ${PACK_NAME}`, template: `%s · ${SERVICE_NAME}` },
  description: "맥이 처음이어도 괜찮아요. MacBook Air와 14형 Pro를 사기 전에 먼저 같이 지내 보는 비교 체험 (시연용 데모).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf6ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
        >
          본문으로 건너뛰기
        </a>
        <div role="note" aria-label="데모 안내" className="border-b border-warn-line bg-warn-bg">
          <p className="mx-auto max-w-6xl px-5 py-1.5 text-center text-xs leading-relaxed text-warn sm:px-8">
            <span className="font-bold">데모</span> · {DEMO_NOTICE}
          </p>
        </div>
        <SiteHeader />
        <StorageBanner />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
          {children}
        </main>
        <footer className="mt-10 border-t border-line bg-cream/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 text-sm text-sub sm:px-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="flex items-center gap-2.5 text-[15px] font-extrabold tracking-[-0.02em] text-ink">
                <BrandMark />
                {SERVICE_NAME}
              </p>
              <p className="mt-2 leading-relaxed">사기 전에, 먼저 같이 지내 보기. {PACK_NAME} · 시연용 데모</p>
            </div>
            <div>
              <p className="font-bold text-ink">아직 정해지지 않은 것</p>
              <p className="mt-1 leading-relaxed">
                {UNDECIDED.join(" · ")} — 모두 딜러 계약 후 정해져요. {PRICE_TBD}
              </p>
              <p className="mt-3 text-xs leading-relaxed">
                서버·분석 도구·실제 결제·문자 발송·리워드 지급이 없습니다. Apple, MacBook은 Apple Inc.의 상표이며 이 데모는
                Apple과 관련이 없습니다.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
