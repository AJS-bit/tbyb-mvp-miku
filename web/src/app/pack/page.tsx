import type { Metadata } from "next";
import {
  CANCELLABLE,
  COMPARE_POINTS,
  DEVICE_LABEL,
  PACK_NAME,
  PICKUP_STORES,
  PRICE_TBD,
  STATUS_LABEL,
  type DeviceKey,
} from "@/lib/domain";
import { ButtonLink, Card, CardTitle, DeviceName, Notice, PageHeader, cx, delay, deviceTone } from "@/components/ui";
import { LaptopMini } from "@/components/illustrations";

export const metadata: Metadata = { title: "비교팩 상세" };

const KEYS: DeviceKey[] = ["air", "pro"];
const MOOD: Record<DeviceKey, string> = {
  air: "가볍게 들고 다니는 쪽",
  pro: "무거운 작업도 끝까지 가는 쪽",
};

const RULES = [
  {
    dot: "bg-success",
    title: "출고 전에는 직접 취소할 수 있어요.",
    body: `${CANCELLABLE.map((s) => STATUS_LABEL[s]).join(" · ")} 단계, 내 체험 화면에서`,
  },
  {
    dot: "bg-warn",
    title: "출고 후 환불·파손·분실은 딜러 계약 기준으로 처리해요.",
    body: "이 데모의 범위 밖이에요.",
  },
  {
    dot: "bg-ink",
    title: "한 대를 사기로 하면 나머지 한 대와 부속품만 반납·검수해요.",
    body: "고른 기기는 딜러 판매가 확인돼야 구매로 확정되고, 확인되지 않으면 그 기기도 반납·검수해요.",
  },
  {
    dot: "bg-pro",
    title: "반납 전에 백업·로그아웃·나의 찾기 해제를 해 주세요.",
    body: "운영자가 검수에서 초기화까지 확인하고, 검수가 끝나기 전에는 다른 사람에게 빌려주지 않아요.",
  },
];

export default function PackPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow="The pack · MacBook Air & Pro 14" title={PACK_NAME}>
        두 대를 함께 빌려 같은 하루를 보내 보는 팩이에요. 숫자 대신, 직접 해 보고 느낄 수 있는 점을 안내해요.
      </PageHeader>

      {/* 두 기기 머리 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {KEYS.map((k, i) => (
          <div key={k} className={cx("fade-up rounded-3xl p-4 sm:p-7", deviceTone[k].soft)} style={delay(i + 1)}>
            <LaptopMini kind={k} className="h-auto w-full max-w-[180px]" />
            <p className="eyebrow mt-4 text-sub">Device 0{i + 1}</p>
            <p className={cx("mt-1 text-[17px] font-extrabold leading-snug sm:text-[22px]", deviceTone[k].text)}>{DEVICE_LABEL[k]}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/80">{MOOD[k]}</p>
            <p className="mt-2 text-xs text-sub">사양은 딜러 재고 확정 후 기기별 표시</p>
          </div>
        ))}
      </div>

      {/* 같은 기준 비교 포인트 */}
      <Card aria-labelledby="points">
        <CardTitle id="points" eyebrow="Same yardstick" sub="두 기기를 같은 기준으로 확인할 점이에요. 숫자 대신 직접 해 볼 방법을 적었어요.">
          같은 기준으로 확인할 점
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
            팩 구성
          </CardTitle>
          <ul className="space-y-2">
            {KEYS.map((k) => (
              <li key={k} className="rounded-2xl bg-bg px-4 py-3">
                <DeviceName kind={k} />
                <p className="mt-0.5 pl-4 text-[15px] text-sub">1대 + 부속품(충전기·케이블 등)</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] leading-relaxed text-sub">
            기기별 칩·메모리·저장공간과 부속품 구성은 딜러 재고 확정 후 표시해요. 픽업 때 두 기기의 상태·부속품을 함께 확인하고
            기록해요.
          </p>
        </Card>

        <Card aria-labelledby="pickup">
          <CardTitle id="pickup" eyebrow="Pick up">
            픽업
          </CardTitle>
          <ul className="space-y-2">
            {PICKUP_STORES.map((s) => (
              <li key={s} className="rounded-2xl bg-bg px-4 py-3 text-[15px] text-ink">
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] leading-relaxed text-sub">제휴 매장과 위치는 딜러 계약 후 확정해요.</p>
        </Card>
      </div>

      <Card aria-labelledby="rules">
        <CardTitle id="rules" eyebrow="Good to know">
          취소·반납 규칙
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="party">
          <CardTitle id="party" eyebrow="Who">
            계약 주체
          </CardTitle>
          <p className="text-[15px] font-bold text-warn">딜러 계약 후 표시</p>
          <p className="mt-1 text-[15px] leading-relaxed text-sub">대여·판매를 누가 맡는지는 계약이 끝나면 여기에 적어요.</p>
        </Card>
        <Notice tone="warn" title="체험료·기간·보증" className="self-start rounded-3xl p-6! sm:p-7!">
          {PRICE_TBD}
        </Notice>
      </div>

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
