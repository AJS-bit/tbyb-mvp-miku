import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, type Theme as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';

import { CloseButton } from '@/components/header';
import { WebHead } from '@/components/web-head';
import { SerifProvider, useAppFonts } from '@/lib/fonts';
import { hydrate } from '@/lib/store';
import { AppThemeProvider, useTheme } from '@/lib/theme-context';

SplashScreen.preventAutoHideAsync().catch(() => {});

// 미션 시트·시뮬레이터로 바로 들어와도(딥 링크·웹 새로고침) 아래에 탭이 깔리게
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);
  // 고운바탕(노트북 화면 문구)은 앱을 막지 않는다 — 실패하거나 늦으면 시스템 글꼴로 먼저 보여 준다 (src/lib/fonts.tsx)
  const fonts = useAppFonts();

  useEffect(() => {
    hydrate().finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    // 저장본 복원(화면 모드 포함)과 글꼴 불러오기(최대 FONT_WAIT_MS)가 끝날 때까지 스플래시를 유지한다
    if (hydrated && fonts.settled) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, fonts.settled]);

  return (
    <SerifProvider ready={fonts.serifReady}>
      <AppThemeProvider>
        <RootStack />
      </AppThemeProvider>
    </SerifProvider>
  );
}

function RootStack() {
  const t = useTheme();
  const c = t.c;
  // 내비게이션 헤더·모달 바탕이 지금 테마를 따르게
  const navigation = useMemo<NavigationTheme>(() => {
    const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: t.scheme === 'dark',
      colors: { ...base.colors, primary: c.ink, background: c.bg, card: c.bg, text: c.ink, border: c.line, notification: c.coral },
    };
  }, [t, c]);

  return (
    <NavigationThemeProvider value={navigation}>
      <WebHead />
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="mission/[id]"
          // iOS 페이지 시트 — 아래로 밀어 닫는다. (formSheet 는 Expo Go 에서 내용이 그려지지 않아 쓰지 않는다)
          options={{ presentation: 'modal', headerShown: false, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="simulator"
          options={{
            presentation: 'modal',
            title: '운영 시뮬레이터',
            headerShown: true,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.ink,
            headerTitleStyle: { color: c.ink },
            contentStyle: { backgroundColor: c.bg },
            headerRight: () => <CloseButton />,
          }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
