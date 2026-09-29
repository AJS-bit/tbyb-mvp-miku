"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CANCELLABLE,
  COMPARE_POINTS,
  DEVICE_LABEL,
  PAYMENT_RULE,
  RESPONSE_TARGET,
  SALE_LABEL,
  STATUS_HELP,
  WORK_TYPES,
  isPaymentExpired,
  saleDevice,
  transition,
  type DeviceKey,
  type Reservation,
} from "@/lib/domain";
import { apply, demoNow, useDemo } from "@/lib/store";
import { fmtDateKey, fmtDateTime, fmtRemaining } from "@/lib/format";
import { CompareSummary } from "@/components/compare";
import {
  BackLink,
  HistoryList,
  NotFound,
  RequestSummary,
  Timeline,
  decisionText,
  useIdParam,
} from "@/components/reservation";
import {
  ButtonLink,
  Card,
  CardTitle,
  DeviceName,
  ErrorText,
  Notice,
  PageHeader,
  Skeleton,
  StatusChip,
  btn,
  cx,
} from "@/components/ui";

const KEYS: DeviceKey[] = ["air", "pro"];

export function MyView() {
  const snap = useDemo();
  const id = useIdParam();
  if (!snap) return <Skeleton />;
  if (id) {
    const r = snap.state.reservations.find((x) => x.id === id);
    return r ? <Detail r={r} /> : <NotFound id={id} />;
  }
  return <List reservations={snap.state.reservations} />;
}

function List({ reservations }: { reservations: Reservation[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="내 체험">이 기기에서 보낸 데모 요청입니다. 다른 기기·브라우저와 공유되지 않습니다.</PageHeader>
      {reservations.length === 0 ? (
        <Card className="text-center">
          <p className="text-[15px] text-ink">아직 보낸 요청이 없습니다.</p>
          <p className="mt-1 text-sm text-sub">희망 시작일과 작업 유형만 고르면 됩니다.</p>
          <ButtonLink href="/request/" className="mt-5">
            데모 일정 요청
          </ButtonLink>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reservations.map((r) => (
            <li key={r.id}>
              <Link
                href={`/my/?id=${encodeURIComponent(r.id)}`}
                className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-sub/40 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular font-bold text-ink">{r.id}</span>
                  <StatusChip status={r.status} />
                </div>
                <p className="mt-2 text-sm text-sub">
                  {fmtDateKey(r.request.startDate)} 시작 희망 · {WORK_TYPES[r.request.workType].label}
                </p>
                <p className="mt-0.5 text-xs text-sub">요청 {fmtDateTime(r.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Detail({ r }: { r: Reservation }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const canCancel = CANCELLABLE.includes(r.status);

  function cancel() {
    const res = apply((s, now) => transition(s, r.id, "cancelled", "customer", "고객 직접 취소", now));
    if (!res.ok) setError(res.error);
    else {
      setError("");
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/my/">내 체험 목록</BackLink>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="tabular text-[26px] font-bold tracking-tight text-ink sm:text-3xl">{r.id}</h1>
          <StatusChip status={r.status} className="text-sm" />
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink" data-testid="status-help">
          {STATUS_HELP[r.status]}
        </p>
      </header>

      <div className="space-y-5">
        <StagePanel r={r} />

        <Card aria-labelledby="progress">
          <CardTitle id="progress">진행 상황</CardTitle>
          <Timeline r={r} />
        </Card>

        <Card aria-labelledby="req">
          <CardTitle id="req">요청 내용</CardTitle>
          <RequestSummary r={r} />
        </Card>

        {canCancel ? (
          <Card aria-labelledby="cancel">
            <CardTitle id="cancel" sub="출고 전(예약 확정까지)에는 직접 취소할 수 있습니다. 출고 후 환불·파손은 딜러 계약 기준이며 데모 범위 밖입니다.">
              요청 취소
            </CardTitle>
            {confirming ? (
              <div className="rounded-xl bg-danger-soft p-4">
                <p className="text-sm font-medium text-danger">이 요청을 취소할까요? 되돌릴 수 없습니다.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={cancel} className={cx(btn.danger, "bg-surface")}>
                    네, 취소합니다
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={btn.secondary}>
                    아니요
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={btn.danger}>
                요청 취소
              </button>
            )}
            <ErrorText>{error}</ErrorText>
          </Card>
        ) : null}

        <Card aria-labelledby="hist">
          <CardTitle id="hist">변경 이력</CardTitle>
          <HistoryList history={r.history} />
        </Card>
      </div>
    </div>
  );
}

function StagePanel({ r }: { r: Reservation }) {
  const now = demoNow();
  switch (r.status) {
    case "requested":
    case "operator_check":
      return (
        <Notice tone="info" title="아직 확정되지 않았습니다">
          <p>운영자가 두 기기와 픽업 일정을 확인한 뒤, 결제 기한과 함께 안내합니다.</p>
          <p className="mt-1 text-sub">{RESPONSE_TARGET}</p>
        </Notice>
      );

    case "payment_pending": {
      const expired = isPaymentExpired(r, now);
      return (
        <Card aria-labelledby="pay" className="border-warn-line">
          <CardTitle id="pay">결제 안내</CardTitle>
          <div className="rounded-xl bg-warn-bg px-4 py-3">
            <p className="text-xs font-medium text-warn">결제 기한</p>
            <p className="tabular mt-0.5 text-lg font-bold text-ink" data-testid="payment-deadline">
              {fmtDateTime(r.ops.paymentDeadline)}
            </p>
            <p className={cx("text-sm font-medium", expired ? "text-danger" : "text-warn")}>
              {fmtRemaining(r.ops.paymentDeadline, now)}
            </p>
          </div>
          {expired ? (
            <Notice tone="danger" className="mt-3" title="결제 기한이 지났습니다">
              자동으로 확정되지 않습니다. 운영자가 취소 또는 대체 일정으로 안내합니다.
            </Notice>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-ink">{PAYMENT_RULE}</p>
          <p className="mt-2 text-sm text-sub">
            보류된 기기: {KEYS.map((k) => DEVICE_LABEL[k]).join(" · ")} (운영자가 두 대 모두 확보)
          </p>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className={cx(btn.secondary, "mt-4 w-full border-dashed")}
          >
            결제 링크 (데모 — 실제 결제 없음)
          </button>
        </Card>
      );
    }

    case "confirmed":
      return (
        <Card aria-labelledby="pickup">
          <CardTitle id="pickup" sub={`${fmtDateKey(r.request.startDate)} · ${r.request.pickupStore}`}>
            픽업 때 함께 확인할 것
          </CardTitle>
          <ul className="space-y-2 text-sm text-ink">
            {[
              "두 기기의 외관·작동 상태를 운영자와 함께 확인하고 기록",
              "기기별 부속품(충전기·케이블 등) 확인",
              `배터리 상태·외관 — ${COMPARE_POINTS.find((p) => p.title.startsWith("배터리"))?.air ?? "픽업 때 기기별로 기록"}`,
              "두 기기에서 똑같이 해 볼 작업 파일·프로젝트 준비",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line text-[11px] text-sub">
                  ☐
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-sub">두 기기의 출고 기록이 끝나면 운영자가 &lsquo;체험 중&rsquo;으로 바꿉니다.</p>
        </Card>
      );

    case "in_trial":
      return (
        <Card aria-labelledby="trial" className="border-primary/30">
          <CardTitle id="trial" sub={`비교 기록 ${r.logs.length}건 · 마지막 날 결정: ${decisionText(r.decision)}`}>
            체험 중 — 같은 작업을 두 기기에서
          </CardTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <ButtonLink href={`/my/record/?id=${encodeURIComponent(r.id)}`}>비교 기록</ButtonLink>
            <ButtonLink href={`/my/decide/?id=${encodeURIComponent(r.id)}`} variant="secondary">
              마지막 날 결정
            </ButtonLink>
          </div>
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">{WORK_TYPES[r.request.workType].label} 체크리스트</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink">
              {WORK_TYPES[r.request.workType].checklist.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden className="text-sub">·</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          {r.logs.length ? (
            <div className="mt-5">
              <CompareSummary logs={r.logs} />
            </div>
          ) : null}
        </Card>
      );

    case "return_received":
    case "inspecting":
    case "completed": {
      const sale = saleDevice(r.decision);
      return (
        <Card aria-labelledby="ret">
          <CardTitle id="ret" sub={`마지막 날 결정: ${decisionText(r.decision)}`}>
            반납·구매
          </CardTitle>
          <ul className="space-y-2">
            {KEYS.map((k) => (
              <li
                key={k}
                data-testid={`return-${k}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2.5 text-sm"
              >
                <DeviceName kind={k} />
                <span
                  className={cx(
                    "font-medium",
                    k !== sale ? "text-ink" : r.ops.sale === "confirmed" ? "text-success-ink" : "text-warn",
                  )}
                >
                  {k === sale ? SALE_LABEL[r.ops.sale] : "반납 · 검수"}
                </span>
              </li>
            ))}
          </ul>
          {sale ? (
            <p className="mt-3 text-sm text-ink">
              선택한 기기는 딜러 판매가 확인돼야 구매로 확정됩니다. 확인되지 않으면 그 기기도 반납·검수합니다.
            </p>
          ) : null}
          {r.decision?.choice === "buy_new" ? (
            <p className="mt-3 text-sm text-sub">체험한 두 대는 모두 반납합니다. 새 제품 구매는 딜러 판매 조건에 따라 따로 안내합니다.</p>
          ) : null}
          <Notice tone="info" className="mt-4" title="후속 설문">
            체험이 끝나면 7일·30일 뒤 짧은 후속 설문을 드립니다. 산 제품에 실제로 만족하는지 확인하기 위해서입니다. (데모에서는
            발송하지 않습니다.)
          </Notice>
        </Card>
      );
    }

    default:
      return null;
  }
}
