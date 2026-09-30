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
  MISSION_OPEN,
  REWARD_FLAG_LABEL,
  REWARD_REJECT_NOTE_VISIBLE,
  REWARD_STATUS_LABEL,
  STATUS_FLOW,
  STATUS_HELP,
  STATUS_LABEL,
  USAGE_LABEL,
  assignDevice,
  availableDevices,
  canTransition,
  isInspectionDone,
  isPaymentExpired,
  missionProgress,
  requiredInspections,
  reviewReward,
  rewardFlags,
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
import { fmtDateKey, fmtDateTime, fmtRemaining, josa } from "@/lib/format";
import { ACTOR_LABEL, RequestSummary, decisionText } from "@/components/reservation";
import { MissionAnswerTable, RewardStatusChip } from "@/components/mission";
import {
  Card,
  CardTitle,
  DeviceName,
  DeviceStateChip,
  ErrorText,
  Eyebrow,
  Notice,
  Skeleton,
  StatusChip,
  SuccessText,
  btn,
  cx,
  deviceTone,
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
      <header className="rounded-3xl border-2 border-warn-line bg-warn-bg px-5 py-6 sm:px-8">
        <p className="eyebrow text-warn">Operator simulator · demo only</p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-snug text-warn sm:text-[32px]">운영 시뮬레이터 — 데모, 실제 운영자 인증 없음</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-warn">
          시연용으로 누구나 열 수 있는 화면입니다. 실제 운영에서는 인증된 운영자만 이 기능을 씁니다. 모든 변경은 이 브라우저의
          데모 데이터에만 저장됩니다. 운영자 상태 변경에는 사유가 필요하고, 허용된 다음 단계로만 이동합니다.
        </p>
      </header>

      <Ledger state={state} selectedId={selectedId} onSelect={select} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div id="ops-panel" className="scroll-mt-28">
            {selected ? (
              <ReservationPanel key={selected.id} r={selected} state={state} />
            ) : (
              <Card>
                <p className="text-sm text-sub">
                  {state.reservations.length
                    ? "대장에서 예약을 고르면 단계 변경·기기 확보·거래 대조·출고·검수·리워드 확인을 할 수 있습니다."
                    : "아직 요청이 없습니다."}
                </p>
              </Card>
            )}
          </div>
        </div>
        <aside className="space-y-6" aria-label="리워드 확인 목록, 기기 보드와 데모 설정">
          <RewardQueue state={state} selectedId={selectedId} onSelect={select} />
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
      <span className="font-medium text-danger-ink">기한 지남</span>
    ) : (
      <span className="font-medium text-warn">대조 전</span>
    );
  }
  return <span className="text-sub">—</span>;
}

function started(r: Reservation): boolean {
  return STATUS_FLOW.indexOf(r.status) >= STATUS_FLOW.indexOf("in_trial");
}

function missionCell(r: Reservation) {
  if (!started(r)) return <span className="text-sub">—</span>;
  const p = missionProgress(r);
  return (
    <span className={cx("font-semibold", p.done === p.total ? "text-ink" : "text-sub")}>
      {p.done}/{p.total}
    </span>
  );
}

function Ledger({ state, selectedId, onSelect }: { state: DemoState; selectedId: string | null; onSelect: (id: string) => void }) {
  const now = demoNow();
  return (
    <section aria-labelledby="ledger" className="rounded-3xl border border-line bg-surface">
      <div className="px-5 pt-6 sm:px-7">
        <CardTitle id="ledger" sub="이 브라우저에 저장된 모든 데모 요청 (최신순)">
          예약 대장
        </CardTitle>
      </div>
      {state.reservations.length === 0 ? (
        <p className="px-5 pb-6 text-sm text-sub sm:px-6">
          아직 요청이 없습니다.{" "}
          <Link href="/request/" className="font-semibold text-ink underline underline-offset-2">
            일정 요청
          </Link>
          에서 데모 요청을 만들어 보세요.
        </p>
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-bg text-xs text-sub">
                {["예약 ID", "상태", "희망일", "용도", "배정 기기", "결제 대조", "미션", "리워드"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-semibold whitespace-nowrap first:pl-5 sm:first:pl-7">
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
                    className={cx("cursor-pointer border-b border-line last:border-b-0", sel ? "bg-cream" : "hover:bg-bg")}
                  >
                    <td className="py-3 pr-3 pl-5 sm:pl-7">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(r.id);
                        }}
                        className="tabular whitespace-nowrap rounded font-bold text-ink underline underline-offset-4 decoration-line-strong hover:decoration-ink"
                        aria-label={`${r.id} 열기`}
                      >
                        {r.id}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{fmtDateKey(r.request.startDate)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{USAGE_LABEL[r.request.usage]}</td>
                    <td className="tabular px-3 py-3 whitespace-nowrap">
                      {r.ops.deviceIds.air || r.ops.deviceIds.pro ? (
                        [r.ops.deviceIds.air, r.ops.deviceIds.pro].filter(Boolean).join(" · ")
                      ) : (
                        <span className="text-sub">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{paymentCell(r, now)}</td>
                    <td className="tabular px-3 py-3 whitespace-nowrap">{missionCell(r)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <RewardStatusChip status={r.reward.status} />
                    </td>
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
    const res = act((s, n) => transition(s, r.id, to, "operator", reason, n), `'${STATUS_LABEL[to]}'${josa(STATUS_LABEL[to], "으로", "로")} 변경했습니다.`);
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

      {r.ops.wallCodes ? <WallCodes r={r} /> : null}

      {/* 단계 변경 */}
      <Card aria-labelledby="move" className="border-ink/20">
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

      {started(r) || r.reward.status !== "none" ? <RewardReview key={`${r.id}-${r.reward.status}`} r={r} state={state} /> : null}

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
                  <td className="py-2 text-ink">
                    {h.reason}
                    {h.internalNote ? <span className="mt-0.5 block text-xs text-sub">운영 메모: {h.internalNote}</span> : null}
                  </td>
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
          Air·Pro 두 대가 함께 준비되는지, 반납 뒤 검수할 시간이 있는지 딜러에게 확인합니다. 그다음{" "}
          &lsquo;{STATUS_LABEL.operator_check}&rsquo;으로 바꾸고 기기를 확보합니다.
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
            미션 {missionProgress(r).done}/{missionProgress(r).total} · 리워드 {REWARD_STATUS_LABEL[r.reward.status]} · 마지막 날 결정:{" "}
            <strong className="font-semibold">{decisionText(r.decision)}</strong>
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
            <div key={k} className="min-w-0 rounded-2xl bg-bg p-4">
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
                <p className="mt-2 text-sm font-medium text-danger-ink">
                  {`배정할 수 있는 ${DEVICE_LABEL[k]}${josa(DEVICE_LABEL[k], "이", "가")} 없습니다. 대체 일정이나 취소를 안내하세요.`}
                </p>
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
        className={cx("rounded-2xl px-4 py-3 text-sm", expired ? "bg-danger-soft text-danger-ink" : "bg-warn-bg text-warn")}
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
        <label className="flex cursor-pointer items-start gap-3 self-start rounded-2xl border border-line p-4 text-sm text-ink has-[:checked]:border-success has-[:checked]:bg-success-soft sm:mt-6">
          <input
            type="checkbox"
            checked={r.ops.txMatched}
            onChange={(e) => act((s) => setPaymentCheck(s, r.id, r.ops.demoTxId, e.target.checked))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
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
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-4 text-sm has-[:checked]:border-success has-[:checked]:bg-success-soft"
          >
            <input
              type="checkbox"
              checked={r.ops.checkout[k]}
              onChange={(e) => act((s) => setCheckout(s, r.id, k, e.target.checked))}
              className="h-4 w-4 shrink-0 accent-ink"
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
            <div key={k} data-testid={`inspect-${k}`} className="min-w-0 rounded-2xl bg-bg p-4">
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
                    "mt-3 rounded-xl px-3 py-2.5 text-sm",
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
                        className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
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
          <li key={d.id} data-testid={`device-${d.id}`} className="rounded-2xl border border-line p-3">
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
                  className="tabular rounded text-xs font-semibold text-ink underline-offset-2 hover:underline"
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
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-bg p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={state.dealerTermsConfirmed}
            onChange={(e) => {
              const v = e.target.checked;
              // domain 에 setter 가 없어 플래그 하나만 바꾼다 (domain.test.ts 와 같은 방식).
              report(apply((s) => ({ ok: true, value: { ...s, dealerTermsConfirmed: v } })));
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
          />
          <span>
            <span className="font-semibold">데모 설정: 딜러 판매 조건 확정됨</span>
            <span className="mt-0.5 block text-xs text-sub">켜면 고객 결정 화면의 구매 선택지가 열립니다.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-bg p-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={clockOffsetHours > 0}
            onChange={(e) => report(setClockOffsetHours(e.target.checked ? DEMO_CLOCK_HOURS : 0))}
            className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
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
            <div className="rounded-2xl bg-danger-soft p-3">
              <p className="text-sm font-medium text-danger-ink">모든 예약·기록·기기 상태를 처음으로 되돌립니다. 계속할까요?</p>
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

// ───────── 바탕화면 코드 · 리워드 확인 ─────────

function WallCodes({ r }: { r: Reservation }) {
  const codes = r.ops.wallCodes!;
  return (
    <Card aria-labelledby="wall" data-testid="wall-codes">
      <CardTitle
        id="wall"
        eyebrow="Wallpaper codes"
        sub="출고할 때 두 맥 바탕화면에 크게 띄워 두세요. 고객은 미션 화면에 이 코드를 적습니다. 운영자만 보는 값이며, 참고 단서일 뿐 사용 여부를 증명하지 않습니다."
      >
        출고 때 바탕화면에 띄울 코드
      </CardTitle>
      <div className="grid grid-cols-2 gap-3">
        {KEYS.map((k) => (
          <div key={k} className={cx("rounded-2xl px-4 py-4", deviceTone[k].soft)}>
            <DeviceName kind={k} className="text-sm" />
            <p className="tabular mt-0.5 text-xs text-sub">{r.ops.deviceIds[k]}</p>
            <p data-testid={`wall-code-${k}`} className="mt-2 font-mono text-[30px] font-extrabold tracking-[0.25em] text-ink">
              {codes[k]}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RewardReview({ r, state }: { r: Reservation; state: DemoState }) {
  const [note, setNote] = useState(r.reward.reviewNote ?? "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submitted = r.reward.status !== "none";
  // 신청 전에는 지금 기준 미리보기, 신청 뒤에는 신청 때 고정된 표시를 쓴다 (reviewReward 가 쓰는 값)
  const flags = submitted ? r.reward.flags : rewardFlags(r);
  const codes = r.ops.wallCodes;
  const p = missionProgress(r);
  // 승인·거절 가능 여부는 domain 이 판단한다 — 메모 조건만 빼고 미리 확인
  const dry = reviewReward(state, r.id, "approved", "확인");
  const canReview = r.reward.status === "submitted" && dry.ok;

  function review(result: "approved" | "rejected") {
    const res = apply((s, now) => reviewReward(s, r.id, result, note, now));
    if (!res.ok) {
      setError(res.error);
      setMessage("");
    } else {
      setError("");
      setMessage(`리워드를 '${REWARD_STATUS_LABEL[result]}'${josa(REWARD_STATUS_LABEL[result], "으로", "로")} 기록했습니다.`);
    }
  }

  return (
    <Card aria-labelledby="reward-review" data-testid="reward-review" className="border-coral/30">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Eyebrow tone="coral" className="mb-2">
            Reward review
          </Eyebrow>
          <h2 id="reward-review" className="text-[19px] font-bold text-ink">
            리워드 확인
          </h2>
          <p className="mt-1 text-sm text-sub">
            핵심 미션 {p.done}/{p.total}
            {r.reward.submittedAt ? ` · 신청 ${fmtDateTime(r.reward.submittedAt)}` : ""}
            {r.reward.reviewedAt ? ` · 확인 ${fmtDateTime(r.reward.reviewedAt)}` : ""}
          </p>
        </div>
        <RewardStatusChip status={r.reward.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-bold text-ink">미션 답</p>
          <MissionAnswerTable r={r} />
        </div>
        <div className="min-w-0 space-y-5">
          <div>
            <p className="mb-2 text-sm font-bold text-ink">바탕화면 코드 (참고)</p>
            <table className="w-full border-collapse text-sm" data-testid="code-compare">
              <thead>
                <tr className="border-b border-line text-xs text-sub">
                  <th scope="col" className="py-1.5 pr-2 text-left font-semibold">기기</th>
                  <th scope="col" className="py-1.5 pr-2 text-left font-semibold">고객 입력</th>
                  <th scope="col" className="py-1.5 pr-2 text-left font-semibold">띄운 코드</th>
                  <th scope="col" className="py-1.5 text-left font-semibold">비교</th>
                </tr>
              </thead>
              <tbody>
                {KEYS.map((k) => {
                  const typed = r.codeCheck?.[k];
                  const expected = codes?.[k];
                  const same = Boolean(typed && expected && typed === expected);
                  return (
                    <tr key={k} className="border-b border-line/70 last:border-b-0">
                      <td className="py-2 pr-2">
                        <DeviceName kind={k} short className="text-xs" />
                      </td>
                      <td className="py-2 pr-2 font-mono font-bold text-ink">{typed ?? <span className="font-sans font-normal text-sub">미입력</span>}</td>
                      <td className="py-2 pr-2 font-mono font-bold text-ink">{expected ?? "—"}</td>
                      <td className="py-2">
                        {typed ? (
                          <span
                            data-testid={`code-match-${k}`}
                            className={cx("rounded-full px-2 py-0.5 text-xs font-bold", same ? "bg-success-soft text-success-ink" : "bg-warn-bg text-warn")}
                          >
                            {same ? "일치" : "불일치"}
                          </span>
                        ) : (
                          <span className="text-xs text-sub">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-sm font-bold text-ink">
              검토 표시 {submitted ? <span className="font-medium text-sub">(신청 때 기준)</span> : <span className="font-medium text-sub">(신청 전 미리보기)</span>}
            </p>
            <p className="mt-0.5 text-xs text-sub">자동 거절하지 않습니다. 고객 화면에는 보이지 않습니다.</p>
            {flags.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5" data-testid="reward-flags">
                {flags.map((f) => (
                  <li key={f} className="rounded-full bg-warn-bg px-2.5 py-1 text-xs font-bold text-warn ring-1 ring-inset ring-warn-line">
                    {REWARD_FLAG_LABEL[f]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-success-ink" data-testid="reward-flags">
                표시 없음
              </p>
            )}
          </div>

          {r.reward.status === "submitted" ? (
            <div>
              <label htmlFor="reward-note" className="mb-1.5 block text-sm font-bold text-ink">
                확인 메모 <span className="font-medium text-sub">(거절하거나 표시가 있는 건을 승인할 때 필수)</span>
                <span className="mt-0.5 block text-xs font-normal text-sub">{REWARD_REJECT_NOTE_VISIBLE}</span>
              </label>
              <textarea
                id="reward-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                className={inputClass}
                placeholder="예: 코드 오타. 두 기기 사용 흔적 확인"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button type="button" disabled={!canReview} onClick={() => review("approved")} className={cx(btn.primary, btn.small, "sm:px-5")}>
                  리워드 승인
                </button>
                <button type="button" disabled={!canReview} onClick={() => review("rejected")} className={cx(btn.danger, btn.small, "sm:px-5")}>
                  리워드 거절
                </button>
              </div>
              {!canReview && !dry.ok ? (
                <p className="mt-2 text-sm font-medium text-warn" data-testid="reward-review-blocked">
                  {dry.error}
                </p>
              ) : null}
            </div>
          ) : r.reward.status === "none" ? (
            <p className="rounded-2xl bg-bg px-4 py-3 text-sm text-sub">
              {MISSION_OPEN.includes(r.status) ? "고객이 아직 리워드를 신청하지 않았습니다." : "리워드 신청 없이 끝난 체험입니다."}
            </p>
          ) : (
            <p className="rounded-2xl bg-bg px-4 py-3 text-sm text-ink">
              {REWARD_STATUS_LABEL[r.reward.status]}
              {r.reward.reviewNote ? ` — 메모: ${r.reward.reviewNote}` : ""}
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          <SuccessText>{message}</SuccessText>
        </div>
      </div>
    </Card>
  );
}

function RewardQueue({ state, selectedId, onSelect }: { state: DemoState; selectedId: string | null; onSelect: (id: string) => void }) {
  const rows = state.reservations.filter((r) => started(r) || r.reward.status !== "none");
  return (
    <Card aria-labelledby="queue" className="sm:p-5" data-testid="reward-queue">
      <CardTitle id="queue" eyebrow="Rewards" sub="픽업한 예약의 리워드 상태입니다. 승인·거절은 검수 단계부터 합니다.">
        리워드 확인
      </CardTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-sub">아직 픽업한 예약이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                aria-label={`${r.id} 리워드 확인 열기`}
                className={cx(
                  "flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors",
                  r.id === selectedId ? "border-ink/40 bg-cream" : "border-line hover:bg-bg",
                )}
              >
                <span className="tabular text-sm font-bold text-ink">{r.id}</span>
                <span className="flex items-center gap-1.5">
                  {r.reward.status === "submitted" && r.reward.flags.length ? (
                    <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-bold text-warn">표시 {r.reward.flags.length}</span>
                  ) : null}
                  <RewardStatusChip status={r.reward.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
