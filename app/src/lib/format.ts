import { parseDate } from '@/domain';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n: number) => String(n).padStart(2, '0');

export function weekday(d: Date): string {
  return WEEKDAY[d.getDay()];
}

/** 2026-10-01 → 10월 1일 (목) */
export function formatDateKey(key: string): string {
  if (!key) return '';
  const d = parseDate(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday(d)})`;
}

/** ISO → 9월 29일 (화) 10:42 */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday(d)}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO → 10:42 (오늘) 또는 9월 29일 10:42 */
export function formatShortDateTime(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return sameDay ? `오늘 ${hm}` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`;
}

/** 남은 시간 문구 (결제 기한 등) */
export function formatRemaining(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return '기한 지남';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h >= 1) return `${h}시간 ${m}분 남음`;
  return `${m}분 남음`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
