// 테마 공급자 — 화면 모드(시스템/라이트/다크)를 고르고, 지금 테마를 화면·네이티브 UI·웹 문서에 맞춘다.
// 저장은 store.updateUi 규칙 그대로(저장이 끝난 뒤에만 ui 에 반영). 저장에 실패해도 이번 실행에는 적용하고,
// 실패는 저장소 오류 카드(StorageBanner)와 고르는 곳의 짧은 안내로 알린다.
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { savedThemePref, setThemePreference, useApp } from './store';
import { THEMES, type Scheme, type Theme, type ThemePref } from './theme';

const ThemeContext = createContext<Theme>(THEMES.light);

interface ThemeControl {
  /** 지금 적용 중인 선택 (저장 실패 시 이번 실행에만 쓰는 값 포함) */
  pref: ThemePref;
  /** 기기 설정 (pref 가 system 일 때만 의미 있음) */
  system: Scheme;
  choose: (pref: ThemePref) => void;
  /** 마지막 선택을 저장하지 못해 이번 실행에만 적용됨 */
  sessionOnly: boolean;
}
const ControlContext = createContext<ThemeControl | null>(null);

// 네이티브: 앱 창의 라이트/다크를 바꿔 탭 바·시트·키보드·스위치·알림창까지 같은 모드가 되게 한다.
// 'unspecified' 는 기기 설정 따라가기. (웹에는 이 API 가 없다 — 웹은 문서의 color-scheme 으로 맞춘다)
function applyNativeScheme(pref: ThemePref) {
  if (Platform.OS === 'web' || typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { ui, ready } = useApp();
  const [session, setSession] = useState<ThemePref | null>(null);
  const [sessionOnly, setSessionOnly] = useState(false);
  // 웹 정적 HTML 은 라이트로 미리 그려져 있다 — 첫 렌더(하이드레이션)는 그대로 맞추고, 붙은 뒤에 실제 모드로 바꾼다.
  // (<head> 스크립트가 그동안 다크 사용자의 화면을 가려 번쩍임을 막는다: src/app/+html.tsx)
  const [mounted, setMounted] = useState(Platform.OS !== 'web');
  const request = useRef(0);

  const pref = session ?? savedThemePref(ui);
  const os = useColorScheme();
  const system: Scheme = os === 'dark' ? 'dark' : 'light';
  const scheme: Scheme = !mounted ? 'light' : pref === 'system' ? system : pref;
  const theme = THEMES[scheme];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    applyNativeScheme(pref);
  }, [pref]);

  useEffect(() => {
    // 웹은 저장본을 읽기 전에는 <head> 스크립트가 정한 값을 건드리지 않는다
    if (Platform.OS === 'web' && !(mounted && ready)) return;
    // 루트 배경 — 시트가 열리고 닫힐 때·탭을 바꿀 때 뒤에서 흰 바탕이 비치지 않게
    SystemUI.setBackgroundColorAsync(theme.c.bg).catch(() => {});
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.style.colorScheme = scheme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.c.bg);
      root.dataset.themeReady = '1';
    }
  }, [scheme, theme, mounted, ready]);

  const choose = useCallback((next: ThemePref) => {
    applyNativeScheme(next);
    setSession(next);
    const id = ++request.current;
    setThemePreference(next).then((ok) => {
      if (id === request.current) setSessionOnly(!ok);
    });
  }, []);

  const control = useMemo(() => ({ pref, system, choose, sessionOnly }), [pref, system, choose, sessionOnly]);

  return (
    <ThemeContext value={theme}>
      <ControlContext value={control}>{children}</ControlContext>
    </ThemeContext>
  );
}

/** 지금 테마 (색 토큰 t.c · 기기 색 t.device · 미션 답 색 t.pick · 상태 칩 t.status · 그림자) */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** 화면 모드 고르기 (설정 화면용) */
export function useThemeControl(): ThemeControl {
  const v = useContext(ControlContext);
  if (!v) throw new Error('useThemeControl 은 AppThemeProvider 안에서만 쓸 수 있습니다');
  return v;
}

/**
 * 테마마다 한 번씩 미리 만들어 두고 지금 테마 것을 돌려주는 훅을 만든다 (모듈 최상위에서 호출).
 *   const useStyles = themed((t) => StyleSheet.create({ card: { backgroundColor: t.c.surface } }));
 *   function Card() { const s = useStyles(); … }
 */
export function themed<T>(make: (t: Theme) => T): () => T {
  const built: Record<Scheme, T> = { light: make(THEMES.light), dark: make(THEMES.dark) };
  return function useThemed() {
    return built[useContext(ThemeContext).scheme];
  };
}
