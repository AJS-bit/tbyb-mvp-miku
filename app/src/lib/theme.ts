// 테마 — 라이트·다크 팔레트(palette.ts)에서 화면이 쓰는 파생 색(기기·미션 답·상태 칩)과 그림자를 만든다.
// 화면은 useTheme() 으로 지금 테마를 받고, 스타일은 themed() 로 두 테마 것을 미리 만들어 골라 쓴다.
import { Platform } from 'react-native';

import type { DeviceKey, Pick, ReservationStatus } from '@/domain';

import { PALETTES, type Palette } from './palette';

export type { Palette } from './palette';
export type Scheme = 'light' | 'dark';
/** 사용자가 고른 화면 모드 — system = 기기 설정 따라가기 (기본) */
export type ThemePref = 'system' | 'light' | 'dark';
export const THEME_PREFS: ThemePref[] = ['system', 'light', 'dark'];

export interface Theme {
  scheme: Scheme;
  c: Palette;
  device: Record<DeviceKey, { main: string; soft: string; ink: string; on: string; short: string }>;
  pick: Record<Pick, { main: string; soft: string; ink: string; mark: string }>;
  status: Record<ReservationStatus, { bg: string; fg: string; dot: string }>;
  shadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
  raised: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number };
}

function makeTheme(scheme: Scheme): Theme {
  const c = PALETTES[scheme];
  return {
    scheme,
    c,
    device: {
      air: { main: c.air, soft: c.airSoft, ink: c.airInk, on: c.onAir, short: 'Air' },
      pro: { main: c.pro, soft: c.proSoft, ink: c.proInk, on: c.onPro, short: 'Pro' },
    },
    // 미션 답 색 — Air·Pro 는 기기 색 그대로, 비슷함은 모래색, 모르겠음은 따뜻한 회색
    pick: {
      air: { main: c.air, soft: c.airSoft, ink: c.airInk, mark: 'A' },
      same: { main: c.sand, soft: c.sandSoft, ink: c.sandInk, mark: '=' },
      pro: { main: c.pro, soft: c.proSoft, ink: c.proInk, mark: 'P' },
      unsure: { main: c.unsure, soft: c.greySoft, ink: c.sub, mark: '?' },
    },
    // 상태 칩: 요청 접수·운영 확인 = 따뜻한 회색 / 결제 대기 = 주의색 / 예약 확정·체험 중 = 잉크(다크에서는 밝은 잉크) /
    // 반납 접수·검수 중 = Pro 색 / 완료 = 완료색 / 취소 = 회색
    status: {
      requested: { bg: c.greySoft, fg: c.sub, dot: c.grey },
      operator_check: { bg: c.greySoft, fg: c.sub, dot: c.grey },
      payment_pending: { bg: c.warnBg, fg: c.warnText, dot: c.warnDot },
      confirmed: { bg: c.ink, fg: c.ivory, dot: c.coral },
      in_trial: { bg: c.ink, fg: c.ivory, dot: c.coral },
      return_received: { bg: c.proSoft, fg: c.proInk, dot: c.pro },
      inspecting: { bg: c.proSoft, fg: c.proInk, dot: c.pro },
      completed: { bg: c.doneSoft, fg: c.doneText, dot: c.done },
      cancelled: { bg: c.greySoft, fg: c.grey, dot: c.muted },
    },
    // 카드 그림자 — 라이트는 아주 옅은 갈색, 다크는 바탕보다 조금 깊은 그림자
    shadow: {
      shadowColor: c.shadow,
      shadowOpacity: scheme === 'dark' ? 0.28 : 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    raised: {
      shadowColor: c.shadow,
      shadowOpacity: scheme === 'dark' ? 0.35 : 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
  };
}

export const THEMES: Record<Scheme, Theme> = { light: makeTheme('light'), dark: makeTheme('dark') };

export const RADIUS = { card: 20, chip: 999, control: 14 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const FONT_FAMILY = Platform.select({
  web: '-apple-system, "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif',
  default: undefined,
});

export const MONO_FAMILY = Platform.select({ ios: 'Menlo', web: 'ui-monospace, Menlo, monospace', default: 'monospace' });

export const MAX_WIDTH = 640;
