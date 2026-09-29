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
import { ButtonLink, Card, CardTitle, DeviceName, Notice, PageHeader, cx, deviceTone } from "@/components/ui";

export const metadata: Metadata = { title: "비교팩 상세" };

const KEYS: DeviceKey[] = ["air", "pro"];

export default function PackPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="비교팩 상세" title={PACK_NAME}>
        두 기기를 함께 빌려 같은 작업을 해 보고, 같은 기준으로 비교합니다. 수치 대신 직접 확인할 점을 안내합니다.
      </PageHeader>

      {/* 두 기기 머리 */}
      <div className="grid grid-cols-2 gap-3">
        {KEYS.map((k) => (
          <div key={k} className={cx("rounded-xl border-t-4 bg-surface p-4 ring-1 ring-line sm:p-5", deviceTone[k].border)}>
            <p className="text-xs font-medium text-sub">비교 기기 {k === "air" ? 1 : 2}</p>
            <p className={cx("mt-1 text-base font-bold sm:text-lg", deviceTone[k].text)}>{DEVICE_LABEL[k]}</p>
            <p className="mt-1 text-xs text-sub">사양은 딜러 재고 확정 후 기기별 표시</p>
          </div>
        ))}
      </div>

      {/* 같은 기준 비교 포인트 */}
      <Card aria-labelledby="points">
        <CardTitle id="points" sub="두 기기를 같은 기준으로 확인할 점입니다. 숫자 대신 직접 해 볼 방법을 적었습니다.">
          같은 기준으로 확인할 점
        </CardTitle>
        <ul className="divide-y divide-line">
          {COMPARE_POINTS.map((p) => (
            <li key={p.title} className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-ink">{p.title}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
                {KEYS.map((k) => (
                  <div key={k} className={cx("rounded-lg px-3 py-2.5", deviceTone[k].soft)}>
                    <DeviceName kind={k} short className="text-xs" />
                    <p className="mt-1 text-sm leading-relaxed text-ink">{p[k]}</p>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="contents">
          <CardTitle id="contents">팩 구성</CardTitle>
          <ul className="space-y-2 text-sm">
            {KEYS.map((k) => (
              <li key={k} className="rounded-lg bg-bg px-3 py-2.5">
                <DeviceName kind={k} />
                <p className="mt-0.5 pl-4 text-sub">1대 + 부속품(충전기·케이블 등)</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-sub">
            기기별 칩·메모리·저장공간과 부속품 구성은 딜러 재고 확정 후 표시합니다. 픽업 때 두 기기의 상태·부속품을 함께
            확인하고 기록합니다.
          </p>
        </Card>

        <Card aria-labelledby="pickup">
          <CardTitle id="pickup">픽업</CardTitle>
          <ul className="space-y-2">
            {PICKUP_STORES.map((s) => (
              <li key={s} className="rounded-lg bg-bg px-3 py-2.5 text-sm text-ink">
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-sub">제휴 매장과 위치는 딜러 계약 후 확정합니다.</p>
        </Card>
      </div>

      <Card aria-labelledby="rules">
        <CardTitle id="rules">취소·반납 규칙</CardTitle>
        <ul className="space-y-3 text-sm leading-relaxed text-ink">
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            <span>
              <strong className="font-semibold">출고 전에는 직접 취소할 수 있습니다.</strong>{" "}
              <span className="text-sub">({CANCELLABLE.map((s) => STATUS_LABEL[s]).join(" · ")} 단계, 내 체험 화면에서)</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
            <span>
              <strong className="font-semibold">출고 후 환불·파손·분실은 딜러 계약 기준으로 처리합니다.</strong>{" "}
              <span className="text-sub">이 데모의 범위 밖입니다.</span>
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>
              체험한 기기 한 대를 사기로 하면 나머지 한 대와 부속품만 반납·검수합니다. 고른 기기는 딜러 판매가 확인돼야 구매로
              확정되고, 확인되지 않으면 그 기기도 반납·검수합니다.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pro" />
            <span>
              반납 전에 백업·로그아웃·나의 찾기 해제를 해 주세요. 운영자가 검수에서 초기화까지 확인하고, 검수가 끝나기 전에는
              다른 사람에게 빌려주지 않습니다.
            </span>
          </li>
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="party">
          <CardTitle id="party">계약 주체</CardTitle>
          <p className="text-sm font-semibold text-warn">딜러 계약 후 표시</p>
          <p className="mt-1 text-sm leading-relaxed text-sub">대여·판매를 누가 맡는지는 계약이 끝나면 여기에 적습니다.</p>
        </Card>
        <Notice tone="warn" title="체험료·기간·보증">
          {PRICE_TBD}
        </Notice>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <ButtonLink href="/request/" className="sm:px-6">
          데모 일정 요청
        </ButtonLink>
        <ButtonLink href="/" variant="secondary" className="sm:px-6">
          소개로 돌아가기
        </ButtonLink>
      </div>
    </div>
  );
}
