import {
  CORE_MISSIONS,
  MISSIONS,
  PICK_LABEL,
  REWARD_AMOUNT_LABEL,
  REWARD_RULE,
  type Pick,
} from "@/lib/domain";
import { Fragment } from "react";
import { UNDECIDED } from "@/lib/copy";
import { ButtonLink, Eyebrow, Tag, cx, delay } from "@/components/ui";
import { GiftEnvelope, HeroIllustration, MissionIcon, StepIcon, type StepArt } from "@/components/illustrations";

const WORRIES = [
  {
    quote: "유튜브랑 과제 정도인데, Pro까지 필요할까?",
    who: "맥은 처음인 새내기",
    tone: "bg-air-soft",
    mark: "text-air-ink",
  },
  {
    quote: "가벼운 게 좋을까, 화면 큰 게 좋을까?",
    who: "매일 가방을 드는 직장인",
    tone: "bg-pro-soft",
    mark: "text-pro-ink",
  },
  {
    quote: "리뷰는 다 좋다는데, 나한테는?",
    who: "리뷰 영상만 한참 본 사람",
    tone: "bg-coral-soft",
    mark: "text-coral-ink",
  },
];

// 문구는 SPEC.md '다듬기 · 소개 페이지 문구 (확정)' 그대로
const STEPS: { art: StepArt; title: string; body: string }[] = [
  {
    art: "calendar",
    title: "일정 요청",
    body: "희망 날짜와 픽업 매장만 고르면 돼요. 이름이나 전화번호는 받지 않아요.",
  },
  {
    art: "check",
    title: "두 대 준비와 결제",
    body: "운영자가 Air와 Pro를 함께 준비하면 결제를 안내해 드려요. 결제가 확인되면 예약이 확정돼요.",
  },
  {
    art: "missions",
    title: "평소처럼 쓰면서 미션",
    body: "가방에 넣고 나가 보고, 영상도 틀어 보고, 메모도 써 보세요. 더 마음에 든 쪽을 고르기만 하면 돼요.",
  },
  {
    art: "decide",
    title: "마지막 날 결정",
    body: "둘 다 돌려줘도, 한 대를 사도, 아직 못 정해도 괜찮아요. 한 대를 사기로 하면 나머지 한 대만 돌려주면 돼요. 구매는 딜러가 판매를 확인하면 확정돼요.",
  },
];

const PICKS: Pick[] = ["air", "same", "pro", "unsure"];
const pickTone: Record<Pick, string> = {
  air: "bg-air-soft text-air-ink",
  same: "bg-mute-soft text-mute-ink",
  pro: "bg-pro-soft text-pro-ink",
  unsure: "bg-surface text-mute-ink ring-1 ring-inset ring-line-strong",
};

function SectionHead({ eyebrow, title, children, className }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
      <h2 className="text-[28px] font-extrabold leading-[1.3] text-ink sm:text-[36px]">{title}</h2>
      {children ? <div className="mt-3 text-[16px] leading-[1.75] text-sub sm:text-[17px]">{children}</div> : null}
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-24 sm:space-y-32">
      {/* 히어로 */}
      <section className="grid items-center gap-8 pt-2 lg:grid-cols-[1fr_1.05fr] lg:gap-6">
        <div>
          <Eyebrow className="fade-up mb-5">
            <span>
              Try before you buy<span className="hidden sm:inline"> · MacBook Air &amp; Pro 14</span>
            </span>
          </Eyebrow>
          <h1 className="fade-up text-[40px] font-extrabold leading-[1.2] text-ink sm:text-[58px]" style={delay(1)}>
            사기 전에,
            <br />
            먼저 같이
            <br className="sm:hidden" /> 지내 봐요
          </h1>
          <p className="fade-up mt-6 max-w-md text-[17px] leading-[1.8] text-sub sm:text-[18px]" style={delay(2)}>
            맥은 처음이어도 괜찮아요. MacBook Air와 14형 Pro를 함께 빌려 평소처럼 써 보고, 마음이 가는 쪽을 천천히
            고르세요.
          </p>
          <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row" style={delay(3)}>
            <ButtonLink href="/request/" className="sm:px-7">
              데모 일정 요청
            </ButtonLink>
            <ButtonLink href="/pack/" variant="secondary" className="sm:px-7">
              비교팩 둘러보기
            </ButtonLink>
          </div>
          <p className="fade-up mt-5 text-sm text-sub" style={delay(4)}>
            이름이나 전화번호 없이 요청할 수 있어요
          </p>
        </div>
        <div className="fade-up -mx-2 sm:mx-0" style={delay(2)}>
          <HeroIllustration className="mx-auto h-auto w-full max-w-[560px]" />
        </div>
      </section>

      {/* 이런 고민 */}
      <section aria-labelledby="worry" className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-14">
        <SectionHead eyebrow="Sound familiar? · 01" title={<span id="worry">이런 고민 해 본 적 있죠?</span>}>
          스펙표만 봐서는 답이 잘 나오지 않아요. 두 대를 내 일상에서 직접 써 보면, 답은 생각보다 쉽게 나와요.
        </SectionHead>
        <ul className="grid gap-4 sm:grid-cols-3">
          {WORRIES.map((w, i) => (
            <li key={w.quote} className="fade-up flex flex-col" style={delay(i + 1)}>
              <div className={cx("relative flex-1 rounded-[28px] rounded-bl-md px-5 pt-5 pb-6", w.tone)}>
                <span aria-hidden className={cx("block h-7 font-serif text-[48px] font-bold leading-none", w.mark)}>
                  &ldquo;
                </span>
                {/* 쉼표에서 줄을 나눠 말의 호흡대로 읽히게 한다 (좁은 칸에서 '화면 큰 / 게'처럼 끊기지 않게) */}
                <p className="mt-2 font-serif text-[20px] font-bold leading-[1.55] tracking-[-0.01em] text-balance text-ink">
                  {w.quote.split(", ").map((part, i, all) => (
                    <Fragment key={part}>
                      {part}
                      {i < all.length - 1 ? (
                        <>
                          ,<br />
                        </>
                      ) : null}
                    </Fragment>
                  ))}
                </p>
              </div>
              <p className="mt-3 pl-2 text-sm font-medium text-sub">— {w.who}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 이용 흐름 */}
      <section aria-labelledby="how">
        <SectionHead eyebrow="How it works · 02" title={<span id="how">이렇게 진행돼요</span>} className="max-w-2xl">
          요청부터 결정까지, 딱 네 단계예요.
        </SectionHead>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="fade-up rounded-3xl border border-line bg-surface p-6" style={delay(i)}>
              <div className="flex items-start justify-between">
                <StepIcon art={s.art} className="h-16 w-16" />
                <span className="eyebrow tabular text-sub">Step 0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-[19px] font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.7] text-sub">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 미션 미리보기 */}
      <section aria-labelledby="missions" className="-mx-5 bg-surface px-5 py-14 sm:mx-0 sm:rounded-[40px] sm:px-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <SectionHead eyebrow="Missions · 03" title={
              <span id="missions">
                맥이 처음이어도 <br className="sm:hidden" />할 수 있는 미션 6개
              </span>
            }>
            숙제처럼 할 필요 없어요. 평소 하던 대로 써 보고 더 나았던 쪽을 고르면 끝이에요. 비슷했다면, 그것도 좋은 답이에요.
          </SectionHead>
          <div className="lg:max-w-[300px]">
            <ul className="flex flex-wrap gap-2 lg:justify-end" aria-label="답은 이 네 가지 중에서 골라요">
              {PICKS.map((p) => (
                <li key={p} className={cx("rounded-full px-3 py-1.5 text-[13px] font-bold", pickTone[p])}>
                  {PICK_LABEL[p]}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-sub lg:text-right">길게 쓸 필요 없어요. 느낀 대로 고르기만 하면 돼요.</p>
          </div>
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MISSIONS.map((m, i) => (
            <li key={m.id} className="fade-up flex gap-4 rounded-3xl bg-bg p-5" style={delay(i)}>
              <MissionIcon id={m.id} className="h-14 w-14 shrink-0" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[16px] font-bold leading-snug text-ink">
                  {m.title.replace(" (해 본 사람만)", "")}
                  {m.optional ? <Tag>선택</Tag> : null}
                </p>
                <p className="mt-1 text-sm leading-[1.65] text-sub">{m.question}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 리워드 */}
      <section
        aria-labelledby="reward"
        className="grid items-center gap-8 rounded-[40px] bg-coral-soft px-6 py-12 sm:px-12 sm:py-14 lg:grid-cols-[auto_1fr] lg:gap-14"
      >
        <GiftEnvelope className="mx-auto h-auto w-40 sm:w-52" />
        <div>
          <Eyebrow tone="coral" className="mb-3">
            A small thank-you · 04
          </Eyebrow>
          <h2 id="reward" className="text-[28px] font-extrabold leading-[1.3] text-ink sm:text-[36px]">
            미션 {CORE_MISSIONS.length}개를 마치면, 작은 리워드를 드려요
          </h2>
          <p className="mt-4 inline-flex rounded-full bg-surface px-4 py-2 text-[17px] font-extrabold text-coral-ink ring-1 ring-coral/30">
            {REWARD_AMOUNT_LABEL}
          </p>
          <p className="mt-4 max-w-2xl text-[16px] leading-[1.75] text-ink/80">{REWARD_RULE}</p>
        </div>
      </section>

      {/* 미확정 */}
      <section aria-labelledby="tbd" className="rounded-[32px] border border-warn-line bg-warn-bg px-6 py-8 sm:px-10">
        <p className="eyebrow text-warn">Not decided yet</p>
        <h2 id="tbd" className="mt-2 text-[22px] font-extrabold text-warn">
          아직 정해지지 않았어요
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {UNDECIDED.map((x) => (
            <li key={x} className="rounded-full bg-surface/80 px-3 py-1 text-sm font-semibold text-warn ring-1 ring-warn-line">
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[15px] leading-relaxed text-warn">
          모두 딜러와 계약한 뒤에 정해져요. 그 전까지는 금액을 표시하지 않아요.
        </p>
      </section>

      {/* 마무리 CTA */}
      {/* 초점 링은 기본이 잉크색이라 라이트의 잉크 판 위에서 안 보인다 — 판 위 글자색으로 바꾼다 */}
      <section className="relative overflow-hidden rounded-[40px] bg-feature px-6 py-14 text-center dark:ring-1 dark:ring-line dark:ring-inset sm:px-12 sm:py-20 [&_:focus-visible]:outline-on-feature">
        <span aria-hidden className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-coral/25 blur-2xl dark:bg-coral/20" />
        <span aria-hidden className="absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-air/25 blur-2xl dark:bg-air/15" />
        <div className="relative">
          <Eyebrow tone="feature" className="justify-center">
            Let&rsquo;s try
          </Eyebrow>
          <h2 className="mt-4 text-[28px] font-extrabold leading-[1.35] text-on-feature sm:text-[40px]">
            먼저 같이 지내 보고
            <br />
            골라도 늦지 않아요
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-on-feature/70">
            요청을 보내 주시면, 두 대를 준비한 뒤 안내해 드릴게요.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/request/" variant="light" className="sm:px-8">
              데모 일정 요청
            </ButtonLink>
            <ButtonLink href="/pack/" variant="ghostLight" className="sm:px-8">
              비교팩 보기
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
