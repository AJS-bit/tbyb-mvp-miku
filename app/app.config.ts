import type { ConfigContext, ExpoConfig } from 'expo/config';

// GitHub Pages 같은 하위 경로 배포용: EXPO_BASE_URL=/tbyb-mvp-miku/app (기본값: 빈 문자열 = 루트)
const baseUrl = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Try Before You Buy',
  slug: 'tbyb-mvp-miku',
  version: '0.1.0',
  orientation: 'portrait',
  // 앱 아이콘·적응형 아이콘·파비콘·스플래시 = 새 브랜드 로고 (원본: shared/brand/ · README 「브랜드」)
  icon: './assets/images/icon.png', // 1024 · 아이보리 꽉 찬 정사각형 · 투명도 없음 (iOS 가 모서리를 둥글게 자른다)
  scheme: 'tbyb',
  // 기기 라이트/다크를 따라간다 (앱 안 '화면 모드'에서 라이트·다크로 고정할 수 있다 — src/lib/theme-context.tsx)
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'xyz.buzz.tbyb.miku',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#FAF6EF', // 아이보리 (palette.ts light.bg)
      foregroundImage: './assets/images/android-icon-foreground.png', // 해 + 마크, 안전 원(66dp) 안
      monochromeImage: './assets/images/android-icon-monochrome.png', // 테마 아이콘용 — 마크만 한 색
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
        // 가운데 마크: 라이트는 잉크 받침, 다크는 크림 받침(logo-mark-dark.svg)
        backgroundColor: '#FAF6EF',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#16130F', image: './assets/images/splash-icon-dark.png' },
      },
    ],
    'expo-notifications',
    // 글꼴은 useFonts 로 실행 중에 불러온다(Expo Go·웹 공통 — src/lib/fonts.tsx). 플러그인은 설정 없이 둔다.
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    baseUrl,
  },
});
