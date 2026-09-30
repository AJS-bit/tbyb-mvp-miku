# Try Before You Buy — 웹 데모 (v2)

MacBook Air · 14형 Pro 비교팩 시연용 웹. Next.js(App Router) 정적 빌드이며 서버·분석 도구·실제 결제·리워드 지급이 없습니다.
모든 데이터는 브라우저 `localStorage`(`tbyb-miku-demo-v2`, v1 데이터와 분리)에만 저장됩니다.

## 화면

| 경로 | 내용 |
|---|---|
| `/` | 소개 — 히어로, "이런 고민 해 본 적 있죠?", 이용 흐름 4단계, 미션 6개 미리보기, 리워드 안내, 미확정 항목 |
| `/pack/` | 비교팩 상세 — 같은 기준 확인 포인트(`COMPARE_POINTS`), 구성·픽업·취소/반납 규칙 |
| `/request/` | 데모 일정 요청 — 날짜·픽업만 필수. 용도(기본 '잘 모르겠어요')·궁금한 점은 선택, 지금 마음 + 확신 1–5. 이름·전화번호 없음 |
| `/my/?id=` | 내 체험 — 상태·타임라인·다음 할 일. 체험 중~검수 중에는 미션 진행(n/5)과 리워드 상태 |
| `/my/missions/?id=` | 미션과 리워드 — 리워드 카드(진행·금액·규칙·상태·신청), 바탕화면 코드 입력, 미션 6개(답 4개 + 후속 칩 + 선택 입력) |
| `/my/decide/?id=` | 마지막 날 결정 — 미션 답 요약(Air·비슷·Pro·모르겠음)과 미션별 답, 결정·이유(빠른 칩)·전후 확신·반납 계획 |
| `/ops/` | 운영 시뮬레이터 — 대장·단계 변경(사유 필수)·기기 확보·거래 대조·출고·검수·판매 확인, 출고 때 바탕화면 코드, 리워드 확인 |
| `/my/record/?id=` | v1 주소 — `/my/missions/` 로 옮겨 준다 |

규칙·문구·데모 데이터는 `src/lib/domain.ts`(= `../shared/domain.ts` 복사본)에서만 옵니다. 직접 고치지 말고 원본을 고친 뒤
`../scripts/sync-domain.sh` 로 복사하세요. 화면 전용 문구는 `src/lib/copy.ts` 와 각 화면 파일.
문구 다듬기(SPEC '다듬기 · 문장 원칙')로 바뀐 문장은 전·후를 `COPY_CHANGES.md` 에 모두 적어 두었습니다.

### 리워드·검토 표시를 다루는 방식

- 고객 화면에는 리워드 **상태**만 보입니다(`REWARD_STATUS_LABEL`). 검토 표시(`rewardFlags`·`REWARD_FLAG_LABEL`), 운영자가 띄운 코드,
  코드 일치 여부는 운영 시뮬레이터에만 나옵니다. 거절된 경우에만 운영자 메모를 고객에게 보여 줍니다.
- `reviewReward` 는 확인 메모를 이력 사유에 붙입니다. 고객용 '변경 이력'에서는 이 메모를 빼고 "리워드 {상태}" 만 보여 줍니다
  (`components/reservation.tsx` 의 `customerReason`). 운영 시뮬레이터의 전체 이력은 그대로 보여 줍니다.
- 바탕화면 코드는 "참고 단서"로만 다룹니다. 화면에 "증명·인증" 같은 표현을 쓰지 않습니다.

## 디자인 (SPEC.md v2 감성 방향)

- 토큰: `src/app/globals.css` — 아이보리 바탕 `#FAF6EF`, 잉크 주 버튼, Air `#1E9E8A` · Pro `#6D4AFF` · 리워드 코랄 `#FF6B4A`.
  작은 글자용 `*-ink` 색은 흰 바탕·아이보리 바탕에서 4.5:1 이상으로 맞췄습니다.
- 글: 큰 굵은 한글 제목(자간 -0.02em) + 작은 영문 대문자 아이브로우(`Eyebrow`), 본문 16–17px/행간 1.7, `word-break: keep-all`.
- 명조(세리프): **고운바탕 Bold** (`font-serif`, `--font-serif`) — 노트북 화면 문구, "이런 고민 해 본 적 있죠?" 인용 카드 문장,
  로고 워드마크에만 씁니다. 본문은 기존 산세리프 그대로입니다. 아래 '글꼴' 참고.
- 로고: `src/components/Brand.tsx` — 겹쳐 선 노트북 두 대(앞 왼쪽 얇은 Air 청록 · 뒤 오른쪽 Pro 보라) + 코랄 반짝임, 워드마크
  "Try Before You Buy"(고운바탕) + 태그라인 "써 보고 고르는 맥북". 원본 SVG·앱 아이콘·파비콘은 `../shared/brand/`(README 있음).
  색은 `--brand-*` 변수라 라이트/다크를 따라가고(다크는 받침이 크림색), 겹친 틈은 마스크로 비워 어느 바탕에서도 보입니다.
  헤더·푸터에 쓰고, 파비콘은 `src/app/icon.svg`(아이보리 타일 + 마크), apple-touch 는 `src/app/apple-icon.png`(180, 앱 아이콘과 같은 그림) —
  Next 메타데이터 파일 규칙이라 basePath 가 자동으로 붙습니다.
- 일러스트: `src/components/illustrations.tsx` — 히어로(기울어진 두 노트북·해), 미션 아이콘 6개, 흐름 아이콘 4개, 선물 봉투, 작은 노트북.
  직접 그린 인라인 SVG이며 Apple 로고·제품 사진은 쓰지 않습니다. **기울인 그림은 히어로 하나뿐**입니다(비교팩의 작은 노트북·미션 아이콘은 똑바로).
  히어로 화면 문구(SPEC 확정): Air "오늘은 어디로 갈까?" · Pro "오늘은 어디까지 해 볼까?" — 작은 "오늘은" 위에 큰 두 줄을 얹어
  대비되는 말(어디로 · 어디까지)이 두 화면의 같은 자리에 오게 했고, 화면 오른쪽 아래에 작은 AIR / PRO 표시가 있습니다.
  Air 화면 청록(`--ill-air-screen*`)은 흰 글자가 읽히도록 브랜드 청록보다 한 단계 깊습니다(글자 자리 약 3.9:1, 큰 글자).
- 움직임: `.fade-up` 페이드업 — `prefers-reduced-motion: reduce` 이면 움직이지 않습니다.

## 다크 모드 (SPEC.md '다크 모드')

- **모드 3개**: 상단 막대의 `화면 테마` 스위처 — 시스템(기본) · 라이트 · 다크. `role="radiogroup"` 안의 기본 라디오 3개라
  Tab 으로 들어가 ←/→ 로 바꾸고, 스크린리더는 "화면 테마, 시스템/라이트/다크"로 읽습니다. 1280px 이상에서는 아이콘+이름,
  좁은 화면(390px 포함)에서는 아이콘만 보이고 이름은 읽어 줍니다(`title` 툴팁). 모바일은 로고와 같은 줄, lg 부터 메뉴 오른쪽.
- **저장**: `localStorage['tbyb-miku-theme']` = `system|light|dark` — 데모 상태(`tbyb-miku-demo-v2`)와 별개이며 `store.ts` 를 거치지 않습니다
  (`src/lib/theme.ts`). '시스템'이면 `prefers-color-scheme` 변화를 바로 따라가고, 다른 탭에서 바꾼 값(`storage` 이벤트)도 따라갑니다.
  저장이 실패하면(용량·사생활 보호 모드 등) 이번 화면에만 적용하고 "이 기기에 저장하지 못해 이번 화면에만 적용돼요" 알림을
  스위처 아래에 잠깐 띄웁니다(8초 뒤 사라짐·닫기 가능·아래 메뉴 누르기를 막지 않음). 데모 저장소 오류 막대와는 무관합니다.
- **번쩍임 없음**: `layout.tsx` 의 `<head>` 인라인 스크립트(`THEME_INIT_SCRIPT`, `src/lib/theme-core.ts`)가 HTML 을 읽는 도중,
  `<body>` 가 생기기 전에 저장값과 `matchMedia('(prefers-color-scheme: dark)')` 를 읽어 `<html data-theme="light|dark">`,
  `data-theme-pref`, `style.color-scheme` 을 붙입니다. 정적 HTML 에 그대로 들어가므로 basePath 와 무관하고, `localStorage`·`matchMedia` 가
  막혀도 try/catch 로 시스템/라이트로 갑니다. `<html suppressHydrationWarning>` 로 하이드레이션 경고를 막습니다
  (Next 가이드 `preventing-flash-before-hydration` 와 같은 방식). 주소창 색은 `viewport.themeColor` 를 시스템별로 두고, 직접 고르면 그 색으로 맞춥니다.
- **색**: `globals.css` 의 `:root[data-theme="dark"]` 에서 같은 `--color-*` 변수를 덮어씁니다 — `bg-bg`·`text-ink` 등 유틸리티는 그대로.
  새 토큰: `field`(글자 입력칸 테두리, 3:1), `feature`/`on-feature`(마무리 CTA 판), `on-coral`(코랄 면 위 글자 — 흰 글자는 코랄 위에서 2.8:1).
  그림자는 `--shadow-card`·`--shadow-lift`, 일러스트 색은 `--ill-*` 변수(`illustrations.tsx` 는 `style` 로 받음 — SVG 속성 안 `var()` 는 브라우저마다 다름).
  `dark:` 변형은 CTA 테두리처럼 변수로 못 바꾸는 곳에만 씁니다. 로고 색은 `--brand-*` 변수입니다.
- **느낌**: 순검정·순백 없는 "밤에 켠 스탠드" — 갈색 기운 바탕 `#16130F`, 카드 `#221E19`, 크림 글자 `#F3ECE2`. 잉크 주 버튼은 크림 버튼 +
  어두운 글자로 뒤집히고, 마무리 CTA 는 코랄·청록 빛이 번지는 따뜻한 판이 됩니다. 일러스트는 선이 밝은 잉크, 해는 가장자리로 스러지는
  호박색 빛, 노트북 화면(청록·보라)은 채도를 낮췄습니다.
- **대비 확인**: `node scripts/contrast.mjs` (저장소 루트에서는 `node web/scripts/contrast.mjs`) — 두 테마에서 실제로 쓰는 글자·바탕 짝
  112개를 토큰 값으로 계산(겹친 반투명 바탕·투명 글자 합성 포함). 본문 4.5:1 · 큰 글자 3:1 · UI 경계·초점·상태 면 3:1 미달이면 종료 코드 1.
  비활성 컨트롤·그림 속 글자·장식 테두리는 WCAG 예외라 참고값만 보여 줍니다(`--all` 로 전체 표).
  E2E 의 `e2e/readability.ts` 는 브라우저에 실제로 그려진 모든 글자를 같은 기준으로 다시 잽니다.

## 글꼴 · 라이선스

- **고운바탕(Gowun Batang) Bold** — Copyright 2021 The Gowun Batang Project Authors (https://github.com/yangheeryu/Gowun-Batang).
  **SIL Open Font License 1.1** 로 배포되는 글꼴입니다(전문: `node_modules/@fontsource/gowun-batang/LICENSE`, https://openfontlicense.org).
  `@fontsource/gowun-batang`(npm) 로 **자체 호스팅**합니다 — `layout.tsx` 가 `@fontsource/gowun-batang/700.css` 를 불러오고, 글꼴 파일은
  빌드 때 `out/_next/static/media/` 로 복사되어 상대 경로로 읽히므로 basePath(`/tbyb-mvp-miku`) 아래에서도 그대로 동작합니다. 외부 CDN 은 쓰지 않습니다.
  한글은 unicode-range 조각으로 나뉘어 있어 화면에 쓰인 글자의 조각만 내려받습니다. 글꼴이 늦게 오면 `font-display: swap` 으로 명조 대체 글꼴이 먼저 보입니다.
- 로고 워드마크(`../shared/brand/logo-lockup*.svg`)는 같은 글꼴을 윤곽선으로 바꾼 것입니다 — OFL 은 글꼴로 만든 결과물(로고·그림)에 제한을 두지 않습니다.
  글꼴 파일 자체를 따로 팔거나 이름을 바꿔 다시 배포하지 않습니다.

## 실행

```bash
npm install          # ~/.npmrc 의 allow-scripts 때문에 막히면: NPM_CONFIG_USERCONFIG=/dev/null npm install
npm run dev          # http://localhost:3000
npm run lint
npx tsc --noEmit
node scripts/contrast.mjs   # 두 테마 대비 확인
node scripts/brand.mjs      # ../shared/brand/*.svg → 앱 아이콘·파비콘 PNG, src/app/icon.svg·apple-icon.png, 로고 시트 다시 만들기
```

## 정적 빌드

```bash
npm run build                                   # basePath 없음 → out/
PAGES_BASE_PATH=/tbyb-mvp-miku npm run build    # GitHub Pages 경로용 (= npm run build:pages)
```

`PAGES_BASE_PATH` 가 `next.config.ts` 의 `basePath` 가 됩니다(기본값 빈 문자열). 결과물은 `out/` 이며 `trailingSlash` 라서 `/pack/index.html` 형태로 나옵니다.

## E2E (Playwright)

```bash
npx playwright install chromium   # 처음 한 번
npm run e2e                       # basePath(/tbyb-mvp-miku)로 빌드 → out/ 을 http://127.0.0.1:4321/tbyb-mvp-miku/ 로 서빙 → 테스트
npm run e2e:only                  # 이미 basePath 로 빌드했다면 테스트만
```

- `e2e/flow.spec.ts`
  - 전체 흐름(고객 390px, 운영 1280px): 기본 용도로 요청 → 운영 단계(사유 필수·건너뛰기 불가) → 체험 중 바탕화면 코드 →
    핵심 미션 5개('잘 모르겠어요' 1개, 배터리 입력 1개, 오류 문구 확인, 신청 전 답 바꾸기) → 코드(일부러 틀린 Air 코드) → 리워드 신청 →
    잠김(두 번째 탭 포함) → 딜러 조건 확정 후 체험 기기 구매(Pro) 결정 → 반납·검수 → 표시가 있으면 메모 필수 → 승인 → 판매 확인 → 완료 → 새로고침 복원
  - 리워드는 체험 건당 한 번(두 탭), 리워드 거절 시 고객에게는 상태·메모만, 고객 화면 어디에도 검토 표시·예상 코드·일치 여부 없음
  - v1 `/my/record/` 주소 이동, 결제 기한 만료·고객 취소·초기화
  - 저장소 보장: 손상된 저장본 보존·명시적 초기화, 부분 초기화 실패(데모 시계 +25 보존), 저장 실패 시 성공 표시 없음(운영 단계·미션 답)
  - 전체 흐름은 `chromium`(라이트)과 `chromium-dark`(시스템 다크, `playwright.config.ts`) 두 프로젝트에서 돌고, 단계마다
    `expectReadable` 로 화면의 모든 글자 대비를 잽니다(안 보이거나 읽기 어려운 글자 잡기)
- `e2e/theme.spec.ts` — 다크 모드
  - 기본은 시스템(다크 흉내) · 라이트가 시스템 다크보다 우선하고 새로고침·화면 이동에도 유지 · 시스템으로 돌아가면 OS 변경을 바로 따라감 · 다른 탭 동기화
  - 번쩍임 없음: 정적 HTML `<head>` 에 스크립트가 `<body>` 앞에 있음 · `<body>` 가 들어오는 순간 이미 `data-theme`·`color-scheme` 이 붙어 있음 ·
    JS 번들을 막아(하이드레이션 없음)도 저장값/시스템 테마가 첫 화면에 적용되고 스위처 모양도 맞음
  - 테마 저장 실패: 이번 화면에 적용 + 알림(role=status), 메뉴 누르기 가능, 데모 오류 막대 없음, 새로고침하면 시스템 · `localStorage` 접근 자체가 막혀도 오류 없음
  - 키보드(Tab → ←/→, 초점 링) · 390px 에서 로고와 같은 줄·가로 넘침 없음·36px 이상 누르기 칸
  - 두 테마 읽기 대비: 소개·비교팩·요청(오류)·내 체험(결제 대기·체험 중)·미션(폼·오류·신청 후)·결정·운영(결제 대기·기한 지남·리워드 확인)·
    저장 실패 막대·손상된 저장본 막대·테마 알림
- `e2e/screenshots.spec.ts` — `../docs/screenshots/` 의 라이트 `web-*.png` 와 다크 `web-dark-*.png` 를 다시 찍습니다
  (intro-mobile · intro-desktop · pack · request · my · missions · decide · ops-reward, 테마는 `colorScheme` 흉내로 '시스템'이 고름)
- `e2e/serve.mjs` — GitHub Pages 처럼 `/tbyb-mvp-miku/` 아래에서 `out/` 을 서빙하는 의존성 없는 정적 서버
