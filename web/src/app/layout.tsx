import type { Metadata, Viewport } from "next";
import { DEMO_NOTICE, PACK_NAME, SERVICE_NAME } from "@/lib/domain";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandLockup } from "@/components/Brand";
import { StorageBanner } from "@/components/StorageBanner";
import { UNDECIDED } from "@/lib/copy";
import { THEME_COLOR, THEME_INIT_SCRIPT } from "@/lib/theme-core";
// 고운바탕 Bold(SIL OFL 1.1) — 외부 CDN 없이 자체 호스팅. 한글은 unicode-range 조각이라 화면에 쓰인 글자 조각만 받는다.
import "@fontsource/gowun-batang/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SERVICE_NAME} — ${PACK_NAME}`, template: `%s · ${SERVICE_NAME}` },
  description: "맥이 처음이어도 괜찮아요. MacBook Air와 14형 Pro를 사기 전에 먼저 써 보고 고르는 비교 체험이에요. (시연용 데모)",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 시스템 설정별 주소창 색. 사용자가 직접 고르면 인라인 스크립트·theme.ts 가 두 값을 고른 색으로 맞춘다.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme · data-theme-pref · style(color-scheme) 는 아래 인라인 스크립트가 하이드레이션 전에 붙인다
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        {/* 번쩍임 방지: 저장된 테마 + prefers-color-scheme 를 읽어 첫 그림 전에 <html data-theme> 를 정한다 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
        >
          본문으로 건너뛰기
        </a>
        <div role="note" aria-label="데모 안내" className="border-b border-warn-line bg-warn-bg">
          <p className="mx-auto max-w-6xl px-5 py-1.5 text-center text-xs leading-relaxed text-warn sm:px-8">
            {/* DEMO_NOTICE 첫 문장("시연용 데모예요.")만 굵게 */}
            <span className="font-bold">{DEMO_NOTICE.slice(0, DEMO_NOTICE.indexOf(".") + 1)}</span>
            {DEMO_NOTICE.slice(DEMO_NOTICE.indexOf(".") + 1)}
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
              <BrandLockup uid="brand-footer" />
              <p className="mt-3 leading-relaxed">{PACK_NAME} · 시연용 데모</p>
            </div>
            <div>
              <p className="font-bold text-ink">아직 정해지지 않은 것들</p>
              <p className="mt-1 leading-relaxed">{UNDECIDED.join(" · ")}. 모두 딜러와 계약한 뒤에 정해져요.</p>
              <p className="mt-3 text-xs leading-relaxed">
                이 데모에는 서버와 분석 도구가 없고, 실제 결제나 문자 발송, 리워드 지급도 없어요. Apple과 MacBook은 Apple Inc.의
                상표이며, 이 데모는 Apple과 관련이 없어요.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
