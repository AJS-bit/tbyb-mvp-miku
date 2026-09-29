"use client";

// 데모 상태 저장소 — DemoState 하나를 localStorage[STORAGE_KEY] 에 저장·복원한다.
// 상태를 바꾸는 규칙은 모두 domain.ts 함수가 결정하고, 여기서는 결과를 저장·알림만 한다.
// 저장 실패·손상된 저장본을 숨기지 않는다:
//  - 읽기: readSaved 가 실패하면 원본을 덮어쓰지 않고 loadError 를 세운다. 이 동안 모든 변경은 거부된다.
//  - 쓰기: setItem 이 실패하면 변경을 반영하지 않고 STORAGE_WRITE_ERROR 를 돌려준다.
//  - 초기화(resetDemo)만 손상된 원본을 덮어쓴다.
import { useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  STORAGE_READ_ERROR,
  STORAGE_WRITE_ERROR,
  createInitialState,
  readSaved,
  type DemoState,
  type Result,
} from "./domain";

// 결제 기한 만료를 시연하기 위한 데모 시계 보정값(시간). DemoState 밖에 따로 저장한다.
const CLOCK_KEY = `${STORAGE_KEY}:clock-offset-hours`;

export interface DemoSnapshot {
  state: DemoState;
  clockOffsetHours: number;
  /** 저장본을 읽지 못함 — 원본은 그대로 두고, 사용자가 초기화할 때까지 변경을 막는다. */
  loadError: string | null;
  /** loadError 일 때 읽지 못한 원본 문자열 (복사용) */
  rawSaved: string | null;
  /** 마지막 저장 시도가 실패했으면 그 오류 */
  writeError: string | null;
}

let snap: DemoSnapshot | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function tryWrite(entries: [string, string][]): boolean {
  try {
    for (const [k, v] of entries) localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}

function read(): DemoSnapshot {
  if (snap) return snap;
  let raw: string | null = null;
  let offset = 0;
  let readable = true;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    offset = Number(localStorage.getItem(CLOCK_KEY)) || 0;
  } catch {
    readable = false;
  }
  const saved = readable ? readSaved(raw) : ({ ok: false, error: STORAGE_READ_ERROR } as const);
  if (!saved.ok) {
    // 원본 보존: 메모리에만 초기 상태를 두고 localStorage 에는 쓰지 않는다.
    // 데모 시계는 별도 키라 정상적으로 읽혔으면 그 값을 그대로 둔다 — 화면이 저장본과 어긋나지 않게
    snap = { state: createInitialState(), clockOffsetHours: offset, loadError: saved.error, rawSaved: raw, writeError: null };
    return snap;
  }
  snap = { state: saved.value, clockOffsetHours: offset, loadError: null, rawSaved: null, writeError: null };
  if (!raw) {
    // 첫 방문: 초기 상태를 저장해 '마지막 갱신' 시각이 새로고침마다 바뀌지 않게 한다.
    if (!tryWrite([[STORAGE_KEY, JSON.stringify(snap.state)]])) snap = { ...snap, writeError: STORAGE_WRITE_ERROR };
  }
  return snap;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!storageBound) {
    storageBound = true;
    // 다른 탭(예: 운영 시뮬레이터)에서 바꾼 내용도 반영
    window.addEventListener("storage", (e) => {
      if (e.key === null || e.key === STORAGE_KEY || e.key === CLOCK_KEY) {
        snap = null;
        emit();
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

/** 마운트 전(정적 HTML·하이드레이션)에는 null — 화면은 스켈레톤을 그린다. */
export function useDemo(): DemoSnapshot | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** 데모 시계가 반영된 현재 시각. domain 함수의 now 인자로 넘긴다. */
export function demoNow(): Date {
  return new Date(Date.now() + read().clockOffsetHours * 3600_000);
}

/**
 * domain 함수 하나를 실행하고, 성공하면 저장한다.
 * domain 이 거부하거나, 저장본을 읽지 못한 상태이거나, 저장에 실패하면 상태를 바꾸지 않고 error 를 돌려준다.
 */
export function apply(fn: (s: DemoState, now: Date) => Result<DemoState>): Result<DemoState> {
  const cur = read();
  if (cur.loadError) return { ok: false, error: cur.loadError };
  const r = fn(cur.state, demoNow());
  if (!r.ok) return r;
  if (!tryWrite([[STORAGE_KEY, JSON.stringify(r.value)]])) {
    snap = { ...cur, writeError: STORAGE_WRITE_ERROR };
    emit();
    return { ok: false, error: STORAGE_WRITE_ERROR };
  }
  snap = { ...cur, state: r.value, writeError: null };
  emit();
  return r;
}

export function setClockOffsetHours(hours: number): Result<true> {
  const cur = read();
  if (cur.loadError) return { ok: false, error: cur.loadError };
  if (!tryWrite([[CLOCK_KEY, String(hours)]])) {
    snap = { ...cur, writeError: STORAGE_WRITE_ERROR };
    emit();
    return { ok: false, error: STORAGE_WRITE_ERROR };
  }
  snap = { ...cur, clockOffsetHours: hours, writeError: null };
  emit();
  return { ok: true, value: true };
}

/**
 * 명시적 초기화 — 손상된 원본도 이때만 덮어쓴다.
 * 두 키를 따로 쓰고 실제로 저장된 키만 화면에 반영한다(한쪽만 실패해도 화면과 저장본이 같다).
 */
export function resetDemo(): Result<true> {
  const cur = read();
  const state = createInitialState(new Date());
  const stateOk = tryWrite([[STORAGE_KEY, JSON.stringify(state)]]);
  const clockOk = tryWrite([[CLOCK_KEY, "0"]]);
  const clockOffsetHours = clockOk ? 0 : cur.clockOffsetHours;
  const writeError = stateOk && clockOk ? null : STORAGE_WRITE_ERROR;
  snap = stateOk
    ? { state, clockOffsetHours, loadError: null, rawSaved: null, writeError }
    : { ...cur, clockOffsetHours, writeError };
  emit();
  return writeError ? { ok: false, error: writeError } : { ok: true, value: true };
}
