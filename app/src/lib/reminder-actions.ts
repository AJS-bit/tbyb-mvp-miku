import { planReminders, trialStartDate } from './reminder-plan';
import { REMINDERS_SUPPORTED, cancelReminders, scheduleReminders } from './reminders';
import { getApp, updateUi, type ReminderRecord } from './store';

import { STORAGE_WRITE_ERROR, type Reservation } from '@/domain';

const EMPTY: ReminderRecord = { lastDay: null, status: 'none', items: [], notificationIds: [] };

export function reminderFor(id: string): ReminderRecord {
  return getApp().ui.reminders[id] ?? EMPTY;
}

function save(id: string, rec: ReminderRecord): Promise<boolean> {
  return updateUi((u) => ({ ...u, reminders: { ...u.reminders, [id]: rec } }));
}

/** 마지막 날을 골라 리마인드를 (다시) 계획·예약한다 */
export async function scheduleFor(r: Reservation, lastDay: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const prev = reminderFor(r.id);
  if (prev.notificationIds.length) await cancelReminders(prev.notificationIds);
  const items = planReminders(trialStartDate(r), lastDay);
  const at = new Date().toISOString();
  if (!REMINDERS_SUPPORTED) {
    const saved = await save(r.id, { lastDay, status: 'planned', items, notificationIds: [], note: '웹 미리보기에서는 알림을 예약하지 않고 계획만 보여 드려요.', updatedAt: at });
    return saved ? { ok: true } : { ok: false, error: STORAGE_WRITE_ERROR };
  }
  const res = await scheduleReminders(items);
  if (!res.ok) {
    await save(r.id, { lastDay, status: 'planned', items, notificationIds: [], note: res.error, updatedAt: at });
    return { ok: false, error: res.error };
  }
  const saved = await save(r.id, {
    lastDay,
    status: 'scheduled',
    items,
    notificationIds: res.ids,
    mode: res.mode,
    note: res.skipped ? `이미 지난 시각의 알림 ${res.skipped}건은 빼고 예약했어요.` : undefined,
    updatedAt: at,
  });
  if (!saved) {
    // 기록을 못 남겼으면 방금 예약한 알림도 거둔다 — 저장되지 않은 알림이 남지 않게
    await cancelReminders(res.ids);
    return { ok: false, error: STORAGE_WRITE_ERROR };
  }
  return { ok: true };
}

/** 리마인드 끄기 (체험 종료·취소 때도 호출) */
export async function clearFor(id: string): Promise<void> {
  const prev = getApp().ui.reminders[id];
  if (!prev) return;
  if (prev.notificationIds.length) await cancelReminders(prev.notificationIds);
  await save(id, { ...EMPTY, lastDay: prev.lastDay });
}
