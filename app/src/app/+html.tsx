// 웹 정적 HTML 뼈대 (웹 미리보기 전용). 한국어 줄바꿈이 단어 중간에서 끊기지 않도록 keep-all, '동작 줄이기' 설정 존중.
// 화면 모드: 정적 HTML 은 라이트로 미리 그려진다. <head> 스크립트가 저장된 모드(앱 UI 키)·기기 설정을 먼저 읽어
// 바탕을 칠하고, 다크라면 앱이 다크로 다시 그릴 때까지(theme-context 가 data-theme-ready 를 붙일 때까지) 화면을 가린다.
// 가리는 동안은 다크 '불러오는 중' 문구를 보이고, 8초가 지나도 준비되지 않으면 다크 안내 문구로 바꾼다.
// 라이트로 미리 그려진 화면을 시간이 지났다고 드러내지 않는다 (TETO 교차검토 2026-09-30: 2.5초 타이머가 라이트 화면을 노출).
import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

import { STORAGE_KEY } from '@/domain';
import { PALETTES } from '@/lib/palette';

const LIGHT_BG = PALETTES.light.bg;
const DARK_BG = PALETTES.dark.bg;
const DARK_INK = PALETTES.dark.ink;
const DARK_SUB = PALETTES.dark.sub;
export const LOAD_SLOW_MS = 8000;
const LOADING_TEXT = '불러오는 중…';
const LOAD_SLOW_TEXT = '앱을 불러오지 못하고 있어요. 연결을 확인한 뒤 새로고침해 주세요.';

const css = `
html, body { background-color: ${LIGHT_BG}; }
html[data-theme="dark"], html[data-theme="dark"] body { background-color: ${DARK_BG}; }
html[data-theme="dark"]:not([data-theme-ready]) #root { visibility: hidden; }
html[data-theme="dark"]:not([data-theme-ready]) body::before {
  content: ${JSON.stringify(LOADING_TEXT)}; position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: 24px; text-align: center; color: ${DARK_SUB};
  font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", system-ui, sans-serif;
}
html[data-theme="dark"][data-load-slow]:not([data-theme-ready]) body::before { content: ${JSON.stringify(LOAD_SLOW_TEXT)}; color: ${DARK_INK}; }
* { word-break: keep-all; overflow-wrap: break-word; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-delay: 0ms !important; transition-duration: 0.01ms !important; }
}
`;

// 저장본이 손상됐으면(읽기 실패) 앱도 system 으로 시작하므로 여기서도 system 으로 둔다
const themeScript = `(function(){try{
var p='system';
try{var u=JSON.parse(localStorage.getItem(${JSON.stringify(`${STORAGE_KEY}:app-ui`)})||'null');if(u&&u.version===1&&(u.theme==='light'||u.theme==='dark'||u.theme==='system'))p=u.theme;}catch(e){}
var d=p==='system'?(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;
var r=document.documentElement;r.setAttribute('data-theme',d);r.style.colorScheme=d;
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d==='dark'?${JSON.stringify(DARK_BG)}:${JSON.stringify(LIGHT_BG)});
if(d==='dark')setTimeout(function(){if(!r.hasAttribute('data-theme-ready'))r.setAttribute('data-load-slow','');},${LOAD_SLOW_MS});
}catch(e){}})();`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content={LIGHT_BG} />
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
