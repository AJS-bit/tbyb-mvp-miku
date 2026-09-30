// 감성 서체 — 고운바탕 굵게 (Gowun Batang Bold, SIL OFL 1.1 · @expo-google-fonts/gowun-batang).
// 노트북 화면 문구처럼 짧은 감성 문장에만 쓴다. 본문은 기존 시스템 산세리프 그대로.
//
// 불러오기: 루트 레이아웃에서 useAppFonts() 한 번. 앱 전체를 막지 않는다 —
//   · 성공하면 serifReady → 그림 속 문구가 고운바탕으로 바뀐다.
//   · 실패하거나 FONT_WAIT_MS 가 지나도 안 끝나면 스플래시는 그냥 내리고, 문구는 시스템 글꼴(굵게)로 보인다.
//     (늦게라도 불러오면 그때 고운바탕으로 바뀐다)
// 웹: 글꼴 이름 목록(CSS font-family)을 처음부터 그대로 넘긴다 — 정적 HTML·하이드레이션 모두 같은 값이라 어긋나지 않고,
//     글꼴이 오기 전·실패 시에는 브라우저가 명조 계열 → serif 로 대신 그린다.
// 굵게 한 벌만, 그것도 필요한 글자만 줄인 파일을 쓴다: 원본 8.2MB → 약 1.4MB.
// KS X 1001 한글 2,350자 + 앱 소스·공통 규칙에 쓰인 한글 + 영문·문장부호 (scripts/subset-font.mjs 로 다시 만든다).
import { FontDisplay, useFonts } from 'expo-font';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

/** useFonts 에 넘기는 이름 = fontFamily 로 쓰는 이름 */
export const SERIF_FONT = 'GowunBatang_700Bold';
// 웹: 글꼴이 오기 전에도 대신 글꼴로 바로 보이게(swap) — 기본값(auto)은 브라우저가 최대 3초 글자를 숨긴다
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GOWUN_BATANG_BOLD_SUBSET = require('../../assets/fonts/GowunBatang-Bold-subset.ttf');
const FONT_MAP = { [SERIF_FONT]: { uri: GOWUN_BATANG_BOLD_SUBSET, display: FontDisplay.SWAP } };
const WEB_SERIF_STACK = `${SERIF_FONT}, "Gowun Batang", AppleMyungjo, "Nanum Myeongjo", serif`;

/** 스플래시를 글꼴 때문에 붙잡아 두는 최대 시간 */
export const FONT_WAIT_MS = 2500;

export function useAppFonts(): { serifReady: boolean; settled: boolean } {
  const [loaded, error] = useFonts(FONT_MAP);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), FONT_WAIT_MS);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (error) console.warn('[fonts] 고운바탕을 불러오지 못해 기본 글꼴로 보여 줘요', error);
  }, [error]);
  return { serifReady: loaded, settled: loaded || !!error || timedOut };
}

const SerifContext = createContext(false);

export function SerifProvider({ ready, children }: { ready: boolean; children: ReactNode }) {
  return <SerifContext value={ready}>{children}</SerifContext>;
}

/**
 * 감성 서체 fontFamily. 네이티브는 불러오기 전이면 undefined(시스템 글꼴) — 없는 이름을 넘기면 iOS 가 오류를 낸다.
 * 웹은 늘 CSS 글꼴 목록.
 */
export function useSerifFamily(): string | undefined {
  const ready = useContext(SerifContext);
  if (Platform.OS === 'web') return WEB_SERIF_STACK;
  return ready ? SERIF_FONT : undefined;
}
