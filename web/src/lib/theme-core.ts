// 화면 테마(시스템 · 라이트 · 다크) 공통 값. 서버 컴포넌트(layout)와 클라이언트(theme.ts)가 함께 쓴다.
// 데모 상태(tbyb-miku-demo-v2)와는 다른 키에 저장한다 — 테마 저장이 실패해도 데모 데이터와 무관하다.

export const THEME_KEY = "tbyb-miku-theme";

export type ThemePref = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFS: ThemePref[] = ["system", "light", "dark"];

export const THEME_LABEL: Record<ThemePref, string> = { system: "시스템", light: "라이트", dark: "다크" };

/** 브라우저 주소창 색 (<meta name="theme-color">) — globals.css 의 --color-bg 와 같은 값 */
export const THEME_COLOR: Record<ResolvedTheme, string> = { light: "#faf6ef", dark: "#16130f" };

export const THEME_SAVE_ERROR = "이 기기에 저장하지 못해 이번 화면에만 적용돼요";

export function isThemePref(v: unknown): v is ThemePref {
  return v === "system" || v === "light" || v === "dark";
}

/**
 * <head> 인라인 스크립트 — 첫 그림을 그리기 전에 <html> 에 테마를 붙여 번쩍임(흰 화면 → 다크)을 막는다.
 * 정적 HTML 에 그대로 들어가므로 basePath 와 무관하고, localStorage·matchMedia 가 막혀도 오류 없이 라이트/시스템으로 간다.
 *  - data-theme="light|dark"   : 실제로 적용할 테마 (CSS 변수 전환)
 *  - data-theme-pref="…"       : 사용자가 고른 값 (스위처 모양을 하이드레이션 전부터 맞춤)
 *  - style.colorScheme          : 기본 폼 컨트롤·스크롤바 색
 *  - <meta name="theme-color">  : 직접 고른 테마면 두 media 모두 그 색으로 (문서 파싱이 끝난 뒤)
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement,p="system";try{var v=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(v==="light"||v==="dark"||v==="system")p=v}catch(e){}var k=p;if(k==="system"){k="light";try{if(window.matchMedia("(prefers-color-scheme: dark)").matches)k="dark"}catch(e){}}d.setAttribute("data-theme",k);d.setAttribute("data-theme-pref",p);d.style.colorScheme=k;if(p!=="system"){var c=k==="dark"?${JSON.stringify(
  THEME_COLOR.dark,
)}:${JSON.stringify(
  THEME_COLOR.light,
)};document.addEventListener("DOMContentLoaded",function(){var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute("content",c)})}}catch(e){}})();`;
