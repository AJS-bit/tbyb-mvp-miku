import {
  METRICS,
  METRIC_LABEL,
  pairedCounts,
  summarize,
  type CompareLog,
  type DeviceEntry,
  type DeviceKey,
  type DeviceSummary,
  type Metric,
} from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";
import { DeviceName, cx, deviceTone } from "./ui";

const KEYS: DeviceKey[] = ["air", "pro"];

/** 1–5 점수 항목 (기록 입력 화면용 도움말) */
export const SCORE_METRICS: { key: Exclude<Metric, "minutes">; hint: string }[] = [
  { key: "portability", hint: "들고 다니기" },
  { key: "display", hint: "가독성·크기" },
  { key: "feel", hint: "키보드·발열·소음" },
];

const SUMMARY_HINT: Partial<Record<Metric, string>> = { minutes: "짧을수록 빠름" };

function summaryValue(s: DeviceSummary, m: Metric): number | null {
  return m === "minutes" ? s.avgMinutes : s[m];
}

function ScoreCell({ kind, value }: { kind: DeviceKey; value: number }) {
  return (
    <div className="min-w-0">
      <span className="tabular text-[15px] font-semibold text-ink">{value}</span>
      <span className="text-xs text-sub"> / 5</span>
      <div className="mt-1 h-1.5 w-full max-w-28 rounded-full bg-line" aria-hidden>
        <div className={cx("h-1.5 rounded-full", deviceTone[kind].bar)} style={{ width: `${(value / 5) * 100}%` }} />
      </div>
    </div>
  );
}

function MinutesCell({ value }: { value: number }) {
  return (
    <span className="tabular text-[15px] font-semibold text-ink">
      {value}
      <span className="text-xs font-normal text-sub"> 분</span>
    </span>
  );
}

/**
 * summarize() 결과를 두 기기 나란히 보여준다.
 * 평균은 같은 기록에서 두 기기 모두 측정한 항목만으로 계산된다(domain) — 항목마다 근거 기록 수를 함께 보인다.
 */
export function CompareSummary({ logs, caption }: { logs: CompareLog[]; caption?: string }) {
  const sum = summarize(logs);
  const counts = pairedCounts(logs);
  return (
    <div data-testid="compare-summary" className="overflow-hidden rounded-xl border border-line">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{caption ?? "두 기기 비교 요약"}</caption>
        <thead>
          <tr className="bg-bg text-xs text-sub">
            <th scope="col" className="w-[36%] px-3 py-2.5 font-medium sm:px-4">
              평균 · 기록 {logs.length}건
            </th>
            {KEYS.map((k) => (
              <th key={k} scope="col" className="px-3 py-2.5 sm:px-4">
                <DeviceName kind={k} short className="text-sm" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((m) => {
            const n = counts[m];
            return (
              <tr key={m} data-testid={`summary-${m}`} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-3 text-sm font-medium text-ink sm:px-4">
                  {METRIC_LABEL[m]}
                  {SUMMARY_HINT[m] ? (
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-sub">{SUMMARY_HINT[m]}</span>
                  ) : null}
                  {n > 0 ? (
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-sub">{n}개 기록 기준</span>
                  ) : null}
                </th>
                {n > 0 ? (
                  KEYS.map((k) => {
                    const v = summaryValue(sum[k], m);
                    return (
                      <td key={k} className="px-3 py-3 sm:px-4">
                        {v === null ? (
                          <span className="text-sm text-sub">—</span>
                        ) : m === "minutes" ? (
                          <MinutesCell value={v} />
                        ) : (
                          <ScoreCell kind={k} value={v} />
                        )}
                      </td>
                    );
                  })
                ) : (
                  <td colSpan={2} className="px-3 py-3 text-sm text-sub sm:px-4">
                    두 기기 모두 측정한 기록 없음
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function entryCell(e: DeviceEntry, key: Metric) {
  const v = e[key];
  if (v === null) return <span className="text-sub">—</span>;
  return <span className="tabular font-semibold">{key === "minutes" ? v : `${v}/5`}</span>;
}

export function LogList({ logs }: { logs: CompareLog[] }) {
  if (!logs.length) return <p className="text-sm text-sub">아직 기록이 없습니다.</p>;
  return (
    <ol className="space-y-3">
      {[...logs].reverse().map((log) => (
        <li key={log.id} data-testid="compare-log" className="rounded-xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-semibold text-ink">{log.task}</p>
            <p className="text-xs text-sub">{fmtDateTime(log.createdAt)}</p>
          </div>
          <table className="mt-3 w-full table-fixed text-sm">
            <thead>
              <tr className="text-xs text-sub">
                <th scope="col" className="w-[34%] pb-1 text-left font-medium">
                  항목
                </th>
                {KEYS.map((k) => (
                  <th key={k} scope="col" className="pb-1 text-left">
                    <DeviceName kind={k} short className="text-xs" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((key) => (
                <tr key={key} className="border-t border-line/70">
                  <th scope="row" className="py-1.5 text-left font-normal text-sub">
                    {METRIC_LABEL[key]}
                  </th>
                  {KEYS.map((k) => (
                    <td key={k} className="py-1.5 text-ink">
                      {entryCell(log.entries[k], key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {log.note ? <p className="mt-3 rounded-lg bg-bg px-3 py-2 text-sm text-ink">{log.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
