import Link from "next/link";
import { DEVICE_LABEL, PACK_NAME, PRICE_TBD, WORK_TYPES } from "@/lib/domain";
import { ButtonLink, Card, cx, deviceTone } from "@/components/ui";
import type { DeviceKey } from "@/lib/domain";

const STEPS = [
  {
    title: "데모 일정 요청",
    body: "희망 시작일·픽업 매장·작업 유형만 고릅니다. 이름과 전화번호는 받지 않습니다. 요청만으로는 확정되지 않습니다.",
  },
  {
    title: "운영자 두 기기 확인·결제",
    body: "운영자가 Air와 Pro 두 대를 확보하면 결제 기한을 안내합니다. 실제 거래내역을 대조한 뒤에만 예약이 확정됩니다.",
  },
  {
    title: "픽업 후 같은 작업으로 비교 기록",
    body: "작업 유형별 체크리스트대로 두 기기에서 똑같이 해 보고, 소요 시간·휴대성·화면·사용감을 같은 기준으로 적습니다.",
  },
  {
    title: "마지막 날 반납/구매 결정",
    body: "기록을 나란히 보고 결정합니다. 두 대 모두 반납하거나, 한 대를 사기로 하면 나머지 한 대만 반납·검수합니다. 구매는 딜러 판매 확인 후 확정됩니다.",
  },
];

const DIFFS = [
  {
    title: "작업 유형 기반 비교 가이드",
    body: `${Object.values(WORK_TYPES)
      .map((w) => w.label)
      .join(" · ")} — 내 작업에 맞춘 확인 항목을 따라 비교합니다.`,
  },
  {
    title: "두 기기, 같은 기준 기록",
    body: "같은 작업을 두 기기에서 해 보고 같은 항목으로 적어 나란히 봅니다. 스펙표가 아니라 내 결과로 비교합니다.",
  },
  {
    title: "마지막 날 결정",
    body: "체험 전 기울기·확신과 체험 후 확신을 함께 남겨, 직접 써 보고 생각이 어떻게 바뀌었는지 확인합니다.",
  },
  {
    title: "반납 개인정보 체크",
    body: "백업·로그아웃·나의 찾기 해제를 안내하고, 운영자가 검수에서 초기화까지 확인합니다. 검수 전 기기는 다시 빌려주지 않습니다.",
  },
];

const UNDECIDED = ["체험료", "체험 기간", "보증", "할인", "제휴 매장"];

function Laptop({ kind }: { kind: DeviceKey }) {
  const t = deviceTone[kind];
  const wide = kind === "pro";
  return (
    <div className={cx("rounded-xl border bg-surface p-4 sm:p-5", "border-line")}>
      <svg viewBox="0 0 120 76" className="mx-auto h-auto w-full max-w-[150px]" aria-hidden>
        <rect x={wide ? 14 : 18} y="6" width={wide ? 92 : 84} height="54" rx="5" fill="none" strokeWidth="3" className={kind === "air" ? "stroke-air" : "stroke-pro"} />
        <rect x={wide ? 20 : 24} y="12" width={wide ? 80 : 72} height="42" rx="2" className={kind === "air" ? "fill-air-soft" : "fill-pro-soft"} />
        <path d={wide ? "M4 64h112l-6 7H10z" : "M8 64h104l-5 6H13z"} className={kind === "air" ? "fill-air" : "fill-pro"} />
      </svg>
      <p className={cx("mt-3 text-center text-sm font-semibold", t.text)}>{DEVICE_LABEL[kind]}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-14 sm:space-y-20">
      {/* 첫 화면 */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-surface px-3 py-1 text-xs font-semibold text-sub ring-1 ring-line">
            {PACK_NAME}
          </p>
          <h1 className="text-[30px] font-bold leading-[1.25] tracking-tight text-ink sm:text-[44px]">
            사기 전에,
            <br />
            <span className="text-primary">내 작업</span>으로 두 MacBook을
            <br className="hidden sm:inline" /> 비교해 보세요
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-sub sm:text-lg">
            스펙표보다 중요한 건 <strong className="font-semibold text-ink">내가 샀을 때 만족할 제품</strong>인지입니다.
            MacBook Air와 14형 Pro를 함께 받아 평소 하는 작업을 두 기기에서 똑같이 해 보고, 마지막 날 반납하거나 구매를
            결정하세요.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/request/" className="sm:px-6">
              데모 일정 요청
            </ButtonLink>
            <ButtonLink href="/pack/" variant="secondary" className="sm:px-6">
              비교팩 자세히 보기
            </ButtonLink>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-linear-to-b from-surface to-bg p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Laptop kind="air" />
            <Laptop kind="pro" />
          </div>
          <div className="mt-4 rounded-xl bg-surface p-4 ring-1 ring-line">
            <p className="text-xs font-medium text-sub">같은 작업 · 같은 기준</p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink">
              <li className="flex gap-2">
                <span aria-hidden className="text-sub">·</span>같은 영상 내보내기에 걸린 시간
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-sub">·</span>하루 들고 다녀 본 휴대성
              </li>
              <li className="flex gap-2">
                <span aria-hidden className="text-sub">·</span>화면·키보드·발열 사용감
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 이용 흐름 */}
      <section aria-labelledby="how">
        <h2 id="how" className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          이렇게 진행됩니다
        </h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-line bg-surface p-5">
              <span className="tabular inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-sub">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 차별점 */}
      <section aria-labelledby="diff">
        <h2 id="diff" className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          단순 대여와 다른 점
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {DIFFS.map((d) => (
            <Card key={d.title} className="sm:p-5!">
              <h3 className="font-semibold text-ink">{d.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-sub">{d.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 미확정 */}
      <section aria-labelledby="tbd" className="rounded-xl border border-warn-line bg-warn-bg p-5 sm:p-6">
        <h2 id="tbd" className="text-lg font-bold text-warn">
          아직 확정되지 않은 것
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {UNDECIDED.map((x) => (
            <li key={x} className="rounded-full bg-surface/70 px-3 py-1 text-sm font-medium text-warn ring-1 ring-warn-line">
              {x} — 딜러 계약 후 확정
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-warn">{PRICE_TBD}</p>
      </section>

      {/* 마무리 CTA */}
      <section className="rounded-2xl bg-ink px-5 py-8 text-center sm:px-10 sm:py-12">
        <h2 className="text-xl font-bold text-white sm:text-2xl">내 작업으로 먼저 비교해 보세요</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/75">
          요청은 확정이 아닙니다. 운영자가 두 기기를 확인한 뒤 안내합니다.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/request/" className="sm:px-6">
            데모 일정 요청
          </ButtonLink>
          <Link
            href="/pack/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-6 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            비교팩 보기
          </Link>
        </div>
      </section>
    </div>
  );
}
