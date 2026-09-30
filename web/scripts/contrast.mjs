#!/usr/bin/env node
// 두 테마(라이트·다크)의 실제 글자·바탕 짝 대비를 globals.css 토큰 값으로 계산한다.
// 사용: node scripts/contrast.mjs            (web/ 에서)   ·  node web/scripts/contrast.mjs (저장소 루트에서)
//       node scripts/contrast.mjs --all      통과한 짝도 모두 표로 출력
// 기준(WCAG 2.2): 본문·작은 글자 4.5:1 · 큰 글자(24px↑ 또는 18.66px↑ 굵게) 3:1 · UI 경계·초점·상태 면 3:1.
// 비활성 컨트롤과 그림 속 글자는 WCAG 1.4.3 예외라 기준 대신 참고값만 보여 준다(단, 비활성은 3:1 아래면 경고).
// tbyb 로고의 apricot 프레임은 브랜드 원본 색(shared/brand/tbyb — 바꾸지 않는다)이라 3:1 을 기준으로 재되 실패로 치지 않고 '로고 보고'로 알린다.
// 기준 미달이 하나라도 있으면 종료 코드 1.
//
// 짝 표기: 글자 'ink' · 투명도 'ink/80' · 겹친 바탕 'cream/60>bg'(bg 위에 60% cream) · 일러스트 토큰은 'ill-*'.
import { readFileSync } from "node:fs";

const CSS_PATH = new URL("../src/app/globals.css", import.meta.url);
const css = readFileSync(CSS_PATH, "utf8");

/** `selector {` 로 시작하는 블록 본문 (중괄호 짝 맞춤) */
function block(startRe) {
  const m = startRe.exec(css);
  if (!m) throw new Error(`globals.css 에서 블록을 찾지 못함: ${startRe}`);
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(m.index + m[0].length, i);
  }
  throw new Error(`닫는 중괄호 없음: ${startRe}`);
}

function vars(body) {
  const out = {};
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function toTokens(v) {
  const t = {};
  for (const [k, val] of Object.entries(v)) {
    if (k.startsWith("color-")) t[k.slice(6)] = val;
    else if (k.startsWith("ill-")) t[k] = val;
  }
  return t;
}

const light = toTokens({ ...vars(block(/@theme\s*\{/)), ...vars(block(/\n:root\s*\{/)) });
const dark = { ...light, ...toTokens(vars(block(/:root\[data-theme="dark"\]\s*\{/))) };
const THEMES = { light, dark };

// ───────── 색 계산 ─────────

function parseColor(str) {
  const s = str.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  throw new Error(`색을 읽지 못함: ${str}`);
}

/** 브라우저처럼 sRGB 공간에서 알파 합성 */
function over(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  const mix = (c) => (top[c] * top.a + bottom[c] * bottom.a * (1 - top.a)) / a;
  return { r: mix("r"), g: mix("g"), b: mix("b"), a };
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 'cream/60' → 토큰 색에 투명도 */
function layer(spec, t) {
  const [name, pct] = spec.split("/");
  if (!(name in t)) throw new Error(`토큰 없음: ${name}`);
  const c = parseColor(t[name]);
  return pct ? { ...c, a: c.a * (+pct / 100) } : c;
}

/** 'cream/60>bg' → 아래에서 위로 쌓은 불투명 바탕 */
function background(spec, t) {
  const layers = spec.split(">").reverse();
  let c = layer(layers[0], t);
  if (c.a < 1) throw new Error(`가장 아래 바탕은 불투명해야 함: ${spec}`);
  for (const l of layers.slice(1)) c = over(layer(l, t), c);
  return c;
}

const hex = ({ r, g, b }) => "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");

// ───────── 실제로 쓰는 짝 ─────────
// kind: text 4.5 · large 3 · ui 3 · disabled(참고, 3 아래면 경고) · picture(참고) · info(참고: 장식 경계)
//       logo(3:1 로 재지만 미달이면 '로고 보고' — 브랜드 원본 색이라 고칠 수 없는 그림)
const MIN = { text: 4.5, large: 3, ui: 3 };

const P = (fg, bg, kind, where) => ({ fg, bg, kind, where });
const each = (fgs, bgs, kind, where) => fgs.flatMap((fg) => bgs.map((bg) => P(fg, bg, kind, where)));

const PAIRS = [
  // 기본 글자
  ...each(["ink", "sub"], ["bg", "surface", "cream", "cream/60>bg", "cream/60>surface", "cream/70>bg"], "text", "본문·보조 글자 (페이지·카드·푸터·안내 상자·호버)"),
  ...each(["ink", "sub"], ["air-soft", "pro-soft", "coral-soft", "mute-soft"], "text", "파스텔 카드 위 글자 (고민 카드·기기 머리·리워드·칩)"),
  ...each(["ink"], ["warn-bg", "success-soft", "danger-soft"], "text", "결제 기한 숫자·체크된 출고 항목·저장 오류 막대"),
  ...each(["ink", "sub"], ["surface/85>coral-soft", "surface/80>coral-soft"], "text", "리워드 카드 안쪽 판"),
  ...each(["ink/80"], ["air-soft", "pro-soft", "coral-soft"], "text", "기기 머리 설명·리워드 규칙"),
  P("ink/75", "coral-soft", "text", "리워드 규칙 (text-ink/75)"),
  // 잉크 면 · 상태 면 위 글자
  P("ivory", "ink", "text", "주 버튼·체험 중 칩·필수 태그·선택된 칩/메뉴/테마"),
  P("ivory/80", "ink", "text", "고른 날짜 아래 작은 글자"),
  ...each(["ivory"], ["air-ink", "pro", "mute-ink", "sub"], "text", "고른 답 버튼(Air·Pro·모르겠음)·취소 단계 점"),
  P("on-coral", "coral", "text", "리워드 '신청함' 칩·타임라인 '지금' 점"),
  P("on-feature", "feature", "large", "마무리 CTA 제목"),
  P("on-feature", "feature", "text", "마무리 CTA 테두리 버튼 글자"),
  P("on-feature/70", "feature", "text", "마무리 CTA 아이브로우·설명"),
  P("feature", "on-feature", "text", "마무리 CTA 밝은 버튼 글자"),
  // 의미 색 글자
  ...each(["warn"], ["warn-bg", "bg", "surface", "cream", "surface/80>warn-bg"], "text", "데모 막대·미확정·결제 대기·판매 확인 전·검토 표시"),
  ...each(["success-ink"], ["success-soft", "surface", "bg", "cream", "coral-soft"], "text", "완료·대조 완료·확신 +n"),
  ...each(["danger-ink"], ["danger-soft", "surface", "bg", "cream", "warn-bg", "coral-soft"], "text", "오류·위험 버튼·기한 지남·확신 -n"),
  P("danger-ink/90", "danger-soft", "text", "저장본 오류 막대 보조 문장"),
  P("danger-ink/80", "surface", "text", "달력 일요일 머리"),
  P("danger", "surface", "text", "'(필수)' 표시"),
  ...each(["coral-ink"], ["coral-soft", "surface", "bg"], "text", "리워드 금액·아이브로우·'지금'·'(필수)'"),
  ...each(["mute-ink"], ["mute-soft", "surface"], "text", "요청 접수 칩·'비슷/모르겠음' 칩·선택 태그"),
  ...each(["pro-ink", "air-ink"], ["surface", "bg", "cream"], "text", "기기 이름 (DeviceName)"),
  P("pro-ink", "pro-soft", "text", "반납 접수·검수 중 칩·Pro 답 칩"),
  P("air-ink", "air-soft", "text", "Air 답 칩·Air 비교 칸"),
  P("ill-air-ink", "ill-air-soft", "text", "히어로 이름표 'MacBook Air' (14px 굵게)"),
  P("ill-pro-ink", "ill-pro-soft", "text", "히어로 이름표 'MacBook Pro 14형'"),
  // UI 경계 · 초점 · 상태 면 (3:1)
  ...each(["field"], ["surface", "bg"], "ui", "글자 입력칸 테두리 (inputClass — 카드·bg 칸 안. 비활성은 line-strong)"),
  ...each(["ink"], ["bg", "surface", "cream", "coral-soft", "warn-bg", "danger-soft", "air-soft", "pro-soft"], "ui", "초점 링·고른 항목 테두리/면"),
  P("on-feature", "feature", "ui", "마무리 CTA 초점 링"),
  ...each(["air-ink", "pro", "mute-ink"], ["surface"], "ui", "고른 답 버튼 면 vs 카드"),

  ...each(["ill-line"], ["bg", "surface", "cream", "coral-soft", "air-soft", "pro-soft"], "ui", "일러스트 선 (의미 있는 그림)"),

  // tbyb 로고 (헤더 bg · 푸터 cream/60>bg). 라이트 = MARK.svg 색, 다크 = MARK_REVERSE.svg cream
  ...each(["brand-word"], ["bg", "cream/60>bg"], "text", "워드마크 tbyb (Georgia 600, 28–36px — 작은 글자 기준으로도 확인)"),
  ...each(["brand-left", "brand-dot"], ["bg", "cream/60>bg"], "ui", "로고 심볼 왼쪽 프레임·가운데 점 (forest / 다크 sage)"),
  ...each(["brand-right"], ["bg", "cream/60>bg"], "logo", "로고 심볼 오른쪽 프레임 (apricot #F18463, 라이트·다크 같음)"),
  // 새 면: 신뢰 한 줄 · 비교팩 조건 표 · FAQ
  P("ink", "surface/70>bg", "text", "히어로 아래 신뢰 한 줄"),
  ...each(["ink", "sub"], ["warn-bg/60>bg"], "text", "비교팩 조건 표 (값·항목 이름)"),
  P("warn", "warn-bg/60>bg", "ui", "비교팩 조건 표 값 앞 점"),
  // 비활성 (WCAG 1.4.3 예외 — 참고)
  P("sub", "line", "disabled", "주 버튼 비활성"),
  P("sub/80", "cream", "disabled", "보조 버튼 비활성"),
  P("sub/80", "surface", "disabled", "위험 버튼 비활성"),
  P("sub/80", "mute-soft/70>surface", "disabled", "달력 마감일 (+ 취소선·'마감' 글자)"),
  // 그림 속 글자 (WCAG 1.4.3 예외 — 참고)
  ...each(["ill-screen-text"], ["ill-air-screen", "ill-pro-screen", "ill-air-screen-a", "ill-air-screen-b", "ill-pro-screen-a", "ill-pro-screen-b"], "picture", "노트북 화면 글자 '오늘은 어디로 갈까?'·'오늘은 어디까지 해 볼까?' (고운바탕, 큰 글자 · 그림 속 글자)"),
  // 장식·보조 (글자가 같은 정보를 주거나, 글자가 있는 버튼·칩·카드라 경계 없이도 알아볼 수 있음 — 참고)
  ...each(["coral"], ["surface/80>coral-soft", "surface"], "info", "진행 막대 채움 (옆에 'n/5' 글자가 항상 있음)"),
  ...each(["line"], ["bg", "surface"], "info", "카드 테두리"),
  ...each(["line-strong"], ["surface", "bg"], "info", "칩·보조 버튼 테두리"),
];

// ───────── 실행 ─────────

const showAll = process.argv.includes("--all");
let failures = 0;
let warnings = 0;
const logoNotes = [];
const summary = [];

for (const [theme, t] of Object.entries(THEMES)) {
  const rows = [];
  for (const p of PAIRS) {
    const bg = background(p.bg, t);
    const fg = over(layer(p.fg, t), bg);
    const r = ratio(fg, bg);
    const min = MIN[p.kind];
    let status = "참고";
    if (min) status = r >= min ? "통과" : "미달";
    else if (p.kind === "disabled" && r < 3) status = "경고";
    else if (p.kind === "logo") status = r >= 3 ? "통과" : "로고 보고";
    if (status === "미달") failures++;
    if (status === "경고") warnings++;
    if (status === "로고 보고") logoNotes.push(`${theme} ${p.fg} on ${p.bg} ${r.toFixed(2)}:1`);
    rows.push({ ...p, r, min, status, fgHex: hex(fg), bgHex: hex(bg) });
  }
  const worst = (kind) => Math.min(...rows.filter((x) => x.kind === kind).map((x) => x.r));
  summary.push(
    `${theme.padEnd(5)}  글자 최소 ${worst("text").toFixed(2)} · 큰 글자 최소 ${worst("large").toFixed(2)} · UI 최소 ${worst("ui").toFixed(2)} · ` +
      `짝 ${rows.length}개 · 미달 ${rows.filter((x) => x.status === "미달").length}`,
  );
  console.log(`\n## ${theme === "light" ? "라이트" : "다크"} (${theme})`);
  for (const x of rows) {
    if (!showAll && x.status === "통과") continue;
    const need = x.min ? `≥${x.min}` : x.kind === "logo" ? "≥3 로고" : x.kind;
    console.log(
      `${x.status}  ${x.r.toFixed(2).padStart(5)}:1 ${need.padEnd(8)} ${x.fg.padEnd(16)} on ${x.bg.padEnd(22)} ${x.fgHex} / ${x.bgHex}  — ${x.where}`,
    );
  }
  if (!showAll) console.log(`(통과 ${rows.filter((x) => x.status === "통과").length}개 생략 — 전체는 --all)`);
}

console.log("\n" + summary.join("\n"));
if (warnings) console.log(`비활성 3:1 미만 경고 ${warnings}개`);
if (logoNotes.length) {
  console.log(
    `로고 보고 ${logoNotes.length}개 — tbyb apricot 프레임은 3:1 미만(브랜드 원본 색, 바꾸지 않음). ` +
      `심볼은 forest 프레임·점과 워드마크로 알아볼 수 있고 링크 이름은 글자로 있음: ${logoNotes.join(" · ")}`,
  );
}
if (failures) {
  console.error(`\n대비 기준 미달 ${failures}개`);
  process.exit(1);
}
console.log("\n모든 짝이 기준을 통과했습니다.");
