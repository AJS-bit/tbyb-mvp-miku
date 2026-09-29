"use client";

import { useState, type FormEvent } from "react";
import {
  DEVICE_LABEL,
  METRIC_LABEL,
  STATUS_LABEL,
  WORK_TYPES,
  addCompareLog,
  type DeviceEntry,
  type DeviceKey,
  type Reservation,
  type Score,
} from "@/lib/domain";
import { apply, useDemo } from "@/lib/store";
import { CompareSummary, LogList, SCORE_METRICS } from "@/components/compare";
import { ScorePicker } from "@/components/ScorePicker";
import { BackLink, NotFound, useIdParam } from "@/components/reservation";
import {
  Card,
  CardTitle,
  DeviceName,
  ErrorText,
  Notice,
  PageHeader,
  Skeleton,
  SuccessText,
  btn,
  cx,
  deviceTone,
  inputClass,
} from "@/components/ui";

const KEYS: DeviceKey[] = ["air", "pro"];

interface Draft {
  minutes: string;
  portability: Score | null;
  display: Score | null;
  feel: Score | null;
}
const emptyDraft = (): Draft => ({ minutes: "", portability: null, display: null, feel: null });

export function RecordView() {
  const snap = useDemo();
  const id = useIdParam();
  if (!snap) return <Skeleton />;
  if (!id) return <NotFound id="(예약 ID 없음)" />;
  const r = snap.state.reservations.find((x) => x.id === id);
  if (!r) return <NotFound id={id} />;
  return <Record r={r} />;
}

function Record({ r }: { r: Reservation }) {
  const locked = r.status !== "in_trial";
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={`/my/?id=${encodeURIComponent(r.id)}`}>{r.id} 내 체험</BackLink>
      <PageHeader eyebrow={`${r.id} · ${WORK_TYPES[r.request.workType].label}`} title="비교 기록">
        같은 작업을 두 기기에서 똑같이 해 보고, 같은 기준으로 적습니다. 마지막 날 이 기록을 나란히 보고 결정합니다.
      </PageHeader>

      <div className="space-y-5">
        {locked ? (
          <Notice tone="warn" title="지금은 비교 기록을 남길 수 없습니다">
            비교 기록은 두 기기를 받은 뒤 &lsquo;{STATUS_LABEL.in_trial}&rsquo; 단계에서만 열립니다. 지금은 &lsquo;
            {STATUS_LABEL[r.status]}&rsquo; 단계입니다.
            {r.status === "requested" || r.status === "operator_check" || r.status === "payment_pending" || r.status === "confirmed"
              ? " 픽업 후 운영자가 출고 기록을 마치면 열립니다."
              : r.status === "cancelled"
                ? ""
                : " 체험 기간이 끝나 기록이 잠겼습니다. 남긴 기록은 아래에서 볼 수 있습니다."}
          </Notice>
        ) : (
          <RecordForm r={r} />
        )}

        {r.logs.length ? (
          <Card aria-labelledby="sum">
            <CardTitle id="sum" sub="항목마다 같은 기록에서 두 기기 모두 측정한 값만 평균냅니다.">
              두 기기 나란히 보기
            </CardTitle>
            <CompareSummary logs={r.logs} />
          </Card>
        ) : null}

        <Card aria-labelledby="logs">
          <CardTitle id="logs">기록 {r.logs.length}건</CardTitle>
          <LogList logs={r.logs} />
        </Card>
      </div>
    </div>
  );
}

function RecordForm({ r }: { r: Reservation }) {
  const [task, setTask] = useState("");
  const [drafts, setDrafts] = useState<Record<DeviceKey, Draft>>({ air: emptyDraft(), pro: emptyDraft() });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  function patch(k: DeviceKey, p: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [k]: { ...d[k], ...p } }));
    setSaved("");
  }

  // 숫자 변환만 하고, 범위·짝 검사는 domain 의 addCompareLog 가 한다.
  function toEntry(d: Draft): DeviceEntry {
    const minutes = d.minutes.trim() === "" ? null : Number(d.minutes);
    return { minutes, portability: d.portability, display: d.display, feel: d.feel };
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    const air = toEntry(drafts.air);
    const pro = toEntry(drafts.pro);
    const res = apply((s, now) => addCompareLog(s, r.id, { task, note: note.trim(), entries: { air, pro } }, now));
    if (!res.ok) return setError(res.error);
    setError("");
    setSaved(`'${task.trim()}' 기록을 저장했습니다.`);
    setTask("");
    setNote("");
    setDrafts({ air: emptyDraft(), pro: emptyDraft() });
  }

  const checklist = WORK_TYPES[r.request.workType].checklist;

  return (
    <>
      <Card aria-labelledby="guide">
        <CardTitle id="guide" sub="항목을 누르면 아래 작업 이름에 채워집니다.">
          {WORK_TYPES[r.request.workType].label} 비교 체크리스트
        </CardTitle>
        <ul className="space-y-2">
          {checklist.map((c) => {
            const done = r.logs.some((l) => l.task === c);
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => {
                    setTask(c);
                    setSaved("");
                  }}
                  className={cx(
                    "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    task === c ? "border-primary bg-primary-soft" : "border-line bg-surface hover:border-sub/40",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                      done ? "bg-success text-white" : "border border-line text-sub",
                    )}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span className="text-ink">
                    {c}
                    {done ? <span className="ml-1 text-xs text-success-ink">기록함</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <form onSubmit={onSubmit} noValidate>
        <Card aria-labelledby="new">
          <CardTitle id="new" sub="같은 항목을 두 기기 모두 적어야 비교에 쓰입니다. 측정하지 않은 항목은 비워 두세요.">
            새 비교 기록
          </CardTitle>
          <label htmlFor="task" className="mb-1.5 block text-sm font-medium text-ink">
            두 기기에서 똑같이 해 본 작업
          </label>
          <input
            id="task"
            value={task}
            onChange={(e) => {
              setTask(e.target.value);
              setSaved("");
            }}
            placeholder="예: 같은 4K 영상 내보내기"
            className={inputClass}
            maxLength={120}
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {KEYS.map((k) => (
              <fieldset
                key={k}
                data-testid={`entry-${k}`}
                className={cx("min-w-0 rounded-xl border-t-4 bg-bg p-4", deviceTone[k].border)}
              >
                <legend className="sr-only">{DEVICE_LABEL[k]} 기록</legend>
                <DeviceName kind={k} className="text-[15px]" />
                <div className="mt-3">
                  <label htmlFor={`min-${k}`} className="mb-1.5 block text-sm font-medium text-ink">
                    {METRIC_LABEL.minutes} <span className="font-normal text-sub">선택 · 1,440분 이하</span>
                  </label>
                  <input
                    id={`min-${k}`}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={1440}
                    step="any"
                    value={drafts[k].minutes}
                    onChange={(e) => patch(k, { minutes: e.target.value })}
                    className={cx(inputClass, "tabular")}
                    aria-label={`${DEVICE_LABEL[k]} 소요 시간 (분)`}
                  />
                </div>
                <div className="mt-4 space-y-4">
                  {SCORE_METRICS.map((m) => (
                    <ScorePicker
                      key={m.key}
                      name={`${k}-${m.key}`}
                      legend={`${DEVICE_LABEL[k]} ${METRIC_LABEL[m.key]}`}
                      value={drafts[k][m.key]}
                      onChange={(v) => patch(k, { [m.key]: v })}
                      allowClear
                      tone={k}
                      compact
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <label htmlFor="note" className="mt-5 mb-1.5 block text-sm font-medium text-ink">
            메모 <span className="font-normal text-sub">선택</span>
          </label>
          <textarea
            id="note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
            maxLength={500}
            placeholder="예: Pro는 끝까지 조용했고, Air는 후반에 조금 느려짐"
          />

          <ErrorText>{error}</ErrorText>
          <SuccessText>{saved}</SuccessText>
          <button type="submit" className={cx(btn.primary, "mt-4 w-full sm:w-auto sm:px-8")}>
            기록 저장
          </button>
        </Card>
      </form>
    </>
  );
}
