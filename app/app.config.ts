import type { ConfigContext, ExpoConfig } from 'expo/config';

// GitHub Pages 같은 하위 경로 배포용: EXPO_BASE_URL=/tbyb-mvp-miku/app (기본값: 빈 문자열 = 루트)
const baseUrl = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'tbyb', // 플랫폼 워드마크 (shared/brand/tbyb). MacBook Air·Pro 는 앱 안에서 "첫 비교팩"으로 부른다
  slug: 'tbyb-mvp-miku',
  version: '0.1.0',
  orientation: 'portrait',
  // 앱 아이콘·적응형 아이콘·파비콘·스플래시 = tbyb 심볼 (원본: shared/brand/tbyb · PNG 는 scripts/brand-icons.mjs 로 만든다)
  icon: './assets/images/icon.png', // 1024 · 크림 #F7F3EA 꽉 찬 정사각형 + APP_ICON_COLOR 비율의 심볼 · 투명도 없음 (iOS 가 모서리를 둥글게 자른다)
  scheme: 'tbyb',
  // 기기 라이트/다크를 따라간다 (앱 안 '화면 모드'에서 라이트·다크로 고정할 수 있다 — src/lib/theme-context.tsx)
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'xyz.buzz.tbyb.miku',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#F7F3EA', // 브랜드 cream (lib/brand.ts BRAND.cream)
      foregroundImage: './assets/images/android-icon-foreground.png', // 컬러 심볼, 투명 바탕 · 안전 원(66dp) 안
      monochromeImage: './assets/images/android-icon-monochrome.png', // 테마 아이콘용 — MARK_MONO (한 색)
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    name: 'tbyb — 써 보고, 나의 기준으로.',
    shortName: 'tbyb',
    lang: 'ko',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        // 스플래시: 라이트 = 브랜드 cream 바탕 + 컬러 심볼(MARK.svg), 다크 = forest 바탕 + 다크용 컬러 심볼(MARK_DARK.svg: sage·apricot).
        // 설정 파일이라 lib/brand.ts 의 값을 그대로 적는다.
        backgroundColor: '#F7F3EA',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#193D35', image: './assets/images/splash-icon-dark.png' },
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
