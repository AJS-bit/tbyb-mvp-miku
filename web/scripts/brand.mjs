// 브랜드 PNG 만들기 — ../shared/brand/*.svg(원본)를 Playwright(Chromium)로 그려 PNG 로 저장한다.
//   node scripts/brand.mjs
// 만드는 것:
//   ../shared/brand/app-icon-1024.png            iOS 앱 아이콘 (꽉 찬 정사각형 · 투명도 없음 · 모서리는 OS 가 둥글게)
//   ../shared/brand/adaptive-foreground-1024.png 안드로이드 적응형 아이콘 앞면 (투명 바탕, 안전 원 안)
//   ../shared/brand/adaptive-background-1024.png 안드로이드 적응형 아이콘 바탕 (단색 · 투명도 없음)
//   ../shared/brand/favicon-32.png · favicon-180.png(apple-touch — 앱 아이콘과 같은 그림)
//   src/app/icon.svg (= favicon.svg) · src/app/apple-icon.png (180)  ← Next 메타데이터 파일 규칙
//   ../docs/screenshots/brand-logo-sheet.png     여러 크기 · 라이트/다크 확인용 시트
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = join(WEB, "..", "shared", "brand");
const SHOTS = join(WEB, "..", "docs", "screenshots");
const svg = (name) => readFileSync(join(BRAND, name), "utf8");

// ── PNG: 알파 채널 없애기 (App Store 1024 아이콘은 투명도 금지) ──
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** 8비트 RGBA/RGB PNG → 불투명 RGB PNG (반투명 픽셀은 배경색 위에 합성) */
function toOpaqueRGB(png, bg = [0xfa, 0xf6, 0xef]) {
  let pos = 8;
  let ihdr;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") ihdr = data;
    if (type === "IDAT") idat.push(data);
    pos += 12 + len;
  }
  const w = ihdr.readUInt32BE(0);
  const h = ihdr.readUInt32BE(4);
  const depth = ihdr[8];
  const ctype = ihdr[9];
  if (depth !== 8 || (ctype !== 6 && ctype !== 2)) throw new Error(`unsupported PNG ${depth}/${ctype}`);
  const bpp = ctype === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * (w * 3 + 1));
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = v & 0xff;
    }
    prev = line;
    const o = y * (w * 3 + 1);
    out[o] = 0;
    for (let x = 0; x < w; x++) {
      const al = bpp === 4 ? line[x * 4 + 3] / 255 : 1;
      for (let k = 0; k < 3; k++) out[o + 1 + x * 3 + k] = Math.round(line[x * bpp + k] * al + bg[k] * (1 - al));
    }
  }
  const hdr = Buffer.alloc(13);
  hdr.writeUInt32BE(w, 0);
  hdr.writeUInt32BE(h, 4);
  hdr[8] = 8;
  hdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", hdr),
    chunk("IDAT", deflateSync(out, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** SVG 문자열을 size×size PNG 로. transparent 면 바탕 투명. */
async function render(svgText, size, { transparent = false } = {}) {
  const sized = svgText.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${size}" height="${size}"`);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`,
  );
  return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

const out = {
  "app-icon-1024.png": toOpaqueRGB(await render(svg("app-icon.svg"), 1024)),
  "adaptive-foreground-1024.png": await render(svg("adaptive-foreground.svg"), 1024, { transparent: true }),
  "adaptive-background-1024.png": toOpaqueRGB(await render(svg("adaptive-background.svg"), 1024)),
  "favicon-32.png": await render(svg("favicon.svg"), 32, { transparent: true }),
  "favicon-180.png": toOpaqueRGB(await render(svg("app-icon.svg"), 180)),
};
for (const [name, buf] of Object.entries(out)) writeFileSync(join(BRAND, name), buf);
copyFileSync(join(BRAND, "favicon.svg"), join(WEB, "src", "app", "icon.svg"));
writeFileSync(join(WEB, "src", "app", "apple-icon.png"), out["favicon-180.png"]);

// ── 확인용 시트 ──
const b64 = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const svgUrl = (t) => `data:image/svg+xml;base64,${Buffer.from(t).toString("base64")}`;
const mark = svg("logo-mark.svg");
const markDark = svg("logo-mark-dark.svg");
const sizes = [16, 32, 64, 256];
const px16 = {
  light: await render(mark, 16, { transparent: true }),
  dark: await render(markDark, 16, { transparent: true }),
  fav: out["favicon-32.png"],
};
const row = (bg, fg, file, label) => `
  <div class="row" style="background:${bg};color:${fg}">
    <p class="lab">${label}</p>
    ${sizes.map((s) => `<figure><img src="${svgUrl(file)}" width="${s}" height="${s}"><figcaption>${s}px</figcaption></figure>`).join("")}
  </div>`;
const sheet = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;font:13px/1.4 -apple-system,"Apple SD Gothic Neo",sans-serif;background:#EFE8DC;color:#1F1B16;width:1400px}
  h1{font-size:20px;margin:0;padding:28px 36px 6px} .note{padding:0 36px 18px;color:#6B635A}
  .row{display:flex;align-items:flex-end;gap:36px;padding:26px 36px}
  .lab{width:170px;margin:0;align-self:center;font-weight:700}
  figure{margin:0;text-align:center} figcaption{font-size:11px;opacity:.7;margin-top:6px}
  .px{image-rendering:pixelated}
  .tabs{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:12px}
  .tab{display:flex;gap:8px;align-items:center;padding:6px 12px;border-radius:8px;font-size:12px}
  .ios{border-radius:22.4%;overflow:hidden;box-shadow:0 2px 10px rgb(0 0 0/.18)}
  .circ{border-radius:50%;overflow:hidden;background:#FAF6EF;box-shadow:0 2px 10px rgb(0 0 0/.18)}
  .sq{border-radius:28%;overflow:hidden;background:#FAF6EF;box-shadow:0 2px 10px rgb(0 0 0/.18)}
</style>
<h1>Try Before You Buy — 로고 시트</h1>
<p class="note">앞 왼쪽 얇은 Air(청록) · 뒤 오른쪽 Pro(보라) · 코랄 반짝임. 원본: shared/brand/*.svg · 이 시트: web/scripts/brand.mjs</p>
${row("#FAF6EF", "#1F1B16", mark, "마크 · 라이트 바탕")}
${row("#FFFFFF", "#1F1B16", mark, "마크 · 흰 바탕")}
${row("#16130F", "#F3ECE2", markDark, "마크(다크) · 다크 바탕")}
<div class="row" style="background:#FAF6EF"><p class="lab">로고 조합 · 라이트</p><img src="${svgUrl(svg("logo-lockup.svg"))}" height="64"><img src="${svgUrl(svg("logo-lockup.svg"))}" height="36"></div>
<div class="row" style="background:#16130F;color:#F3ECE2"><p class="lab">로고 조합 · 다크</p><img src="${svgUrl(svg("logo-lockup-dark.svg"))}" height="64"><img src="${svgUrl(svg("logo-lockup-dark.svg"))}" height="36"></div>
<div class="row" style="background:#FAF6EF">
  <p class="lab">16px 실제 픽셀 (8배 확대)</p>
  <figure><img class="px" src="${b64(px16.light)}" width="128" height="128"><figcaption>마크 · 라이트</figcaption></figure>
  <figure style="background:#16130F;color:#F3ECE2;padding:0"><img class="px" src="${b64(px16.dark)}" width="128" height="128"><figcaption style="padding-bottom:4px">마크 · 다크</figcaption></figure>
  <figure><img class="px" src="${b64(px16.fav)}" width="128" height="128"><figcaption>파비콘 32px (4배)</figcaption></figure>
</div>
<div class="row" style="background:#FAF6EF">
  <p class="lab">파비콘 · 브라우저 탭</p>
  <div class="tabs" style="background:#DEE1E6"><span class="tab" style="background:#fff"><img src="${b64(out["favicon-32.png"])}" width="16" height="16">Try Before You Buy</span><span class="tab"><img src="${b64(out["favicon-32.png"])}" width="16" height="16">라이트 탭</span></div>
  <div class="tabs" style="background:#202124;color:#E8EAED"><span class="tab" style="background:#35363A"><img src="${b64(out["favicon-32.png"])}" width="16" height="16">Try Before You Buy</span><span class="tab"><img src="${b64(out["favicon-32.png"])}" width="16" height="16">다크 탭</span></div>
</div>
<div class="row" style="background:#FAF6EF">
  <p class="lab">앱 아이콘</p>
  <figure><img class="ios" src="${b64(out["app-icon-1024.png"])}" width="180" height="180"><figcaption>iOS (1024 · OS가 모서리 둥글게)</figcaption></figure>
  <figure><img class="ios" src="${b64(out["app-icon-1024.png"])}" width="60" height="60"><figcaption>60px</figcaption></figure>
  <figure><img class="circ" src="${b64(out["adaptive-foreground-1024.png"])}" width="180" height="180"><figcaption>Android 적응형 · 원</figcaption></figure>
  <figure><img class="sq" src="${b64(out["adaptive-foreground-1024.png"])}" width="180" height="180"><figcaption>Android 적응형 · 둥근 사각</figcaption></figure>
  <figure><img class="circ" src="${b64(out["adaptive-foreground-1024.png"])}" width="48" height="48"><figcaption>48px</figcaption></figure>
</div>
<div class="row" style="background:#2A2520;color:#F3ECE2">
  <p class="lab">앱 아이콘 · 어두운 홈 화면</p>
  <figure><img class="ios" src="${b64(out["app-icon-1024.png"])}" width="120" height="120"></figure>
  <figure><img class="ios" src="${b64(out["app-icon-1024.png"])}" width="60" height="60"></figure>
  <figure><img class="circ" src="${b64(out["adaptive-foreground-1024.png"])}" width="60" height="60"></figure>
</div>`;
await page.setViewportSize({ width: 1400, height: 900 });
await page.setContent(sheet);
await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = r))))));
await page.screenshot({ path: join(SHOTS, "brand-logo-sheet.png"), fullPage: true });
await browser.close();
console.log("brand assets written:", Object.keys(out).join(", "), "+ src/app/icon.svg, src/app/apple-icon.png, docs/screenshots/brand-logo-sheet.png");
