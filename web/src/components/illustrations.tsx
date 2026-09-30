// 직접 그린 인라인 SVG 일러스트 (SPEC v2 감성 디자인).
// 선은 모두 잉크색·같은 굵기(64 기준 2px), 면은 부드러운 파스텔. Apple 로고·제품 사진은 쓰지 않는다.
// 색은 globals.css 의 --ill-* 변수에서 온다 — 다크에서는 선이 밝은 잉크, 해는 은은한 호박색 빛, 화면은 채도를 조금 낮춘다.
// (SVG 속성 fill="var(--x)" 는 브라우저마다 지원이 달라, 색은 항상 style 로 준다.)
import type { CSSProperties, ReactNode, SVGProps } from "react";
import type { DeviceKey, MissionId } from "@/lib/domain";

const v = (name: string) => `var(--ill-${name})`;
const C = {
  line: v("line"),
  paper: v("paper"),
  knockout: v("knockout"),
  air: v("air"),
  airInk: v("air-ink"),
  airSoft: v("air-soft"),
  pro: v("pro"),
  proInk: v("pro-ink"),
  proSoft: v("pro-soft"),
  coral: v("coral"),
  coralSoft: v("coral-soft"),
  amber: v("amber"),
  sun: v("sun"),
  warnSoft: v("warn-soft"),
  success: v("success"),
  successSoft: v("success-soft"),
  ivory: v("ivory"),
  track: v("track"),
  dot: v("dot"),
  airBody: v("air-body"),
  airBase: v("air-base"),
  airHinge: v("air-hinge"),
  proBody: v("pro-body"),
  proBase: v("pro-base"),
  proHinge: v("pro-hinge"),
  screenText: v("screen-text"),
  airScreen: v("air-screen"),
  proScreen: v("pro-screen"),
  sunA: v("sun-a"),
  sunB: v("sun-b"),
  sunC: v("sun-c"),
  orbit: v("orbit"),
  shadow: v("shadow"),
};

type Paint = Pick<SVGProps<SVGElement>, "strokeWidth" | "strokeLinecap" | "strokeLinejoin"> & { style: CSSProperties };

/** 색 선 (기본: 잉크 선, 면 없음). fill 을 주면 면도 칠한다. */
function st(color: string = C.line, fill = "none", width = 2): Paint {
  return { strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round", style: { stroke: color, fill } };
}

/** 잉크 선 + 면 */
const ink = (fill = "none", width = 2) => st(C.line, fill, width);

/** 면만 */
const fl = (fill: string): { style: CSSProperties } => ({ style: { fill } });

function Icon({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {children}
    </svg>
  );
}

function Sparkle({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const k = r * 0.28;
  return (
    <path
      d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`}
      {...fl(fill)}
    />
  );
}

// ───────── 히어로: 기울어진 두 노트북 + 따뜻한 해 ─────────
// 화면 문구(SPEC '다듬기'): Air "오늘은 어디로 갈까?" ↔ Pro "오늘은 어디까지 해 볼까?" — 고운바탕 Bold.
// 작은 "오늘은" 위에 큰 두 줄을 얹어, 대비되는 말(어디로 · 어디까지)이 두 화면의 같은 자리에 오게 했다.

const serif: CSSProperties = { fontFamily: "var(--font-serif)", fontWeight: 700 };

/** 화면 가운데 문구 — y 는 첫 줄("오늘은") 글자 기준선 */
function ScreenLines({ x, y, lines }: { x: number; y: number; lines: [string, string] }) {
  return (
    <g textAnchor="middle" style={{ ...serif, fill: C.screenText }}>
      <text x={x} y={y} fontSize="19" opacity="0.94">
        오늘은
      </text>
      {lines.map((l, i) => (
        <text key={l} x={x} y={y + 38 + i * 37} fontSize="30" letterSpacing="-0.3">
          {l}
        </text>
      ))}
    </g>
  );
}

/** 화면 오른쪽 아래 작은 AIR / PRO 표시 */
function ScreenMark({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="end" fontSize="9" fontWeight="700" letterSpacing="2.4" opacity="0.72" style={{ fill: C.screenText }}>
      {children}
    </text>
  );
}

export function HeroIllustration({ className }: { className?: string }) {
  const s = (fill: string) => ink(fill, 2.5);
  return (
    <svg
      viewBox="0 0 560 450"
      className={className}
      role="img"
      aria-label="따뜻한 해 앞에 기울어 놓인 노트북 두 대. 왼쪽 얇은 MacBook Air 화면에는 '오늘은 어디로 갈까?', 오른쪽 MacBook Pro 화면에는 '오늘은 어디까지 해 볼까?'라고 적혀 있어요."
    >
      <defs>
        {/* 라이트: 꽉 찬 복숭아색 해 · 다크: 가운데만 은은하게 빛나고 가장자리로 스러지는 호박색 빛 */}
        <radialGradient id="hero-sun" cx="50%" cy="45%" r="55%">
          <stop offset="0%" style={{ stopColor: C.sunA, stopOpacity: "var(--ill-sun-a-o)" }} />
          <stop offset="70%" style={{ stopColor: C.sunB, stopOpacity: "var(--ill-sun-b-o)" }} />
          <stop offset="100%" style={{ stopColor: C.sunC, stopOpacity: "var(--ill-sun-c-o)" }} />
        </radialGradient>
        <linearGradient id="hero-air" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: v("air-screen-a") }} />
          <stop offset="100%" style={{ stopColor: v("air-screen-b") }} />
        </linearGradient>
        <linearGradient id="hero-pro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: v("pro-screen-a") }} />
          <stop offset="100%" style={{ stopColor: v("pro-screen-b") }} />
        </linearGradient>
      </defs>

      {/* 해 · 궤도 */}
      <circle cx="300" cy="200" r="205" strokeWidth="1.5" strokeDasharray="1 9" strokeLinecap="round" style={{ stroke: C.orbit, fill: "none" }} />
      <circle cx="300" cy="200" r="160" fill="url(#hero-sun)" />
      <Sparkle x={86} y={96} r={13} fill={C.coral} />
      <Sparkle x={505} y={352} r={10} fill={C.air} />
      <Sparkle x={470} y={112} r={7} fill={C.amber} />
      <circle cx="120" cy="150" r="4" {...fl(C.amber)} />
      <circle cx="528" cy="250" r="3.5" opacity="0.7" {...fl(C.pro)} />

      {/* 그림자 */}
      <ellipse cx="385" cy="300" rx="150" ry="9" {...fl(C.shadow)} />
      <ellipse cx="185" cy="368" rx="140" ry="9" {...fl(C.shadow)} />

      {/* Pro — 뒤, 오른쪽으로 기울임 */}
      <g transform="rotate(5 380 230)">
        <rect x="250" y="90" width="250" height="168" rx="14" {...s(C.proBody)} />
        <rect x="262" y="102" width="226" height="144" rx="6" fill="url(#hero-pro)" />
        <rect x="362" y="101" width="26" height="8" rx="3" {...fl(C.proBody)} />
        <ScreenLines x={375} y={142} lines={["어디까지", "해 볼까?"]} />
        <ScreenMark x={475} y={237}>
          PRO
        </ScreenMark>
        <path d="M236 258H514L507 275Q505 280 499 280H251Q245 280 243 275Z" {...s(C.proBase)} />
        <path d="M352 258h46v3a3 3 0 0 1-3 3h-40a3 3 0 0 1-3-3Z" {...fl(C.proHinge)} />
      </g>

      {/* Air — 앞, 왼쪽으로 기울임 · 얇게 */}
      <g transform="rotate(-7 190 285)">
        <rect x="60" y="182" width="236" height="150" rx="13" {...s(C.airBody)} />
        <rect x="70" y="192" width="216" height="130" rx="6" fill="url(#hero-air)" />
        <ScreenLines x={178} y={224} lines={["어디로", "갈까?"]} />
        <ScreenMark x={273} y={313}>
          AIR
        </ScreenMark>
        <path d="M46 334H310L305 341Q303 344 298 344H58Q53 344 51 341Z" {...s(C.airBase)} />
        <path d="M160 334h36v2a2 2 0 0 1-2 2h-32a2 2 0 0 1-2-2Z" {...fl(C.airHinge)} />
      </g>

      {/* 이름표 */}
      <g>
        <rect x="46" y="392" width="126" height="32" rx="16" {...ink(C.airSoft, 1.5)} />
        <text x="109" y="413" textAnchor="middle" fontSize="14" fontWeight="700" {...fl(C.airInk)}>
          MacBook Air
        </text>
      </g>
      <g>
        <rect x="392" y="36" width="150" height="32" rx="16" {...ink(C.proSoft, 1.5)} />
        <text x="467" y="57" textAnchor="middle" fontSize="14" fontWeight="700" {...fl(C.proInk)}>
          MacBook Pro 14형
        </text>
      </g>
    </svg>
  );
}

// ───────── 작은 노트북 (비교팩 머리) — 히어로 화면 문구의 큰 두 줄만 ─────────

export function LaptopMini({ kind, className }: { kind: DeviceKey; className?: string }) {
  const air = kind === "air";
  return (
    <svg viewBox="0 0 120 84" className={className} aria-hidden focusable="false">
      <rect x="16" y="8" width="88" height="58" rx="6" {...ink(air ? C.airBody : C.proBody)} />
      <rect x="21" y="13" width="78" height="48" rx="3" {...fl(air ? C.airScreen : C.proScreen)} />
      {!air ? <rect x="54" y="12.5" width="12" height="4" rx="1.5" {...fl(C.proBody)} /> : null}
      <g textAnchor="middle" fontSize="14" style={{ ...serif, fill: C.screenText }}>
        <text x="60" y="34">{air ? "어디로" : "어디까지"}</text>
        <text x="60" y="51">{air ? "갈까?" : "해 볼까?"}</text>
      </g>
      {air ? (
        <path d="M6 68h108l-3 4.5a2 2 0 0 1-1.7 1H10.7a2 2 0 0 1-1.7-1Z" {...ink(C.airBase)} />
      ) : (
        <path d="M5 67h110l-3.5 7a2 2 0 0 1-1.8 1.1H10.3A2 2 0 0 1 8.5 74Z" {...ink(C.proBase)} />
      )}
    </svg>
  );
}

// ───────── 미션 장면 아이콘 6개 ─────────

const MISSION_ART: Record<MissionId, ReactNode> = {
  // 가방 — 노트북이 살짝 보이는 토트백
  carry: (
    <>
      <path d="M17 27v-6a15 13 0 0 1 30 0v6" {...ink()} />
      <rect x="21" y="9" width="22" height="20" rx="2.5" {...ink(C.airSoft)} />
      <path d="M28 13.5h8" {...st(C.air)} />
      <path d="M11 27h42l-3.2 25.3A4 4 0 0 1 45.8 56H18.2a4 4 0 0 1-4-3.7Z" {...ink(C.coralSoft)} />
      <path d="M19 37h26" {...st(C.coral)} strokeDasharray="0.5 5" />
    </>
  ),
  // 재생 화면
  video: (
    <>
      <rect x="7" y="11" width="50" height="34" rx="5" {...ink(C.proSoft)} />
      <path d="M28 20.5v13.5l11.5-6.75Z" {...ink(C.coral)} />
      <path d="M14 39.5h36" {...st(C.track)} />
      <path d="M14 39.5h14" {...st(C.pro)} />
      <path d="M32 45v7M22 53h20" {...ink()} />
    </>
  ),
  // 해와 달
  screen: (
    <>
      <circle cx="23" cy="24" r="9" {...ink(C.sun)} />
      <path d="M23 8.5v3M23 36.5v3M7.5 24h3M11.8 12.8l2.1 2.1M34.2 12.8l-2.1 2.1M11.8 35.2l2.1-2.1" {...ink()} />
      <path d="M48.5 30.5A12 12 0 1 0 55 49a10 10 0 0 1-6.5-18.5Z" {...ink(C.proSoft)} />
      <Sparkle x={52} y={18} r={4} fill={C.amber} />
      <circle cx="40" cy="57" r="1.6" {...fl(C.pro)} />
    </>
  ),
  // 키보드 + 메모
  typing: (
    <>
      <rect x="17" y="5" width="30" height="15" rx="3" {...ink(C.coralSoft)} />
      <path d="M22 10.5h20M22 15h11" {...st(C.coral)} />
      <rect x="6" y="25" width="52" height="28" rx="6" {...ink(C.paper)} />
      {[13.5, 21, 28.5, 36, 43.5, 51].map((x) => (
        <circle key={`a${x}`} cx={x} cy="32.5" r="1.7" {...fl(C.line)} />
      ))}
      {[17, 24.5, 32, 39.5, 47].map((x) => (
        <circle key={`b${x}`} cx={x} cy="39" r="1.7" {...fl(C.line)} />
      ))}
      <path d="M21 46h22" {...ink()} />
    </>
  ),
  // 폰 → 노트북
  daily: (
    <>
      <rect x="5" y="13" width="18" height="32" rx="4" {...ink(C.coralSoft)} />
      <path d="M11.5 39.5h5" {...ink()} />
      <path d="M26.5 29h8.5M31.5 25l4 4-4 4" {...ink()} />
      <rect x="39" y="18" width="21" height="15" rx="2.5" {...ink(C.airSoft)} />
      <path d="M36 37h27l-1.6 3.2a2 2 0 0 1-1.8 1.1H39.4a2 2 0 0 1-1.8-1.1Z" {...ink(C.ivory)} />
      <path d="M45 25.5l2.2 2.2 4.6-4.6" {...st(C.air)} />
      <circle cx="14" cy="52" r="1.6" {...fl(C.coral)} />
    </>
  ),
  // 게이지
  heavy: (
    <>
      <path d="M8 46a24 24 0 0 1 48 0Z" {...ink(C.warnSoft)} />
      <path d="M16.06 44.61A16 16 0 0 1 22.82 32.89" {...st(C.air, "none", 4)} />
      <path d="M25.24 31.5A16 16 0 0 1 38.76 31.5" {...st(C.amber, "none", 4)} />
      <path d="M41.18 32.89A16 16 0 0 1 47.94 44.61" {...st(C.coral, "none", 4)} />
      <path d="M32 46l9-9.5" {...ink("none", 2.5)} />
      <circle cx="32" cy="46" r="3.5" {...fl(C.line)} />
      <path d="M6 52h52" {...ink()} />
    </>
  ),
};

export function MissionIcon({ id, className }: { id: MissionId; className?: string }) {
  return <Icon className={className}>{MISSION_ART[id]}</Icon>;
}

// ───────── 이용 흐름 4단계 ─────────

export type StepArt = "calendar" | "check" | "missions" | "decide";

const STEP_ART: Record<StepArt, ReactNode> = {
  calendar: (
    <>
      <rect x="9" y="14" width="46" height="42" rx="6" {...ink(C.paper)} />
      <path d="M9 20a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v5H9Z" {...ink(C.coralSoft)} />
      <path d="M21 9v9M43 9v9" {...ink()} />
      {[18, 27, 36, 45].flatMap((x) =>
        [33, 41, 49].map((y) => (x === 36 && y === 41 ? null : <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" {...fl(C.dot)} />)),
      )}
      <circle cx="36" cy="41" r="5.5" {...fl(C.line)} />
      <path d="M33.8 41l1.5 1.5 3-3" {...st(C.knockout, "none", 1.8)} />
    </>
  ),
  check: (
    <>
      <rect x="5" y="24" width="24" height="16" rx="2.5" {...ink(C.airSoft)} />
      <path d="M2 44h30" {...ink()} />
      <rect x="35" y="24" width="24" height="16" rx="2.5" {...ink(C.proSoft)} />
      <path d="M32 44h30" {...ink()} />
      <circle cx="32" cy="14" r="8" {...ink(C.successSoft)} />
      <path d="M28.5 14l2.5 2.5 4.5-4.5" {...st(C.success)} />
      <rect x="21" y="49" width="22" height="9" rx="3" {...ink(C.warnSoft)} />
    </>
  ),
  missions: (
    <>
      <rect x="13" y="10" width="38" height="47" rx="6" {...ink(C.paper)} />
      <rect x="24" y="6" width="16" height="8" rx="3" {...ink(C.coralSoft)} />
      {[25, 35].map((y) => (
        <g key={y}>
          <circle cx="22.5" cy={y} r="3.6" {...fl(C.coral)} />
          <path d={`M20.8 ${y}l1.3 1.3 2.6-2.6`} {...st(C.knockout, "none", 1.6)} />
          <path d={`M30 ${y}h13`} {...ink()} />
        </g>
      ))}
      <circle cx="22.5" cy="45" r="3.6" {...ink(C.paper)} />
      <path d="M30 45h9" {...ink()} />
      <Sparkle x={54} y={12} r={5} fill={C.amber} />
    </>
  ),
  decide: (
    <>
      <path d="M32 8v48" {...ink()} />
      <path d="M30 15H13l-5.5 5.5L13 26h17Z" {...ink(C.airSoft)} />
      <path d="M34 29h17l5.5 5.5L51 40H34Z" {...ink(C.proSoft)} />
      <path d="M21 56h22" {...ink()} />
      <circle cx="46" cy="14" r="2" {...fl(C.coral)} />
    </>
  ),
};

export function StepIcon({ art, className }: { art: StepArt; className?: string }) {
  return <Icon className={className}>{STEP_ART[art]}</Icon>;
}

// ───────── 리워드: 작은 선물 봉투 ─────────

export function GiftEnvelope({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 80" fill="none" className={className} aria-hidden focusable="false">
      <rect x="22" y="10" width="52" height="34" rx="4" {...ink(C.paper)} />
      <path d="M31 19h26M31 26h15" {...st(C.coral)} />
      <rect x="10" y="28" width="76" height="45" rx="6" {...ink(C.coralSoft)} />
      <path d="M11 32l37 23 37-23" {...ink()} />
      <circle cx="48" cy="55" r="8" {...ink(C.coral)} />
      <path
        d="M48 59.2c-2.9-1.9-4.3-3.5-4.3-5.1a2.2 2.2 0 0 1 4.3-.7 2.2 2.2 0 0 1 4.3.7c0 1.6-1.4 3.2-4.3 5.1Z"
        {...fl(C.knockout)}
      />
      <Sparkle x={86} y={12} r={6} fill={C.amber} />
      <Sparkle x={9} y={16} r={4} fill={C.coral} />
    </svg>
  );
}

// ───────── 히어로 아래 신뢰 한 줄: 작은 아이콘 3개 (32 기준 선 1.6) ─────────

export type TrustArt = "sameDay" | "experience" | "local";

const tk = (fill = "none") => st(C.line, fill, 1.6);

const TRUST_ART: Record<TrustArt, ReactNode> = {
  // 두 대를 같은 하루에 — 해 하나 아래 나란히 놓인 Air(청록)·Pro(보라) 화면
  sameDay: (
    <>
      <circle cx="16" cy="7" r="3.4" {...fl(C.amber)} />
      <rect x="3" y="13" width="11.5" height="8.5" rx="1.6" {...tk(C.airSoft)} />
      <path d="M1.6 24.5h14.3" {...tk()} />
      <rect x="17.5" y="13" width="11.5" height="8.5" rx="1.6" {...tk(C.proSoft)} />
      <path d="M16.1 24.5h14.3" {...tk()} />
    </>
  ),
  // 스펙보다 내 경험 — 말풍선 속 작은 하트(느낀 대로)
  experience: (
    <>
      <path d="M7 6h18a3.5 3.5 0 0 1 3.5 3.5v10A3.5 3.5 0 0 1 25 23h-9.5L10 27.5V23H7a3.5 3.5 0 0 1-3.5-3.5v-10A3.5 3.5 0 0 1 7 6Z" {...tk(C.coralSoft)} />
      <path d="M16 19c-2.7-1.8-4-3.3-4-4.9a2.1 2.1 0 0 1 4-.7 2.1 2.1 0 0 1 4 .7c0 1.6-1.3 3.1-4 4.9Z" {...fl(C.coral)} />
    </>
  ),
  // 기록은 이 기기에만 — 자물쇠
  local: (
    <>
      <path d="M11 14.5V11a5 5 0 0 1 10 0v3.5" {...tk()} />
      <rect x="7" y="14.5" width="18" height="13" rx="3" {...tk(C.warnSoft)} />
      <circle cx="16" cy="20" r="1.7" {...fl(C.line)} />
      <path d="M16 21v2.6" {...tk()} />
    </>
  ),
};

export function TrustIcon({ art, className }: { art: TrustArt; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden focusable="false">
      {TRUST_ART[art]}
    </svg>
  );
}
