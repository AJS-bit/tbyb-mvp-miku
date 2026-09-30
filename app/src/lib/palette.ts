// 색 토큰 원본 (라이트 · 다크) — 순수 데이터만 둔다. scripts/contrast.mjs 가 이 파일을 그대로 읽어 대비를 계산한다.
// 라이트 = SPEC.md v2 「감성 디자인 방향」 · 다크 = SPEC.md 「다크 모드」 표에서 출발해 대비 계산으로 다듬은 값.
// 두 팔레트는 키가 완전히 같아야 한다 (타입으로 강제).
//
// 다크 원칙: "밤에 켠 스탠드" — 순검정·순백 없이 따뜻한 갈색 바탕, 잉크 버튼은 뒤집는다(밝은 버튼 + 어두운 글자).

export const light = {
  // ── 바탕·글자 ──
  bg: '#FAF6EF', // 따뜻한 아이보리
  sunk: '#F3EDE3', // 한 톤 낮은 칸 — 트랙·미리보기
  surface: '#FFFFFF',
  ink: '#1F1B16', // 본문 · 잉크 버튼 바탕
  ivory: '#FAF6EF', // 잉크 바탕 위 글자·아이콘
  onInkSub: '#D9CFC2', // 잉크 바탕 위 보조 글자
  sub: '#6B635A',
  muted: '#A0968A', // 글자 아닌 것: 화살표·비활성·장식 점
  placeholder: '#7E7467', // 입력칸 안내 글자 (표면 위 4.5:1)
  line: '#EAE3D8',
  lineStrong: '#DDD3C4',
  control: '#978C7F', // 체크박스·라디오 테두리 (표면 위 3:1)
  railIdle: '#D9D0C3', // 타임라인 아직 안 온 단계
  switchOff: '#D9D0C3',
  thumb: '#FFFFFF',
  sun: '#FFE2C2',

  // ── 기기 색 ──
  air: '#1E9E8A',
  airSoft: '#E3F4F0',
  airInk: '#11695C', // 연한 바탕 위 작은 글자
  onAir: '#1F1B16', // Air 채움 위 글자 (흰 글자는 3.3:1 로 모자람)
  pro: '#6D4AFF',
  proSoft: '#EEEAFF',
  proInk: '#4B2FC9',
  onPro: '#FFFFFF',

  // ── 리워드 코랄 ──
  coral: '#FF6B4A',
  coralSoft: '#FFEDE7',
  coralInk: '#B8391E',
  coralLine: '#FFD5C8',
  coralWash: '#FFF8F4', // 리워드 카드 안 조건 칸
  coralControl: '#E9C9BD', // 조건 점 테두리
  onCoral: '#1F1B16', // 코랄 버튼 글자 (흰 글자는 2.8:1 로 모자람)

  // ── 상태 ──
  warnBg: '#FFF4E0',
  warnText: '#8A5A00',
  warnLine: '#F3DDB0',
  warnDot: '#DC8B00',
  error: '#D3291D', // 오류 글자 — errorSoft 위 4.5:1 (기존 #D92D20 은 4.44:1)
  errorSoft: '#FEF3F2',
  errorLine: '#FBCFCA',
  done: '#12B76A',
  doneText: '#067647',
  doneSoft: '#E8F6EE',
  doneLine: '#B7E6CB',
  grey: '#6E655B', // 취소·거절 칩 글자
  greySoft: '#F1ECE4',

  // ── 미션 답 (비슷함 = 모래색 · 모르겠음 = 따뜻한 회색) ──
  sand: '#B8894A',
  sandSoft: '#F7EEDF',
  sandInk: '#7A5620',
  unsure: '#9A9084',
  onMark: '#FFFFFF', // 채운 원·체크 위 기호 (A · P · = · ? · ✓)

  // ── 그림자 ──
  shadow: '#5A4630',

  // ── 일러스트 ──
  artInk: '#1F1B16', // 선
  artBody: '#FFFFFF', // 노트북 몸체
  artBase: '#F3EDE3', // 노트북 바닥·키보드
  artShadow: '#EFE4D3', // 바닥 그림자
  artAirScreen: '#1E9E8A',
  artProScreen: '#6D4AFF',
  artScreenText: '#FAF6EF',
  artAirHi: '#BFEDE3',
  artProHi: '#D5CAFF',
  artNotch: '#1F1B16',
  artPeach: '#FFE2C2',
  artButter: '#FFD98A',
  artAirFill: '#E3F4F0',
  artProFill: '#EEEAFF',
  artCoralFill: '#FFEDE7',
  artEnvelope: '#F7DCCF',
  artPaper: '#FFFFFF',
  artSunGlow: '#FFE2C2',
  tileCarry: '#FFF1E2',
  tileVideo: '#E9F6F2',
  tileScreen: '#FFF6DE',
  tileTyping: '#F2EEFF',
  tileDaily: '#E8F1FB', // 폰으로 하는 일 — 맑은 하늘색 (들고 나가기 타일과 겹치지 않게)
  tileHeavy: '#FFEFEA',
};

export type Palette = { [K in keyof typeof light]: string };

export const dark: Palette = {
  bg: '#16130F',
  sunk: '#1E1A15',
  surface: '#221E19',
  ink: '#F3ECE2',
  ivory: '#16130F',
  onInkSub: '#5E554B',
  sub: '#B4AA9D',
  muted: '#7D7367',
  placeholder: '#948A7C',
  line: '#342E27',
  lineStrong: '#4A4238',
  control: '#857B6E',
  railIdle: '#4A4238',
  switchOff: '#4A4238',
  thumb: '#EDE5DA',
  sun: '#664729', // SPEC 출발값 #5C4128 → 조금 더 호박색으로 (스탠드 불빛)

  air: '#3CC4AE',
  airSoft: '#13322D',
  airInk: '#7FE0CF',
  onAir: '#16130F',
  pro: '#9A85FF',
  proSoft: '#251E47',
  proInk: '#C2B6FF',
  onPro: '#16130F',

  coral: '#FF8A6B',
  coralSoft: '#3A1F17',
  coralInk: '#FFB39E',
  coralLine: '#5C3226',
  coralWash: '#2A1C16',
  coralControl: '#6B4436',
  onCoral: '#16130F',

  warnBg: '#33270F',
  warnText: '#F2C46B',
  warnLine: '#5A4520',
  warnDot: '#F2B544',
  error: '#FF6B5E',
  errorSoft: '#3A1614',
  errorLine: '#6B2A24',
  done: '#3DD68C',
  doneText: '#86E8B8',
  doneSoft: '#10301F',
  doneLine: '#1F5A3A',
  grey: '#A39A8E',
  greySoft: '#2A251F',

  sand: '#D0A46A',
  sandSoft: '#33291B',
  sandInk: '#E6C48F',
  unsure: '#8F8578',
  onMark: '#16130F',

  shadow: '#000000',

  artInk: '#E8DDCD',
  artBody: '#2B251F',
  artBase: '#3A332B',
  artShadow: '#0E0C09',
  artAirScreen: '#2B8577',
  artProScreen: '#6556C2',
  artScreenText: '#F3ECE2',
  artAirHi: '#9ED9CD',
  artProHi: '#C4B8F5',
  artNotch: '#16130F',
  artPeach: '#7A5A3E',
  artButter: '#D9A94A',
  artAirFill: '#2C6B60',
  artProFill: '#4B3F87',
  artCoralFill: '#6E3B2C',
  artEnvelope: '#5E3A2C',
  artPaper: '#3D352C',
  artSunGlow: '#A0703A',
  tileCarry: '#2D231A',
  tileVideo: '#172A26',
  tileScreen: '#2C2515',
  tileTyping: '#211D35',
  tileDaily: '#172330',
  tileHeavy: '#301F1A',
};

export const PALETTES = { light, dark } as const;
