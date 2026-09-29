// 앱 전체 상태 저장소 (하나) — useSyncExternalStore.
// demo: shared/domain.ts 의 DemoState 그대로 (STORAGE_KEY 에 저장, readSaved 로 읽음 — 손상되면 원본을 덮어쓰지 않는다)
// ui:   앱에서만 쓰는 로컬 UI 상태 (선택한 예약, 체크리스트, 리마인드) — 별도 키에 저장
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import {
  STORAGE_KEY,
  STORAGE_READ_ERROR,
  STORAGE_WRITE_ERROR,
  createInitialState,
  readSaved,
  type DemoState,
  type Reservation,
  type Result,
} from '@/domain';

export const UI_STORAGE_KEY = `${STORAGE_KEY}:app-ui`;

export interface ReminderItem {
  key: 'day1' | 'dayBeforeLast' | 'combined';
  date: string; // YYYY-MM-DD
  at: string; // ISO — 알림 시각
  title: string;
  body: string;
}

export interface ReminderRecord {
  lastDay: string | null; // 고객이 고른 체험 마지막 날 (YYYY-MM-DD)
  status: 'none' | 'scheduled' | 'planned'; // scheduled = 기기에 실제 예약됨 · planned = 계획만 표시
  items: ReminderItem[];
  notificationIds: string[];
  mode?: 'alert' | 'provisional';
  note?: string;
  updatedAt?: string;
}

export interface UiState {
  version: 1;
  selectedId: string | null;
  checklist: Record<string, number[]>; // 예약ID → 확인한 체크리스트 항목 번호
  returnChecklist: Record<string, string[]>; // 예약ID → 'air:backup' 형식
  reminders: Record<string, ReminderRecord>;
}

export interface AppSnapshot {
  ready: boolean;
  demo: DemoState;
  ui: UiState;
  /** 저장본을 읽지 못함 — 원본 보존을 위해 저장하지 않는다. 사용자가 '초기화'할 때만 덮어쓴다. */
  loadError: { key: string; raw: string }[] | null;
  /** 마지막 저장 실패 */
  writeError: string | null;
}

function emptyUi(): UiState {
  return { version: 1, selectedId: null, checklist: {}, returnChecklist: {}, reminders: {} };
}

function readUi(raw: string | null | undefined): Result<UiState> {
  if (!raw) return { ok: true, value: emptyUi() };
  try {
    const u = JSON.parse(raw) as UiState;
    if (u && u.version === 1 && typeof u.checklist === 'object') return { ok: true, value: { ...emptyUi(), ...u } };
  } catch {
    // 아래 오류로 알린다
  }
  return { ok: false, error: STORAGE_READ_ERROR };
}

let snapshot: AppSnapshot = { ready: false, demo: createInitialState(), ui: emptyUi(), loadError: null, writeError: null };
const listeners = new Set<() => void>();
let hydrating: Promise<void> | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return snapshot;
}

function setWriteError(e: string | null) {
  if (snapshot.writeError === e) return;
  snapshot = { ...snapshot, writeError: e };
  emit();
}

function persist(): Promise<boolean> {
  if (snapshot.loadError) return Promise.resolve(false); // 손상된 원본을 덮어쓰지 않는다
  const demo = JSON.stringify(snapshot.demo);
  const ui = JSON.stringify(snapshot.ui);
  // 순서대로 저장 — 빠르게 연속 변경해도 마지막 값이 남는다
  const p = writeChain.then(() =>
    AsyncStorage.multiSet([
      [STORAGE_KEY, demo],
      [UI_STORAGE_KEY, ui],
    ]).then(
      () => {
        setWriteError(null);
        return true;
      },
      (e) => {
        console.warn('[store] 저장 실패', e);
        setWriteError(STORAGE_WRITE_ERROR);
        return false;
      },
    ),
  );
  writeChain = p;
  return p;
}

/** 저장 실패 후 다시 시도 */
export function retryPersist(): Promise<boolean> {
  return persist();
}

/** 실행 시 한 번: 저장본 복원 */
export function hydrate(): Promise<void> {
  if (snapshot.ready) return Promise.resolve();
  if (!hydrating) {
    hydrating = AsyncStorage.multiGet([STORAGE_KEY, UI_STORAGE_KEY])
      .then((pairs) => {
        const raw = pairs.find(([k]) => k === STORAGE_KEY)?.[1];
        const uiRaw = pairs.find(([k]) => k === UI_STORAGE_KEY)?.[1];
        const demo = readSaved(raw);
        const ui = readUi(uiRaw);
        const bad: { key: string; raw: string }[] = [];
        if (!demo.ok) bad.push({ key: STORAGE_KEY, raw: raw ?? '' });
        if (!ui.ok) bad.push({ key: UI_STORAGE_KEY, raw: uiRaw ?? '' });
        snapshot = {
          ready: true,
          demo: demo.ok ? demo.value : createInitialState(),
          ui: ui.ok ? ui.value : emptyUi(),
          loadError: bad.length ? bad : null,
          writeError: null,
        };
      })
      .catch((e) => {
        console.warn('[store] 저장본 읽기 실패', e);
        snapshot = {
          ready: true,
          demo: createInitialState(),
          ui: emptyUi(),
          loadError: [{ key: STORAGE_KEY, raw: `읽기 오류: ${e instanceof Error ? e.message : String(e)}` }],
          writeError: null,
        };
      })
      .then(() => emit());
  }
  return hydrating;
}

export function useApp(): AppSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getApp(): AppSnapshot {
  return snapshot;
}

/** 도메인 함수 실행 → 성공하면 저장. 실패하면 상태를 바꾸지 않고 오류를 돌려준다. */
export function apply(fn: (s: DemoState) => Result<DemoState>): Result<DemoState> {
  if (snapshot.loadError) return { ok: false, error: STORAGE_READ_ERROR };
  const r = fn(snapshot.demo);
  if (r.ok) {
    snapshot = { ...snapshot, demo: r.value };
    emit();
    persist();
  }
  return r;
}

/** 앱 UI 상태 변경. 저장본을 읽지 못한 상태면 바꾸지 않고 false. */
export function updateUi(fn: (u: UiState) => UiState): boolean {
  if (snapshot.loadError) return false;
  snapshot = { ...snapshot, ui: fn(snapshot.ui) };
  emit();
  persist();
  return true;
}

export function selectReservation(id: string) {
  updateUi((u) => ({ ...u, selectedId: id }));
}

/** 데모 설정: 딜러 판매 조건 확정 여부 (domain.ts 에 setter 가 없어 필드만 바꾼다) */
export function setDealerTermsConfirmed(value: boolean): Result<DemoState> {
  return apply((s) => ({ ok: true, value: { ...s, dealerTermsConfirmed: value } }));
}

/** 데모 초기화 — 도메인 초기 상태 + 앱 UI 상태 비움. 손상된 저장본을 덮어쓰는 유일한 경로. */
export function resetAll(): Promise<boolean> {
  snapshot = { ready: true, demo: createInitialState(), ui: emptyUi(), loadError: null, writeError: null };
  emit();
  return persist();
}

export function currentReservation(s: AppSnapshot): Reservation | undefined {
  const list = s.demo.reservations;
  return list.find((r) => r.id === s.ui.selectedId) ?? list[0];
}

export function useCurrent(): { app: AppSnapshot; current: Reservation | undefined } {
  const app = useApp();
  return { app, current: currentReservation(app) };
}
