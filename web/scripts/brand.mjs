// 웹 파비콘·apple-touch 아이콘 만들기 — tbyb 플랫폼 로고(TETO 선택안)의 원본 SVG 를 Playwright(Chromium)로 그린다.
//   node scripts/brand.mjs
// 읽는 것 (고치지 않는다): ../shared/brand/tbyb/APP_ICON_COLOR.svg · MARK.svg · MARK_REVERSE.svg · MARK_MONO.svg
// 만드는 것 (web 안과 docs/screenshots/web-* 만):
//   src/app/icon.svg          파비콘 — APP_ICON_COLOR 그대로(cream 둥근 타일 + 컬러 심볼). 라이트·다크 탭 모두에서 타일이 바탕을 만들어 준다.
//   src/app/apple-icon.png    180×180 apple-touch — APP_ICON_COLOR, 투명도 없음(둥근 모서리 바깥은 타일과 같은 cream 으로 채움, 모서리는 iOS 가 둥글게)
//   ../docs/screenshots/web-brand-icons.png  확인용 시트 — 16·32px 실제 픽셀, 라이트·다크 탭, 홈 화면, 헤더 바탕 위 심볼
// 예전 MIKU 노트북 로고(../shared/brand/_archive-miku-laptops/)는 더 쓰지 않는다.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { chromium } from "@playwright/test";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const TBYB = join(WEB, "..", "shared", "brand", "tbyb");
const SHOTS = join(WEB, "..", "docs", "screenshots");
const svg = (name) => readFileSync(join(TBYB, name), "utf8");
const CREAM = [0xf7, 0xf3, 0xea]; // APP_ICON_COLOR 타일 색

// ── PNG: 알파 채널 없애기 (apple-touch 아이콘은 투명도 없이) ──
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
function toOpaqueRGB(png, bg) {
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
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
  return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
}

// ── 파비콘 (SVG 그대로) ──
const appIcon = svg("APP_ICON_COLOR.svg");
const iconSvg = appIcon.replace(
  /(<svg[^>]*>)/,
  "$1<!-- tbyb favicon = shared/brand/tbyb/APP_ICON_COLOR.svg (cream tile + color mark). Regenerate: node web/scripts/brand.mjs -->",
);
writeFileSync(join(WEB, "src", "app", "icon.svg"), iconSvg);

// ── apple-touch 180 (불투명) ──
const apple = toOpaqueRGB(await render(appIcon, 180, { transparent: true }), CREAM);
writeFileSync(join(WEB, "src", "app", "apple-icon.png"), apple);

// ── 확인용 시트 ──
const b64 = (buf) => `data:image/png;base64,${buf.toString("base64")}`;
const svgUrl = (t) => `data:image/svg+xml;base64,${Buffer.from(t).toString("base64")}`;
const fav16 = await render(appIcon, 16, { transparent: true });
const fav32 = await render(appIcon, 32, { transparent: true });
const mono16 = await render(svg("MARK_MONO.svg").replace('width="600" height="480"', 'width="600" height="600"'), 16, { transparent: true });
const sheet = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;font:13px/1.4 -apple-system,"Apple SD Gothic Neo",sans-serif;background:#EFE8DC;color:#1F1B16;width:1200px}
  h1{font-size:20px;margin:0;padding:28px 36px 6px} .note{padding:0 36px 18px;color:#6B635A;margin:0}
  .row{display:flex;align-items:center;gap:32px;padding:22px 36px}
  .lab{width:190px;margin:0;font-weight:700}
  figure{margin:0;text-align:center} figcaption{font-size:11px;opacity:.75;margin-top:6px}
  .px{image-rendering:pixelated}
  .tabs{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:12px}
  .tab{display:flex;gap:8px;align-items:center;padding:6px 12px;border-radius:8px;font-size:12px}
  .ios{border-radius:22.4%;overflow:hidden;box-shadow:0 2px 10px rgb(0 0 0/.18)}
  .lock{display:flex;align-items:center;gap:7px;font:600 32px/1 Georgia,serif;letter-spacing:-.06em}
</style>
<h1>tbyb — 웹 파비콘 · 아이콘 확인</h1>
<p class="note">원본: shared/brand/tbyb/*.svg (TETO 선택안, 도형·색 그대로) · 이 시트: web/scripts/brand.mjs</p>
<div class="row" style="background:#FAF6EF">
  <p class="lab">파비콘 실제 픽셀 (8배)</p>
  <figure><img class="px" src="${b64(fav16)}" width="128" height="128"><figcaption>icon.svg · 16px</figcaption></figure>
  <figure><img class="px" src="${b64(fav32)}" width="128" height="128"><figcaption>icon.svg · 32px (4배)</figcaption></figure>
  <figure><img class="px" src="${b64(mono16)}" width="128" height="128"><figcaption>참고: MARK_MONO · 16px</figcaption></figure>
</div>
<div class="row" style="background:#FAF6EF">
  <p class="lab">브라우저 탭</p>
  <div class="tabs" style="background:#DEE1E6"><span class="tab" style="background:#fff"><img src="${b64(fav32)}" width="16" height="16">tbyb — 첫 비교팩</span><span class="tab"><img src="${b64(fav32)}" width="16" height="16">라이트 탭</span></div>
  <div class="tabs" style="background:#202124;color:#E8EAED"><span class="tab" style="background:#35363A"><img src="${b64(fav32)}" width="16" height="16">tbyb — 첫 비교팩</span><span class="tab"><img src="${b64(fav32)}" width="16" height="16">다크 탭</span></div>
</div>
<div class="row" style="background:#FAF6EF">
  <p class="lab">apple-icon.png (180 · 불투명)</p>
  <figure><img class="ios" src="${b64(apple)}" width="120" height="120"><figcaption>iOS 홈 화면 (OS 가 모서리를 둥글게)</figcaption></figure>
  <figure><img class="ios" src="${b64(apple)}" width="60" height="60"><figcaption>60px</figcaption></figure>
  <figure style="background:#2A2520;color:#F3ECE2;padding:14px;border-radius:14px"><img class="ios" src="${b64(apple)}" width="60" height="60"><figcaption>어두운 홈 화면</figcaption></figure>
</div>
<div class="row" style="background:#FAF6EF"><p class="lab">헤더 · 라이트 (#FAF6EF)</p>
  <span class="lock" style="color:#193D35"><img src="${svgUrl(svg("MARK.svg"))}" height="29">tbyb</span>
  <span class="lock" style="color:#193D35;font-size:28px;gap:6px"><img src="${svgUrl(svg("MARK.svg"))}" height="25">tbyb</span></div>
<div class="row" style="background:#16130F;color:#F3ECE2"><p class="lab">헤더 · 다크 (#16130F)</p>
  <span class="lock" style="color:#F7F3EA"><img src="${svgUrl(svg("MARK_REVERSE.svg"))}" height="29">tbyb</span>
  <span class="lock" style="color:#F7F3EA;font-size:28px;gap:6px"><img src="${svgUrl(svg("MARK_REVERSE.svg"))}" height="25">tbyb</span></div>`;
await page.setViewportSize({ width: 1200, height: 800 });
await page.setContent(sheet);
await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = r))))));
await page.screenshot({ path: join(SHOTS, "web-brand-icons.png"), fullPage: true });
await browser.close();
console.log("written: src/app/icon.svg, src/app/apple-icon.png (180, opaque), ../docs/screenshots/web-brand-icons.png");
