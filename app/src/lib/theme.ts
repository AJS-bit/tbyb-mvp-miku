// SPEC.md 디자인 토큰 (웹·앱 공통)
import { Platform } from 'react-native';

import type { DeviceKey, ReservationStatus } from '@/domain';

export const C = {
  ink: '#111418',
  sub: '#5B6470',
  muted: '#8A93A0',
  line: '#E4E7EC',
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  primary: '#2B59FF',
  primarySoft: '#EDF1FF',
  air: '#0F9D8A',
  airSoft: '#E6F5F2',
  pro: '#6D4AFF',
  proSoft: '#F0ECFF',
  warnBg: '#FFF7E6',
  warnText: '#8A5A00',
  warnLine: '#F5DDAE',
  error: '#D92D20',
  errorSoft: '#FEF3F2',
  done: '#12B76A',
  doneText: '#067647',
  doneSoft: '#ECFDF3',
  slate: '#475467',
  slateSoft: '#EEF2F6',
  grey: '#667085',
  greySoft: '#F2F4F7',
} as const;

export const DEVICE_COLOR: Record<DeviceKey, { main: string; soft: string; short: string }> = {
  air: { main: C.air, soft: C.airSoft, short: 'Air' },
  pro: { main: C.pro, soft: C.proSoft, short: 'Pro' },
};

// 상태 칩: 요청 접수·운영 확인 = 회청 / 결제 대기 = 주의색 / 예약 확정·체험 중 = primary /
// 반납 접수·검수 중 = Pro 색 / 완료 = 완료색 / 취소 = 회색
export const STATUS_TONE: Record<ReservationStatus, { bg: string; fg: string; dot: string }> = {
  requested: { bg: C.slateSoft, fg: C.slate, dot: C.slate },
  operator_check: { bg: C.slateSoft, fg: C.slate, dot: C.slate },
  payment_pending: { bg: C.warnBg, fg: C.warnText, dot: '#DC8B00' },
  confirmed: { bg: C.primarySoft, fg: C.primary, dot: C.primary },
  in_trial: { bg: C.primarySoft, fg: C.primary, dot: C.primary },
  return_received: { bg: C.proSoft, fg: C.pro, dot: C.pro },
  inspecting: { bg: C.proSoft, fg: C.pro, dot: C.pro },
  completed: { bg: C.doneSoft, fg: C.doneText, dot: C.done },
  cancelled: { bg: C.greySoft, fg: C.grey, dot: C.grey },
};

export const RADIUS = { card: 12, chip: 999, control: 10 } as const;
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const FONT_FAMILY = Platform.select({
  web: '-apple-system, "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif',
  default: undefined,
});

export const MAX_WIDTH = 640;
