// 직접 그린 일러스트 (react-native-svg) — 같은 굵기의 잉크 선 + 부드러운 면. Apple 로고·제품 사진 없음.
// 색은 모두 테마 토큰(art*·tile*)에서 온다. 다크: 밝은 잉크 선 · 은은한 호박색 해 · 채도를 낮춘 청록/보라 화면.
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import type { MissionId } from '@/domain';
import { useSerifFamily } from '@/lib/fonts';
import { useTheme } from '@/lib/theme-context';
import type { Palette } from '@/lib/theme';

import { T } from './ui';

const SW = 2; // 아이콘 선 굵기 (48 기준)

const hidden = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

// ───────── 히어로: 기울어진 노트북 두 대 + 따뜻한 해 ─────────

function Sparkle({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const k = r * 0.28;
  return <Path d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`} fill={fill} />;
}

/** 노트북 화면 속 한 줄 — 고운바탕 굵게 (불러오기 전·실패 시 시스템 글꼴 굵게) */
function ScreenLine({ x, y, text }: { x: number; y: number; text: string }) {
  const { c } = useTheme();
  const serif = useSerifFamily();
  return (
    <SvgText
      x={x}
      y={y}
      fontSize={15.5}
      // 고운바탕은 이미 굵은 글꼴 하나라 굵기를 따로 주지 않는다 (웹에서 가짜 굵게가 겹치지 않게)
      fontFamily={serif}
      fontWeight={serif ? undefined : '700'}
      fill={c.artScreenText}
      textAnchor="middle"
      letterSpacing={-0.4}>
      {text}
    </SvgText>
  );
}

export function HeroIllustration({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const c = t.c;
  const INK = c.artInk;
  const sw = 2.6;
  const night = t.scheme === 'dark';
  return (
    <View style={[{ width: '100%', aspectRatio: 340 / 214 }, style]} {...hidden}>
      <Svg width="100%" height="100%" viewBox="0 0 340 214">
        {night ? (
          // 밤: 해 둘레로 번지는 호박색 빛 (스탠드 불빛처럼)
          <Defs>
            <RadialGradient id="sunGlow" cx="176" cy="92" r="130" gradientUnits="userSpaceOnUse">
              {/* 해 중심에서 그림 위 끝(92)까지 사라지게 — 위쪽에서 빛이 잘린 직선이 보이지 않도록 (92 / 130 ≈ 0.7) */}
              <Stop offset="0" stopColor={c.artSunGlow} stopOpacity={0.55} />
              <Stop offset="0.45" stopColor={c.artSunGlow} stopOpacity={0.2} />
              <Stop offset="0.7" stopColor={c.artSunGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
        ) : null}
        {night ? <Circle cx={176} cy={92} r={130} fill="url(#sunGlow)" /> : null}
        {/* 해 */}
        <Circle cx={176} cy={92} r={80} fill={c.sun} />
        <Circle cx={176} cy={92} r={98} fill="none" stroke={night ? c.artSunGlow : c.sun} strokeWidth={1.5} strokeDasharray="2 7" strokeLinecap="round" />
        <Sparkle x={48} y={40} r={9} fill={c.coral} />
        <Sparkle x={300} y={30} r={6} fill={INK} />
        <Circle cx={318} cy={78} r={3} fill={c.coral} />
        <Circle cx={20} cy={62} r={2.5} fill={INK} />

        {/* 바닥 그림자 */}
        <Ellipse cx={108} cy={198} rx={84} ry={7} fill={c.artShadow} />
        <Ellipse cx={240} cy={200} rx={92} ry={8} fill={c.artShadow} />

        {/* Air — 얇고 가볍게: "오늘은 어디로 갈까?" (들고 나가는 가벼움) */}
        <G transform="rotate(-7 110 150)">
          <Rect x={38} y={66} width={142} height={94} rx={9} fill={c.artBody} stroke={INK} strokeWidth={sw} />
          <Rect x={46} y={74} width={126} height={78} rx={4} fill={c.artAirScreen} />
          <Circle cx={152} cy={86} r={4.5} fill={c.artAirHi} opacity={0.7} />
          <Circle cx={161} cy={95} r={2.2} fill={c.artAirHi} opacity={0.7} />
          {/* 오른쪽 끝은 Pro 에 가려지므로 보이는 화면(46–160)의 가운데에 둔다 */}
          <ScreenLine x={103} y={104} text="오늘은" />
          <ScreenLine x={103} y={127} text="어디로 갈까?" />
          <SvgText x={54} y={145} fontSize={8.5} fontWeight="700" fill={c.artAirHi} letterSpacing={1.6}>
            AIR
          </SvgText>
          <Path d="M24 160 H194 L188 166 H30 Z" fill={c.artBase} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        </G>

        {/* Pro — 두툼하게: "오늘은 어디까지 해 볼까?" (끝까지 해내는 힘) */}
        <G transform="rotate(6 236 150)">
          <Rect x={160} y={56} width={154} height={104} rx={10} fill={c.artBody} stroke={INK} strokeWidth={sw} />
          <Rect x={169} y={65} width={136} height={86} rx={4} fill={c.artProScreen} />
          <Rect x={230} y={65} width={14} height={5} rx={2.5} fill={c.artNotch} />
          <ScreenLine x={237} y={99} text="오늘은" />
          <ScreenLine x={237} y={122} text="어디까지 해 볼까?" />
          <SvgText x={177} y={143} fontSize={8.5} fontWeight="700" fill={c.artProHi} letterSpacing={1.6}>
            PRO
          </SvgText>
          <Path d="M262 143 L271 138 L279 141 L295 132" stroke={c.artProHi} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M146 160 H328 L320 172 H154 Z" fill={c.artBase} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <Line x1={226} y1={166} x2={248} y2={166} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        </G>
      </Svg>
    </View>
  );
}

// ───────── 미션 장면 아이콘 6개 (48 격자) ─────────

type ArtProps = { c: Palette };

function Carry({ c }: ArtProps) {
  const INK = c.artInk;
  return (
    <>
      <Path d="M14 21 C14 7 34 7 34 21" stroke={INK} strokeWidth={SW} fill="none" strokeLinecap="round" />
      <Rect x={13} y={11} width={22} height={13} rx={2} fill={c.artAirFill} stroke={INK} strokeWidth={SW} />
      <Path d="M8 20 H40 L37.4 40.4 A2.5 2.5 0 0 1 34.9 42.5 H13.1 A2.5 2.5 0 0 1 10.6 40.4 Z" fill={c.artPeach} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M15 27 H33" stroke={INK} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="1 3.5" />
      <Circle cx={33} cy={34} r={2.6} fill={c.coral} />
    </>
  );
}

function Video({ c }: ArtProps) {
  const INK = c.artInk;
  return (
    <>
      <Rect x={6} y={9} width={36} height={25} rx={4.5} fill={c.artAirFill} stroke={INK} strokeWidth={SW} />
      <Path d="M20.5 15.5 L30 21.5 L20.5 27.5 Z" fill={c.coral} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M24 34 V39.5 M17 40 H31" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
    </>
  );
}

function SunMoon({ c }: ArtProps) {
  const INK = c.artInk;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <>
      {rays.map((a) => {
        const r = (a * Math.PI) / 180;
        const x1 = 17 + Math.cos(r) * 11;
        const y1 = 19 + Math.sin(r) * 11;
        const x2 = 17 + Math.cos(r) * 14;
        const y2 = 19 + Math.sin(r) * 14;
        return <Line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={SW} strokeLinecap="round" />;
      })}
      <Circle cx={17} cy={19} r={7.5} fill={c.artButter} stroke={INK} strokeWidth={SW} />
      <Path d="M36 22.5 A11 11 0 1 0 44.5 38 A8.5 8.5 0 0 1 36 22.5 Z" fill={c.artProFill} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Circle cx={40.5} cy={17} r={1.3} fill={INK} />
    </>
  );
}

function Keyboard({ c }: ArtProps) {
  const INK = c.artInk;
  const keys: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) keys.push([9.5 + i * 5, 19.5, 3.4]);
  for (let i = 0; i < 5; i++) keys.push([12 + i * 5, 24.5, 3.4]);
  return (
    <>
      <Rect x={5} y={14} width={38} height={22} rx={4.5} fill={c.artProFill} stroke={INK} strokeWidth={SW} />
      {keys.map(([x, y, w], i) => (
        <Rect key={i} x={x} y={y} width={w} height={3} rx={1} fill={INK} opacity={0.8} />
      ))}
      <Rect x={15} y={29.5} width={18} height={3} rx={1.5} fill={c.coral} />
      <Path d="M36 8 L40 12" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M31.5 9.5 L33 5.5" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
    </>
  );
}

function PhoneToLaptop({ c }: ArtProps) {
  const INK = c.artInk;
  return (
    <>
      <Rect x={4} y={11} width={13} height={23} rx={3} fill={c.artPeach} stroke={INK} strokeWidth={SW} />
      <Path d="M8.5 30 H12.5" stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M19.5 22.5 H27.5 M24.5 19 L28 22.5 L24.5 26" stroke={c.coral} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={31} y={14} width={14} height={11} rx={1.8} fill={c.artAirFill} stroke={INK} strokeWidth={SW} />
      <Path d="M28.5 27 H47 L45.2 30.5 H30.3 Z" fill={c.artBase} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
    </>
  );
}

function Gauge({ c }: ArtProps) {
  const INK = c.artInk;
  const ticks = [180, 216, 252, 288, 324, 360];
  return (
    <>
      <Path d="M7 34 A17 17 0 0 1 41 34 Z" fill={c.artCoralFill} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <Path d="M34.4 21.3 A17 17 0 0 1 41 34" stroke={c.coral} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      {ticks.map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <Line
            key={a}
            x1={24 + Math.cos(r) * 12.5}
            y1={34 + Math.sin(r) * 12.5}
            x2={24 + Math.cos(r) * 15}
            y2={34 + Math.sin(r) * 15}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}
      <Line x1={24} y1={34} x2={32.5} y2={23} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={24} cy={34} r={3} fill={INK} />
      <Path d="M8 39.5 H40" stroke={INK} strokeWidth={SW} strokeLinecap="round" />
    </>
  );
}

const MISSION_ART: Record<MissionId, { tile: keyof Palette; Art: (p: ArtProps) => React.JSX.Element }> = {
  carry: { tile: 'tileCarry', Art: Carry },
  video: { tile: 'tileVideo', Art: Video },
  screen: { tile: 'tileScreen', Art: SunMoon },
  typing: { tile: 'tileTyping', Art: Keyboard },
  daily: { tile: 'tileDaily', Art: PhoneToLaptop },
  heavy: { tile: 'tileHeavy', Art: Gauge },
};

/** 미션 장면 아이콘 — 둥근 타일 위에 그린다 */
export function MissionIcon({ id, size = 56, style }: { id: MissionId; size?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const { tile, Art } = MISSION_ART[id];
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: c[tile], alignItems: 'center', justifyContent: 'center' }, style]} {...hidden}>
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 48 48">
        <Art c={c} />
      </Svg>
    </View>
  );
}

// ───────── 리워드: 작은 선물 봉투 ─────────

export function GiftEnvelope({ size = 64, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const INK = c.artInk;
  return (
    <View style={[{ width: size, height: size }, style]} {...hidden}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Rect x={8} y={25} width={48} height={30} rx={5} fill={c.artEnvelope} stroke={INK} strokeWidth={SW} />
        <Rect x={15} y={10} width={34} height={28} rx={3.5} fill={c.artPaper} stroke={INK} strokeWidth={SW} />
        <Path d="M32 26.5 C27 23 25.5 19.5 27.8 17.4 C29.6 15.8 31.4 16.8 32 18.3 C32.6 16.8 34.4 15.8 36.2 17.4 C38.5 19.5 37 23 32 26.5 Z" fill={c.coral} />
        <Path d="M21 31 H43" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.35} />
        <Path d="M8 30 L32 44.5 L56 30 V50 A5 5 0 0 1 51 55 H13 A5 5 0 0 1 8 50 Z" fill={c.artCoralFill} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
        <Circle cx={32} cy={44.5} r={4.2} fill={c.coral} stroke={INK} strokeWidth={SW} />
        <Sparkle x={55} y={12} r={4.5} fill={c.coral} />
        <Sparkle x={8} y={15} r={3} fill={INK} />
      </Svg>
    </View>
  );
}

// ───────── 코랄 진행 고리 (n / 5) ─────────

export function ProgressRing({
  done,
  total,
  size = 92,
  stroke = 9,
  complete,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
  complete?: boolean;
}) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const frac = total ? Math.min(1, done / total) : 0;
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={`핵심 미션 ${total}개 중 ${done}개를 했어요`}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.coralSoft} strokeWidth={stroke} fill="none" />
        {frac > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c.coral}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ * frac} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T variant={size >= 80 ? 'title' : 'headline'} weight="800" color={complete ? c.coralInk : c.ink} style={{ fontVariant: ['tabular-nums'] }}>
          {done}
        </T>
        <T variant={size >= 80 ? 'callout' : 'caption'} weight="700" color={c.sub}>
          /{total}
        </T>
      </View>
    </View>
  );
}
