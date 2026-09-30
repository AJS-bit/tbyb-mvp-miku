// iOS·Android: expo-notifications 로 기기 로컬 알림을 실제로 예약한다 (서버·푸시 없음).
import * as Notifications from 'expo-notifications';

import type { ReminderItem } from './store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const REMINDERS_SUPPORTED = true;

export type ScheduleResult =
  | { ok: true; ids: string[]; mode: 'alert' | 'provisional'; skipped: number }
  | { ok: false; error: string };

async function ensurePermission(): Promise<'alert' | 'provisional' | null> {
  const read = (p: Notifications.NotificationPermissionsStatus) => {
    const s = p.ios?.status;
    if (s === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'provisional' as const;
    if (p.granted) return 'alert' as const;
    return null;
  };
  const current = await Notifications.getPermissionsAsync();
  const have = read(current);
  if (have) return have;
  if (!current.canAskAgain) return null;
  // 고객이 '알림 받기'를 누른 순간에만 요청한다.
  // iOS 는 먼저 조용한 알림(provisional)으로 허용 — 확인 창 없이 알림 센터로 전달되고, 설정에서 배너로 바꿀 수 있다.
  const asked = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false, allowProvisional: true },
  });
  return read(asked);
}

export async function scheduleReminders(items: ReminderItem[], now: Date = new Date()): Promise<ScheduleResult> {
  try {
    const mode = await ensurePermission();
    if (!mode) {
      return { ok: false, error: '알림이 꺼져 있어서 예약하지 못했어요. 설정 앱에서 알림을 켜 주세요.' };
    }
    const ids: string[] = [];
    let skipped = 0;
    for (const item of items) {
      const date = new Date(item.at);
      if (date.getTime() <= now.getTime()) {
        skipped += 1;
        continue;
      }
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: item.title, body: item.body, data: { kind: 'tbyb-reminder', key: item.key } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
      ids.push(id);
    }
    return { ok: true, ids, mode, skipped };
  } catch (e) {
    return { ok: false, error: `알림을 예약하지 못했어요. (${e instanceof Error ? e.message : String(e)})` };
  }
}

export async function cancelReminders(ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // 이미 전달됐거나 없는 알림
    }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/** 기기에 실제로 예약돼 있는 이 앱의 리마인드. 확인하지 못하면 null */
export async function listScheduledReminders(): Promise<{ id: string; title: string; date: string | null }[] | null> {
  try {
    const all = await withTimeout(Notifications.getAllScheduledNotificationsAsync(), 4000);
    return all
      .filter((n) => (n.content.data as { kind?: string } | null)?.kind === 'tbyb-reminder')
      .map((n) => {
        const t = n.trigger as { type?: string; value?: number; date?: number | string } | null;
        const raw = t?.value ?? t?.date ?? null;
        return { id: n.identifier, title: n.content.title ?? '', date: raw === null ? null : new Date(raw).toISOString() };
      });
  } catch {
    return null;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await withTimeout(Notifications.cancelAllScheduledNotificationsAsync(), 4000);
  } catch {
    // 확인 불가 — 개별 ID 는 예약 기록에서 취소한다
  }
}
