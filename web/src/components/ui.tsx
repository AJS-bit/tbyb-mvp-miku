import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
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

/** 페이드업 순서 — style={delay(2)} */
export function delay(step: number): CSSProperties {
  return { ["--delay" as string]: `${step * 80}ms` };
}

// ───────── 버튼 ─────────

const btnBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold leading-snug transition-colors disabled:cursor-not-allowed text-center";

export const btn = {
  primary: cx(btnBase, "bg-ink text-ivory hover:bg-ink-hover disabled:bg-line disabled:text-sub"),
  secondary: cx(
    btnBase,
    "border border-line-strong bg-surface text-ink hover:bg-cream disabled:bg-cream disabled:text-sub/80",
  ),
  danger: cx(
    btnBase,
    "border border-danger/30 bg-surface text-danger-ink hover:bg-danger-soft disabled:border-line disabled:text-sub/80",
  ),
  light: cx(btnBase, "bg-ivory text-ink hover:bg-cream"),
  ghostLight: cx(btnBase, "border border-ivory/30 text-ivory hover:bg-ivory/10"),
  small: "min-h-10 px-4 py-1.5 text-sm",
};

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "light" | "ghostLight" }) {
  return <Link {...props} className={cx(btn[variant], className)} />;
}

// ───────── 글자 ─────────

/** 작은 영문 대문자 아이브로우 — 앞에 코랄 점 */
export function Eyebrow({ children, className, tone = "sub" }: { children: ReactNode; className?: string; tone?: "sub" | "coral" | "ivory" }) {
  return (
    <p
      className={cx(
        "eyebrow flex items-center gap-2",
        tone === "sub" && "text-sub",
        tone === "coral" && "text-coral-ink",
        tone === "ivory" && "text-ivory/70",
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="fade-up mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-3">{eyebrow}</Eyebrow> : null}
        <h1 className="text-[30px] font-extrabold leading-[1.28] text-ink sm:text-[40px]">{title}</h1>
        {children ? <div className="mt-3 max-w-2xl text-[16px] leading-[1.75] text-sub sm:text-[17px]">{children}</div> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

// ───────── 카드·섹션 ─────────

export function Card({ children, className, ...rest }: ComponentProps<"section">) {
  return (
    <section
      {...rest}
      className={cx("rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(31,27,22,0.04)] sm:p-7", className)}
    >
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  sub,
  id,
  eyebrow,
  tag,
}: {
  children: ReactNode;
  sub?: ReactNode;
  id?: string;
  eyebrow?: ReactNode;
  tag?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
      <h2 id={id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[19px] font-bold leading-snug text-ink">
        {children}
        {tag}
      </h2>
      {sub ? <p className="mt-1.5 text-[15px] leading-relaxed text-sub">{sub}</p> : null}
    </div>
  );
}

/** '필수' · '선택' 같은 작은 표시 */
export function Tag({ children, tone = "mute" }: { children: ReactNode; tone?: "mute" | "ink" | "coral" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 tracking-normal",
        tone === "mute" && "bg-mute-soft text-mute-ink",
        tone === "ink" && "bg-ink text-ivory",
        tone === "coral" && "bg-coral-soft text-coral-ink",
      )}
    >
      {children}
    </span>
  );
}

// ───────── 알림 상자 ─────────

type Tone = "info" | "warn" | "danger" | "success" | "coral";
const toneClass: Record<Tone, string> = {
  info: "border-line bg-cream/60 text-ink",
  warn: "border-warn-line bg-warn-bg text-warn",
  danger: "border-danger/25 bg-danger-soft text-danger-ink",
  success: "border-success/30 bg-success-soft text-success-ink",
  coral: "border-coral/25 bg-coral-soft text-coral-ink",
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
    <div role={role} className={cx("rounded-2xl border px-4 py-3.5 text-[15px] leading-relaxed sm:px-5", toneClass[tone], className)}>
      {title ? <p className="font-bold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}

/** domain 함수가 돌려준 error 문자열을 입력 바로 아래에 보여준다. */
export function ErrorText({ children, id }: { children: ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-3 rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger-ink">
      {children}
    </p>
  );
}

export function SuccessText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="mt-3 rounded-2xl bg-success-soft px-4 py-2.5 text-sm font-semibold text-success-ink">
      {children}
    </p>
  );
}

// ───────── 칩 ─────────

const statusTone: Record<ReservationStatus, string> = {
  requested: "bg-mute-soft text-mute-ink",
  operator_check: "bg-mute-soft text-mute-ink",
  payment_pending: "bg-warn-bg text-warn ring-1 ring-inset ring-warn-line",
  confirmed: "bg-ink text-ivory",
  in_trial: "bg-ink text-ivory",
  return_received: "bg-pro-soft text-pro-ink",
  inspecting: "bg-pro-soft text-pro-ink",
  completed: "bg-success-soft text-success-ink",
  cancelled: "bg-mute-soft text-sub",
};

export function StatusChip({ status, className }: { status: ReservationStatus; className?: string }) {
  return (
    <span
      data-testid="status-chip"
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold leading-4",
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
  held: "bg-mute-soft text-mute-ink",
  out: "bg-ink text-ivory",
  inspection: "bg-danger-soft text-danger-ink",
  sale_pending: "bg-warn-bg text-warn ring-1 ring-inset ring-warn-line",
  sold: "bg-mute-soft text-sub",
};

/** 기기 상태 칩 — 라벨의 괄호 설명(예: '재대여 불가')은 칩 옆 작은 글자로 뺀다. */
export function DeviceStateChip({ state }: { state: DeviceState }) {
  const full = DEVICE_STATE_LABEL[state];
  const cut = full.indexOf(" (");
  const main = cut > 0 ? full.slice(0, cut) : full;
  const note = cut > 0 ? full.slice(cut + 1) : "";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span className={cx("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-4", deviceStateTone[state])}>
        {main}
      </span>
      {note ? <span className="text-xs font-medium text-sub"> {note}</span> : null}
    </span>
  );
}

export const deviceTone: Record<DeviceKey, { dot: string; text: string; soft: string; border: string; bar: string; solid: string }> = {
  air: { dot: "bg-air", text: "text-air-ink", soft: "bg-air-soft", border: "border-air", bar: "bg-air", solid: "bg-air-ink" },
  pro: { dot: "bg-pro", text: "text-pro-ink", soft: "bg-pro-soft", border: "border-pro", bar: "bg-pro", solid: "bg-pro" },
};

export const shortName = (k: DeviceKey) => (k === "air" ? "Air" : "Pro");

/** 기기 이름 — 항상 같은 색(Air 청록 · Pro 보라) */
export function DeviceName({ kind, short, className }: { kind: DeviceKey; short?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 font-bold", deviceTone[kind].text, className)}>
      <span aria-hidden className={cx("h-2.5 w-2.5 shrink-0 rounded-full", deviceTone[kind].dot)} />
      {short ? shortName(kind) : DEVICE_LABEL[kind]}
    </span>
  );
}

/** 진행 막대 (n/total) */
export function ProgressBar({ done, total, tone = "coral", label }: { done: number; total: number; tone?: "coral" | "ink"; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="h-2.5 w-full overflow-hidden rounded-full bg-surface/80 ring-1 ring-inset ring-line"
    >
      <div
        className={cx("h-full rounded-full transition-[width] duration-500", tone === "coral" ? "bg-coral" : "bg-ink")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ───────── 기타 ─────────

export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="animate-pulse space-y-4">
      <div className="h-3 w-40 rounded bg-line/80" />
      <div className="h-10 w-2/3 rounded-xl bg-line/70" />
      <div className="h-4 w-1/2 rounded bg-line/60" />
      <div className="h-44 rounded-3xl bg-line/50" />
      <div className="h-28 rounded-3xl bg-line/40" />
    </div>
  );
}

export function DefList({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-[15px] sm:grid-cols-2">
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-semibold text-sub">{it.label}</dt>
          <dd className="mt-0.5 leading-relaxed text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const inputClass =
  "block w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-sub/70 focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-ink disabled:bg-cream disabled:text-sub";

/** sr-only 라디오를 감싸는 칩 모양 label */
export const chipLabel =
  "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface px-4 py-1.5 text-[14px] font-semibold text-ink transition-colors hover:bg-cream has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-ivory has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60";
