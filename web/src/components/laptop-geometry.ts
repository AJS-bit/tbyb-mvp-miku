// MacBook Air · Pro 일러스트의 SVG 도형 — TETO `public/visuals.mjs` 의 laptop()(tbyb-mvp-teto 11ec0a6, 투시 보정판)을
// 타입 있는 순수 함수로 옮겼다. 좌표·투영·소수점 자리까지 같은 계산이라 같은 경로 문자열이 나온다(화면 속 장면 글자만 웹 문구로 바꿈).
//
// 뚜껑·상판·앞면이 한 카메라를 공유한다. 중심점만이 아니라 모양 전체(키캡 모서리·스피커 구멍·글자)를 평면 위에서 투영한다.
// 주의(TETO DESIGN_V8): 키보드 그룹은 `.device-keyboard` 로만 묶는다. 예전 `.keyboard` 사다리꼴 clip-path 를 다시 씌우면
// 이미 투영된 가장자리를 두 번째 원근으로 잘라 바깥 키가 잘리고 키보드 홈 경계가 어긋난다.
// 이 파일은 의존성이 없다 — 검증 스크립트가 Node 에서 바로 불러 TETO 원본 SVG 와 경로를 비교할 수 있게.

export type DeviceType = "air" | "pro";
export type Point = [number, number];
export type Plane = (x: number, y: number) => Point;
/** [명령, x1, y1, x2, y2, …] — 좌표는 평면(plane) 위 좌표 */
export type SurfaceCommand = [string, ...number[]];

export const VIEW_BOX = "0 0 360 287";
export const VIEW_W = 360;
export const VIEW_H = 287;

const deckWidth = 312;
const deckDepth = 210;
const pitchSin = (82 * (312 / 350)) / deckDepth;
const pitchCos = Math.sqrt(1 - pitchSin ** 2);
const cameraDistance = (pitchCos * deckDepth) / (1 - 312 / 350);
const lidLean = (10 * Math.PI) / 180;
const num = (value: number) => value.toFixed(3);

export function project(x: number, depth: number, height = 0): Point {
  const scale = cameraDistance / (cameraDistance - pitchCos * depth - pitchSin * height);
  return [180 + (x - deckWidth / 2) * scale, 192 + (pitchSin * depth - pitchCos * height) * scale];
}

export const deck: Plane = (x, y) => project(x, y);
const point = (plane: Plane, x: number, y: number) => plane(x, y).map(num).join(" ");

export function surfacePath(plane: Plane, commands: SurfaceCommand[]): string {
  return commands
    .map(([command, ...coordinates]) => {
      const points: string[] = [];
      for (let i = 0; i < coordinates.length; i += 2) points.push(point(plane, coordinates[i], coordinates[i + 1]));
      return command + points.join(" ");
    })
    .join("");
}

export function surfaceRect(plane: Plane, x: number, y: number, width: number, height: number, radius = 2): string {
  const r = Math.min(radius, width / 2, height / 2);
  const p = (px: number, py: number) => point(plane, px, py);
  return `M${p(x + r, y)}L${p(x + width - r, y)}Q${p(x + width, y)} ${p(x + width, y + r)}L${p(x + width, y + height - r)}Q${p(x + width, y + height)} ${p(x + width - r, y + height)}L${p(x + r, y + height)}Q${p(x, y + height)} ${p(x, y + height - r)}L${p(x, y + r)}Q${p(x, y)} ${p(x + r, y)}Z`;
}
const deckRect = (x: number, y: number, width: number, height: number, radius?: number) =>
  surfaceRect(deck, x, y, width, height, radius);

export function surfaceCircle(plane: Plane, x: number, y: number, radius: number): string {
  const r = radius;
  const c = r * 0.55228475;
  return surfacePath(plane, [
    ["M", x + r, y],
    ["C", x + r, y + c, x + c, y + r, x, y + r],
    ["C", x - c, y + r, x - r, y + c, x - r, y],
    ["C", x - r, y - c, x - c, y - r, x, y - r],
    ["C", x + c, y - r, x + r, y - c, x + r, y],
    ["Z"],
  ]);
}

/** 글자도 그 자리의 접평면으로 줄이고 기울인다 — `<text transform>` 에 넣을 matrix(…) */
export function surfaceTextTransform(plane: Plane, x: number, y: number): string {
  const [px, py] = plane(x, y);
  const h = 0.01;
  const a = plane(x + h, y);
  const b = plane(x - h, y);
  const c = plane(x, y + h);
  const d = plane(x, y - h);
  const matrix = [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h), (c[0] - d[0]) / (2 * h), (c[1] - d[1]) / (2 * h), px, py];
  return `matrix(${matrix.map(num).join(" ")})`;
}

export interface KeyShape {
  kind: "keycap" | "arrow-key" | "touch-id";
  d: string;
}
export interface KeyLegend {
  text: string;
  transform: string;
  modifier: boolean;
}
export interface KeyboardGeometry {
  /** Pro 만 — 키보드 홈 */
  well: string | null;
  keys: KeyShape[];
  legends: KeyLegend[];
}

function keyboard(air: boolean): KeyboardGeometry {
  // ANSI 배열: 전체 높이 기능키 줄, 엇갈린 글자 줄, 넓은 보조키, 스페이스, 역 T 자 반 높이 화살표 4개.
  const left = air ? 18 : 22;
  const width = air ? 276 : 268;
  const unit = width / 15;
  const gap = 1.65;
  const rowHeight = 17;
  const step = 19.3;
  const rows = [
    [1.5, ...Array(12).fill(1), 1.5],
    [...Array(13).fill(1), 2],
    [1.5, ...Array(12).fill(1), 1.5],
    [1.75, ...Array(11).fill(1), 2.25],
    [2.25, ...Array(10).fill(1), 2.75],
    [1, 1, 1, 1.25, 5, 1.25, 1.5],
  ] as number[][];
  const labels = [
    ["esc", ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`), ""],
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "−", "=", "delete"],
    ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
    ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "’", "return"],
    ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"],
    ["fn", "ctrl", "opt", "cmd", "", "cmd", "opt"],
  ];
  const keys: KeyShape[] = [];
  const legends: KeyLegend[] = [];
  rows.forEach((row, rowIndex) => {
    let offset = 0;
    const y = 14 + rowIndex * step;
    row.forEach((size, index) => {
      const x = left + offset * unit + gap / 2;
      const w = size * unit - gap;
      keys.push({ kind: "keycap", d: deckRect(x, y, w, rowHeight, 2.5) });
      const label = labels[rowIndex][index];
      if (rowIndex === 0 && index === row.length - 1) {
        keys.push({ kind: "touch-id", d: surfaceCircle(deck, x + w / 2, y + 8.5, 4.8) });
      } else if (label) {
        legends.push({ text: label, transform: surfaceTextTransform(deck, x + w / 2, y + 11.2), modifier: label.length > 2 });
      }
      offset += size;
    });
  });
  const y = 14 + 5 * step;
  const x = left + 12 * unit + gap / 2;
  const arrows: [number, boolean, string][] = [
    [0, false, "‹"],
    [1, true, "⌃"],
    [1, false, "⌄"],
    [2, false, "›"],
  ];
  for (const [column, upper, symbol] of arrows) {
    const kx = x + column * unit;
    const ky = y + (upper ? 0 : 9.3);
    keys.push({ kind: "arrow-key", d: deckRect(kx, ky, unit - gap, 7.7, 1.6) });
    legends.push({ text: symbol, transform: surfaceTextTransform(deck, kx + (unit - gap) / 2, ky + 6), modifier: false });
  }
  return { well: air ? null : deckRect(left - 3, 10, width + 6, 121, 5), keys, legends };
}

export type SpeakerSide = "left" | "right";
export const SPEAKER_SIDES: SpeakerSide[] = ["left", "right"];

// 스피커 그릴은 촘촘한 정사각 간격의 타공면(132줄 × 16칸)이다. 면과 구멍 하나하나가 키보드와 같은 상판 평면에 놓인다.
// 구멍 경로는 한쪽에 수백 KB 라 정적 HTML 에 싣지 않는다 — 브라우저에서 처음 필요할 때 한 번 만들어 모든 Pro 가 같이 쓴다.
export const SPEAKER_ROWS = 132;
export const SPEAKER_COLUMNS = 16;
const speakerPlane =
  (side: SpeakerSide): Plane =>
  (x, y) =>
    deck(side === "left" ? x : deckWidth - x, y);

export function speakerField(side: SpeakerSide): string {
  return surfaceRect(speakerPlane(side), 2.8, 14.2, 13.5, 113.26, 0.4);
}

const perforationCache: Partial<Record<SpeakerSide, string>> = {};
export function speakerPerforations(side: SpeakerSide): string {
  const hit = perforationCache[side];
  if (hit) return hit;
  const plane = speakerPlane(side);
  const holes: string[] = [];
  for (let row = 0; row < SPEAKER_ROWS; row++) {
    for (let col = 0; col < SPEAKER_COLUMNS; col++) {
      holes.push(surfaceCircle(plane, 3.1 + col * 0.86, 14.5 + row * 0.86, 0.24));
    }
  }
  return (perforationCache[side] = holes.join(""));
}

export interface LaptopGeometry {
  lidHeight: number;
  thickness: number;
  /** 화면 장면 좌표(x 28–292, y 16–174) → 뚜껑 위 투영 */
  screen: Plane;
  shell: string;
  screenArea: string;
  notch: string;
  camera: string;
  cameraGlint: string;
  bezelLine: string;
  rim: string;
  deck: string;
  hinge: string;
  keyboard: KeyboardGeometry;
  trackpad: string;
  recess: string;
  recessLine: string;
}

const cache: Partial<Record<DeviceType, LaptopGeometry>> = {};

export function laptopGeometry(type: DeviceType): LaptopGeometry {
  const hit = cache[type];
  if (hit) return hit;
  const air = type === "air";
  const lidHeight = air ? 186 : 190;
  const thickness = air ? 2.7 : 5.4;
  const lid: Plane = (x, y) => project(x, -(lidHeight - y) * Math.sin(lidLean), (lidHeight - y) * Math.cos(lidLean));
  const screen: Plane = (x, y) => lid(6 + ((x - 28) * 300) / 264, 7 + ((y - 16) * (lidHeight - 17)) / 158);
  const front: Plane = (x, y) => project(x, deckDepth, -y);
  const geometry: LaptopGeometry = {
    lidHeight,
    thickness,
    screen,
    shell: surfaceRect(lid, 0, 0, deckWidth, lidHeight, 9),
    screenArea: surfaceRect(lid, 6, 7, 300, lidHeight - 17, 4),
    notch: surfacePath(lid, [
      ["M", 137, 6],
      ["L", 175, 6],
      ["L", 175, 14.5],
      ["Q", 175, 18, 171.5, 18],
      ["L", 140.5, 18],
      ["Q", 137, 18, 137, 14.5],
      ["Z"],
    ]),
    camera: surfaceCircle(lid, 156, 11.5, 1.35),
    cameraGlint: surfaceCircle(lid, 156.4, 11.1, 0.45),
    bezelLine: surfacePath(lid, [
      ["M", 10, lidHeight - 4],
      ["L", 302, lidHeight - 4],
    ]),
    rim: surfaceRect((x, y) => project(x, y, -thickness), 0, 0, deckWidth, deckDepth, 6),
    deck: deckRect(0, 0, deckWidth, deckDepth, 6),
    hinge: deckRect(20, 0, 272, 5, 2),
    keyboard: keyboard(air),
    trackpad: deckRect(94, 138, 124, 64, 5),
    recess: surfacePath(front, [
      ["M", 134, 0],
      ["L", 178, 0],
      ["Q", 177, thickness * 0.7, 173, thickness * 0.7],
      ["L", 139, thickness * 0.7],
      ["Q", 135, thickness * 0.7, 134, 0],
      ["Z"],
    ]),
    recessLine: surfacePath(front, [
      ["M", 140, thickness * 0.65],
      ["L", 172, thickness * 0.65],
    ]),
  };
  cache[type] = geometry;
  return geometry;
}
