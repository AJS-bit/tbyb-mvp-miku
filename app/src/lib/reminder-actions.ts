import { planReminders, trialStartDate } from './reminder-plan';
import { REMINDERS_SUPPORTED, cancelReminders, scheduleReminders } from './reminders';
import { getApp, updateUi, type ReminderRecord } from './store';

import type { Reservation } from '@/domain';

const EMPTY: ReminderRecord = { lastDay: null, status: 'none', items: [], notificationIds: [] };

export function reminderFor(id: string): ReminderRecord {
  return getApp().ui.reminders[id] ?? EMPTY;
}

function save(id: string, rec: ReminderRecord) {
  updateUi((u) => ({ ...u, reminders: { ...u.reminders, [id]: rec } }));
}

/** 마지막 날을 골라 리마인드를 (다시) 계획·예약한다 */
export async function scheduleFor(r: Reservation, lastDay: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const prev = reminderFor(r.id);
  if (prev.notificationIds.length) await cancelReminders(prev.notificationIds);
  const items = planReminders(trialStartDate(r), lastDay);
  const at = new Date().toISOString();
  if (!REMINDERS_SUPPORTED) {
    save(r.id, { lastDay, status: 'planned', items, notificationIds: [], note: '웹 미리보기 — 알림은 예약하지 않고 계획만 표시합니다.', updatedAt: at });
    return { ok: true };
  }
  const res = await scheduleReminders(items);
  if (!res.ok) {
    save(r.id, { lastDay, status: 'planned', items, notificationIds: [], note: res.error, updatedAt: at });
    return { ok: false, error: res.error };
  }
  save(r.id, {
    lastDay,
    status: 'scheduled',
    items,
    notificationIds: res.ids,
    mode: res.mode,
    note: res.skipped ? `이미 지난 시각 ${res.skipped}건은 예약하지 않았습니다.` : undefined,
    updatedAt: at,
  });
  return { ok: true };
}

/** 리마인드 끄기 (체험 종료·취소 때도 호출) */
export async function clearFor(id: string): Promise<void> {
  const prev = getApp().ui.reminders[id];
  if (!prev) return;
  if (prev.notificationIds.length) await cancelReminders(prev.notificationIds);
  save(id, { ...EMPTY, lastDay: prev.lastDay });
}
