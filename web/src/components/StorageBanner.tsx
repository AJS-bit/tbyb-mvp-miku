"use client";

import { useState } from "react";
import { resetDemo, useDemo } from "@/lib/store";
import { btn, cx } from "./ui";

/** 저장본을 읽지 못했거나 저장에 실패했을 때 모든 화면 위에 계속 보이는 오류 막대. */
export function StorageBanner() {
  const snap = useDemo();
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  if (!snap || (!snap.loadError && !snap.writeError)) return null;

  if (!snap.loadError) {
    return (
      <div role="alert" data-testid="storage-write-error" className="border-b border-danger/30 bg-danger-soft">
        <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm font-medium text-danger sm:px-6">{snap.writeError}</p>
      </div>
    );
  }

  const raw = snap.rawSaved ?? "";

  async function copy() {
    setShowRaw(true);
    try {
      await navigator.clipboard.writeText(raw);
      setCopied("원본을 클립보드에 복사했습니다.");
    } catch {
      setCopied("자동 복사가 막혀 있습니다. 아래 원본을 직접 선택해 복사해 주세요.");
    }
  }

  function reset() {
    const r = resetDemo();
    if (!r.ok) setError(r.error);
    else {
      setError("");
      setConfirming(false);
    }
  }

  return (
    <div role="alert" data-testid="storage-load-error" className="border-b border-danger/30 bg-danger-soft">
      <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-danger sm:px-6">
        <p className="font-semibold">{snap.loadError}</p>
        <p className="mt-1 text-danger/90">이 상태에서는 어떤 변경도 저장하지 않습니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={copy} className={cx(btn.secondary, btn.small)}>
            원본 복사
          </button>
          {confirming ? (
            <>
              <button type="button" onClick={reset} className={cx(btn.danger, btn.small)}>
                원본을 지우고 초기화
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={cx(btn.secondary, btn.small)}>
                그만두기
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={cx(btn.danger, btn.small)}>
              초기화
            </button>
          )}
        </div>
        {copied ? <p className="mt-2 text-ink">{copied}</p> : null}
        {showRaw ? (
          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-ink">읽지 못한 원본</span>
            <textarea
              readOnly
              value={raw || "(비어 있음 — 저장소 자체에 접근하지 못했습니다)"}
              rows={3}
              onFocus={(e) => e.currentTarget.select()}
              className="tabular block w-full rounded-lg border border-line bg-surface p-2 font-mono text-xs text-ink"
            />
          </label>
        ) : null}
        {error ? <p className="mt-2 font-semibold">{error}</p> : null}
      </div>
    </div>
  );
}
