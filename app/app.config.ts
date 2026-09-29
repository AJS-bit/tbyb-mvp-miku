import type { ConfigContext, ExpoConfig } from 'expo/config';

// GitHub Pages 같은 하위 경로 배포용: EXPO_BASE_URL=/tbyb-mvp-miku/app (기본값: 빈 문자열 = 루트)
const baseUrl = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Try Before You Buy',
  slug: 'tbyb-mvp-miku',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tbyb',
  // 기기 라이트/다크를 따라간다 (앱 안 '화면 모드'에서 라이트·다크로 고정할 수 있다 — src/lib/theme-context.tsx)
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    supportsTablet: false,
    bundleIdentifier: 'xyz.buzz.tbyb.miku',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    name: 'Try Before You Buy — 비교팩 데모',
    lang: 'ko',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        // 스플래시 바탕 = palette.ts 의 bg (라이트 아이보리 / 다크 따뜻한 밤색). 설정 파일이라 값을 그대로 적는다.
        backgroundColor: '#FAF6EF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: '#16130F', image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-notifications',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    baseUrl,
  },
});
