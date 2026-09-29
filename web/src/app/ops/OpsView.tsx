"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEVICE_LABEL,
  DEVICE_STATE_LABEL,
  INSPECTION_LABEL,
  NEXT,
  PAYMENT_RULE,
  PAYMENT_WINDOW_HOURS,
  SALE_LABEL,
  STATUS_HELP,
  STATUS_LABEL,
  WORK_TYPES,
  assignDevice,
  availableDevices,
  canTransition,
  isInspectionDone,
  isPaymentExpired,
  requiredInspections,
  saleDevice,
  setCheckout,
  setInspection,
  setPaymentCheck,
  setSaleResult,
  transition,
  type DemoState,
  type DeviceKey,
  type Inspection,
  type Reservation,
  type Result,
} from "@/lib/domain";
import { apply, demoNow, resetDemo, setClockOffsetHours, useDemo, type DemoSnapshot } from "@/lib/store";
import { fmtDateKey, fmtDateTime, fmtRemaining } from "@/lib/format";
import { ACTOR_LABEL, RequestSummary, decisionText } from "@/components/reservation";
import {
  Card,
  CardTitle,
  DeviceName,
  DeviceStateChip,
  ErrorText,
  Notice,
  Skeleton,
  StatusChip,
  SuccessText,
  btn,
  cx,
  inputClass,
} from "@/components/ui";

const KEYS: DeviceKey[] = ["air", "pro"];
const INSPECTION_FIELDS = Object.keys(INSPECTION_LABEL) as (keyof Inspection)[];
const DEMO_CLOCK_HOURS = PAYMENT_WINDOW_HOURS + 1;

export function OpsView() {
  const snap = useDemo();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!snap) return <Skeleton />;
  const { state } = snap;
  const selected = state.reservations.find((r) => r.id === selectedId) ?? null;

  function select(id: string) {
    setSelectedId(id);
    requestAnimationFrame(() => document.getElementById("ops-panel")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl border-2 border-warn-line bg-warn-bg px-5 py-5 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-warn sm:text-[28px]">운영 시뮬레이터 — 데모, 실제 운영자 인증 없음</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-warn">
          시연용으로 누구나 열 수 있는 화면입니다. 실제 운영에서는 인증된 운영자만 이 기능을 씁니다. 모든 변경은 이 브라우저의
          데모 데이터에만 저장됩니다. 운영자 상태 변경에는 사유가 필요하고, 허용된 다음 단계로만 이동합니다.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Ledger state={state} selectedId={selectedId} onSelect={select} />
          <div id="ops-panel" className="scroll-mt-28">
            {selected ? (
              <ReservationPanel key={selected.id} r={selected} state={state} />
            ) : (
              <Card>
                <p className="text-sm text-sub">
                  {state.reservations.length
                    ? "대장에서 예약을 고르면 단계 변경·기기 확보·거래 대조·출고·검수를 할 수 있습니다."
                    : "아직 요청이 없습니다."}
                </p>
              </Card>
            )}
          </div>
        </div>
        <aside className="space-y-6" aria-label="기기 보드와 데모 설정">
          <DeviceBoard state={state} onSelect={select} />
          <DemoControls snap={snap} onReset={() => setSelectedId(null)} />
        </aside>
      </div>
    </div>
  );
}

// ───────── 대장 ─────────

function paymentCell(r: Reservation, now: Date) {
  if (r.ops.txMatched) return <span className="font-medium text-success-ink">대조 완료</span>;
  if (r.status === "payment_pending") {
    return isPaymentExpired(r, now) ? (
      <span className="font-medium text-danger">기한 지남</span>
    ) : (
      <span className="font-medium text-warn">대조 전</span>
    );
  }
  return <span className="text-sub">—</span>;
}

function Ledger({ state, selectedId, onSelect }: { state: DemoState; selectedId: string | null; onSelect: (id: string) => void }) {
  const now = demoNow();
  return (
    <section aria-labelledby="ledger" className="rounded-xl border border-line bg-surface">
      <div className="px-5 pt-5 sm:px-6">
        <CardTitle id="ledger" sub="이 브라우저에 저장된 모든 데모 요청 (최신순)">
          예약 대장
        </CardTitle>
      </div>
      {state.reservations.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-sub sm:px-6">
          아직 요청이 없습니다.{" "}
          <Link href="/request/" className="font-semibold text-primary-ink underline underline-offset-2">
            일정 요청
          </Link>
          에서 데모 요청을 만들어 보세요.
        </p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-bg text-xs text-sub">
                {["예약 ID", "상태", "희망일", "작업 유형", "배정 기기", "결제 대조", "생성"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-medium whitespace-nowrap first:pl-5 sm:first:pl-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.reservations.map((r) => {
                const sel = r.id === selectedId;
                return (
                  <tr
                    key={r.id}
                    data-testid={`ledger-row-${r.id}`}
                    data-selected={sel ? "true" : undefined}
                    onClick={() => onSelect(r.id)}
                    className={cx("cursor-pointer border-b border-line last:border-b-0", sel ? "bg-primary-soft" : "hover:bg-bg")}
                  >
                    <td className="py-3 pr-3 pl-5 sm:pl-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(r.id);
                        }}
                        className="tabular whitespace-nowrap rounded font-bold text-primary-ink underline-offset-2 hover:underline"
                        aria-label={`${r.id} 열기`}
                      >
                        {r.id}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{fmtDateKey(r.request.startDate)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{WORK_TYPES[r.request.workType].label}</td>
                    <td className="tabular px-3 py-3 whitespace-nowrap">
                      {r.ops.deviceIds.air || r.ops.deviceIds.pro ? (
                        [r.ops.deviceIds.air, r.ops.deviceIds.pro].filter(Boolean).join(" · ")
                      ) : (
                        <span className="text-sub">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{paymentCell(r, now)}</td>
                    <td className="tabular px-3 py-3 whitespace-nowrap text-sub">{fmtDateTime(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ───────── 선택한 예약 ─────────

function ReservationPanel({ r, state }: { r: Reservation; state: DemoState }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const now = demoNow();

  function act(fn: (s: DemoState, now: Date) => Result<DemoState>, ok?: string) {
    const res = apply(fn);
    if (!res.ok) {
      setError(res.error);
      setMessage("");
    } else {
      setError("");
      setMessage(ok ?? "");
    }
    return res;
  }

  function move(to: Reservation["status"]) {
    const res = act((s, n) => transition(s, r.id, to, "operator", reason, n), `'${STATUS_LABEL[to]}'(으)로 변경했습니다.`);
    if (res.ok) setReason("");
  }

  const nextSteps = NEXT[r.status].filter((s) => s !== "cancelled");
  const canCancel = NEXT[r.status].includes("cancelled");

  return (
    <div className="space-y-5" data-testid="ops-panel">
      <Card aria-labelledby="sel">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="sel" className="tabular text-xl font-bold tracking-tight text-ink">
            {r.id}
          </h2>
          <StatusChip status={r.status} className="text-sm" />
        </div>
        <p className="mt-2 text-sm text-sub">{STATUS_HELP[r.status]}</p>
        <div className="mt-5">
          <RequestSummary r={r} />
        </div>
        <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-sub">배정 기기</p>
            <p className="tabular mt-0.5 text-ink">
              {KEYS.map((k) => `${k === "air" ? "Air" : "Pro"} ${r.ops.deviceIds[k] ?? "미배정"}`).join(" · ")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-sub">마지막 날 결정</p>
            <p className="mt-0.5 text-ink">{decisionText(r.decision)}</p>
            {saleDevice(r.decision) ? (
              <p className="mt-0.5 text-sm font-medium text-warn" data-testid="sale-status">
                판매: {SALE_LABEL[r.ops.sale]}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      {/* 단계 변경 */}
      <Card aria-labelledby="move" className="border-primary/30">
        <CardTitle id="move" sub="허용된 다음 단계만 보입니다. 단계를 건너뛸 수 없습니다.">
          단계 변경
        </CardTitle>
        {nextSteps.length || canCancel ? (
          <>
            <label htmlFor="op-reason" className="mb-1.5 block text-sm font-medium text-ink">
              변경 사유 <span className="text-danger">(필수)</span>
            </label>
            <input
              id="op-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 딜러에게 두 대 재고 확인 요청"
              className={inputClass}
              aria-describedby="op-reason-help"
              maxLength={200}
            />
            <p id="op-reason-help" className="mt-1 text-xs text-sub">
              모든 운영자 상태 변경은 사유와 함께 이력에 남습니다.
            </p>
            <div className="mt-4 space-y-3">
              {nextSteps.map((to) => {
                const check = canTransition(state, r.id, to, now);
                return (
                  <div key={to}>
                    <button
                      type="button"
                      disabled={!check.ok}
                      onClick={() => move(to)}
                      className={cx(btn.primary, "w-full sm:w-auto")}
                      aria-describedby={!check.ok ? `why-${to}` : undefined}
                    >
                      다음 단계: {STATUS_LABEL[to]}
                    </button>
                    {!check.ok ? (
                      <p id={`why-${to}`} data-testid={`blocked-${to}`} className="mt-1.5 text-sm font-medium text-warn">
                        {check.error}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {canCancel ? (
                <div className="border-t border-line pt-3">
                  <button type="button" onClick={() => move("cancelled")} className={cx(btn.danger, "w-full sm:w-auto")}>
                    취소 처리 (출고 전)
                  </button>
                  <p className="mt-1.5 text-xs text-sub">보류한 기기는 &lsquo;{DEVICE_STATE_LABEL.available}&rsquo;으로 풀립니다.</p>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-sub">
            {r.status === "completed" ? "완료된 예약입니다. 더 이상 바꿀 단계가 없습니다." : "취소된 예약입니다."}
          </p>
        )}
        <ErrorText>{error}</ErrorText>
        <SuccessText>{message}</SuccessText>
      </Card>

      <StageTools r={r} state={state} now={now} act={act} />

      <Card aria-labelledby="history">
        <CardTitle id="history">전체 이력</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-sub">
                {["시각", "이전", "이후", "주체", "사유"].map((h) => (
                  <th key={h} scope="col" className="py-2 pr-4 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.history.map((h, i) => (
                <tr key={`${h.at}-${i}`} className="border-b border-line/70 last:border-b-0 align-top">
                  <td className="tabular py-2 pr-4 whitespace-nowrap text-sub">{fmtDateTime(h.at)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{h.from ? STATUS_LABEL[h.from] : "—"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap font-medium">
                    {h.from === h.to ? <span className="font-normal text-sub">상태 유지</span> : STATUS_LABEL[h.to]}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{ACTOR_LABEL[h.actor]}</td>
                  <td className="py-2 text-ink">{h.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

type Act = (fn: (s: DemoState, now: Date) => Result<DemoState>, ok?: string) => Result<DemoState>;

function StageTools({ r, state, now, act }: { r: Reservation; state: DemoState; now: Date; act: Act }) {
  switch (r.status) {
    case "requested":
      return (
        <Notice tone="info" title="다음 할 일">
          딜러에게 Air·Pro 두 대와 반납 후 검수 여유 시간을 확인하고, &lsquo;{STATUS_LABEL.operator_check}&rsquo;으로 바꾼 뒤 기기를
          확보합니다.
        </Notice>
      );
    case "operator_check":
      return <DeviceAssign r={r} state={state} act={act} />;
    case "payment_pending":
      return <PaymentCheck r={r} now={now} act={act} />;
    case "confirmed":
      return <Checkout r={r} act={act} />;
    case "in_trial":
      return (
        <Card aria-labelledby="trial">
          <CardTitle id="trial">고객 체험 중</CardTitle>
          <p className="text-sm text-ink">
            비교 기록 {r.logs.length}건 · 마지막 날 결정: <strong className="font-semibold">{decisionText(r.decision)}</strong>
          </p>
          <p className="mt-2 text-sm text-sub">
            고객이 마지막 날 결정(아직 결정 못 함 포함)을 남겨야 반납 접수를 할 수 있습니다. 반납 접수 때 결정에 따라 반납 기기는
            검수 대기, 구매를 고른 기기는 딜러 판매 확인 대기로 바뀝니다. 구매 선택만으로는 판매가 아닙니다.
          </p>
        </Card>
      );
    case "return_received":
    case "inspecting":
    case "completed":
      return <Inspect r={r} act={act} />;
    default:
      return null;
  }
}

function DeviceAssign({ r, state, act }: { r: Reservation; state: DemoState; act: Act }) {
  return (
    <Card aria-labelledby="assign">
      <CardTitle id="assign" sub="요청 가능 상태인 기기만 배정할 수 있습니다. 두 대를 모두 확보해야 결제 요청을 보낼 수 있습니다.">
        기기 확보
      </CardTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {KEYS.map((k) => {
          const current = r.ops.deviceIds[k];
          const avail = availableDevices(state, k);
          const others = state.devices.filter((d) => d.kind === k && d.state !== "available" && d.id !== current);
          return (
            <div key={k} className="min-w-0 rounded-xl bg-bg p-4">
              <label htmlFor={`assign-${k}`} className="mb-2 block">
                <DeviceName kind={k} />
              </label>
              <select
                id={`assign-${k}`}
                value={current ?? ""}
                onChange={(e) => act((s) => assignDevice(s, r.id, k, e.target.value), `${e.target.value} 보류 완료`)}
                className={cx(inputClass, "tabular")}
                aria-label={`${DEVICE_LABEL[k]} 기기 배정`}
              >
                <option value="" disabled>
                  기기 선택
                </option>
                {current ? <option value={current}>{current} · 이 예약에 보류됨</option> : null}
                {avail.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} · {DEVICE_STATE_LABEL[d.state]}
                  </option>
                ))}
                {others.map((d) => (
                  <option key={d.id} value={d.id} disabled>
                    {d.id} · {DEVICE_STATE_LABEL[d.state]}
                    {d.heldBy ? ` (${d.heldBy})` : ""}
                  </option>
                ))}
              </select>
              {others.length ? (
                <div className="mt-3" data-testid={`unavailable-${k}`}>
                  <p className="text-xs font-medium text-sub">배정할 수 없는 기기</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {others.map((d) => (
                      <li key={d.id} className="text-ink">
                        <span className="tabular font-semibold">{d.id}</span> — {DEVICE_STATE_LABEL[d.state]}
                        {d.heldBy ? <span className="text-sub"> · {d.heldBy}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {!current && avail.length === 0 ? (
                <p className="mt-2 text-sm font-medium text-danger">배정할 수 있는 {DEVICE_LABEL[k]}가 없습니다. 대체 일정이나 취소를 안내하세요.</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PaymentCheck({ r, now, act }: { r: Reservation; now: Date; act: Act }) {
  const expired = isPaymentExpired(r, now);
  return (
    <Card aria-labelledby="pay">
      <CardTitle id="pay" sub={PAYMENT_RULE}>
        결제 대조
      </CardTitle>
      <div
        data-testid="payment-expiry"
        className={cx("rounded-xl px-4 py-3 text-sm", expired ? "bg-danger-soft text-danger" : "bg-warn-bg text-warn")}
      >
        <p className="font-semibold">
          결제 기한 {fmtDateTime(r.ops.paymentDeadline)} · {expired ? "기한 지남 — 자동 확정하지 않음" : fmtRemaining(r.ops.paymentDeadline, now)}
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tx" className="mb-1.5 block text-sm font-medium text-ink">
            데모 거래 식별자
          </label>
          <input
            id="tx"
            value={r.ops.demoTxId}
            onChange={(e) => act((s) => setPaymentCheck(s, r.id, e.target.value, r.ops.txMatched))}
            placeholder="예: DEMO-TX-0001"
            className={cx(inputClass, "tabular")}
            maxLength={60}
          />
          <p className="mt-1 text-xs text-sub">결제 서비스 거래내역에서 확인한 값 (데모 — 실제 조회 없음)</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 self-start rounded-xl border border-line p-4 text-sm text-ink has-[:checked]:border-success has-[:checked]:bg-success-soft sm:mt-6">
          <input
            type="checkbox"
            checked={r.ops.txMatched}
            onChange={(e) => act((s) => setPaymentCheck(s, r.id, r.ops.demoTxId, e.target.checked))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          거래내역·예약ID 대조 완료
        </label>
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          disabled={!expired}
          onClick={() => act((s, n) => transition(s, r.id, "cancelled", "operator", "결제 기한 만료 — 자동 확정하지 않음", n), "기한 만료로 취소했습니다. 보류 기기가 풀렸습니다.")}
          className={btn.danger}
        >
          기한 만료 처리
        </button>
        <p className="mt-1.5 text-xs text-sub">
          {expired
            ? "사유 '결제 기한 만료'로 취소하고 보류 기기를 풉니다."
            : `아직 기한 전입니다. 기한이 지나면 취소할 수 있습니다. 데모 설정의 ‘데모 시계’로 기한 만료를 시연할 수 있습니다.`}
        </p>
      </div>
    </Card>
  );
}

function Checkout({ r, act }: { r: Reservation; act: Act }) {
  return (
    <Card aria-labelledby="checkout">
      <CardTitle id="checkout" sub="픽업 때 고객과 함께 기기별 상태·부속품을 확인하고 기록합니다. 두 대 모두 마쳐야 체험을 시작합니다.">
        출고 기록
      </CardTitle>
      <div className="space-y-2">
        {KEYS.map((k) => (
          <label
            key={k}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-4 text-sm has-[:checked]:border-success has-[:checked]:bg-success-soft"
          >
            <input
              type="checkbox"
              checked={r.ops.checkout[k]}
              onChange={(e) => act((s) => setCheckout(s, r.id, k, e.target.checked))}
              className="h-4 w-4 shrink-0 accent-primary"
              aria-label={`${DEVICE_LABEL[k]} 출고 기록 완료`}
            />
            <span className="flex flex-wrap items-center gap-x-2">
              <DeviceName kind={k} />
              <span className="tabular text-sub">{r.ops.deviceIds[k]}</span>
              <span className="text-ink">상태·부속품 출고 기록 완료</span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

function Inspect({ r, act }: { r: Reservation; act: Act }) {
  const required = requiredInspections(r);
  const sale = saleDevice(r.decision);
  const editable = r.status === "inspecting";
  const saleOpen = r.status === "return_received" || r.status === "inspecting";
  return (
    <Card aria-labelledby="inspect">
      <CardTitle
        id="inspect"
        sub="반납 기기마다 네 항목을 모두 확인해야 완료할 수 있고, 그 전에는 다시 빌려줄 수 없습니다. 초기화는 기기에서 직접 확인합니다 — 고객의 웹 체크는 삭제를 증명하지 않습니다."
      >
        반납 검수{sale ? " · 판매 확인" : ""}
      </CardTitle>
      {r.status === "return_received" ? (
        <Notice tone="info" className="mb-4">
          &lsquo;{STATUS_LABEL.inspecting}&rsquo;으로 바꾼 뒤 검수 항목을 체크할 수 있습니다.
        </Notice>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {KEYS.map((k) => {
          const mustInspect = required.includes(k);
          const done = isInspectionDone(r.ops.inspection[k]);
          return (
            <div key={k} data-testid={`inspect-${k}`} className="min-w-0 rounded-xl bg-bg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <DeviceName kind={k} />
                  <span className="tabular text-sm text-sub">{r.ops.deviceIds[k]}</span>
                </span>
                {mustInspect ? (
                  <span
                    className={cx(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      done ? "bg-success-soft text-success-ink" : "bg-surface text-sub ring-1 ring-line",
                    )}
                  >
                    {done ? "검수 완료" : "검수 전"}
                  </span>
                ) : null}
              </div>
              {k === sale ? (
                <div
                  className={cx(
                    "mt-3 rounded-lg px-3 py-2.5 text-sm",
                    r.ops.sale === "confirmed" ? "bg-success-soft text-success-ink" : "bg-warn-bg text-warn",
                  )}
                  data-testid={`sale-${k}`}
                >
                  <p className="font-semibold">{SALE_LABEL[r.ops.sale]}</p>
                  {r.ops.sale === "none" ? (
                    <>
                      <p className="mt-0.5">
                        고객이 구매를 고른 기기입니다. 딜러 판매가 확인돼야 재고에서 빠지고, 불성립이면 반납·검수합니다. 자동으로 판매
                        완료 처리하지 않습니다.
                      </p>
                      {saleOpen ? (
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => act((s) => setSaleResult(s, r.id, "confirmed"), "딜러 판매 확인을 기록했습니다.")}
                            className={cx(btn.primary, btn.small)}
                          >
                            딜러 판매 확인
                          </button>
                          <button
                            type="button"
                            onClick={() => act((s) => setSaleResult(s, r.id, "failed"), "판매 불성립 — 이 기기도 반납·검수 대상입니다.")}
                            className={cx(btn.secondary, btn.small)}
                          >
                            판매 불성립 → 반납·검수
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : r.ops.sale === "failed" ? (
                    <p className="mt-0.5">판매가 성립하지 않아 이 기기도 반납·검수합니다.</p>
                  ) : (
                    <p className="mt-0.5">재고에서 제외했습니다. 정산은 딜러 계약 기준이며 데모 범위 밖입니다.</p>
                  )}
                </div>
              ) : null}
              {mustInspect ? (
                <div className="mt-3 space-y-2">
                  {INSPECTION_FIELDS.map((f) => (
                    <label
                      key={f}
                      className={cx("flex items-start gap-3 text-sm text-ink", editable ? "cursor-pointer" : "cursor-not-allowed opacity-70")}
                    >
                      <input
                        type="checkbox"
                        disabled={!editable}
                        checked={r.ops.inspection[k][f]}
                        onChange={(e) => act((s) => setInspection(s, r.id, k, f, e.target.checked))}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        aria-label={`${DEVICE_LABEL[k]} ${INSPECTION_LABEL[f]}`}
                      />
                      {INSPECTION_LABEL[f]}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ───────── 기기 보드·데모 설정 ─────────

function DeviceBoard({ state, onSelect }: { state: DemoState; onSelect: (id: string) => void }) {
  return (
    <Card aria-labelledby="board" className="sm:p-5">
      <CardTitle id="board" sub="검수 대기·구매 대기 기기는 새 예약에 배정할 수 없습니다.">
        기기 보드
      </CardTitle>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {state.devices.map((d) => (
          <li key={d.id} data-testid={`device-${d.id}`} className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="tabular font-bold text-ink">{d.id}</span>
              <DeviceName kind={d.kind} short className="text-xs" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DeviceStateChip state={d.state} />
              {d.heldBy ? (
                <button
                  type="button"
                  onClick={() => onSelect(d.heldBy!)}
                  className="tabular rounded text-xs font-semibold text-primary-ink underline-offset-2 hover:underline"
                >
                  {d.heldBy}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DemoControls({ snap, onReset }: { snap: DemoSnapshot; onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const { state, clockOffsetHours } = snap;
  const report = (r: { ok: boolean; error?: string }) => setError(r.ok ? "" : (r.error ?? ""));
  return (
    <Card aria-labelledby="demo" className="border-dashed sm:p-5">
      <CardTitle id="demo" sub="시연을 위한 설정입니다. 실제 서비스에는 없습니다.">
        데모 설정
      </CardTitle>
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-bg p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={state.dealerTermsConfirmed}
            onChange={(e) => {
              const v = e.target.checked;
              // domain 에 setter 가 없어 플래그 하나만 바꾼다 (domain.test.ts 와 같은 방식).
              report(apply((s) => ({ ok: true, value: { ...s, dealerTermsConfirmed: v } })));
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            <span className="font-semibold">데모 설정: 딜러 판매 조건 확정됨</span>
            <span className="mt-0.5 block text-xs text-sub">켜면 고객 결정 화면의 구매 선택지가 열립니다.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-bg p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={clockOffsetHours > 0}
            onChange={(e) => report(setClockOffsetHours(e.target.checked ? DEMO_CLOCK_HOURS : 0))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span>
            <span className="font-semibold">데모 시계 +{DEMO_CLOCK_HOURS}시간</span>
            <span className="mt-0.5 block text-xs text-sub">
              결제 기한({PAYMENT_WINDOW_HOURS}시간) 만료를 시연합니다. 지금 데모 시각: {fmtDateTime(demoNow().toISOString())}
            </span>
          </span>
        </label>
        <div className="border-t border-line pt-3">
          {confirming ? (
            <div className="rounded-xl bg-danger-soft p-3">
              <p className="text-sm font-medium text-danger">모든 예약·기록·기기 상태를 처음으로 되돌립니다. 계속할까요?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const r = resetDemo();
                    report(r);
                    if (r.ok) {
                      setConfirming(false);
                      onReset();
                    }
                  }}
                  className={cx(btn.danger, btn.small, "bg-surface")}
                >
                  초기화
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={cx(btn.secondary, btn.small)}>
                  그만두기
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={cx(btn.danger, btn.small, "w-full")}>
              데모 데이터 초기화
            </button>
          )}
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    </Card>
  );
}
