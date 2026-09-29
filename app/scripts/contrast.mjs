// 색 대비 검사 (WCAG 2.x 상대 휘도) — 라이트·다크 두 팔레트 모두.
// 앱 화면에서 실제로 함께 쓰는 [글자/그래픽, 바탕] 토큰 쌍만 나열한다 (어디서 쓰는지 주석).
//   text  : 작은 글자 → 4.5:1 이상
//   large : 큰 제목 (24px 이상, 또는 19px 이상 굵게) → 3:1 이상
//   ui    : 상태를 알려 주는 그래픽·경계 (채운 선택, 체크 표시, 체크박스·라디오 테두리, 스위치, 진행 고리) → 3:1 이상
//   info  : 장식용 머리카락 선 · 입력칸 테두리 · 비활성 · 옆 글자가 같은 뜻을 이미 전하는 보조 그래픽
//           — 계산만 보여 주고 실패로 치지 않는다
//
// 사용: (app/ 에서) node scripts/contrast.mjs        # 기준 미달이 있으면 종료 코드 1
//       node scripts/contrast.mjs --all              # 통과한 쌍까지 전부 출력
// palette.ts 는 앱(Metro)과 같이 쓰는 TS 파일이라 package.json 에 type 을 두지 않는다 — Node 의 형식 추측 경고만 숨긴다
process.removeAllListeners('warning');
process.on('warning', (w) => w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && console.warn(w));
const { PALETTES } = await import('../src/lib/palette.ts');

const MIN = { text: 4.5, large: 3, ui: 3, info: 0 };

// [종류, 글자·그래픽 토큰, 바탕 토큰, 쓰는 곳]
const PAIRS = [
  // ── 기본 글자 ──
  ['text', 'ink', 'bg', '화면 바탕 위 본문·섹션 제목'],
  ['text', 'ink', 'surface', '카드 본문'],
  ['text', 'ink', 'sunk', '진행 단계 번호 · 검토 결과 칸 · 시트 닫기 아이콘'],
  ['text', 'sub', 'bg', '섹션 설명 · 아이브로우 (11px)'],
  ['text', 'sub', 'surface', '카드 보조 글자 · 캡션 · 타임라인 아직 안 온 단계 · 웹 탭 비활성'],
  ['text', 'sub', 'sunk', '세그먼트 안 고른 칸 · 코드 표 머리'],
  ['text', 'placeholder', 'surface', '입력칸 안내 글자'],
  ['text', 'coralInk', 'bg', '히어로·미션 아이브로우'],
  ['text', 'coralInk', 'surface', '리워드 금액 · 진행 고리 완료 숫자 · 타임라인 "지금" · 추천 사유'],
  ['text', 'error', 'surface', '결제 기한 지남 · 배정 기기 없음'],
  ['text', 'warnText', 'surface', '결제 남은 시간 · 판매 확인 대기 · 운영 메모'],
  ['text', 'doneText', 'surface', '날짜 칸 "가능"'],

  // ── 잉크(뒤집힌) 바탕 ──
  ['text', 'ivory', 'ink', '주 버튼 · 고른 칩 · 예약 확정/체험 중 상태 칩 · 시뮬레이터 배너'],
  ['text', 'onInkSub', 'ink', '고른 날짜 요일 · 고른 예약 상태 · 시뮬레이터 배너 설명'],

  // ── 채운 버튼·세그먼트 ──
  ['text', 'onCoral', 'coral', '리워드 신청 버튼 (16px 굵게)'],
  ['text', 'onAir', 'air', '세그먼트 "Air 쪽" 고름'],
  ['text', 'onPro', 'pro', '세그먼트 "Pro 쪽" 고름'],

  // ── 연한 칩·알림 상자 ──
  ['text', 'sub', 'greySoft', '정보 알림 · 기본 알약 · 요청 접수 칩'],
  ['text', 'grey', 'greySoft', '취소 · 지급 안 함 · 판매됨 칩'],
  ['text', 'warnText', 'warnBg', '주의 알림 · 결제 대기 칩 · 날짜 "확인 필요" · 검토 표시'],
  ['text', 'error', 'errorSoft', '오류 글자 · 저장소 오류 카드 · 위험 버튼'],
  ['text', 'doneText', 'doneSoft', '완료 알림 · 완료 칩'],
  ['text', 'coralInk', 'coralSoft', '리워드 신청함 · 필수 알약 · 고객 이력 알약 · 알림 종'],
  ['text', 'proInk', 'proSoft', '반납 접수/검수 중 칩 · 검수 알약'],
  ['text', 'airInk', 'airSoft', '비교 포인트 Air · 기기 라벨'],
  ['text', 'ink', 'airSoft', '기기 태그 · 바탕화면 코드 라벨'],
  ['text', 'ink', 'proSoft', '기기 태그 · 바탕화면 코드 라벨'],
  ['text', 'sandInk', 'sandSoft', '미션 답 "비슷했어요"'],
  ['text', 'ink', 'coralWash', '리워드 조건 칸'],
  ['text', 'coralInk', 'coralWash', '리워드 조건 칸 완료 표시'],
  ['text', 'sub', 'coralWash', '리워드 조건 칸 "아직"'],
  ['text', 'ink', 'coralSoft', '진행 단계 03 번호'],
  ['text', 'ink', 'warnBg', '판매 확인 칸 본문'],

  // ── 큰 제목 ──
  ['large', 'ink', 'bg', '탭 큰 제목 · 히어로 제목 (29px)'],
  ['large', 'ink', 'surface', '상태 카드 제목 · 빈 화면 제목'],
  ['large', 'airInk', 'airSoft', '운영 코드 (28px)'],

  // ── 상태 그래픽 ──
  ['ui', 'ink', 'bg', '주 버튼 · 고른 칩 경계 (바탕 위)'],
  ['ui', 'ink', 'surface', '고른 칩 · 고른 날짜 · 체크박스 채움 · 스위치 켬 (카드 위)'],
  ['ui', 'control', 'surface', '체크박스·라디오 테두리'],
  ['ui', 'air', 'surface', 'Air 체크박스·스위치·고른 미션 답 테두리'],
  ['ui', 'pro', 'surface', 'Pro 체크박스·스위치·고른 미션 답 테두리'],
  ['ui', 'sand', 'surface', '고른 미션 답 테두리 (비슷함)'],
  ['ui', 'unsure', 'surface', '고른 미션 답 테두리 (모르겠음)'],
  ['ui', 'onMark', 'air', '답 표시 A · 체크'],
  ['ui', 'onMark', 'pro', '답 표시 P · 체크'],
  ['ui', 'onMark', 'sand', '답 표시 ='],
  ['ui', 'onMark', 'unsure', '답 표시 ?'],
  ['ui', 'onCoral', 'coral', '조건 점 체크'],
  ['ui', 'ivory', 'ink', '타임라인 완료 체크 · 미션 완료 배지'],
  ['ui', 'doneText', 'surface', '코드 일치 아이콘'],
  ['ui', 'error', 'surface', '코드 불일치 아이콘'],

  // ── 참고만 (기준 없음) ──
  ['info', 'line', 'surface', '카드 머리카락 선'],
  ['info', 'line', 'bg', '카드 테두리 (바탕 쪽)'],
  ['info', 'lineStrong', 'surface', '입력칸·보조 버튼·칩 테두리'],
  ['info', 'surface', 'bg', '카드 면 (바탕 위)'],
  ['info', 'muted', 'surface', '목록 화살표 · 닫힌 날짜(비활성)'],
  ['info', 'switchOff', 'surface', '스위치 끔 트랙 (손잡이 위치로 구분)'],
  ['info', 'thumb', 'switchOff', '스위치 끔 손잡이'],
  ['info', 'coralSoft', 'surface', '진행 고리 트랙'],
  ['info', 'surface', 'sunk', '세그먼트 고른 칸 — 굵기·글자색·그림자로도 구분'],
  ['info', 'coral', 'surface', '진행 고리 호 (옆에 n/5 숫자) · 리워드 버튼 면 (글자로 식별)'],
  ['info', 'coral', 'coralWash', '조건 점 채움 (옆에 n/5 · 적음 글자)'],
  ['info', 'coral', 'ink', '고른 예약의 상태 점 (옆에 상태 글자)'],
];

function lum(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const all = process.argv.includes('--all');
const keys = Object.keys(PALETTES.light);
const darkKeys = Object.keys(PALETTES.dark);
let failed = 0;
if (keys.length !== darkKeys.length || keys.some((k) => !(k in PALETTES.dark))) {
  console.log('FAIL 라이트·다크 토큰 이름이 다릅니다');
  failed++;
}
for (const [name, p] of Object.entries(PALETTES)) {
  for (const [k, v] of Object.entries(p)) {
    if (!/^#[0-9A-F]{6}$/i.test(v)) {
      console.log(`FAIL ${name}.${k} = ${v} (#RRGGBB 아님)`);
      failed++;
    }
  }
}

const counts = { light: 0, dark: 0 };
for (const scheme of ['light', 'dark']) {
  const p = PALETTES[scheme];
  console.log(`\n── ${scheme} ──`);
  for (const [kind, fg, bg, where] of PAIRS) {
    if (!p[fg] || !p[bg]) {
      console.log(`FAIL 없는 토큰: ${fg} / ${bg}`);
      failed++;
      continue;
    }
    const r = ratio(p[fg], p[bg]);
    const ok = r >= MIN[kind];
    if (kind !== 'info') counts[scheme]++;
    if (!ok) failed++;
    if (!ok || all || kind === 'info') {
      const tag = kind === 'info' ? 'INFO' : ok ? 'PASS' : 'FAIL';
      console.log(`${tag} ${kind.padEnd(5)} ${r.toFixed(2).padStart(5)}:1  ${fg} ${p[fg]} / ${bg} ${p[bg]}  — ${where}`);
    }
  }
}
const enforced = PAIRS.filter(([k]) => k !== 'info').length;
console.log(`\n검사한 쌍: 테마마다 ${enforced}개 (text ${PAIRS.filter(([k]) => k === 'text').length} · large ${PAIRS.filter(([k]) => k === 'large').length} · ui ${PAIRS.filter(([k]) => k === 'ui').length}) + 참고 ${PAIRS.length - enforced}개`);
console.log(failed ? `기준 미달 ${failed}건` : '모두 기준 통과');
process.exit(failed ? 1 : 0);
