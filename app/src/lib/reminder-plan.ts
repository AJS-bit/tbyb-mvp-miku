// 리마인드 계획: 체험 시작 다음 날(D+1)과 마지막 날 전날. 같은 날이면 하나로 합친다.
// 체험 기간은 딜러 계약 후 확정이라 앱이 숫자를 정하지 않는다 — 마지막 날은 고객이 안내받은 날짜를 고른다.
import { toDateKey, parseDate, type Reservation } from '@/domain';

import { addDays, startOfDay } from './format';
import type { ReminderItem } from './store';

export const REMINDER_HOUR = 10; // 오전 10시

/** 체험 시작일: 이력에서 '체험 중'으로 바뀐 날 (없으면 오늘) */
export function trialStartDate(r: Reservation): Date {
  const h = r.history.find((x) => x.to === 'in_trial' && x.from !== x.to);
  return startOfDay(h ? new Date(h.at) : new Date());
}

/** 고를 수 있는 마지막 날: 체험 시작 이틀째(D+2)부터 2주 */
export function lastDayOptions(start: Date, n = 13): string[] {
  return Array.from({ length: n }, (_, i) => toDateKey(addDays(start, i + 2)));
}

function at(dateKey: string): string {
  const d = parseDate(dateKey);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d.toISOString();
}

export function planReminders(start: Date, lastDay: string): ReminderItem[] {
  const day1 = toDateKey(addDays(start, 1));
  const beforeLast = toDateKey(addDays(parseDate(lastDay), -1));
  if (day1 === beforeLast) {
    return [
      {
        key: 'combined',
        date: day1,
        at: at(day1),
        title: '체험 둘째 날 · 내일이 마지막 날이에요',
        body: '남은 미션을 마치고 리워드를 신청해 두세요. 결정·반납 탭에서 반납 준비도 함께 확인해요.',
      },
    ];
  }
  return [
    {
      key: 'day1',
      date: day1,
      at: at(day1),
      title: '체험 둘째 날이에요 · 미션 하나 해 볼까요?',
      body: '두 맥에 같은 영상 틀어 보기처럼 쉬운 미션부터요. 비슷했거나 모르겠어도 그대로 골라 주세요.',
    },
    {
      key: 'dayBeforeLast',
      date: beforeLast,
      at: at(beforeLast),
      title: '내일이 체험 마지막 날이에요',
      body: '남은 미션을 마치고 리워드를 신청해 두세요. 결정·반납 탭에서 백업·로그아웃·나의 찾기 해제도 확인해요.',
    },
  ];
}
