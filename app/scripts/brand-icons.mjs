// tbyb 앱 아이콘·스플래시·파비콘 PNG 만들기 — shared/brand/tbyb/*.svg(원본, TETO 선택안)를 Playwright(Chromium)로 그린다.
//   (app/ 에서) node scripts/brand-icons.mjs
// Playwright 는 web/ 의 것을 빌려 쓴다 (앱 의존성에 넣지 않는다): ../web/node_modules/playwright
//
// 만드는 것 (app/assets/images/):
//   icon.png                     1024 · iOS 앱 아이콘. APP_ICON_COLOR.svg 와 같은 비율의 심볼을 **꽉 찬 정사각형 크림 바탕** 위에 — 투명도 없음(RGB).
//                                (원본 SVG 의 둥근 모서리는 iOS 가 직접 자르므로 네모로 채운다)
//   android-icon-foreground.png  1024 · 적응형 아이콘 앞면. 투명 바탕, 심볼을 안전 원(지름 66dp/108dp ≈ 626px) 안에.
//                                보이는 72dp 영역 안에서 iOS 아이콘과 같은 비율이 되게 둔다. 바탕은 app.config 의 backgroundColor(크림).
//   android-icon-monochrome.png  1024 · 테마 아이콘 — MARK_MONO.svg (한 색), 앞면과 같은 자리
//   favicon.png                  32 · APP_ICON_COLOR.svg 그대로 (둥근 크림 타일, 모서리 투명)
//   splash-icon.png              600×480 · MARK.svg (컬러, 투명 바탕) — 라이트 스플래시(크림 바탕)
//   splash-icon-dark.png         600×480 · MARK_DARK.svg (sage 왼쪽 프레임·점 + apricot 오른쪽, 투명 바탕) — 다크 스플래시(forest 바탕)
// + docs/screenshots/app-brand-icon.png  위 PNG 들을 실제 모양(iOS 마스크·안드로이드 원/둥근 사각·스플래시·브라우저 탭)으로 모아 본 시트
//
// 안전장치: src/lib/brand.ts 의 도형·색이 MARK.svg 와 다르면 멈춘다 (앱 안 로고와 아이콘이 어긋나지 않게).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

import { chromium } from '../../web/node_modules/playwright/index.mjs';

process.removeAllListeners('warning');
process.on('warning', (w) => w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && console.warn(w));
const B = await import('../src/lib/brand.ts');

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(APP, '..', 'shared', 'brand', 'tbyb');
const OUT = join(APP, 'assets', 'images');
const SHOTS = join(APP, '..', 'docs', 'screenshots');
const svg = (name) => readFileSync(join(SRC, name), 'utf8');

// ── 원본과 앱 코드가 같은지 ──
const mark = svg('MARK.svg');
const paths = [...mark.matchAll(/<path fill="(#[0-9A-F]{6})" d="([^"]+)"/gi)].map((m) => ({ fill: m[1].toUpperCase(), d: m[2] }));
const dot = mark.match(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill="(#[0-9A-F]{6})"/i);
const same =
  paths.length === 2 &&
  paths[0].d === B.MARK_LEFT &&
  paths[1].d === B.MARK_RIGHT &&
  paths[0].fill === B.BRAND.forest &&
  paths[1].fill === B.BRAND.apricot &&
  dot &&
  +dot[1] === B.MARK_DOT.cx &&
  +dot[2] === B.MARK_DOT.cy &&
  +dot[3] === B.MARK_DOT.r &&
  dot[4].toUpperCase() === B.BRAND.forest &&
  /viewBox="0 0 100 80"/.test(mark);
if (!same) throw new Error('src/lib/brand.ts 의 심볼이 shared/brand/tbyb/MARK.svg 와 다릅니다');
// 다크 심볼(MARK_DARK.svg)도 도형은 같고 색만 sage·apricot 이어야 한다
const markDark = svg('MARK_DARK.svg');
const darkParts = [...markDark.matchAll(/<path fill="(#[0-9A-F]{6})" d="([^"]+)"/gi)].map((m) => ({ fill: m[1].toUpperCase(), d: m[2] }));
const darkDot = markDark.match(/<circle cx="50" cy="40" r="6" fill="(#[0-9A-F]{6})"/i);
if (
  darkParts.length !== 2 ||
  darkParts[0].d !== B.MARK_LEFT ||
  darkParts[1].d !== B.MARK_RIGHT ||
  darkParts[0].fill !== B.BRAND.sage ||
  darkParts[1].fill !== B.BRAND.apricot ||
  darkDot?.[1].toUpperCase() !== B.BRAND.sage
)
  throw new Error('shared/brand/tbyb/MARK_DARK.svg 가 예상(같은 도형 · sage·apricot)과 다릅니다');

/** SVG 안쪽(도형들)만 — <title>/<desc> 는 뺀다 */
const inner = (text) =>
  text
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g, '')
    .trim();

const appIcon = svg('APP_ICON_COLOR.svg');
// APP_ICON_COLOR.svg 의 심볼 배치(128 격자에서 translate(19 28) scale(.9)) 그대로
const iconGroup = appIcon.match(/<g transform="[^"]+">[\s\S]*?<\/g>/)[0];
const iosIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 128 128"><rect width="128" height="128" fill="${B.BRAND.cream}"/>${iconGroup}</svg>`;

// 안드로이드 적응형: 108dp 캔버스(1024px) 중 보이는 영역 72dp(≈683px). iOS 아이콘에서 심볼 상자(100×80 격자를 .9배)가
// 아이콘 너비의 90/128 이므로, 보이는 영역에서도 같은 비율 → 상자 너비 = 683 × 90/128 ≈ 480px (격자 1 = 4.8px), 가운데 정렬.
const VISIBLE = (1024 * 72) / 108;
const S = (VISIBLE * (90 / 128)) / 100;
const box = { w: 100 * S, h: 80 * S };
const ox = (1024 - box.w) / 2;
const oy = (1024 - box.h) / 2;
const adaptive = (source) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><g transform="translate(${ox} ${oy}) scale(${S})">${inner(source)}</g></svg>`;
// 안전 원 확인: 칠한 부분(격자 x4–96, y8–72)의 모서리가 지름 626px 원 안에 드는지
const corner = Math.hypot((92 / 2) * S, (64 / 2) * S);
const SAFE_R = (1024 * 66) / 108 / 2;
if (corner > SAFE_R) throw new Error(`적응형 심볼이 안전 원을 벗어납니다: ${corner.toFixed(1)} > ${SAFE_R.toFixed(1)}`);

// ── PNG: 알파 채널 없애기 (App Store 1024 아이콘은 투명도 금지) — web/scripts/brand.mjs 와 같은 방식 ──
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
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function readPng(png) {
  let pos = 8;
  let ihdr;
  const idat = [];
  while (pos < png.length) {
    const len = png.readUInt32BE(pos);
    const type = png.toString('ascii', pos + 4, pos + 8);
    const data = png.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') ihdr = data;
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  return { w: ihdr.readUInt32BE(0), h: ihdr.readUInt32BE(4), depth: ihdr[8], ctype: ihdr[9], idat };
}
/** 8비트 RGBA/RGB PNG → 불투명 RGB PNG (반투명 픽셀은 배경색 위에 합성) */
function toOpaqueRGB(png, bgHex) {
  const bg = [1, 3, 5].map((i) => parseInt(bgHex.slice(i, i + 2), 16));
  const { w, h, depth, ctype, idat } = readPng(png);
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
    chunk('IHDR', hdr),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

/** SVG 문자열을 w×h PNG 로. transparent 면 바탕 투명. */
async function render(svgText, w, h = w, { transparent = false } = {}) {
  const sized = svgText.replace(/<svg([^>]*?) width="[^"]*" height="[^"]*"/, `<svg$1 width="${w}" height="${h}"`);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
  return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
}

const out = {
  'icon.png': toOpaqueRGB(await render(iosIcon, 1024), B.BRAND.cream),
  'android-icon-foreground.png': await render(adaptive(mark), 1024, 1024, { transparent: true }),
  'android-icon-monochrome.png': await render(adaptive(svg('MARK_MONO.svg')), 1024, 1024, { transparent: true }),
  'favicon.png': await render(appIcon, 32, 32, { transparent: true }),
  'splash-icon.png': await render(mark, 600, 480, { transparent: true }),
  'splash-icon-dark.png': await render(markDark, 600, 480, { transparent: true }),
};
for (const [name, buf] of Object.entries(out)) writeFileSync(join(OUT, name), buf);

// ── 확인용 시트 ──
const b64 = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
const { cream, forest } = B.BRAND;
const fig = (img, cap, style = '') => `<figure style="${style}">${img}<figcaption>${cap}</figcaption></figure>`;
const sheet = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;font:13px/1.45 -apple-system,"Apple SD Gothic Neo",sans-serif;background:#EEE9DF;color:#1F1B16;width:1400px}
  h1{font-size:20px;margin:0;padding:28px 36px 4px} .note{padding:0 36px 16px;color:#6B635A;margin:0}
  .row{display:flex;align-items:flex-end;gap:34px;padding:22px 36px;flex-wrap:wrap}
  .lab{width:190px;margin:0;align-self:center;font-weight:700}
  figure{margin:0;text-align:center} figcaption{font-size:11px;opacity:.75;margin-top:7px}
  .px{image-rendering:pixelated}
  .ios{border-radius:22.37%;box-shadow:0 2px 10px rgb(0 0 0/.18);display:block}
  .circ{border-radius:50%;overflow:hidden;background:${cream};box-shadow:0 2px 10px rgb(0 0 0/.18);display:block}
  .sq{border-radius:28%;overflow:hidden;background:${cream};box-shadow:0 2px 10px rgb(0 0 0/.18);display:block}
  .mono{border-radius:50%;overflow:hidden;background:#2F3A36;display:block}
  .mono img{filter:brightness(0) invert(.88) sepia(.2)}
  .splash{width:130px;height:282px;border-radius:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgb(0 0 0/.18)}
  .tabs{display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:12px}
  .tab{display:flex;gap:8px;align-items:center;padding:6px 12px;border-radius:8px;font-size:12px}
</style>
<h1>tbyb — 앱 아이콘 · 스플래시 · 파비콘 (app/assets/images)</h1>
<p class="note">원본: shared/brand/tbyb (TETO 선택안, 도형·색 그대로) · 만든 스크립트: app/scripts/brand-icons.mjs · 스플래시는 개발/스토어 빌드에서 보인다(Expo Go 는 자체 화면)</p>
<div class="row" style="background:#F4F1EA">
  <p class="lab">iOS 앱 아이콘<br><span style="font-weight:400;color:#6B635A">icon.png · 1024 RGB(투명도 없음) · 꽉 찬 크림 정사각형 — 모서리는 iOS 가 자른다</span></p>
  ${fig(`<img src="${b64(out['icon.png'])}" width="200" height="200" style="display:block;box-shadow:0 2px 10px rgb(0 0 0/.18)">`, '원본 PNG (정사각형)')}
  ${fig(`<img class="ios" src="${b64(out['icon.png'])}" width="200" height="200">`, 'iOS 마스크 적용')}
  ${fig(`<img class="ios" src="${b64(out['icon.png'])}" width="60" height="60">`, '60pt')}
  ${fig(`<img class="ios" src="${b64(out['icon.png'])}" width="29" height="29">`, '29pt')}
</div>
<div class="row" style="background:#1C1A17;color:#F3ECE2">
  <p class="lab">어두운 홈 화면</p>
  ${fig(`<img class="ios" src="${b64(out['icon.png'])}" width="120" height="120">`, 'iOS')}
  ${fig(`<img class="circ" src="${b64(out['android-icon-foreground.png'])}" width="120" height="120">`, 'Android 원')}
  ${fig(`<img class="sq" src="${b64(out['android-icon-foreground.png'])}" width="120" height="120">`, 'Android 둥근 사각')}
</div>
<div class="row" style="background:#F4F1EA">
  <p class="lab">Android 적응형<br><span style="font-weight:400;color:#6B635A">앞면(투명) + backgroundColor ${cream} · 테마 아이콘(한 색)</span></p>
  ${fig(`<div style="position:relative;width:200px;height:200px;background:${cream};box-shadow:0 2px 10px rgb(0 0 0/.18)"><img src="${b64(out['android-icon-foreground.png'])}" width="200" height="200" style="display:block"><div style="position:absolute;left:${(100 - (200 * 66) / 108 / 2).toFixed(1)}px;top:${(100 - (200 * 66) / 108 / 2).toFixed(1)}px;width:${((200 * 66) / 108).toFixed(1)}px;height:${((200 * 66) / 108).toFixed(1)}px;border-radius:50%;outline:1.5px dashed #C0392B"></div><div style="position:absolute;left:${(100 - (200 * 72) / 108 / 2).toFixed(1)}px;top:${(100 - (200 * 72) / 108 / 2).toFixed(1)}px;width:${((200 * 72) / 108).toFixed(1)}px;height:${((200 * 72) / 108).toFixed(1)}px;outline:1px dotted #6B635A"></div></div>`, '108dp 캔버스 · 점선 원 = 안전 원 66dp · 점선 네모 = 보이는 72dp')}
  ${fig(`<img class="circ" src="${b64(out['android-icon-foreground.png'])}" width="160" height="160">`, '원')}
  ${fig(`<img class="sq" src="${b64(out['android-icon-foreground.png'])}" width="160" height="160">`, '둥근 사각')}
  ${fig(`<img class="circ" src="${b64(out['android-icon-foreground.png'])}" width="48" height="48">`, '48dp')}
  ${fig(`<div class="mono" style="width:120px;height:120px"><img src="${b64(out['android-icon-monochrome.png'])}" width="120" height="120" style="display:block"></div>`, '테마 아이콘 (monochrome)')}
</div>
<div class="row" style="background:#F4F1EA">
  <p class="lab">스플래시<br><span style="font-weight:400;color:#6B635A">imageWidth 120 · 390pt 폭 화면 기준 축소</span></p>
  ${fig(`<div class="splash" style="background:${cream}"><img src="${b64(out['splash-icon.png'])}" width="40" height="32"></div>`, `라이트 · ${cream} + 컬러 심볼`)}
  ${fig(`<div class="splash" style="background:${forest}"><img src="${b64(out['splash-icon-dark.png'])}" width="40" height="32"></div>`, `다크 · ${forest} + 다크 심볼(sage·apricot)`)}
  ${fig(`<img src="${b64(out['splash-icon.png'])}" width="300" height="240" style="display:block;background:${cream}">`, 'splash-icon.png (600×480)')}
  ${fig(`<img src="${b64(out['splash-icon-dark.png'])}" width="300" height="240" style="display:block;background:${forest}">`, 'splash-icon-dark.png')}
</div>
<div class="row" style="background:#F4F1EA">
  <p class="lab">파비콘 32<br><span style="font-weight:400;color:#6B635A">favicon.png = APP_ICON_COLOR.svg</span></p>
  ${fig(`<img class="px" src="${b64(out['favicon.png'])}" width="128" height="128">`, '실제 픽셀 (4배)')}
  <div class="tabs" style="background:#DEE1E6"><span class="tab" style="background:#fff"><img src="${b64(out['favicon.png'])}" width="16" height="16">tbyb — 첫 비교팩</span><span class="tab"><img src="${b64(out['favicon.png'])}" width="16" height="16">라이트 탭</span></div>
  <div class="tabs" style="background:#202124;color:#E8EAED"><span class="tab" style="background:#35363A"><img src="${b64(out['favicon.png'])}" width="16" height="16">tbyb — 첫 비교팩</span><span class="tab"><img src="${b64(out['favicon.png'])}" width="16" height="16">다크 탭</span></div>
</div>`;
await page.setViewportSize({ width: 1400, height: 900 });
await page.setContent(sheet);
await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = r))))));
await page.screenshot({ path: join(SHOTS, 'app-brand-icon.png'), fullPage: true });
await browser.close();

// ── 결과 확인 ──
for (const [name, buf] of Object.entries(out)) {
  const { w, h, ctype } = readPng(buf);
  console.log(`${name.padEnd(28)} ${w}×${h} ${ctype === 2 ? 'RGB (투명도 없음)' : ctype === 6 ? 'RGBA' : `type ${ctype}`}`);
}
if (readPng(out['icon.png']).ctype !== 2) throw new Error('icon.png 에 알파 채널이 남아 있습니다');
console.log(`적응형 심볼: 상자 ${box.w.toFixed(0)}×${box.h.toFixed(0)}px, 모서리 거리 ${corner.toFixed(0)}px ≤ 안전 원 반지름 ${SAFE_R.toFixed(0)}px`);
console.log('시트: docs/screenshots/app-brand-icon.png');
