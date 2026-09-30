"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CANCELLABLE,
  DEVICE_LABEL,
  MISSION_OPEN,
  PAYMENT_RULE,
  RESPONSE_TARGET,
  SALE_LABEL,
  STATUS_HELP,
  USAGE_LABEL,
  isPaymentExpired,
  missionProgress,
  saleDevice,
  transition,
  type DeviceKey,
  type Reservation,
  type ReservationStatus,
} from "@/lib/domain";
import { apply, demoNow, useDemo } from "@/lib/store";
import { fmtDateKey, fmtDateTime, fmtRemaining } from "@/lib/format";
import { GiftEnvelope, StepIcon } from "@/components/illustrations";
import { MissionDots, RewardAmount, RewardFlow, RewardStatusChip } from "@/components/mission";
import { BackLink, HistoryList, NotFound, RequestSummary, Timeline, decisionText, myHref, useIdParam } from "@/components/reservation";
import {
  ButtonLink,
  Card,
  CardTitle,
  DeviceName,
  ErrorText,
  Eyebrow,
  Notice,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatusChip,
  btn,
  cx,
} from "@/components/ui";

const KEYS: DeviceKey[] = ["air", "pro"];

/** 상태별 한 줄 인사 — 제목으로 쓴다. 바로 아래 STATUS_HELP(domain) 첫 문장과 겹치지 않게 쓴다. */
const GREETING: Record<ReservationStatus, string> = {
  requested: "요청이 잘 도착했어요",
  operator_check: "두 대를 알아보고 있어요",
  payment_pending: "결제만 남았어요",
  confirmed: "이제 픽업만 하면 돼요",
  in_trial: "두 맥과 지내는 중이에요",
  return_received: "돌려주셔서 고마워요",
  inspecting: "마무리하고 있어요",
  completed: "함께해 주셔서 고마워요",
  cancelled: "요청이 취소됐어요",
};

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
      <PageHeader eyebrow="My trial" title="내 체험">
        이 기기에서 보낸 요청이에요. 다른 기기나 브라우저에서는 보이지 않아요.
      </PageHeader>
      {reservations.length === 0 ? (
        <Card className="flex flex-col items-center py-12 text-center">
          <StepIcon art="calendar" className="h-20 w-20" />
          <p className="mt-5 text-[18px] font-bold text-ink">아직 보낸 요청이 없어요</p>
          <p className="mt-1 text-[15px] text-sub">날짜와 픽업 매장만 고르면 돼요.</p>
          <ButtonLink href="/request/" className="mt-6 px-8">
            데모 일정 요청
          </ButtonLink>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reservations.map((r) => {
            const open = MISSION_OPEN.includes(r.status);
            const p = missionProgress(r);
            return (
              <li key={r.id}>
                <Link
                  href={myHref(r.id)}
                  className="block rounded-3xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-cream/40 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="tabular text-[17px] font-extrabold text-ink">{r.id}</span>
                    <StatusChip status={r.status} />
                  </div>
                  <p className="mt-2 text-[15px] text-sub">
                    {fmtDateKey(r.request.startDate)} 시작 희망 · {USAGE_LABEL[r.request.usage]}
                  </p>
                  {open ? (
                    <p className="mt-1 text-sm font-semibold text-coral-ink">
                      미션 {p.done}/{p.total}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-sub">요청 {fmtDateTime(r.createdAt)}</p>
                </Link>
              </li>
            );
          })}
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
      <header className="fade-up mb-8">
        <Eyebrow className="mb-3">
          <span>
            My trial · <span data-testid="res-id">{r.id}</span>
          </span>
        </Eyebrow>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-[30px] font-extrabold leading-[1.28] text-ink sm:text-[40px]">{GREETING[r.status]}</h1>
          <StatusChip status={r.status} className="text-[13px]" />
        </div>
        <p className="mt-3 max-w-2xl text-[16px] leading-[1.75] text-sub sm:text-[17px]" data-testid="status-help">
          {STATUS_HELP[r.status]}
        </p>
      </header>

      <div className="space-y-5">
        <StagePanel r={r} />

        <Card aria-labelledby="progress">
          <CardTitle id="progress" eyebrow="Timeline">
            진행 상황
          </CardTitle>
          <Timeline r={r} />
        </Card>

        <Card aria-labelledby="req">
          <CardTitle id="req" eyebrow="Your request">
            요청 내용
          </CardTitle>
          <RequestSummary r={r} />
        </Card>

        {canCancel ? (
          <Card aria-labelledby="cancel">
            <CardTitle id="cancel" sub="픽업 전(예약 확정까지)에는 여기서 바로 취소할 수 있어요.">
              요청 취소
            </CardTitle>
            {confirming ? (
              <div className="rounded-2xl bg-danger-soft p-4">
                <p className="text-[15px] font-semibold text-danger-ink">이 요청을 취소할까요? 되돌릴 수 없어요.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={cancel} className={btn.danger}>
                    네, 취소할게요
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={btn.secondary}>
                    아니요, 그대로 둘게요
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
          <CardTitle id="hist" eyebrow="History">
            변경 이력
          </CardTitle>
          <HistoryList history={r.history} />
        </Card>
      </div>
    </div>
  );
}

// ───────── 미션 진행 + 리워드 요약 ─────────

function MissionProgressCard({ r }: { r: Reservation }) {
  const p = missionProgress(r);
  const done = p.done === p.total;
  return (
    <Card aria-labelledby="mp" data-testid="mission-progress" className="flex flex-col">
      <CardTitle
        id="mp"
        eyebrow="Missions"
        sub={
          done
            ? r.codeCheck
              ? "핵심 미션을 모두 마쳤어요. 이제 리워드를 신청할 수 있어요."
              : "핵심 미션을 모두 마쳤어요. 바탕화면 코드까지 적으면 리워드를 신청할 수 있어요."
            : "맥이 처음이어도 괜찮아요. 평소처럼 쓰다가 생각날 때 골라 주세요."
        }
      >
        <span>
          미션 <span className="tabular">{p.done}/{p.total}</span>
        </span>
      </CardTitle>
      <ProgressBar done={p.done} total={p.total} label="핵심 미션 진행" />
      <div className="mt-5">
        <MissionDots r={r} />
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href={myHref(r.id, "missions/")} className="sm:px-7">
          {p.done ? "미션 이어서 하기" : "미션 하러 가기"}
        </ButtonLink>
      </div>
    </Card>
  );
}

function RewardMini({ r }: { r: Reservation }) {
  const { status, reviewNote } = r.reward;
  return (
    <section aria-labelledby="rw" data-testid="reward-mini" className="flex flex-col rounded-3xl bg-coral-soft p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow tone="coral" className="mb-2">
            Reward
          </Eyebrow>
          <h2 id="rw" className="text-[19px] font-bold text-ink">
            리워드
          </h2>
        </div>
        <GiftEnvelope className="h-auto w-16 shrink-0" />
      </div>
      <RewardAmount className="mt-2 text-[17px]" />
      <div className="mt-3">
        <RewardStatusChip status={status} />
      </div>
      <RewardFlow r={r} className="mt-4" />
      {status === "rejected" && reviewNote ? (
        <p className="mt-3 rounded-2xl bg-surface/80 px-3 py-2 text-sm text-ink">운영자 메모: {reviewNote}</p>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-ink/75">
        {status === "none"
          ? "핵심 미션을 마치고 바탕화면 코드를 적으면 신청할 수 있어요."
          : status === "submitted"
            ? "돌려주신 기기를 점검한 뒤 운영자가 확인해요."
            : status === "approved"
              ? "금액과 지급 방식은 아직 정하는 중이에요. 데모라서 실제로 지급되지는 않아요."
              : "궁금한 점은 운영자에게 물어봐 주세요."}
      </p>
      <Link
        href={myHref(r.id, "missions/")}
        className="mt-auto inline-flex min-h-10 items-center gap-1 pt-4 text-sm font-bold text-coral-ink underline-offset-4 hover:underline"
      >
        미션과 리워드 보기 <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

function MissionAndReward({ r }: { r: Reservation }) {
  return (
    <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
      <MissionProgressCard r={r} />
      <RewardMini r={r} />
    </div>
  );
}

// ───────── 단계별 안내 ─────────

function ReturnCard({ r }: { r: Reservation }) {
  const sale = saleDevice(r.decision);
  return (
    <Card aria-labelledby="ret">
      <CardTitle id="ret" eyebrow="Return" sub={`마지막 날 결정: ${decisionText(r.decision)}`}>
        반납과 구매
      </CardTitle>
      <ul className="space-y-2">
        {KEYS.map((k) => (
          <li key={k} data-testid={`return-${k}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bg px-4 py-3 text-[15px]">
            <DeviceName kind={k} />
            <span className={cx("font-semibold", k !== sale ? "text-ink" : r.ops.sale === "confirmed" ? "text-success-ink" : "text-warn")}>
              {k === sale ? SALE_LABEL[r.ops.sale] : "반납 · 점검"}
            </span>
          </li>
        ))}
      </ul>
      {sale ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink">
          고른 기기는 딜러가 판매를 확인하면 구매가 확정돼요. 확인되지 않으면 그 기기도 돌려주셔야 해요.
        </p>
      ) : null}
      {r.decision?.choice === "buy_new" ? (
        <p className="mt-3 text-[15px] text-sub">체험한 두 대는 모두 돌려주시면 돼요. 새 제품은 딜러의 판매 조건에 맞춰 따로 안내해 드려요.</p>
      ) : null}
      {/* 완료 단계에서는 STATUS_HELP 가 같은 설문 안내를 하므로, 데모라서 보내지 않는다는 사실만 짧게 남긴다 */}
      {r.status !== "completed" ? (
        <Notice className="mt-4" title="체험이 끝나면 짧은 설문을 드리려고 해요">
          7일 뒤와 30일 뒤에 한 번씩이에요. 고른 맥이 정말 잘 맞는지 알고 싶어서예요. 데모라서 실제로 보내지는 않아요.
        </Notice>
      ) : (
        <p className="mt-4 text-sm text-sub">데모라서 설문은 실제로 보내지 않아요.</p>
      )}
    </Card>
  );
}

function StagePanel({ r }: { r: Reservation }) {
  const now = demoNow();
  switch (r.status) {
    case "requested":
    case "operator_check":
      return (
        // 로컬 데모: 실제 운영자가 없어 연락이 가지 않는다 — 운영 시뮬레이터에서 단계를 넘기면 이 화면이 바뀐다
        <Notice title="다음 단계는 운영 시뮬레이터에서 넘겨 볼 수 있어요">
          <p>
            이 데모에는 실제 운영자가 없어서 따로 연락이 가지 않아요. 운영 시뮬레이터에서 두 대를 준비하고 결제를 요청하면, 이 화면에 결제
            안내가 나타나요.
          </p>
          <p className="mt-1 text-sub">실제 서비스에서는 {RESPONSE_TARGET}</p>
          <Link
            href="/ops/"
            className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-ink underline-offset-4 hover:underline"
          >
            운영 시뮬레이터 열기 <span aria-hidden>→</span>
          </Link>
        </Notice>
      );

    case "payment_pending": {
      const expired = isPaymentExpired(r, now);
      return (
        <Card aria-labelledby="pay" className="border-warn-line">
          <CardTitle id="pay" eyebrow="Payment">
            결제 안내
          </CardTitle>
          <div className="rounded-2xl bg-warn-bg px-5 py-4">
            <p className="text-xs font-bold text-warn">결제 기한</p>
            <p className="tabular mt-0.5 text-[20px] font-extrabold text-ink" data-testid="payment-deadline">
              {fmtDateTime(r.ops.paymentDeadline)}
            </p>
            <p className={cx("text-sm font-semibold", expired ? "text-danger-ink" : "text-warn")}>{fmtRemaining(r.ops.paymentDeadline, now)}</p>
          </div>
          {expired ? (
            <Notice tone="danger" className="mt-3" title="결제 기한이 지났어요">
              예약이 저절로 확정되지는 않아요. 운영자가 이 요청을 취소하면, 다른 날짜로 다시 요청할 수 있어요.
            </Notice>
          ) : null}
          <p className="mt-4 text-[15px] leading-relaxed text-ink">{PAYMENT_RULE}</p>
          <p className="mt-2 text-sm text-sub">잡아 둔 기기: {KEYS.map((k) => DEVICE_LABEL[k]).join(", ")}</p>
          <button type="button" disabled aria-disabled="true" className={cx(btn.secondary, "mt-5 w-full border-dashed")}>
            결제하기 (데모라서 실제 결제는 없어요)
          </button>
        </Card>
      );
    }

    case "confirmed":
      return (
        <Card aria-labelledby="pickup">
          <CardTitle id="pickup" eyebrow="Pick up" sub={`${fmtDateKey(r.request.startDate)} · ${r.request.pickupStore}`}>
            픽업하는 날 이렇게 해요
          </CardTitle>
          <ul className="space-y-2.5 text-[15px] text-ink">
            {[
              "두 기기의 겉모습과 작동 상태를 운영자와 함께 확인하고 기록해요.",
              "기기마다 구성품(충전기, 케이블 등)과 배터리 상태를 확인해요.",
              "두 맥 바탕화면에 뜬 4자리 코드를 미션 화면에 적어 주세요.",
              "맥이 처음이라면 켜고 끄는 법이나 트랙패드 쓰는 법을 편하게 물어보세요.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line-strong bg-surface" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-sub">두 기기를 건네받으면 &lsquo;체험 중&rsquo;으로 바뀌어요.</p>
        </Card>
      );

    case "in_trial":
      return (
        <>
          <MissionAndReward r={r} />
          <Card aria-labelledby="dec" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <StepIcon art="decide" className="h-14 w-14 shrink-0" />
              <div>
                <h2 id="dec" className="text-[17px] font-bold text-ink">
                  마지막 날 결정
                </h2>
                <p className="text-sm text-sub">지금 결정: {decisionText(r.decision)} · 반납하기 전까지 바꿀 수 있어요</p>
              </div>
            </div>
            <ButtonLink href={myHref(r.id, "decide/")} variant="secondary" className="shrink-0 sm:px-6">
              마지막 날 결정
            </ButtonLink>
          </Card>
        </>
      );

    case "return_received":
    case "inspecting":
      return (
        <>
          <MissionAndReward r={r} />
          <ReturnCard r={r} />
        </>
      );

    case "completed":
      return (
        <>
          {r.reward.status !== "none" ? <MissionAndReward r={r} /> : null}
          <ReturnCard r={r} />
        </>
      );

    default:
      return null;
  }
}
