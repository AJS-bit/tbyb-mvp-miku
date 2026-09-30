// tbyb 브랜드 (TETO 선택안 「두 선택 사이, 나의 기준」) — 원본은 shared/brand/tbyb/ (README · MARK.svg · BRAND_BRIEF.json).
// 도형·색은 원본 그대로 옮긴 것이다. 바꾸지 않는다. (scripts/brand-icons.mjs 가 MARK.svg 와 같은지 확인한다)
// 순수 데이터만 둔다 — scripts/contrast.mjs · scripts/brand-icons.mjs 가 이 파일을 그대로 읽는다.

/** 브랜드 색 (BRAND_BRIEF.json palette). 좌우 색은 선택지 구분일 뿐 우열이 아니다. */
export const BRAND = {
  forest: '#193D35',
  apricot: '#F18463',
  cream: '#F7F3EA',
  sage: '#DCE6CF',
} as const;

/** 심볼 도형 — MARK.svg (viewBox 0 0 100 80): 같은 크기의 열린 프레임 두 개가 가운데 점(나의 기준)을 마주 본다 */
export const MARK_VIEWBOX = { width: 100, height: 80 } as const;
export const MARK_LEFT = 'M42 8H24C13 8 4 17 4 28V52C4 63 13 72 24 72H42V56H27C23 56 20 53 20 49V31C20 27 23 24 27 24H42Z';
export const MARK_RIGHT = 'M58 8H76C87 8 96 17 96 28V52C96 63 87 72 76 72H58V56H73C77 56 80 53 80 49V31C80 27 77 24 73 24H58Z';
export const MARK_DOT = { cx: 50, cy: 40, r: 6 } as const;

/** 워드마크 · 태그라인 — 플랫폼 이름. MacBook Air·Pro 는 "첫 비교팩"으로 따로 부른다. */
export const WORDMARK = 'tbyb';
export const TAGLINE = '써 보고, 나의 기준으로.';
export const FIRST_PACK = '첫 비교팩';
