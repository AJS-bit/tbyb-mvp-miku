"use client";

// 화면 테마 저장소 — 고른 값(시스템/라이트/다크)을 localStorage[THEME_KEY] 에 저장한다. 데모 상태 저장소(store.ts)와 별개.
//  - 첫 적용은 layout.tsx 의 <head> 인라인 스크립트(THEME_INIT_SCRIPT)가 한다. 여기서는 그 뒤의 변경만 다룬다.
//  - '시스템'이면 OS 설정(prefers-color-scheme)이 바뀌는 즉시 따라간다.
//  - 저장에 실패해도 이번 화면에는 적용하고, saveFailedAt 으로 짧은 알림을 띄운다. 예외를 밖으로 던지지 않는다.
//  - 다른 탭에서 바꾸면(storage 이벤트) 이 탭도 따라간다.
import { useSyncExternalStore } from "react";
import { THEME_COLOR, THEME_KEY, isThemePref, type ResolvedTheme, type ThemePref } from "./theme-core";

export interface ThemeSnapshot {
  pref: ThemePref;
  resolved: ResolvedTheme;
  /** 마지막 선택을 저장하지 못했으면 몇 번째 실패인지(같은 알림을 다시 띄우는 데 쓴다). 저장됐으면 null */
  saveFailedAt: number | null;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

let snap: ThemeSnapshot | null = null;
const listeners = new Set<() => void>();
let bound = false;
let failures = 0;

function systemTheme(): ResolvedTheme {
  try {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function resolve(pref: ThemePref): ResolvedTheme {
  return pref === "system" ? systemTheme() : pref;
}

function readStoredPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemePref(v) ? v : "system";
  } catch {
    return "system";
  }
}

/** <html> 속성·color-scheme·주소창 색을 맞춘다. 바뀌는 순간에는 전환 효과를 잠깐 끈다. */
function applyToDocument(pref: ThemePref, resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") !== resolved) {
    root.setAttribute("data-theme-switching", "");
    root.setAttribute("data-theme", resolved);
    // 새 색이 한 번 그려진 뒤에 전환 효과를 되살린다
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
  }
  root.setAttribute("data-theme-pref", pref);
  root.style.colorScheme = resolved;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const media = m.getAttribute("media") ?? "";
    // 시스템이면 media 별 원래 색, 직접 골랐으면 두 media 모두 고른 색
    const own: ResolvedTheme = media.includes("dark") ? "dark" : media.includes("light") ? "light" : resolved;
    m.setAttribute("content", THEME_COLOR[pref === "system" ? own : resolved]);
  });
}

function read(): ThemeSnapshot {
  if (snap) return snap;
  const pref = readStoredPref();
  snap = { pref, resolved: resolve(pref), saveFailedAt: null };
  return snap;
}

function emit() {
  listeners.forEach((l) => l());
}

function onSystemChange() {
  const cur = read();
  if (cur.pref !== "system") return;
  const resolved = systemTheme();
  if (resolved === cur.resolved) return;
  snap = { ...cur, resolved };
  applyToDocument(cur.pref, resolved);
  emit();
}

function onStorage(e: StorageEvent) {
  if (e.key !== null && e.key !== THEME_KEY) return;
  const pref = readStoredPref();
  snap = { pref, resolved: resolve(pref), saveFailedAt: null };
  applyToDocument(pref, snap.resolved);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!bound) {
    bound = true;
    try {
      const mql = window.matchMedia(DARK_QUERY);
      if (typeof mql.addEventListener === "function") mql.addEventListener("change", onSystemChange);
      else mql.addListener(onSystemChange); // 오래된 Safari
    } catch {
      // matchMedia 가 없으면 시스템 = 라이트로 둔다
    }
    window.addEventListener("storage", onStorage);
    // 인라인 스크립트가 막혔던 경우에도 화면과 저장값이 같게 한 번 맞춘다
    const cur = read();
    applyToDocument(cur.pref, cur.resolved);
  }
  return () => {
    listeners.delete(listener);
  };
}

/** 마운트 전(정적 HTML·하이드레이션)에는 null — 스위처 모양은 <html data-theme-pref> 로 CSS 가 먼저 맞춘다. */
export function useTheme(): ThemeSnapshot | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** 테마를 고른다. 저장이 실패해도 이번 화면에는 적용하고 saveFailedAt 을 세운다. */
export function setThemePref(pref: ThemePref): void {
  const resolved = resolve(pref);
  applyToDocument(pref, resolved);
  let saved = true;
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    saved = false;
  }
  if (!saved) failures += 1;
  snap = { pref, resolved, saveFailedAt: saved ? null : failures };
  emit();
}
