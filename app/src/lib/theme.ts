// SPEC.md v2 감성 디자인 토큰 — 따뜻한 아이보리 바탕, 잉크 버튼, Air 청록 · Pro 보라, 리워드 코랄
import { Platform } from 'react-native';

import type { DeviceKey, Pick, ReservationStatus } from '@/domain';

export const C = {
  ink: '#1F1B16',
  sub: '#6B635A',
  muted: '#A0968A',
  line: '#EAE3D8',
  lineStrong: '#DDD3C4',
  bg: '#FAF6EF',
  surface: '#FFFFFF',
  sunk: '#F3EDE3', // 한 톤 낮은 아이보리 — 트랙·미리보기 칸
  ivory: '#FAF6EF', // 잉크 버튼 위 글자
  sun: '#FFE2C2', // 히어로 뒤 해
  air: '#1E9E8A',
  airSoft: '#E3F4F0',
  airInk: '#11695C', // 연한 바탕 위 작은 글자용
  pro: '#6D4AFF',
  proSoft: '#EEEAFF',
  proInk: '#4B2FC9',
  coral: '#FF6B4A',
  coralSoft: '#FFEDE7',
  coralInk: '#B8391E',
  warnBg: '#FFF4E0',
  warnText: '#8A5A00',
  warnLine: '#F3DDB0',
  error: '#D92D20',
  errorSoft: '#FEF3F2',
  errorLine: '#FBCFCA',
  done: '#12B76A',
  doneText: '#067647',
  doneSoft: '#E8F6EE',
  doneLine: '#B7E6CB',
  grey: '#7A7065',
  greySoft: '#F1ECE4',
} as const;

export const DEVICE_COLOR: Record<DeviceKey, { main: string; soft: string; ink: string; short: string }> = {
  air: { main: C.air, soft: C.airSoft, ink: C.airInk, short: 'Air' },
  pro: { main: C.pro, soft: C.proSoft, ink: C.proInk, short: 'Pro' },
};

// 미션 답 색 — Air·Pro 는 기기 색 그대로, 비슷함은 모래색, 모르겠음은 따뜻한 회색
export const PICK_COLOR: Record<Pick, { main: string; soft: string; ink: string; mark: string }> = {
  air: { main: C.air, soft: C.airSoft, ink: C.airInk, mark: 'A' },
  same: { main: '#B8894A', soft: '#F7EEDF', ink: '#7A5620', mark: '=' },
  pro: { main: C.pro, soft: C.proSoft, ink: C.proInk, mark: 'P' },
  unsure: { main: '#9A9084', soft: C.greySoft, ink: C.sub, mark: '?' },
};

// 상태 칩: 요청 접수·운영 확인 = 따뜻한 회색 / 결제 대기 = 주의색 / 예약 확정·체험 중 = 잉크 /
// 반납 접수·검수 중 = Pro 색 / 완료 = 완료색 / 취소 = 회색
export const STATUS_TONE: Record<ReservationStatus, { bg: string; fg: string; dot: string }> = {
  requested: { bg: C.greySoft, fg: C.sub, dot: C.grey },
  operator_check: { bg: C.greySoft, fg: C.sub, dot: C.grey },
  payment_pending: { bg: C.warnBg, fg: C.warnText, dot: '#DC8B00' },
  confirmed: { bg: C.ink, fg: C.ivory, dot: C.coral },
  in_trial: { bg: C.ink, fg: C.ivory, dot: C.coral },
  return_received: { bg: C.proSoft, fg: C.proInk, dot: C.pro },
  inspecting: { bg: C.proSoft, fg: C.proInk, dot: C.pro },
  completed: { bg: C.doneSoft, fg: C.doneText, dot: C.done },
  cancelled: { bg: C.greySoft, fg: C.grey, dot: C.muted },
};

export const RADIUS = { card: 20, chip: 999, control: 14 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const FONT_FAMILY = Platform.select({
  web: '-apple-system, "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif',
  default: undefined,
});

export const MONO_FAMILY = Platform.select({ ios: 'Menlo', web: 'ui-monospace, Menlo, monospace', default: 'monospace' });

// 카드 그림자 — 아주 옅게
export const SOFT_SHADOW = {
  shadowColor: '#5A4630',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1,
} as const;

export const MAX_WIDTH = 640;
