import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  DEVICE_LABEL,
  DEVICE_STATE_LABEL,
  STATUS_LABEL,
  type DeviceKey,
  type DeviceState,
  type ReservationStatus,
} from "@/lib/domain";

export function cx(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(" ");
}

// ───────── 버튼 ─────────

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed text-center";

export const btn = {
  primary: cx(btnBase, "bg-primary text-white hover:bg-primary-ink disabled:bg-line disabled:text-sub"),
  secondary: cx(
    btnBase,
    "border border-line bg-surface text-ink hover:border-sub/40 hover:bg-bg disabled:text-sub/70 disabled:bg-bg",
  ),
  danger: cx(
    btnBase,
    "border border-danger/30 bg-surface text-danger hover:bg-danger-soft disabled:text-sub/70 disabled:border-line",
  ),
  small: "min-h-9 px-3 py-1.5 text-sm",
};

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return <Link {...props} className={cx(btn[variant], className)} />;
}

// ───────── 카드·섹션 ─────────

export function Card({ children, className, ...rest }: ComponentProps<"section">) {
  return (
    <section {...rest} className={cx("rounded-xl border border-line bg-surface p-5 sm:p-6", className)}>
      {children}
    </section>
  );
}

export function CardTitle({ children, sub, id }: { children: ReactNode; sub?: ReactNode; id?: string }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="text-[17px] font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {sub ? <p className="mt-1 text-sm leading-relaxed text-sub">{sub}</p> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 sm:mb-8">
      {eyebrow ? <p className="mb-2 text-sm font-medium text-sub">{eyebrow}</p> : null}
      <h1 className="text-[26px] font-bold leading-snug tracking-tight text-ink sm:text-3xl">{title}</h1>
      {children ? <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-sub">{children}</div> : null}
    </header>
  );
}

// ───────── 알림 상자 ─────────

type Tone = "info" | "warn" | "danger" | "success" | "primary";
const toneClass: Record<Tone, string> = {
  info: "border-line bg-bg text-ink",
  warn: "border-warn-line bg-warn-bg text-warn",
  danger: "border-danger/25 bg-danger-soft text-danger",
  success: "border-success/30 bg-success-soft text-success-ink",
  primary: "border-primary/20 bg-primary-soft text-primary-ink",
};

export function Notice({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: string;
}) {
  return (
    <div role={role} className={cx("rounded-xl border px-4 py-3 text-sm leading-relaxed", toneClass[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}

/** domain 함수가 돌려준 error 문자열을 입력 바로 아래에 보여준다. */
export function ErrorText({ children, id }: { children: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function SuccessText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-sm font-medium text-success-ink">
      {children}
    </p>
  );
}

// ───────── 칩 ─────────

const statusTone: Record<ReservationStatus, string> = {
  requested: "bg-slate-soft text-slate-ink",
  operator_check: "bg-slate-soft text-slate-ink",
  payment_pending: "bg-warn-bg text-warn ring-1 ring-inset ring-warn-line",
  confirmed: "bg-primary-soft text-primary-ink",
  in_trial: "bg-primary-soft text-primary-ink",
  return_received: "bg-pro-soft text-pro-ink",
  inspecting: "bg-pro-soft text-pro-ink",
  completed: "bg-success-soft text-success-ink",
  cancelled: "bg-muted-soft text-sub",
};

export function StatusChip({ status, className }: { status: ReservationStatus; className?: string }) {
  return (
    <span
      data-testid="status-chip"
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        statusTone[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const deviceStateTone: Record<DeviceState, string> = {
  available: "bg-success-soft text-success-ink",
  held: "bg-slate-soft text-slate-ink",
  out: "bg-primary-soft text-primary-ink",
  inspection: "bg-danger-soft text-danger",
  sale_pending: "bg-warn-bg text-warn ring-1 ring-inset ring-warn-line",
  sold: "bg-muted-soft text-sub",
};

/** 기기 상태 칩 — 라벨의 괄호 설명(예: '재대여 불가')은 칩 옆 작은 글자로 뺀다. */
export function DeviceStateChip({ state }: { state: DeviceState }) {
  const full = DEVICE_STATE_LABEL[state];
  const cut = full.indexOf(" (");
  const main = cut > 0 ? full.slice(0, cut) : full;
  const note = cut > 0 ? full.slice(cut + 1) : "";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className={cx("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", deviceStateTone[state])}>
        {main}
      </span>
      {note ? <span className="text-xs font-medium text-sub"> {note}</span> : null}
    </span>
  );
}

export const deviceTone: Record<DeviceKey, { dot: string; text: string; soft: string; border: string; bar: string }> = {
  air: { dot: "bg-air", text: "text-air-ink", soft: "bg-air-soft", border: "border-air", bar: "bg-air" },
  pro: { dot: "bg-pro", text: "text-pro-ink", soft: "bg-pro-soft", border: "border-pro", bar: "bg-pro" },
};

/** 기기 이름 — 항상 같은 색(Air 청록 · Pro 보라) */
export function DeviceName({ kind, short, className }: { kind: DeviceKey; short?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 font-semibold", deviceTone[kind].text, className)}>
      <span aria-hidden className={cx("h-2.5 w-2.5 shrink-0 rounded-full", deviceTone[kind].dot)} />
      {short ? (kind === "air" ? "Air" : "Pro") : DEVICE_LABEL[kind]}
    </span>
  );
}

// ───────── 기타 ─────────

export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="animate-pulse space-y-4">
      <div className="h-8 w-2/3 rounded-lg bg-line/70" />
      <div className="h-4 w-1/2 rounded bg-line/60" />
      <div className="h-40 rounded-xl bg-line/50" />
      <div className="h-24 rounded-xl bg-line/40" />
    </div>
  );
}

export function DefList({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium text-sub">{it.label}</dt>
          <dd className="mt-0.5 text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const inputClass =
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-sub/70 focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-primary";
