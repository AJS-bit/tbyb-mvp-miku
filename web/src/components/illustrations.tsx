// 직접 그린 인라인 SVG 일러스트 (SPEC v2 감성 디자인).
// 선은 모두 잉크색·같은 굵기(64 기준 2px), 면은 부드러운 파스텔. Apple 로고·제품 사진은 쓰지 않는다.
import type { ReactNode } from "react";
import type { DeviceKey, MissionId } from "@/lib/domain";

const INK = "#1F1B16";
const C = {
  airSoft: "#E3F4F0",
  air: "#1E9E8A",
  proSoft: "#EEEAFF",
  pro: "#6D4AFF",
  coral: "#FF6B4A",
  coralSoft: "#FFEDE7",
  sun: "#FFD9AE",
  amber: "#F5B35C",
  warnSoft: "#FFF4E0",
  successSoft: "#E8F7EE",
  success: "#067647",
  ivory: "#FAF6EF",
  starlight: "#EDE7DD",
  starlightBase: "#F4EFE7",
  space: "#3A342D",
  spaceBase: "#4B443B",
};

const stroke = { stroke: INK, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

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
  return <path d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`} fill={fill} />;
}

// ───────── 히어로: 기울어진 두 노트북 + 따뜻한 해 ─────────

export function HeroIllustration({ className }: { className?: string }) {
  const s = { ...stroke, strokeWidth: 2.5 };
  return (
    <svg
      viewBox="0 0 560 450"
      className={className}
      role="img"
      aria-label="따뜻한 해 앞에 기울어 놓인 두 노트북. 얇은 Air 화면에는 '가볍게', Pro 화면에는 '끝까지'라고 적혀 있다."
    >
      <defs>
        <radialGradient id="hero-sun" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFE3C0" />
          <stop offset="70%" stopColor="#FFD9AE" />
          <stop offset="100%" stopColor="#FFCF9C" />
        </radialGradient>
        <linearGradient id="hero-air" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3DBBA4" />
          <stop offset="100%" stopColor="#1A8F7C" />
        </linearGradient>
        <linearGradient id="hero-pro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8466FF" />
          <stop offset="100%" stopColor="#5A36F0" />
        </linearGradient>
      </defs>

      {/* 해 · 궤도 */}
      <circle cx="300" cy="200" r="205" fill="none" stroke="#E7D8C4" strokeWidth="1.5" strokeDasharray="1 9" strokeLinecap="round" />
      <circle cx="300" cy="200" r="160" fill="url(#hero-sun)" />
      <Sparkle x={86} y={96} r={13} fill={C.coral} />
      <Sparkle x={505} y={352} r={10} fill={C.air} />
      <Sparkle x={470} y={112} r={7} fill={C.amber} />
      <circle cx="120" cy="150" r="4" fill={C.amber} />
      <circle cx="528" cy="250" r="3.5" fill={C.pro} opacity="0.7" />

      {/* 그림자 */}
      <ellipse cx="385" cy="300" rx="150" ry="9" fill={INK} opacity="0.07" />
      <ellipse cx="185" cy="368" rx="140" ry="9" fill={INK} opacity="0.08" />

      {/* Pro — 뒤, 오른쪽으로 기울임 */}
      <g transform="rotate(5 380 230)">
        <rect x="250" y="90" width="250" height="168" rx="14" fill={C.space} {...s} />
        <rect x="262" y="102" width="226" height="144" rx="6" fill="url(#hero-pro)" />
        <rect x="362" y="101" width="26" height="8" rx="3" fill={C.space} />
        <text x="375" y="182" textAnchor="middle" fontSize="40" fontWeight="800" fill="#fff" letterSpacing="-1">
          끝까지
        </text>
        <rect x="316" y="202" width="118" height="7" rx="3.5" fill="#fff" opacity="0.28" />
        <rect x="316" y="202" width="118" height="7" rx="3.5" fill="#fff" opacity="0.85" />
        <path d="M236 258H514L507 275Q505 280 499 280H251Q245 280 243 275Z" fill={C.spaceBase} {...s} />
        <path d="M352 258h46v3a3 3 0 0 1-3 3h-40a3 3 0 0 1-3-3Z" fill="#2A251F" />
      </g>

      {/* Air — 앞, 왼쪽으로 기울임 · 얇게 */}
      <g transform="rotate(-7 190 285)">
        <rect x="60" y="182" width="236" height="150" rx="13" fill={C.starlight} {...s} />
        <rect x="70" y="192" width="216" height="130" rx="6" fill="url(#hero-air)" />
        <path d="M150 238C160 222 184 214 200 216C194 230 176 240 150 238Z" fill="#fff" opacity="0.9" />
        <path d="M150 238L186 222" stroke={C.air} strokeWidth="2" strokeLinecap="round" />
        <text x="178" y="286" textAnchor="middle" fontSize="36" fontWeight="800" fill="#fff" letterSpacing="-1">
          가볍게
        </text>
        <path d="M46 334H310L305 341Q303 344 298 344H58Q53 344 51 341Z" fill={C.starlightBase} {...s} />
        <path d="M160 334h36v2a2 2 0 0 1-2 2h-32a2 2 0 0 1-2-2Z" fill="#D8CFC1" />
      </g>

      {/* 이름표 */}
      <g>
        <rect x="46" y="392" width="126" height="32" rx="16" fill={C.airSoft} stroke={INK} strokeWidth="1.5" />
        <text x="109" y="413" textAnchor="middle" fontSize="14" fontWeight="700" fill="#13786A">
          MacBook Air
        </text>
      </g>
      <g>
        <rect x="392" y="36" width="150" height="32" rx="16" fill={C.proSoft} stroke={INK} strokeWidth="1.5" />
        <text x="467" y="57" textAnchor="middle" fontSize="14" fontWeight="700" fill="#5635E0">
          MacBook Pro 14형
        </text>
      </g>
    </svg>
  );
}

// ───────── 작은 노트북 (비교팩 머리) ─────────

export function LaptopMini({ kind, className }: { kind: DeviceKey; className?: string }) {
  const air = kind === "air";
  return (
    <svg viewBox="0 0 120 84" className={className} aria-hidden focusable="false">
      <rect x="16" y="8" width="88" height="58" rx="6" fill={air ? C.starlight : C.space} {...stroke} />
      <rect x="21" y="13" width="78" height="48" rx="3" fill={air ? C.air : C.pro} />
      {!air ? <rect x="54" y="12.5" width="12" height="4" rx="1.5" fill={C.space} /> : null}
      <text x="60" y="43" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">
        {air ? "가볍게" : "끝까지"}
      </text>
      {air ? (
        <path d="M6 68h108l-3 4.5a2 2 0 0 1-1.7 1H10.7a2 2 0 0 1-1.7-1Z" fill={C.starlightBase} {...stroke} />
      ) : (
        <path d="M5 67h110l-3.5 7a2 2 0 0 1-1.8 1.1H10.3A2 2 0 0 1 8.5 74Z" fill={C.spaceBase} {...stroke} />
      )}
    </svg>
  );
}

// ───────── 미션 장면 아이콘 6개 ─────────

const MISSION_ART: Record<MissionId, ReactNode> = {
  // 가방 — 노트북이 살짝 보이는 토트백
  carry: (
    <>
      <path d="M17 27v-6a15 13 0 0 1 30 0v6" {...stroke} />
      <rect x="22" y="9" width="22" height="20" rx="2.5" fill={C.airSoft} {...stroke} transform="rotate(-7 33 19)" />
      <path d="M29.5 13.5h8" stroke={C.air} strokeWidth="2" strokeLinecap="round" transform="rotate(-7 33 19)" />
      <path d="M11 27h42l-3.2 25.3A4 4 0 0 1 45.8 56H18.2a4 4 0 0 1-4-3.7Z" fill={C.coralSoft} {...stroke} />
      <path d="M19 37h26" stroke={C.coral} strokeWidth="2" strokeLinecap="round" strokeDasharray="0.5 5" />
    </>
  ),
  // 재생 화면
  video: (
    <>
      <rect x="7" y="11" width="50" height="34" rx="5" fill={C.proSoft} {...stroke} />
      <path d="M28 20.5v13.5l11.5-6.75Z" fill={C.coral} {...stroke} />
      <path d="M14 39.5h36" stroke={INK} strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 39.5h14" stroke={C.pro} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 45v7M22 53h20" {...stroke} />
    </>
  ),
  // 해와 달
  screen: (
    <>
      <circle cx="23" cy="24" r="9" fill={C.sun} {...stroke} />
      <path d="M23 8.5v3M23 36.5v3M7.5 24h3M11.8 12.8l2.1 2.1M34.2 12.8l-2.1 2.1M11.8 35.2l2.1-2.1" {...stroke} />
      <path d="M48.5 30.5A12 12 0 1 0 55 49a10 10 0 0 1-6.5-18.5Z" fill={C.proSoft} {...stroke} />
      <Sparkle x={52} y={18} r={4} fill={C.amber} />
      <circle cx="40" cy="57" r="1.6" fill={C.pro} />
    </>
  ),
  // 키보드 + 메모
  typing: (
    <>
      <rect x="17" y="5" width="30" height="15" rx="3" fill={C.coralSoft} {...stroke} />
      <path d="M22 10.5h20M22 15h11" stroke={C.coral} strokeWidth="2" strokeLinecap="round" />
      <rect x="6" y="25" width="52" height="28" rx="6" fill="#fff" {...stroke} />
      {[13.5, 21, 28.5, 36, 43.5, 51].map((x) => (
        <circle key={`a${x}`} cx={x} cy="32.5" r="1.7" fill={INK} />
      ))}
      {[17, 24.5, 32, 39.5, 47].map((x) => (
        <circle key={`b${x}`} cx={x} cy="39" r="1.7" fill={INK} />
      ))}
      <path d="M21 46h22" {...stroke} />
    </>
  ),
  // 폰 → 노트북
  daily: (
    <>
      <rect x="5" y="13" width="18" height="32" rx="4" fill={C.coralSoft} {...stroke} />
      <path d="M11.5 39.5h5" {...stroke} />
      <path d="M26.5 29h8.5M31.5 25l4 4-4 4" {...stroke} />
      <rect x="39" y="18" width="21" height="15" rx="2.5" fill={C.airSoft} {...stroke} />
      <path d="M36 37h27l-1.6 3.2a2 2 0 0 1-1.8 1.1H39.4a2 2 0 0 1-1.8-1.1Z" fill={C.ivory} {...stroke} />
      <path d="M45 25.5l2.2 2.2 4.6-4.6" stroke={C.air} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="52" r="1.6" fill={C.coral} />
    </>
  ),
  // 게이지
  heavy: (
    <>
      <path d="M8 46a24 24 0 0 1 48 0Z" fill={C.warnSoft} {...stroke} />
      <path d="M16.06 44.61A16 16 0 0 1 22.82 32.89" stroke={C.air} strokeWidth="4" strokeLinecap="round" />
      <path d="M25.24 31.5A16 16 0 0 1 38.76 31.5" stroke={C.amber} strokeWidth="4" strokeLinecap="round" />
      <path d="M41.18 32.89A16 16 0 0 1 47.94 44.61" stroke={C.coral} strokeWidth="4" strokeLinecap="round" />
      <path d="M32 46l9-9.5" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="46" r="3.5" fill={INK} />
      <path d="M6 52h52" {...stroke} />
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
      <rect x="9" y="14" width="46" height="42" rx="6" fill="#fff" {...stroke} />
      <path d="M9 20a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v5H9Z" fill={C.coralSoft} {...stroke} />
      <path d="M21 9v9M43 9v9" {...stroke} />
      {[18, 27, 36, 45].flatMap((x) =>
        [33, 41, 49].map((y) =>
          x === 36 && y === 41 ? null : <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" fill={INK} opacity="0.3" />,
        ),
      )}
      <circle cx="36" cy="41" r="5.5" fill={INK} />
      <path d="M33.8 41l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  check: (
    <>
      <rect x="5" y="24" width="24" height="16" rx="2.5" fill={C.airSoft} {...stroke} />
      <path d="M2 44h30" {...stroke} />
      <rect x="35" y="24" width="24" height="16" rx="2.5" fill={C.proSoft} {...stroke} />
      <path d="M32 44h30" {...stroke} />
      <circle cx="32" cy="14" r="8" fill={C.successSoft} {...stroke} />
      <path d="M28.5 14l2.5 2.5 4.5-4.5" stroke={C.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="21" y="49" width="22" height="9" rx="3" fill={C.warnSoft} {...stroke} />
    </>
  ),
  missions: (
    <>
      <rect x="13" y="10" width="38" height="47" rx="6" fill="#fff" {...stroke} />
      <rect x="24" y="6" width="16" height="8" rx="3" fill={C.coralSoft} {...stroke} />
      {[25, 35].map((y) => (
        <g key={y}>
          <circle cx="22.5" cy={y} r="3.6" fill={C.coral} />
          <path d={`M20.8 ${y}l1.3 1.3 2.6-2.6`} stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M30 ${y}h13`} {...stroke} />
        </g>
      ))}
      <circle cx="22.5" cy="45" r="3.6" fill="#fff" {...stroke} />
      <path d="M30 45h9" {...stroke} />
      <Sparkle x={54} y={12} r={5} fill={C.amber} />
    </>
  ),
  decide: (
    <>
      <path d="M32 8v48" {...stroke} />
      <path d="M30 15H13l-5.5 5.5L13 26h17Z" fill={C.airSoft} {...stroke} />
      <path d="M34 29h17l5.5 5.5L51 40H34Z" fill={C.proSoft} {...stroke} />
      <path d="M21 56h22" {...stroke} />
      <circle cx="46" cy="14" r="2" fill={C.coral} />
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
      <rect x="22" y="10" width="52" height="34" rx="4" fill="#fff" {...stroke} />
      <path d="M31 19h26M31 26h15" stroke={C.coral} strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="28" width="76" height="45" rx="6" fill={C.coralSoft} {...stroke} />
      <path d="M11 32l37 23 37-23" {...stroke} />
      <circle cx="48" cy="55" r="8" fill={C.coral} {...stroke} />
      <path
        d="M48 59.2c-2.9-1.9-4.3-3.5-4.3-5.1a2.2 2.2 0 0 1 4.3-.7 2.2 2.2 0 0 1 4.3.7c0 1.6-1.4 3.2-4.3 5.1Z"
        fill="#fff"
      />
      <Sparkle x={86} y={12} r={6} fill={C.amber} />
      <Sparkle x={9} y={16} r={4} fill={C.coral} />
    </svg>
  );
}
