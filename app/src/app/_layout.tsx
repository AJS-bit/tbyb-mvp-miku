import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CloseButton } from '@/components/header';
import { hydrate } from '@/lib/store';
import { C } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: C.primary,
    background: C.bg,
    card: C.surface,
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
