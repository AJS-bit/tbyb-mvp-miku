# tbyb — 앱 (Expo) · 첫 비교팩 데모

비교 체험 플랫폼 **tbyb**(태그라인 "써 보고, 나의 기준으로.")의 **첫 비교팩 — MacBook Air · 14형 Pro** 시연용 데모 앱입니다. 맥을 처음 쓰는 손님을 기준으로 만들었습니다 — 작업 유형별 기록 대신 **쉬운 일상 미션 6개**와 **미션 리워드(금액 미정 · 검토 중인 예 1,000원, 미션 → 반납 점검 → 운영자 확인)**, 따뜻한 아이보리·잉크·코랄 톤(SPEC.md v2 「감성 디자인 방향」)과 직접 그린 SVG 일러스트를 씁니다. 데모 진행용 **운영 시뮬레이터**(실제 운영자 기능 아님)가 들어 있습니다. 서버·실제 결제·지급·연락·개인정보 수집이 없고, 데이터는 기기 안(AsyncStorage / 웹은 localStorage)에만 저장됩니다.

- 도메인 규칙: `src/domain.ts` 는 `shared/domain.ts` 의 **자동 복사본**입니다. 직접 고치지 말고 루트에서 `sh scripts/sync-domain.sh` 를 실행하세요 (`--check` 로 일치 여부만 확인). 저장 키는 `tbyb-miku-demo-v2` (v1 데이터와 분리).
- Expo SDK 57 · expo-router · TypeScript · `react-native-svg`(일러스트, Expo Go 포함 모듈) · `@expo-google-fonts/gowun-batang`(감성 서체, 아래 「글꼴」).
- 문구: SPEC.md 「다듬기 (2026-09-30)」 문장 원칙으로 앱 문장을 모두 다시 봤습니다 — 바뀐 문장 목록은 [`COPY_CHANGES.md`](COPY_CHANGES.md).

## 화면

| 탭 / 화면 | 경로 | 내용 |
|---|---|---|
| 비교팩 | `src/app/(tabs)/(pack)` | 맨 위 tbyb 로고(심볼 + 워드마크 "tbyb" + 태그라인 "써 보고, 나의 기준으로.") · "첫 비교팩" 표시 · 히어로(기울어진 두 노트북 — Air 화면 「오늘은 / 어디로 갈까?」 · Pro 화면 「오늘은 / 어디까지 해 볼까?」, 고운바탕) · "맥은 처음이어도 괜찮아요" · 진행 4단계 · 비교 포인트 · 요금 미정 안내 · 데모 일정 요청(날짜·픽업 필수, "주로 뭘 할 것 같아요?" 선택·기본 '잘 모르겠어요', 궁금한 점 선택, 지금 마음 + 확신). 이름·전화번호 없음 |
| 내 체험 | `src/app/(tabs)/my` | (저장소 오류 카드) · 상태에 맞는 **인사**("반가워요, 오늘의 두 맥은 어땠나요?") · 버튼이 하나뿐인 **다음 행동 카드**(요청 → 미션 미리 둘러보기 / 결제 대기 → 결제 안내 / 예약 확정 → 픽업 준비 / 체험 중 → 아직 안 한 첫 핵심 미션 → 코드 → 리워드 신청 → 결정 → 반납 준비 / 반납·점검 → 반납 안내 / 완료 → 결과 보기) · **첫 비교팩 요약**(Air·Pro 칩 · 날짜 · 매장 · 미션 n/5 · 리워드 상태) · 접어 둔 **진행 상황 자세히**(상태 설명 · 진행 단계 · 요청 내용) · 픽업 전 취소 · 맨 아래 **화면 모드**(시스템/라이트/다크). 큰 제목은 끄고 인사가 제목 역할 |
| 미션 | `src/app/(tabs)/missions` | 체험 중·반납 접수·검수 중에만 열림(그 전엔 "픽업한 날부터 열려요" 잠금 화면). 리워드 카드(진행 고리·"금액 미정 (검토 중인 예: 1,000원)"·검토 흐름 3단계·규칙·상태·신청) · 바탕화면 코드 카드(두 맥 4자리 입력) · 미션 카드 6개 · 미션 알림(체험 중) |
| 미션 시트 | `src/app/mission/[id].tsx` | iOS 페이지 시트. 큰 선택 버튼 4개(`PICK_LABEL`) · 후속 칩 · 미션별 입력(영상: 배터리 % 선택 / 폰으로 하는 일: `DAILY_OPTIONS` / 무거운 작업: 두 맥 분). 리워드 신청 전까지 수정 가능 |
| 결정·반납 | `src/app/(tabs)/decide` | 미션 답 모아 보기(`missionSummary` 막대 + 미션별 답) · 결정(이유 필수 + 빠른 이유 칩) · 확신 전→후 · 반납 계획 · 딜러 조건 전 구매 잠금 · 반납 준비 체크 |
| 운영 시뮬레이터 | `src/app/simulator.tsx` | 단계 진행(사유 필수) · 기기 확보·거래 대조·출고·검수·판매 확인 · **출고 때 바탕화면에 띄울 코드** · **리워드 확인**(답·고객 코드 vs 출고 코드·검토 표시·메모·승인/거절) · 이력(운영 메모 포함) · 기기 보드 · 데모 설정 · 초기화 |

고객 화면에는 리워드 검토 표시(flag)·출고 코드·승인 메모를 보여 주지 않습니다(상태만). 거절 사유만 미션 탭 리워드 카드에 보입니다.

### 화면 중간으로 바로 가기 (`?section=`)

`Screen` 은 `?section=<이름>` 으로 열리면 같은 이름의 `<ScrollTarget>` 까지 내려갑니다(`src/components/screen.tsx`). 알림·안내에서 화면 중간으로 보낼 때 씁니다.

| 경로 | 가는 곳 |
|---|---|
| `/missions?section=list` · `?section=nudge` | 미션 목록 · 미션 알림 |
| `/decide?section=choice` | 결정 고르기 |
| `/my?section=appearance` · `/my?section=details` | 화면 모드 · 진행 상황 자세히 |
| `/simulator?section=codes` | 출고 때 바탕화면에 띄울 코드 |
| `/?section=form` · `/simulator?section=reward` | (예전부터) 데모 일정 요청 폼 · 리워드 확인 |

## 글꼴 (고운바탕)

- **고운바탕(Gowun Batang) Bold** — 노트북 화면 두 줄, 미션 탭 인용 한 줄("비슷했다면, 그것도 좋은 답이에요.")에만 씁니다. 제목·본문은 시스템 산세리프 그대로입니다.
- **tbyb 워드마크**는 브랜드 규칙대로 **Georgia 600 · 자간 -0.06em**(iOS 시스템 글꼴 'Georgia' → Georgia Bold, 웹 `Georgia, serif`, 안드로이드 `serif`)입니다. 글꼴 파일을 따로 넣지 않습니다.
- `@expo-google-fonts/gowun-batang/700Bold` 한 벌만 가져와 루트 레이아웃에서 `useFonts` 로 불러옵니다(`src/lib/fonts.tsx`). 앱을 막지 않습니다: 스플래시는 저장본 복원과 글꼴(최대 2.5초)을 기다린 뒤 내리고, 글꼴이 실패하거나 늦으면 시스템 글꼴(굵게)로 먼저 보여 준 뒤 불러오면 바꿉니다.
- 네이티브는 불러온 뒤에만 `fontFamily` 를 넘깁니다(없는 이름을 넘기면 iOS 가 오류를 냅니다). 웹은 처음부터 `GowunBatang_700Bold, "Gowun Batang", AppleMyungjo, "Nanum Myeongjo", serif` 를 넘기고 `font-display: swap` 으로 둡니다 — 정적 HTML·하이드레이션이 같은 값이고, 글꼴이 오기 전에도 글자가 숨지 않습니다. 글꼴 파일은 `dist/assets/…/GowunBatang_700Bold.*.ttf` 로 같은 사이트에서 받습니다(외부 CDN 없음).
- `react-native-svg` 의 `<Text>` 도 같은 `fontFamily` 로 그립니다(iOS 는 expo-font 가 등록한 별칭을 RCTFont 로 찾음). 고운바탕은 이미 굵은 글꼴 한 벌이라 `fontWeight` 를 따로 주지 않습니다(웹에서 가짜 굵게가 겹치지 않게).
- **라이선스**: 고운바탕은 SIL Open Font License 1.1 글꼴입니다 — Copyright 2021 The Gowun Batang Project Authors (https://github.com/yangheeryu/Gowun-Batang). 라이선스 전문은 `node_modules/@expo-google-fonts/gowun-batang/LICENSE_FONT` 에 함께 배포되며, 글꼴 파일은 수정하지 않고 그대로 번들합니다. 글꼴 파일 자체를 따로 판매할 수 없고, 앱에 넣어 배포하는 것은 허용됩니다.

## 브랜드 (tbyb) · 앱 아이콘

- 로고는 TETO 선택안 **tbyb**(두 선택 사이, 나의 기준)입니다. 원본은 `shared/brand/tbyb/`(README · `MARK.svg` · `MARK_DARK.svg` · `APP_ICON_COLOR.svg` · `BRAND_BRIEF.json`) — 도형·색을 바꾸지 않습니다. 예전 노트북 로고(`shared/brand/_archive-miku-laptops/`)는 쓰지 않습니다.
- **플랫폼과 첫 비교팩을 나눠 부릅니다**: 플랫폼 = tbyb + "써 보고, 나의 기준으로.", MacBook Air·Pro = "첫 비교팩". (맥북을 플랫폼처럼 부르던 예전 태그라인은 화면·메타 어디에도 쓰지 않습니다 — 웹 빌드 검증이 확인)
- 앱 안 로고: `src/components/brand.tsx` — `BrandMark`(react-native-svg, 도형은 `src/lib/brand.ts` = `MARK.svg` 그대로)와 `BrandLockup`(심볼 + 워드마크 "tbyb" + 태그라인, 심볼 높이 = 글자 크기 × 0.9 · 간격 0.22em). 비교팩 첫 화면 맨 위에 두고, 내 체험의 첫 비교팩 요약에 작은 심볼을 씁니다.
  - 라이트: forest `#193D35` 왼쪽 프레임·점 + apricot `#F18463` 오른쪽 프레임, forest 워드마크.
  - 다크: `MARK_DARK.svg` — sage `#DCE6CF` 왼쪽 프레임·점 + apricot 오른쪽 프레임(다크에서도 컬러), 워드마크는 크림 `#F7F3EA`.
  - 색은 `palette.ts` 의 `brandWord`·`brandMark`·`brandAccent` 토큰이고, `scripts/contrast.mjs` 가 `brand.ts` 값과 같은지와 대비를 함께 확인합니다.
- 아이콘·스플래시 PNG 는 `node scripts/brand-icons.mjs`(app/ 에서)로 만듭니다 — `web/` 의 Playwright(Chromium)로 원본 SVG 를 그리고, `brand.ts` 도형이 `MARK.svg`·`MARK_DARK.svg` 와 다르면 멈춥니다.
  - `icon.png` — 1024, **꽉 찬 정사각형 크림 바탕** + `APP_ICON_COLOR.svg` 와 같은 비율의 컬러 심볼, 투명도 없음(RGB). 모서리는 iOS 가 자릅니다.
  - `android-icon-foreground.png` — 1024 투명 바탕, 심볼을 안전 원(66dp) 안에(보이는 72dp 안에서 iOS 와 같은 비율) + `backgroundColor: '#F7F3EA'`. `android-icon-monochrome.png` 는 `MARK_MONO.svg`.
  - `favicon.png` — 32, `APP_ICON_COLOR.svg` 그대로(둥근 크림 타일).
  - `splash-icon.png` / `splash-icon-dark.png` — `MARK.svg` / `MARK_DARK.svg`(600×480 투명). 스플래시 바탕은 라이트 크림 `#F7F3EA`, 다크 forest `#193D35`, `imageWidth: 120`.
  - 확인용 시트: `docs/screenshots/app-brand-icon.png`.
- 앱 이름은 `tbyb`, 웹 문서 제목은 "tbyb — 첫 비교팩 데모 앱"(`src/components/web-head.web.tsx`).
- Expo Go 는 자기 아이콘·로딩 화면을 보여 주므로 앱 아이콘·스플래시는 설정과 PNG(시트)로만 확인했습니다(개발/스토어 빌드에서 적용).

## 준비

```bash
cd app
npm install
# 의존성 추가는 expo install 로 (npx expo install 은 ~/.npmrc allow-scripts 때문에 실패할 수 있음)
./node_modules/.bin/expo install <package>
```

## iOS 시뮬레이터 / Expo Go

```bash
CI=1 ./node_modules/.bin/expo start --port 8090
xcrun simctl boot <UDID>                        # 예: iPhone 17
xcrun simctl launch <UDID> host.exp.Exponent --initialUrl exp://127.0.0.1:8090
```

- `CI=1` 에서는 파일 감시(빠른 새로 고침)가 꺼집니다. 코드를 고쳤다면 서버를 다시 켜고 Expo Go 를 다시 실행하세요.
- `xcrun simctl openurl` 로 `exp://` 링크를 열면 iOS 확인창이 떠서 자동화가 멈춥니다. `launch --initialUrl` 을 쓰세요.
- 미션 시트는 `presentation: 'modal'`(iOS 페이지 시트)입니다. `formSheet` 는 Expo Go(iOS 26 시뮬레이터)에서 시트 안 내용이 그려지지 않아 쓰지 않습니다.
- 미션 알림은 `expo-notifications` 로 **기기 로컬 알림을 실제로 예약**합니다(체험 둘째 날 · 마지막 날 전날 오전 10시, 겹치면 1건, 이미 지난 시각은 건너뜀). iOS 에서는 확인창 없는 '조용한 알림(provisional)'으로 허용받아 알림 센터로 전달됩니다. 웹에서는 계획만 보여 줍니다.

## 웹 미리보기 · 정적 내보내기

```bash
npx expo start --web                                   # 개발용
rm -rf dist && EXPO_BASE_URL=/tbyb-mvp-miku/app npx expo export --platform web --output-dir dist
```

- 정적 HTML: `index.html`, `my/`, `missions/`, `decide/`, `mission/{carry,video,screen,typing,daily,heavy}.html`(`generateStaticParams`), `simulator.html`.
- `dist/` 를 GitHub Pages 의 `/tbyb-mvp-miku/app/` 경로에 올리면 됩니다. 브랜치(Jekyll) 배포라면 사이트 루트에 `.nojekyll` 이 필요합니다(`public/.nojekyll` 은 `dist/` 에 복사됨). `dist/` 는 `.gitignore` 대상입니다.

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `EXPO_BASE_URL` | (빈 값 = 루트) | 웹 내보내기 하위 경로 → `experiments.baseUrl` |

## 다크 모드

SPEC.md 「다크 모드」 — "밤에 켠 스탠드" 같은 따뜻한 다크(순검정·순백 없음). 색만 뒤집지 않고, 잉크 버튼·잉크 칩만 뒤집는다(밝은 잉크 바탕 + 어두운 글자).

- **모드 3개**: 내 체험 탭 맨 아래 「화면 모드」에서 **시스템(기본) / 라이트 / 다크**. 시스템은 기기 설정(`useColorScheme`)을 실시간으로 따라간다.
- **저장**: 앱 UI 상태(`tbyb-miku-demo-v2:app-ui` 의 `theme`)에 `updateUi` 로 저장 — 저장이 끝난 뒤에만 UI 상태에 반영하는 기존 규칙 그대로. 저장에 실패하면(또는 저장본을 읽지 못한 상태면) **이번 실행에만 적용**하고, 저장소 오류 카드 + 고르는 곳의 「이번 실행에만 적용됐어요」로 알린다. 데모 초기화를 해도 화면 모드는 남긴다(데모 데이터가 아니라 기기 설정).
- **구조**
  - `src/lib/palette.ts` — `light`·`dark` 색 토큰(키가 같음을 타입으로 강제). 순수 데이터라 대비 검사 스크립트가 그대로 읽는다.
  - `src/lib/theme.ts` — 팔레트에서 테마 객체 `THEMES.light/dark` 를 만든다: `t.c`(토큰) · `t.device`(Air/Pro) · `t.pick`(미션 답) · `t.status`(상태 칩) · `t.shadow`.
  - `src/lib/theme-context.tsx` — `AppThemeProvider`(루트) · `useTheme()` · `useThemeControl()`(고르기) · `themed(make)`: 두 테마의 `StyleSheet`/색 표를 모듈에서 한 번씩 미리 만들고 지금 테마 것을 돌려주는 훅 팩토리.
  - 네이티브 UI 맞추기: `Appearance.setColorScheme`(라이트/다크 고정 시 앱 창 모드 → 네이티브 탭 바·시트·키보드·스위치), `expo-system-ui` 루트 배경, `expo-status-bar` 글자색, 내비게이션 테마(헤더·모달), 탭 화면 `contentStyle` 배경, 입력칸 `keyboardAppearance`. `app.config.ts` 는 `userInterfaceStyle: 'automatic'` + 스플래시 `dark.backgroundColor`.
  - 웹: 정적 HTML 은 라이트로 미리 그려지므로 `+html.tsx` 의 `<head>` 스크립트가 저장된 모드·기기 설정을 먼저 읽어 바탕을 칠하고, 다크면 앱이 다크로 다시 그릴 때까지(`data-theme-ready`) 화면을 가린다(번쩍임 방지). 가리는 동안은 다크 '불러오는 중…' 문구를 보이고, 8초가 지나도 준비되지 않으면 다크 안내 문구(새로고침 안내)로 바꾼다 — 라이트로 미리 그려진 화면은 시간이 지나도 드러내지 않는다. 첫 렌더는 하이드레이션을 위해 라이트로 맞춘 뒤 바꾼다.
- **일러스트**: 모든 색이 `art*`·`tile*` 토큰. 다크는 밝은 잉크 선, 호박색 해 + 은은한 빛(방사형 그라데이션), 채도를 낮춘 청록/보라 화면.
- **대비 검사**: `node scripts/contrast.mjs`(app/ 에서) — 화면에서 실제로 함께 쓰는 글자/바탕·상태 그래픽 쌍을 두 테마 모두 계산한다. 작은 글자 4.5:1 · 큰 제목 3:1 · 상태 그래픽(체크·채운 선택·체크박스/라디오 테두리) 3:1 미만이면 실패. 장식 선·입력칸 테두리·비활성, 옆 글자가 같은 뜻을 전하는 보조 그래픽은 `INFO` 로 값만 보여 준다. `--all` 이면 통과한 쌍도 출력.
- 화면: `docs/screenshots/app-dark-*.png` (iPhone 17 · Expo Go).
- 그림 기울기: 기울인 그림은 히어로(두 노트북) 하나뿐입니다. 로고·미션 아이콘·리워드 봉투는 똑바로 둡니다. 미션 아이콘 타일은 미션마다 색이 다릅니다(폰으로 하는 일 = 맑은 하늘색 `tileDaily`).

## 저장 보장 (`src/lib/store.ts`)

- `apply`/`updateUi` 는 **키 하나 쓰기가 성공한 뒤에만** 화면 상태를 바꿉니다. 실패하면 오류를 보여 주고 입력값(고른 답 포함)은 그대로 두어 다시 누를 수 있습니다.
- 저장본이 손상되면 덮어쓰지 않고 원본 보기·복사·명시적 초기화만 제공합니다. 초기화는 실제로 저장된 키만 화면에 반영합니다.

## 확인 명령

```bash
# app/
npx tsc --noEmit --noUnusedLocals
npx expo-doctor
node scripts/contrast.mjs                # 라이트·다크 색 대비 (+ tbyb 로고·아이콘 색)
node scripts/brand-icons.mjs             # 아이콘·스플래시·파비콘 PNG 다시 만들기 (web/ 의 Playwright 사용)
# 저장소 루트
sh scripts/sync-domain.sh --check
node --test shared/domain.test.ts
node scripts/verify-app-storage.mjs      # app/dist 를 먼저 내보낸 뒤. VERIFY_DEBUG=1 이면 실패 상세 출력
```

`verify-app-storage.mjs` (Playwright, 웹 빌드): 노트북 화면 문구가 고운바탕(같은 사이트 ttf)으로 그려지는지, tbyb 워드마크(Georgia 600 · -0.06em)·태그라인·"첫 비교팩", 내 체험(체험 중) 첫 화면의 **주 버튼이 딱 하나**(아직 안 한 첫 핵심 미션을 여는지)·진행 단계 접힘/펼침, 맥북을 플랫폼처럼 부르던 예전 태그라인이 화면·제목·설명·빌드 파일 어디에도 없는지와 1,000원이 '검토 중인 예'로만 나오는지, 결정·미션 답·리워드 신청·시뮬레이터 설정·리워드 승인 저장 실패 → 반영 안 됨·입력 유지·재시도 성공, 키 하나만 실패하는 부분 실패, 초기화 부분 실패, 리워드 승인 메모·검토 표시가 고객 화면(내 체험·미션·결정·반납)에 나오지 않는지(거절 사유는 미션 탭에만). 화면 모드: 다크 선택이 새로고침·다른 페이지·데모 초기화 뒤에도 남는지, 저장 실패 시 이번 실행에만 적용 + 저장 오류 표시 + 다른 탭 저장은 정상 + 새로고침하면 이전 모드, 기기 설정 다크(`colorScheme: 'dark'`)에서 첫 HTML 부터 다크·화면 바탕·글자색.

## 데모 진행 순서 (운영 시뮬레이터)

비교팩에서 데모 일정 요청 → 헤더 **운영 시뮬레이터** → 사유 입력 후 단계 진행(운영 확인 · 기기 확보 · 결제 대기 · 거래 대조 · 출고 기록 · 체험 시작) → 시뮬레이터의 **출고 때 바탕화면에 띄울 코드** 확인 → 미션 탭에서 미션 답·바탕화면 코드 입력 → 리워드 신청 → 결정·반납에서 결정 → 시뮬레이터에서 반납 접수 · 검수 · **리워드 확인**(표시가 있거나 거절이면 메모 필수) · (체험 기기 구매 시) 딜러 판매 확인 → 완료. 구매 선택지는 시뮬레이터의 '딜러 판매 조건 확정 (데모 설정)'을 켜야 열립니다. '데모 초기화'로 처음부터 다시 할 수 있습니다.

## 한계

- 백엔드 없음 — 웹 사이트(`web/`)와 데이터를 공유하지 않고, 운영 시뮬레이터는 누구나 열 수 있습니다. 리워드는 실제로 지급되지 않고 금액도 정해지지 않았습니다(1,000원은 검토 중인 예).
- 연락·알림 약속은 로컬 데모에서 참인 것만 씁니다: 요청·진행은 "이 기기에 저장돼요 / 내 체험에서 이어서 볼 수 있어요". 미션 알림은 iOS 에서 이 기기의 로컬 알림만 예약하고(웹은 계획만), 체험 뒤 설문은 "실제 서비스의 계획 · 데모는 보내지 않음"으로 적습니다. 공통 규칙의 `STATUS_HELP.completed`(설문을 보내 드린다는 문장)는 `shared/` 범위라 고치지 않았고, 앱은 그 문장 대신 앱 문구를 보여 줍니다.
- iOS 다크/틴트 아이콘 변형(`ios.icon` 의 dark·tinted)은 넣지 않았습니다 — 아이콘은 라이트 `APP_ICON_COLOR` 디자인 하나입니다.
- Expo Go(iOS 시뮬레이터)와 웹 빌드에서 확인했습니다. 스토어 배포·실기기 설치 파일은 없습니다.
- 다크 모드: 스플래시 다크 바탕은 개발/스토어 빌드에서만 적용됩니다(Expo Go 는 자체 로딩 화면). 입력칸 테두리·카드 머리카락 선은 부드러운 인상을 위해 3:1 미만이며(대비 검사에서 `INFO`), 입력칸은 보이는 라벨로 구분합니다.
- 바탕화면 코드는 참고 단서일 뿐이고, 검토 표시는 자동 거절이 아닌 운영자 확인 신호입니다.
- 고운바탕 Bold 원본은 약 8.2MB라, 필요한 글자만 남긴 서브셋(`assets/fonts/GowunBatang-Bold-subset.ttf`, 약 1.4MB)을 씁니다. KS X 1001 완성형 한글 2,350자 + 앱 소스·공통 규칙에 쓰인 한글 전부 + 영문·문장부호라 문구를 바꿔도 흔한 한글은 그대로 나옵니다. 드문 글자를 새로 쓰면 `node scripts/subset-font.mjs`(app/ 에서)로 다시 만드세요. 웹은 `swap` 이라 받는 동안 대신 글꼴로 보입니다.
