// tbyb 로고 — 심볼(shared/brand/tbyb/MARK.svg 도형 그대로, react-native-svg) + 소문자 워드마크 "tbyb" + 태그라인.
// 라이트: MARK.svg — forest 왼쪽 프레임·점 + apricot 오른쪽 프레임, forest 워드마크.
// 다크: MARK_DARK.svg — sage 왼쪽 프레임·점 + apricot 오른쪽 프레임(다크에서도 컬러), 워드마크는 크림.
// 색은 palette.ts 의 brandMark·brandAccent·brandWord (값은 lib/brand.ts BRAND).
// 비율은 브랜드 README: 심볼 높이 ≈ 워드마크 글자 크기 × 0.9, 간격 ≈ 0.22em, 워드마크 Georgia 600 · 자간 -0.06em.
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { MARK_DOT, MARK_LEFT, MARK_RIGHT, MARK_VIEWBOX, TAGLINE, WORDMARK } from '@/lib/brand';
import { useTheme } from '@/lib/theme-context';

import { T } from './ui';

// iOS 는 시스템에 Georgia 가 있다(굵기 600 → Georgia Bold). 안드로이드는 기본 세리프, 웹은 TETO 사이트와 같은 목록.
const WORDMARK_FAMILY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

/** 심볼만. height 기준으로 그린다 (가로 = 세로 × 1.25). */
export function BrandMark({ height = 32, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const width = (height * MARK_VIEWBOX.width) / MARK_VIEWBOX.height;
  return (
    <View style={[{ width, height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox={`0 0 ${MARK_VIEWBOX.width} ${MARK_VIEWBOX.height}`}>
        <Path d={MARK_LEFT} fill={c.brandMark} />
        <Path d={MARK_RIGHT} fill={c.brandAccent} />
        <Circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill={c.brandMark} />
      </Svg>
    </View>
  );
}

/** 심볼 + 워드마크 "tbyb" (+ 태그라인 "써 보고, 나의 기준으로.") — 비교팩 첫 화면 맨 위 */
export function BrandLockup({ size = 34, tagline = true, style }: { size?: number; tagline?: boolean; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View
      style={[{ gap: 4, alignSelf: 'flex-start' }, style]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={tagline ? `${WORDMARK}, ${TAGLINE}` : WORDMARK}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.22) }}>
        <BrandMark height={Math.round(size * 0.9)} />
        <T
          variant="title"
          color={c.brandWord}
          style={{
            fontFamily: WORDMARK_FAMILY,
            fontWeight: '600',
            fontSize: size,
            lineHeight: Math.round(size * 1.15),
            letterSpacing: -0.06 * size,
            // 자간을 좁히면 마지막 글자 오른쪽이 잘릴 수 있어 그만큼 여유를 둔다
            paddingRight: Math.ceil(0.06 * size),
          }}>
          {WORDMARK}
        </T>
      </View>
      {tagline ? (
        <T variant="callout" weight="600" color={c.sub} style={{ letterSpacing: -0.2 }}>
          {TAGLINE}
        </T>
      ) : null}
    </View>
  );
}
