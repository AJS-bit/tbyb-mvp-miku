import { parseDate } from "./domain";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 'YYYY-MM-DD' → '10월 1일 (목)' */
export function fmtDateKey(key: string): string {
  if (!key) return "—";
  const d = parseDate(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`;
}

/** ISO → '9월 29일 (화) 10:43' */
export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]}) ${hh}:${mm}`;
}

/** 남은 시간 표시 — '약 23시간 남음' / '기한 지남' */
export function fmtRemaining(iso: string | undefined, now: Date): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms < 0) return "기한 지남";
  const h = Math.floor(ms / 3600_000);
  if (h >= 1) return `약 ${h}시간 남음`;
  return `약 ${Math.max(1, Math.floor(ms / 60_000))}분 남음`;
}

export function weekdayOf(key: string): number {
  return parseDate(key).getDay();
}

export const WEEKDAY_LABELS = WEEKDAY;
