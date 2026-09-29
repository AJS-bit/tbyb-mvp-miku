// 웹 미리보기: 로컬 알림을 예약하지 않는다. 계획만 보여 준다.
import type { ReminderItem } from './store';

export const REMINDERS_SUPPORTED = false;

export type ScheduleResult =
  | { ok: true; ids: string[]; mode: 'alert' | 'provisional'; skipped: number }
  | { ok: false; error: string };

export async function scheduleReminders(_items: ReminderItem[], _now: Date = new Date()): Promise<ScheduleResult> {
  return { ok: false, error: '웹 미리보기에서는 알림을 예약하지 않습니다. 계획만 표시합니다.' };
}

export async function cancelReminders(_ids: string[]): Promise<void> {}

export async function listScheduledReminders(): Promise<{ id: string; title: string; date: string | null }[] | null> {
  return null;
}

export async function cancelAllReminders(): Promise<void> {}
