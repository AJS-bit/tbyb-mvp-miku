import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CloseButton } from '@/components/header';
import { hydrate } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// 미션 시트·시뮬레이터로 바로 들어와도(딥 링크·웹 새로고침) 아래에 탭이 깔리게
export const unstable_settings = { anchor: '(tabs)' };

const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: C.ink,
    background: C.bg,
    card: C.bg,
    text: C.ink,
    border: C.line,
  },
};

export default function RootLayout() {
  useEffect(() => {
    // 저장본 복원이 끝날 때까지 스플래시를 유지한다
    hydrate().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="mission/[id]"
          // iOS 페이지 시트 — 아래로 밀어 닫는다. (formSheet 는 Expo Go 에서 내용이 그려지지 않아 쓰지 않는다)
          options={{ presentation: 'modal', headerShown: false, contentStyle: { backgroundColor: C.bg } }}
        />
        <Stack.Screen
          name="simulator"
          options={{
            presentation: 'modal',
            title: '운영 시뮬레이터',
            headerShown: true,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: C.bg },
            headerRight: () => <CloseButton />,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
