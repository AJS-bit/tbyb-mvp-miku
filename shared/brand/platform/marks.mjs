// 비교 체험 플랫폼 로고안 — 제품 모양 없이 "둘을 비교해 나에게 맞는 걸 고른다"를 담은 심볼 3안.
// 모든 심볼은 64×64 격자, 배경 투명. palette 로 라이트/다크를 바꾼다.

export const LIGHT = { a: '#1E9E8A', b: '#6D4AFF', pick: '#FF6B4A', ink: '#1F1B16', paper: '#FAF6EF', sub: '#6B635A', line: '#EAE3D8', sun: '#FFD9AE' };
export const DARK = { a: '#3CC4AE', b: '#9A85FF', pick: '#FF8A6B', ink: '#F3ECE2', paper: '#16130F', sub: '#B4AA9D', line: '#342E27', sun: '#5C4128' };

let uid = 0;
const id = (p) => `${p}${++uid}`;

// 1안 · 겹침 — 두 카드가 대각선으로 겹치고, 겹친 칸이 "나에게 맞는 답"(코랄 + 체크)
export function overlap(c, { check = true } = {}) {
  const clip = id('ov');
  const r = 9;
  const A = { x: 6, y: 6, s: 34 };
  const B = { x: 24, y: 24, s: 34 };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><clipPath id="${clip}"><rect x="${A.x}" y="${A.y}" width="${A.s}" height="${A.s}" rx="${r}"/></clipPath></defs>
  <rect x="${A.x}" y="${A.y}" width="${A.s}" height="${A.s}" rx="${r}" fill="${c.a}"/>
  <rect x="${B.x}" y="${B.y}" width="${B.s}" height="${B.s}" rx="${r}" fill="${c.b}"/>
  <rect x="${B.x}" y="${B.y}" width="${B.s}" height="${B.s}" rx="${r}" fill="${c.pick}" clip-path="url(#${clip})"/>
  ${check ? `<path d="M26.8 32.6 L30.6 36.4 L37.4 28.4" fill="none" stroke="${c.paper}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
</svg>`;
}

// 2안 · 비교 슬라이더 — 한 장의 카드를 반씩 나눠 보는 비교 손잡이. 둘 사이를 직접 오가며 써 보기
export function slider(c) {
  const clipL = id('sl');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><clipPath id="${clipL}"><rect x="6" y="6" width="26" height="52"/></clipPath></defs>
  <rect x="6" y="6" width="52" height="52" rx="14" fill="${c.b}"/>
  <rect x="6" y="6" width="52" height="52" rx="14" fill="${c.a}" clip-path="url(#${clipL})"/>
  <rect x="30" y="6" width="4" height="52" fill="${c.paper}"/>
  <circle cx="32" cy="32" r="10" fill="${c.paper}"/>
  <path d="M29.6 28.2 L25 32 L29.6 35.8 Z M34.4 28.2 L39 32 L34.4 35.8 Z" fill="${c.pick}" stroke="${c.pick}" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
}

// 3안 · 두 색 체크 — 체크의 짧은 획(청록)과 긴 획(보라)이 두 선택지, 둘이 만나는 점(코랄)이 "내가 고른 순간"
export function paths(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path d="M11 31 L26 46" fill="none" stroke="${c.a}" stroke-width="8" stroke-linecap="round"/>
  <path d="M26 46 L53 16" fill="none" stroke="${c.b}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="26" cy="46" r="7.2" fill="${c.pick}"/>
</svg>`;
}

// 카테고리 선 아이콘 (24 격자) — 로고가 어떤 제품에도 붙는지 검증용
export const CATEGORY = {
  헤드폰: 'M4 14v-2a8 8 0 0 1 16 0v2 M3.5 14h3.5v6h-2a1.5 1.5 0 0 1-1.5-1.5z M20.5 14h-3.5v6h2a1.5 1.5 0 0 0 1.5-1.5z',
  스피커: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M12 18.2a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4z M12 8.4a1.3 1.3 0 1 0 0-2.6a1.3 1.3 0 0 0 0 2.6z',
  마우스: 'M12 3a5 5 0 0 1 5 5v8a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5z M12 3v6',
  키보드: 'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z M6 10h.01 M10 10h.01 M14 10h.01 M18 10h.01 M8 14h8',
  모니터: 'M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M12 16v4 M8 20h8',
  노트북: 'M6 5h12a1 1 0 0 1 1 1v9H5V6a1 1 0 0 1 1-1z M2.5 18h19',
  자동차: 'M4 16a1 1 0 0 1-1-1v-2.6l2.1-4.2A2 2 0 0 1 6.9 7h10.2a2 2 0 0 1 1.8 1.2L21 12.4V15a1 1 0 0 1-1 1 M6 12h12 M7.5 17.8a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6z M16.5 17.8a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6z M9.3 16h5.4',
};

export function icon(name, color, size = 24, stroke = 1.8) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${CATEGORY[name]}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export const CONCEPTS = [
  {
    key: 'overlap',
    no: '1',
    name: '겹침',
    en: 'OVERLAP',
    mark: overlap,
    idea: '두 선택지를 나란히 겹쳐 보면, 가운데에 나에게 맞는 답이 생겨요.',
    why: [
      '청록·보라 두 카드 = 비교하는 두 제품. 겹친 코랄 칸 = 써 보고 찾은 "내 답".',
      '두 칸 안에 어떤 카테고리 아이콘이든 넣으면 그대로 "A vs B" 프레임이 돼요.',
      '작은 크기에서도 세 가지 색 덩어리로 읽혀요.',
    ],
  },
  {
    key: 'slider',
    no: '2',
    name: '비교 슬라이더',
    en: 'SLIDER',
    mark: slider,
    idea: '한 장면을 반씩 나눠 두 제품을 오가며 비교해요.',
    why: ['사진 비교에서 익숙한 "전·후 슬라이더" 손잡이 — 보자마자 비교가 떠올라요.', '청록·보라 두 면 = 두 제품, 가운데 손잡이 = 직접 오가며 써 보는 나.', '네모 한 덩어리라 앱 아이콘·파비콘에서 가장 단단해요.'],
  },
  {
    key: 'paths',
    no: '3',
    name: '두 색 체크',
    en: 'CHECK',
    mark: paths,
    idea: '두 제품을 다 써 본 뒤, 둘이 만나는 곳에서 마음을 정해요.',
    why: ['체크의 짧은 획(청록)과 긴 획(보라) = 비교한 두 제품, 만나는 코랄 점 = 내가 고른 순간.', '"써 보고 → 고른다"는 흐름이 체크 한 번에 담겨요.', '체크라서 선택·신뢰의 인상이 가장 또렷해요.'],
  },
];
