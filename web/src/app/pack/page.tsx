import type { Metadata } from "next";
import {
  CANCELLABLE,
  COMPARE_POINTS,
  DEVICE_LABEL,
  PACK_NAME,
  PICKUP_STORES,
  STATUS_LABEL,
  type DeviceKey,
} from "@/lib/domain";
import { ButtonLink, Card, CardTitle, DeviceName, Eyebrow, PageHeader, cx, delay, deviceTone } from "@/components/ui";
import { LaptopMini } from "@/components/illustrations";

export const metadata: Metadata = { title: "첫 비교팩" };

const KEYS: DeviceKey[] = ["air", "pro"];
// 히어로 화면 문구(어디로 · 어디까지)와 짝을 맞춘 한 줄
const MOOD: Record<DeviceKey, string> = {
  air: "가볍게 들고 어디든 가고 싶다면",
  pro: "무거운 작업도 끝까지 해내고 싶다면",
};

// 조건 표 — 아직 정해지지 않은 조건과 정해지는 때 (예전 '요금과 기간' 알림 · '누가 빌려주고 파나요?' 카드 · 픽업 매장 안내를 한 곳에)
const TERMS = [
  { label: "체험 요금 · 기간", value: "딜러와 계약한 뒤 안내해요" },
  { label: "픽업 매장 · 계약 주체", value: "협의하고 있어요" },
  { label: "취소 · 환불 · 보증", value: "유료 운영 전에 확정해요" },
];

const RULES = [
  {
    dot: "bg-success",
    title: "픽업 전이라면 직접 취소할 수 있어요.",
    body: `${STATUS_LABEL[CANCELLABLE[0]]}부터 ${STATUS_LABEL[CANCELLABLE[CANCELLABLE.length - 1]]}까지, ‘내 체험’ 화면에서 바로 취소하면 돼요.`,
  },
  {
    dot: "bg-warn",
    title: "픽업한 뒤의 환불, 파손, 분실은 딜러와의 계약을 따라요.",
    body: "이 데모에서는 다루지 않아요.",
  },
  {
    dot: "bg-ink",
    title: "한 대를 사기로 하면, 나머지 한 대와 구성품만 돌려주면 돼요.",
    body: "고른 기기는 딜러가 판매를 확인하면 구매가 확정돼요. 확인되지 않으면 그 기기도 돌려주셔야 해요.",
  },
  {
    dot: "bg-pro",
    title: "돌려주기 전에 백업하고, 로그아웃과 ‘나의 찾기’ 해제를 해 주세요.",
    body: "점검할 때 운영자가 초기화까지 확인해요. 점검이 끝나기 전에는 다른 분께 빌려 드리지 않아요.",
  },
];

export default function PackPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow="The first pack" title={PACK_NAME}>
        tbyb의 첫 비교팩이에요. 두 대를 함께 빌려 똑같은 하루를 보내 보는 구성이에요. 맥이 처음이어도 차이를 느낄 수 있게 비교할 점을 골라
        뒀어요.
      </PageHeader>

      {/* 두 기기 머리 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {KEYS.map((k, i) => (
          <div key={k} className={cx("fade-up rounded-3xl p-4 sm:p-7", deviceTone[k].soft)} style={delay(i + 1)}>
            <LaptopMini kind={k} className="h-auto w-full max-w-[180px]" />
            <p className="eyebrow mt-4 text-sub">Device 0{i + 1}</p>
            <p className={cx("mt-1 text-[17px] font-extrabold leading-snug sm:text-[22px]", deviceTone[k].text)}>{DEVICE_LABEL[k]}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">{MOOD[k]}</p>
          </div>
        ))}
      </div>

      {/* 조건 표 — 숫자는 만들지 않고, 언제 정해지는지만 */}
      <section
        aria-labelledby="terms"
        data-testid="pack-terms"
        className="grid gap-4 rounded-3xl border border-warn-line bg-warn-bg/60 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-center lg:gap-10"
      >
        <div>
          <Eyebrow className="mb-2">Terms</Eyebrow>
          <h2 id="terms" className="text-[19px] font-bold leading-snug text-ink">
            요금과 조건은 아직 정하는 중이에요
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-sub">정해지기 전까지는 금액을 표시하지 않아요.</p>
        </div>
        <dl className="divide-y divide-warn-line border-y border-warn-line text-[14px] sm:text-[15px]">
          {TERMS.map((t) => (
            <div key={t.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-3">
              <dt className="text-sub">{t.label}</dt>
              <dd className="ml-auto flex items-center gap-2 text-right font-bold text-ink">
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                {t.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 같은 기준 비교 포인트 */}
      <Card aria-labelledby="points">
        <CardTitle id="points" eyebrow="Same yardstick" sub="스펙 숫자 대신, 직접 해 보면 알 수 있는 방법을 적었어요.">
          같은 기준으로 비교해 보세요
        </CardTitle>
        <ul className="divide-y divide-line">
          {COMPARE_POINTS.map((p) => (
            <li key={p.title} className="grid gap-3 py-5 first:pt-0 last:pb-0 md:grid-cols-[200px_1fr_1fr] md:items-start md:gap-4">
              <p className="text-[16px] font-bold text-ink md:pt-2.5">{p.title}</p>
              {KEYS.map((k) => (
                <div key={k} className={cx("rounded-2xl px-4 py-3", deviceTone[k].soft)}>
                  <DeviceName kind={k} short className="text-xs" />
                  <p className="mt-1 text-[15px] leading-relaxed text-ink">{p[k]}</p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="contents">
          <CardTitle id="contents" eyebrow="In the box">
            팩에 들어 있는 것
          </CardTitle>
          <ul className="space-y-2">
            {KEYS.map((k) => (
              <li key={k} className="rounded-2xl bg-bg px-4 py-3">
                <DeviceName kind={k} />
                <p className="mt-0.5 pl-4 text-[15px] text-sub">1대와 구성품(충전기, 케이블 등)</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] leading-relaxed text-sub">
            정확한 구성품은 딜러 재고가 정해지면 알려 드려요. 픽업할 때 두 기기의 상태와 구성품을 함께 확인하고 기록해 둬요.
          </p>
        </Card>

        <Card aria-labelledby="pickup">
          <CardTitle id="pickup" eyebrow="Pick up">
            픽업 매장
          </CardTitle>
          <ul className="space-y-2">
            {PICKUP_STORES.map((s) => (
              <li key={s} className="rounded-2xl bg-bg px-4 py-3 text-[15px] text-ink">
                {s}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card aria-labelledby="rules">
        <CardTitle id="rules" eyebrow="Good to know">
          취소와 반납은 이렇게 해요
        </CardTitle>
        <ul className="grid gap-5 md:grid-cols-2">
          {RULES.map((r) => (
            <li key={r.title} className="flex gap-3">
              <span aria-hidden className={cx("mt-2.5 h-2 w-2 shrink-0 rounded-full", r.dot)} />
              <span className="text-[15px] leading-relaxed">
                <strong className="block font-bold text-ink">{r.title}</strong>
                <span className="text-sub">{r.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <ButtonLink href="/request/" className="sm:px-7">
          데모 일정 요청
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className="sm:px-7">
          소개로 돌아가기
        </ButtonLink>
      </div>
    </div>
  );
}
