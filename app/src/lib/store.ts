// 앱 전체 상태 저장소 (하나) — useSyncExternalStore.
// demo: shared/domain.ts 의 DemoState 그대로 (STORAGE_KEY 에 저장, readSaved 로 읽음 — 손상되면 원본을 덮어쓰지 않는다)
// ui:   앱에서만 쓰는 로컬 UI 상태 (선택한 예약, 반납 준비 체크, 리마인드, 화면 모드) — 별도 키에 저장
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

import { THEME_PREFS, type ThemePref } from './theme';

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
  returnChecklist: Record<string, string[]>; // 예약ID → 'air:backup' 형식
  reminders: Record<string, ReminderRecord>;
  /** 화면 모드 (없으면 system). 데모 데이터와 별개 — 데모 초기화 때도 그대로 둔다 */
  theme?: ThemePref;
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
  return { version: 1, selectedId: null, returnChecklist: {}, reminders: {} };
}

function readUi(raw: string | null | undefined): Result<UiState> {
  if (!raw) return { ok: true, value: emptyUi() };
  try {
    const u = JSON.parse(raw) as UiState;
    if (u && u.version === 1 && typeof u.reminders === 'object' && u.reminders !== null) return { ok: true, value: { ...emptyUi(), ...u } };
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

// 키 하나만 쓴다 — 한 번의 쓰기는 전부 되거나 전부 안 된다. (여러 키를 한꺼번에 쓰면 웹에서는 일부만
// 저장될 수 있어 화면과 저장본이 어긋난다: TETO 교차검토 2026-09-29)
function writeKey(key: string, value: unknown): Promise<boolean> {
  return AsyncStorage.setItem(key, JSON.stringify(value)).then(
    () => true,
    (e) => {
      console.warn('[store] 저장 실패', e);
      return false;
    },
  );
}

// 변경은 한 줄로 세워 처리한다 — 앞 변경의 저장이 끝난 상태를 기준으로 다음 변경을 계산한다
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const p = writeChain.then(task, task);
  writeChain = p.catch(() => undefined);
  return p;
}

/** 저장 실패 안내 닫기 (실패한 변경은 이미 반영되지 않았다) */
export function dismissWriteError() {
  setWriteError(null);
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

/**
 * 도메인 함수 실행 → 기기 저장이 끝난 뒤에만 화면 상태를 바꾸고 성공을 돌려준다.
 * 도메인이 거부하거나, 저장본을 읽지 못한 상태이거나, 저장에 실패하면 아무것도 바꾸지 않고 오류를 돌려준다.
 * (화면은 입력값을 그대로 두고 다시 시도할 수 있다)
 */
export function apply(fn: (s: DemoState) => Result<DemoState>): Promise<Result<DemoState>> {
  return enqueue(async () => {
    if (snapshot.loadError) return { ok: false, error: STORAGE_READ_ERROR };
    const r = fn(snapshot.demo);
    if (!r.ok) return r;
    if (!(await writeKey(STORAGE_KEY, r.value))) {
      setWriteError(STORAGE_WRITE_ERROR);
      return { ok: false, error: STORAGE_WRITE_ERROR };
    }
    snapshot = { ...snapshot, demo: r.value, writeError: null };
    emit();
    return r;
  });
}

/** 저장된 화면 모드 (알 수 없는 값이면 system) */
export function savedThemePref(u: UiState): ThemePref {
  return u.theme && THEME_PREFS.includes(u.theme) ? u.theme : 'system';
}

/** 앱 UI 상태 변경 — apply 와 같이 저장이 끝난 뒤에만 반영. 실패하거나 저장본을 읽지 못한 상태면 false. */
export function updateUi(fn: (u: UiState) => UiState): Promise<boolean> {
  return enqueue(async () => {
    if (snapshot.loadError) return false;
    const ui = fn(snapshot.ui);
    if (!(await writeKey(UI_STORAGE_KEY, ui))) {
      setWriteError(STORAGE_WRITE_ERROR);
      return false;
    }
    snapshot = { ...snapshot, ui, writeError: null };
    emit();
    return true;
  });
}

/** 화면 모드 저장 — updateUi 규칙 그대로(저장이 끝난 뒤에만 ui 에 반영). 실패하면 false (화면 적용은 theme-context 가 이번 실행에만 한다) */
export function setThemePreference(pref: ThemePref): Promise<boolean> {
  return updateUi((u) => ({ ...u, theme: pref }));
}

export function selectReservation(id: string): Promise<boolean> {
  return updateUi((u) => ({ ...u, selectedId: id }));
}

/** 데모 설정: 딜러 판매 조건 확정 여부 (domain.ts 에 setter 가 없어 필드만 바꾼다) */
export function setDealerTermsConfirmed(value: boolean): Promise<Result<DemoState>> {
  return apply((s) => ({ ok: true, value: { ...s, dealerTermsConfirmed: value } }));
}

/**
 * 데모 초기화 — 도메인 초기 상태 + 앱 UI 상태 비움. 손상된 저장본을 덮어쓰는 유일한 경로.
 * 두 키를 따로 쓰고, 실제로 저장된 키만 화면에 반영한다(한쪽만 실패해도 화면과 저장본이 같다).
 */
export function resetAll(): Promise<boolean> {
  return enqueue(async () => {
    const demo = createInitialState();
    // 화면 모드는 데모 데이터가 아니라 기기 설정이라 초기화해도 남긴다
    const theme = snapshot.ui.theme;
    const ui: UiState = theme ? { ...emptyUi(), theme } : emptyUi();
    const demoOk = await writeKey(STORAGE_KEY, demo);
    const uiOk = await writeKey(UI_STORAGE_KEY, ui);
    const stillBad = (snapshot.loadError ?? []).filter(
      (b) => (b.key === STORAGE_KEY && !demoOk) || (b.key === UI_STORAGE_KEY && !uiOk),
    );
    snapshot = {
      ready: true,
      demo: demoOk ? demo : snapshot.demo,
      ui: uiOk ? ui : snapshot.ui,
      loadError: stillBad.length ? stillBad : null,
      writeError: demoOk && uiOk ? null : STORAGE_WRITE_ERROR,
    };
    emit();
    return demoOk && uiOk;
  });
}

export function currentReservation(s: AppSnapshot): Reservation | undefined {
  const list = s.demo.reservations;
  return list.find((r) => r.id === s.ui.selectedId) ?? list[0];
}

export function useCurrent(): { app: AppSnapshot; current: Reservation | undefined } {
  const app = useApp();
  return { app, current: currentReservation(app) };
}
