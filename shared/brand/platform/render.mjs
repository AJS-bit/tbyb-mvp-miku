// 플랫폼 로고안 시트 렌더 — node shared/brand/platform/render.mjs (저장소 루트에서)
// 결과: shared/brand/platform/svg/*.svg (심볼 원본), docs/screenshots/platform-logo-*.png (제안 시트)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../web/node_modules/playwright/index.mjs';
import { CATEGORY, CONCEPTS, DARK, LIGHT, icon } from './marks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const OUT = join(ROOT, 'docs/screenshots');
mkdirSync(join(HERE, 'svg'), { recursive: true });

const NAME = 'Try Before You Buy';
const TAG = '써 보고 고르는 모든 것';
const SANS = "-apple-system, 'SF Pro Display', 'Apple SD Gothic Neo', sans-serif";
const sized = (svg, s) => svg.replace('<svg ', `<svg width="${s}" height="${s}" `);
const cats = Object.keys(CATEGORY);

for (const c of CONCEPTS) {
  writeFileSync(join(HERE, 'svg', `${c.no}-${c.key}.svg`), c.mark(LIGHT));
  writeFileSync(join(HERE, 'svg', `${c.no}-${c.key}-dark.svg`), c.mark(DARK));
}

const lockup = (c, p, s = 56, tag = true) => `<div style="display:flex;align-items:center;gap:${s * 0.28}px">
  ${sized(c.mark(p), s)}
  <div><div style="font:800 ${s * 0.5}px/1.05 ${SANS};letter-spacing:-0.02em;color:${p.ink}">${NAME}</div>
  ${tag ? `<div style="font:600 ${s * 0.22}px/1.4 ${SANS};color:${p.sub};margin-top:${s * 0.06}px;letter-spacing:0.02em">${TAG}</div>` : ''}</div></div>`;

const appIcon = (c, p, s, dark = false) => `<div style="width:${s}px;height:${s}px;border-radius:${s * 0.225}px;background:${dark ? '#221E19' : LIGHT.paper};display:flex;align-items:center;justify-content:center;box-shadow:0 ${s * 0.04}px ${s * 0.12}px rgba(0,0,0,.18)">${sized(c.mark(dark ? DARK : LIGHT), s * 0.66)}</div>`;

// 픽셀 그대로 확대해 16·32px 실제 모양 보기
const pixel = (c, p, s) => `<div style="width:${s * 6}px;height:${s * 6}px;background:${p.paper};display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid ${p.line}">
  <canvas data-src="${encodeURIComponent(c.mark(p))}" data-size="${s}" data-bg="${p.paper}" width="${s}" height="${s}" style="width:${s * 5}px;height:${s * 5}px;image-rendering:pixelated"></canvas></div>`;

// 개념별 카테고리 적용 예
function application(c, p) {
  const pairs = [['헤드폰', 'A', 'B'], ['키보드', 'A', 'B'], ['자동차', 'A', 'B']];
  if (c.key === 'overlap') {
    return pairs.map(([cat]) => `<div style="text-align:center"><svg width="150" height="120" viewBox="0 0 150 120">
      <defs><clipPath id="ap-${cat}-${p === DARK ? 'd' : 'l'}"><rect x="8" y="8" width="80" height="80" rx="20"/></clipPath></defs>
      <rect x="8" y="8" width="80" height="80" rx="20" fill="${p.a}"/>
      <rect x="62" y="32" width="80" height="80" rx="20" fill="${p.b}"/>
      <rect x="62" y="32" width="80" height="80" rx="20" fill="${p.pick}" clip-path="url(#ap-${cat}-${p === DARK ? 'd' : 'l'})"/>
      <g transform="translate(20 20) scale(1.5)"><path d="${CATEGORY[cat]}" fill="none" stroke="${p.paper}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g transform="translate(94 64) scale(1.5)"><path d="${CATEGORY[cat]}" fill="none" stroke="${p.paper}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>
      <path d="M68 60 L74 66 L83 55" fill="none" stroke="${p.paper}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><div style="font:600 14px ${SANS};color:${p.sub}">${cat} 비교팩</div></div>`).join('');
  }
  if (c.key === 'slider') {
    return pairs.map(([cat]) => `<div style="text-align:center"><svg width="150" height="120" viewBox="0 0 150 120">
      <defs><clipPath id="sl-${cat}-${p === DARK ? 'd' : 'l'}"><rect x="15" y="10" width="60" height="100"/></clipPath></defs>
      <rect x="15" y="10" width="120" height="100" rx="24" fill="${p.b}"/>
      <rect x="15" y="10" width="120" height="100" rx="24" fill="${p.a}" clip-path="url(#sl-${cat}-${p === DARK ? 'd' : 'l'})"/>
      <g transform="translate(22 42) scale(1.5)"><path d="${CATEGORY[cat]}" fill="none" stroke="${p.paper}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g transform="translate(92 42) scale(1.5)"><path d="${CATEGORY[cat]}" fill="none" stroke="${p.paper}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></g>
      <rect x="72" y="10" width="6" height="100" fill="${p.paper}"/>
      <circle cx="75" cy="60" r="15" fill="${p.paper}"/>
      <path d="M71.5 54 L64.5 60 L71.5 66 Z M78.5 54 L85.5 60 L78.5 66 Z" fill="${p.pick}" stroke="${p.pick}" stroke-width="2" stroke-linejoin="round"/>
    </svg><div style="font:600 14px ${SANS};color:${p.sub}">${cat} 비교팩</div></div>`).join('');
  }
  return pairs.map(([cat]) => `<div style="text-align:center"><div style="width:150px;height:120px;display:flex;align-items:center;justify-content:center;gap:10px">
      <div style="width:52px;height:52px;border-radius:16px;background:${p.a};display:flex;align-items:center;justify-content:center">${icon(cat, p.paper, 30)}</div>
      <div style="width:36px">${sized(c.mark(p), 36)}</div>
      <div style="width:52px;height:52px;border-radius:16px;background:${p.b};display:flex;align-items:center;justify-content:center">${icon(cat, p.paper, 30)}</div>
    </div><div style="font:600 14px ${SANS};color:${p.sub}">${cat} 비교팩</div></div>`).join('');
}

const chips = (c, p) => cats.map((cat) => `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:999px;background:${p === DARK ? '#221E19' : '#FFFFFF'};border:1px solid ${p.line}">
  ${sized(c.mark(p), 22)}${icon(cat, p.ink, 20)}<span style="font:600 14px ${SANS};color:${p.ink}">${cat}</span></div>`).join('');

function panel(c, p) {
  const dark = p === DARK;
  return `<div style="background:${p.paper};padding:40px 48px;display:grid;gap:34px">
  <div style="display:flex;align-items:center;gap:56px">
    <div style="width:220px;height:220px;display:flex;align-items:center;justify-content:center;border-radius:28px;background:${dark ? '#1E1A15' : '#F4EDE2'}">${sized(c.mark(p), 180)}</div>
    <div style="display:grid;gap:26px">${lockup(c, p, 64)}${lockup(c, p, 34, false)}</div>
  </div>
  <div style="display:flex;align-items:flex-end;gap:28px">
    ${appIcon(c, p, 120, dark)}${appIcon(c, p, 60, dark)}
    ${pixel(c, p, 32)}${pixel(c, p, 16)}
    <div style="font:500 13px/1.6 ${SANS};color:${p.sub}">앱 아이콘 120·60 · 파비콘 32·16px<br>(오른쪽 둘은 실제 픽셀을 확대)</div>
  </div>
  <div style="display:flex;gap:18px;flex-wrap:wrap">${application(c, p)}</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">${chips(c, p)}</div>
</div>`;
}

function conceptPage(c) {
  return `<div style="background:#EFE8DD;padding:40px 48px 30px;font-family:${SANS}">
  <div style="font:700 13px ${SANS};letter-spacing:.18em;color:#B93F22">PLATFORM LOGO · ${c.no}안 · ${c.en}${c.no === '1' ? ' · 추천' : ''}</div>
  <div style="font:800 40px/1.2 ${SANS};letter-spacing:-.02em;color:#1F1B16;margin-top:8px">${c.no}안 ${c.name}</div>
  <div style="font:600 20px/1.5 ${SANS};color:#3A342D;margin-top:8px">${c.idea}</div>
  <ul style="margin:14px 0 0;padding-left:20px;font:500 15px/1.75 ${SANS};color:#5A5249">${c.why.map((w) => `<li>${w}</li>`).join('')}</ul>
</div>${panel(c, LIGHT)}${panel(c, DARK)}`;
}

function overview() {
  return `<div style="background:#FAF6EF;padding:48px;font-family:${SANS}">
  <div style="font:700 13px ${SANS};letter-spacing:.18em;color:#B93F22">TRY BEFORE YOU BUY · PLATFORM LOGO</div>
  <div style="font:800 40px/1.25 ${SANS};letter-spacing:-.02em;color:#1F1B16;margin-top:8px">맥북을 넘어, 무엇이든 비교해 보고 고르는 곳</div>
  <div style="font:500 17px/1.7 ${SANS};color:#5A5249;margin-top:10px">제품 모양을 그리지 않고 "두 선택지를 비교해 나에게 맞는 걸 고른다"만 담았어요. 헤드폰부터 자동차까지 같은 로고를 써요.</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:34px">
  ${CONCEPTS.map((c) => `<div style="border-radius:28px;overflow:hidden;border:${c.no === '1' ? '3px solid #FF6B4A' : '1px solid #EAE3D8'};background:#FFFFFF">
    <div style="display:flex;gap:0">
      <div style="flex:1;height:200px;display:flex;align-items:center;justify-content:center;background:#FAF6EF">${sized(c.mark(LIGHT), 130)}</div>
      <div style="flex:1;height:200px;display:flex;align-items:center;justify-content:center;background:#16130F">${sized(c.mark(DARK), 130)}</div>
    </div>
    <div style="padding:20px 22px 24px">
      <div style="font:800 22px ${SANS};color:#1F1B16">${c.no}안 ${c.name}${c.no === '1' ? ' <span style="font:700 13px ' + SANS + ';color:#FFFFFF;background:#FF6B4A;border-radius:999px;padding:3px 10px;vertical-align:middle">추천</span>' : ''}</div>
      <div style="font:500 15px/1.6 ${SANS};color:#5A5249;margin-top:6px">${c.idea}</div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:16px">${[16, 24, 32, 48].map((s) => sized(c.mark(LIGHT), s)).join('')}</div>
    </div></div>`).join('')}
  </div></div>`;
}

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 400 }, deviceScaleFactor: 2 });
async function shot(html, file) {
  await page.setContent(`<body style="margin:0;background:#FAF6EF">${html}</body>`);
  // 캔버스에 실제 크기로 그려 픽셀 확대 보기 만들기
  await page.evaluate(async () => {
    for (const cv of document.querySelectorAll('canvas[data-src]')) {
      const s = +cv.dataset.size;
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + cv.dataset.src;
      await img.decode();
      const ctx = cv.getContext('2d');
      ctx.fillStyle = cv.dataset.bg; ctx.fillRect(0, 0, s, s);
      ctx.drawImage(img, 0, 0, s, s);
    }
  });
  await page.screenshot({ path: join(OUT, file), fullPage: true });
  console.log('wrote', file);
}
await shot(overview(), 'platform-logo-overview.png');
for (const c of CONCEPTS) await shot(conceptPage(c), `platform-logo-${c.no}-${c.key}.png`);
await b.close();
