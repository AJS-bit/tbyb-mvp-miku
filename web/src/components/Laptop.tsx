"use client";

// MacBook Air · Pro 14형 일러스트 — TETO 투시 보정판(tbyb-mvp-teto 11ec0a6 `public/visuals.mjs` laptop())을 React 로 옮긴 것.
// 도형은 laptop-geometry.ts 가 TETO 와 같은 계산으로 만들고, 색은 globals.css 의 `.laptop` 변수(TETO identity.css 값,
// 다크는 :root[data-theme="dark"] .laptop)에서 온다. 화면 속 글자만 웹 문구(SPEC 확정, 고운바탕 Bold)로 바꿨다.
//
// - 키보드는 `.device-keyboard` 그룹. 예전 `.keyboard` 사다리꼴 clip-path 를 절대 씌우지 않는다(투시가 두 번 잘림 — TETO DESIGN_V8).
// - 색은 SVG 속성 안 var() 대신 style 로 준다(브라우저마다 지원이 다름 — illustrations.tsx 와 같은 규칙).
// - 클라이언트 컴포넌트인 까닭: Pro 스피커 구멍 경로(수백 KB)를 정적 HTML·RSC 데이터에 싣지 않고 브라우저에서 만든다.
//   첫 화면(하이드레이션 전)에는 그릴 면만 보이고, 하이드레이션 뒤 같은 평면 위 구멍 4,224개가 채워진다.
import { useId, type ReactNode, type SVGProps } from "react";
import {
  SPEAKER_COLUMNS,
  SPEAKER_ROWS,
  SPEAKER_SIDES,
  VIEW_BOX,
  laptopGeometry,
  speakerField,
  speakerPerforations,
  surfaceCircle,
  surfacePath,
  surfaceRect,
  surfaceTextTransform,
  type DeviceType,
  type Plane,
  type SurfaceCommand,
} from "./laptop-geometry";

export type { DeviceType } from "./laptop-geometry";

/** 화면 문구 — full: 히어로("오늘은" + 큰 두 줄 + AIR/PRO) · lines: 비교팩 머리(큰 두 줄만) */
export type ScreenCopy = "full" | "lines";

const COPY: Record<DeviceType, { lines: [string, string]; mark: string }> = {
  air: { lines: ["어디로", "갈까?"], mark: "AIR" },
  pro: { lines: ["어디까지", "해 볼까?"], mark: "PRO" },
};

const fill = (name: string) => ({ style: { fill: `var(${name})` } });

function SurfaceText({ plane, x, y, className, children }: { plane: Plane; x: number; y: number; className: string; children: ReactNode }) {
  return (
    <text className={className} transform={surfaceTextTransform(plane, x, y)}>
      {children}
    </text>
  );
}

/** 화면 장면 — 배경 도형은 TETO 그대로(물결·해·작업 막대), 글자는 웹 문구 */
function Scene({ type, copy }: { type: DeviceType; copy: ScreenCopy }) {
  const { screen } = laptopGeometry(type);
  const shape = (commands: SurfaceCommand[], name: string) => <path d={surfacePath(screen, commands)} {...fill(name)} />;
  const { lines, mark } = COPY[type];
  // 글자 자리(장면 좌표 x 28–292 · y 16–174). Air 물결은 왼쪽에서 y≈110, Pro 물결은 y≈100 근처에서 시작하므로 그 위에 둔다.
  const text =
    copy === "full"
      ? type === "air"
        ? { x: 51, small: 47, big: [81, 114] }
        : { x: 47, small: 39, big: [69, 98] }
      : type === "air"
        ? { x: 51, small: null, big: [72, 110] }
        : { x: 47, small: null, big: [58, 90] };
  return (
    <>
      {type === "air" ? (
        <>
          {shape([["M", 28, 132], ["C", 92, 78, 158, 155, 292, 75], ["L", 292, 174], ["L", 28, 174], ["Z"]], "--screen-wave")}
          {shape([["M", 28, 149], ["C", 117, 129, 190, 188, 292, 116], ["L", 292, 174], ["L", 28, 174], ["Z"]], "--screen-wave-back")}
          <path d={surfaceCircle(screen, 245, 50, 20)} {...fill("--screen-sun")} />
        </>
      ) : (
        <>
          <path d={surfaceCircle(screen, 257, 66, 59)} {...fill("--screen-sun")} />
          {shape([["M", 26, 123], ["C", 103, 58, 177, 159, 294, 98], ["L", 294, 176], ["L", 26, 176], ["Z"]], "--screen-wave")}
          {shape([["M", 26, 149], ["C", 112, 112, 189, 168, 294, 123], ["L", 294, 176], ["L", 26, 176], ["Z"]], "--screen-wave-back")}
          <g className="screen-tracks">
            {[184, 143, 161].map((width, i) => (
              <path key={width} d={surfaceRect(screen, 46, 137 + i * 8, width, 4, 2)} />
            ))}
          </g>
        </>
      )}
      {text.small !== null ? (
        <SurfaceText plane={screen} x={text.x + 1} y={text.small} className="screen-lead">
          오늘은
        </SurfaceText>
      ) : null}
      {lines.map((line, i) => (
        <SurfaceText key={line} plane={screen} x={text.x} y={text.big[i]} className={copy === "full" ? "screen-verse" : "screen-verse screen-verse-lg"}>
          {line}
        </SurfaceText>
      ))}
      {copy === "full" ? (
        <SurfaceText plane={screen} x={281} y={166} className="screen-caption">
          {mark}
        </SurfaceText>
      ) : null}
    </>
  );
}

type LaptopProps = { type: DeviceType; copy?: ScreenCopy } & Omit<SVGProps<SVGSVGElement>, "viewBox" | "type" | "children">;

/**
 * 노트북 한 대 (viewBox 0 0 360 287). 혼자 쓰면 className 으로 크기를, 다른 SVG 안에 넣으면 x·y·width·height 를 준다.
 * 그림은 장식이라 aria-hidden — 설명은 감싸는 쪽(히어로 SVG 의 aria-label, 비교팩 카드 글자)이 맡는다.
 */
export function Laptop({ type, copy = "full", className, ...rest }: LaptopProps) {
  const g = laptopGeometry(type);
  // useId 는 «r0» 같은 글자를 쓸 수 있어 url(#…) 참조에 안전한 글자만 남긴다
  const id = `device-${type}-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const kb = g.keyboard;
  return (
    <svg
      viewBox={VIEW_BOX}
      fill="none"
      className={["laptop", type, className].filter(Boolean).join(" ")}
      data-device={type}
      aria-hidden
      focusable="false"
      {...rest}
    >
      <defs>
        <linearGradient id={`${id}-deck`} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop style={{ stopColor: "var(--device-deck-top)" }} />
          <stop offset="1" style={{ stopColor: "var(--device-deck)" }} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop style={{ stopColor: "var(--device-rim)" }} />
          <stop offset="1" style={{ stopColor: "var(--device-edge)" }} />
        </linearGradient>
        <clipPath id={`${id}-screen`}>
          <path d={g.screenArea} />
        </clipPath>
      </defs>
      <path className="display-shell" d={g.shell} strokeWidth="1.4" style={{ fill: "var(--device-shell)", stroke: "var(--device-edge)" }} />
      <g clipPath={`url(#${id}-screen)`}>
        <path d={g.screenArea} {...fill("--screen-paper")} />
        <Scene type={type} copy={copy} />
      </g>
      <path className="camera-notch" d={g.notch} {...fill("--device-shell")} />
      <path d={g.camera} style={{ fill: "#14202c" }} />
      <path d={g.cameraGlint} style={{ fill: "#54778a" }} />
      <path d={g.bezelLine} strokeWidth=".7" style={{ stroke: "var(--device-bezel-line)" }} />
      <path className="device-rim" d={g.rim} style={{ fill: `url(#${id}-rim)` }} />
      <path className="device-deck" d={g.deck} strokeWidth=".75" style={{ fill: `url(#${id}-deck)`, stroke: "var(--device-edge)" }} />
      <path className="device-hinge" d={g.hinge} {...fill("--device-hinge")} />
      {/* .device-keyboard — HTML 용 .keyboard 자르기 스타일이 닿지 않는 전용 클래스 */}
      <g className="device-keyboard">
        {kb.well ? <path className="keyboard-well" d={kb.well} /> : null}
        {kb.keys.map((k, i) => (
          <path key={i} className={k.kind === "arrow-key" ? "keycap arrow-key" : k.kind} d={k.d} />
        ))}
        <g className="key-legends">
          {kb.legends.map((l, i) => (
            <text key={i} className={l.modifier ? "key-modifier" : undefined} transform={l.transform}>
              {l.text}
            </text>
          ))}
        </g>
      </g>
      {type === "pro" ? (
        <g className="speaker-grilles">
          {SPEAKER_SIDES.map((side) => (
            <g key={side} className={`speaker-grille ${side}`} data-rows={SPEAKER_ROWS} data-columns={SPEAKER_COLUMNS}>
              <path className="speaker-field" d={speakerField(side)} />
              <path
                className="speaker-perforations"
                ref={(el) => {
                  if (el && !el.hasAttribute("d")) el.setAttribute("d", speakerPerforations(side));
                }}
              />
            </g>
          ))}
        </g>
      ) : null}
      <path className="device-trackpad" d={g.trackpad} strokeWidth=".65" style={{ fill: "var(--device-trackpad)", stroke: "var(--device-trackpad-edge)" }} />
      <path className="opening-recess" d={g.recess} {...fill("--device-recess")} />
      <path d={g.recessLine} strokeWidth=".6" strokeLinecap="round" style={{ stroke: "var(--device-deck-top)" }} />
    </svg>
  );
}
