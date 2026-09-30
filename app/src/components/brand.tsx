// 브랜드 마크 · 로고 조합 — 원본 shared/brand/logo-mark.svg · logo-mark-dark.svg (64 격자) 를 react-native-svg 로 옮긴 것.
// 겹쳐 선 노트북 두 대(앞 왼쪽 얇은 Air 청록 · 뒤 오른쪽 Pro 보라) + 코랄 반짝임. 기울이지 않는다(기울인 그림은 히어로 하나).
// 다크 바탕에서는 받침을 크림(#EBE2D5)으로, 화면을 살짝 낮춘 dark 변형 색을 쓴다.
// 로고 원본 색이라 팔레트 토큰이 아닌 고정 값이다 (브랜드 README 「색」 표 그대로).
import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';

import { useSerifFamily } from '@/lib/fonts';
import { useTheme } from '@/lib/theme-context';

import { T } from './ui';

const MARK = {
  light: { airA: '#3DBBA4', airB: '#1A8F7C', proA: '#8466FF', proB: '#5A36F0', base: '#1F1B16', dot: '#1F1B16', spark: '#FF6B4A' },
  dark: { airA: '#3BB9A3', airB: '#1E8D7B', proA: '#8A74F0', proB: '#5E44D8', base: '#EBE2D5', dot: '#16130F', spark: '#FF8A6B' },
} as const;

export function BrandMark({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { scheme } = useTheme();
  const k = MARK[scheme];
  // 한 화면에 마크가 여럿이어도(웹은 숨은 탭까지 한 문서) 그라데이션·마스크 id 가 겹치지 않게
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const air = `air${uid}`;
  const pro = `pro${uid}`;
  const gap = `gap${uid}`;
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Defs>
          <LinearGradient id={air} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={k.airA} />
            <Stop offset="1" stopColor={k.airB} />
          </LinearGradient>
          <LinearGradient id={pro} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={k.proA} />
            <Stop offset="1" stopColor={k.proB} />
          </LinearGradient>
          {/* 겹친 곳: Air 둘레 2.4 만큼 Pro 를 비워 어느 바탕에서도 틈이 보이게 */}
          <Mask id={gap} maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">
            <Rect x={-8} y={-8} width={80} height={80} fill="#fff" />
            <G fill="#000" stroke="#000" strokeWidth={4.8} strokeLinejoin="round">
              <Rect x={5} y={24} width={33} height={23} rx={3.4} />
              <Rect x={1} y={48.2} width={41} height={3} />
            </G>
          </Mask>
        </Defs>
        <G transform="translate(0 2.2)">
          {/* MacBook Pro 14 — 뒤 오른쪽 */}
          <G mask={`url(#${gap})`}>
            <Rect x={23} y={10} width={36} height={25} rx={3.6} fill={`url(#${pro})`} />
            <Circle cx={41} cy={11.9} r={0.75} fill={k.dot} fillOpacity={0.55} />
            <Path d="M19 36.2H63L61.6 39Q61.2 40.6 60 40.6H22Q20.8 40.6 20.4 39Z" fill={k.base} />
          </G>
          {/* MacBook Air — 앞 왼쪽, 더 얇게 */}
          <Rect x={5} y={24} width={33} height={23} rx={3.4} fill={`url(#${air})`} />
          <Circle cx={21.5} cy={25.8} r={0.7} fill={k.dot} fillOpacity={0.5} />
          <Path d="M1 48.2H42L41 49.7Q40.6 51.2 39.5 51.2H3.5Q2.4 51.2 2 49.7Z" fill={k.base} />
          {/* 반짝임 */}
          <Path d="M13.5 8Q15.04 11.96 19 13.5Q15.04 15.04 13.5 19Q11.96 15.04 8 13.5Q11.96 11.96 13.5 8Z" fill={k.spark} />
        </G>
      </Svg>
    </View>
  );
}

/** 마크 + 워드마크 "Try Before You Buy"(고운바탕) + 태그라인 — 비교팩 첫 화면 맨 위 */
export function BrandLockup({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const serif = useSerifFamily();
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}
      accessible
      accessibilityRole="header"
      accessibilityLabel="Try Before You Buy, 써 보고 고르는 맥북">
      <BrandMark size={46} />
      <View style={{ gap: 1 }}>
        <T
          variant="title3"
          color={c.ink}
          // 고운바탕은 이미 굵은 글꼴 하나 — 굵기를 더하면 웹에서 가짜 굵게가 겹친다. 불러오기 전엔 시스템 글꼴 굵게.
          style={serif ? { fontFamily: serif, fontWeight: 'normal', letterSpacing: -0.2, fontSize: 20, lineHeight: 26 } : { fontWeight: '800', letterSpacing: -0.3 }}>
          Try Before You Buy
        </T>
        <T variant="footnote" color={c.sub} style={{ letterSpacing: 0.2 }}>
          써 보고 고르는 맥북
        </T>
      </View>
    </View>
  );
}
