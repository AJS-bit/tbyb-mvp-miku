# Try Before You Buy — 앱 (Expo) · v2

MacBook Air · 14형 Pro 비교팩 **시연용 데모 앱**입니다. v2 는 맥을 처음 쓰는 손님을 기준으로 다시 만들었습니다 — 작업 유형별 기록 대신 **쉬운 일상 미션 6개**와 **미션 리워드(1,000원 가정 · 금액 미정)**, 따뜻한 아이보리·잉크·코랄 톤(SPEC.md v2 「감성 디자인 방향」)과 직접 그린 SVG 일러스트를 씁니다. 데모 진행용 **운영 시뮬레이터**(실제 운영자 기능 아님)가 들어 있습니다. 서버·실제 결제·지급·연락·개인정보 수집이 없고, 데이터는 기기 안(AsyncStorage / 웹은 localStorage)에만 저장됩니다.

- 도메인 규칙: `src/domain.ts` 는 `shared/domain.ts` 의 **자동 복사본**입니다. 직접 고치지 말고 루트에서 `sh scripts/sync-domain.sh` 를 실행하세요 (`--check` 로 일치 여부만 확인). 저장 키는 `tbyb-miku-demo-v2` (v1 데이터와 분리).
- Expo SDK 57 · expo-router · TypeScript · `react-native-svg`(일러스트, Expo Go 포함 모듈).

## 화면

| 탭 / 화면 | 경로 | 내용 |
|---|---|---|
| 비교팩 | `src/app/(tabs)/(pack)` | 히어로(기울어진 두 노트북 「가볍게」·「끝까지」) · "맥은 처음이어도 괜찮아요" · 진행 4단계 · 비교 포인트 · 요금 미정 안내 · 데모 일정 요청(날짜·픽업 필수, "주로 뭘 할 것 같아요?" 선택·기본 '잘 모르겠어요', 궁금한 점 선택, 지금 마음 + 확신). 이름·전화번호 없음 |
| 내 체험 | `src/app/(tabs)/my` | 상태 카드 · (체험 중~검수 중) 코랄 진행 고리 n/5 + 리워드 상태 + 미션 탭 버튼 · 다음 할 일 · 반납 결과 · 타임라인 · 요청 내용 · 출고 전 취소 |
| 미션 | `src/app/(tabs)/missions` | 체험 중·반납 접수·검수 중에만 열림(그 전엔 "픽업한 날부터 열려요" 잠금 화면). 리워드 카드(진행 고리·금액·규칙·상태·신청) · 바탕화면 코드 카드(두 맥 4자리 입력) · 미션 카드 6개 · 미션 알림(체험 중) |
| 미션 시트 | `src/app/mission/[id].tsx` | iOS 페이지 시트. 큰 선택 버튼 4개(`PICK_LABEL`) · 후속 칩 · 미션별 입력(영상: 배터리 % 선택 / 폰으로 하는 일: `DAILY_OPTIONS` / 무거운 작업: 두 맥 분). 리워드 신청 전까지 수정 가능 |
| 결정·반납 | `src/app/(tabs)/decide` | 미션 답 모아 보기(`missionSummary` 막대 + 미션별 답) · 결정(이유 필수 + 빠른 이유 칩) · 확신 전→후 · 반납 계획 · 딜러 조건 전 구매 잠금 · 반납 준비 체크 |
| 운영 시뮬레이터 | `src/app/simulator.tsx` | 단계 진행(사유 필수) · 기기 확보·거래 대조·출고·검수·판매 확인 · **출고 때 바탕화면에 띄울 코드** · **리워드 확인**(답·고객 코드 vs 출고 코드·검토 표시·메모·승인/거절) · 이력(운영 메모 포함) · 기기 보드 · 데모 설정 · 초기화 |

고객 화면에는 리워드 검토 표시(flag)·출고 코드·승인 메모를 보여 주지 않습니다(상태만). 거절 사유만 미션 탭 리워드 카드에 보입니다.

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

## 저장 보장 (`src/lib/store.ts`)

- `apply`/`updateUi` 는 **키 하나 쓰기가 성공한 뒤에만** 화면 상태를 바꿉니다. 실패하면 오류를 보여 주고 입력값(고른 답 포함)은 그대로 두어 다시 누를 수 있습니다.
- 저장본이 손상되면 덮어쓰지 않고 원본 보기·복사·명시적 초기화만 제공합니다. 초기화는 실제로 저장된 키만 화면에 반영합니다.

## 확인 명령

```bash
# app/
npx tsc --noEmit --noUnusedLocals
npx expo-doctor
# 저장소 루트
sh scripts/sync-domain.sh --check
node --test shared/domain.test.ts
node scripts/verify-app-storage.mjs      # app/dist 를 먼저 내보낸 뒤. VERIFY_DEBUG=1 이면 실패 상세 출력
```

`verify-app-storage.mjs` (Playwright, 웹 빌드): 결정·미션 답·리워드 신청·시뮬레이터 설정·리워드 승인 저장 실패 → 반영 안 됨·입력 유지·재시도 성공, 키 하나만 실패하는 부분 실패, 초기화 부분 실패, 리워드 승인 메모·검토 표시가 고객 화면(내 체험·미션·결정·반납)에 나오지 않는지(거절 사유는 미션 탭에만).

## 데모 진행 순서 (운영 시뮬레이터)

비교팩에서 데모 일정 요청 → 헤더 **운영 시뮬레이터** → 사유 입력 후 단계 진행(운영 확인 · 기기 확보 · 결제 대기 · 거래 대조 · 출고 기록 · 체험 시작) → 시뮬레이터의 **출고 때 바탕화면에 띄울 코드** 확인 → 미션 탭에서 미션 답·바탕화면 코드 입력 → 리워드 신청 → 결정·반납에서 결정 → 시뮬레이터에서 반납 접수 · 검수 · **리워드 확인**(표시가 있거나 거절이면 메모 필수) · (체험 기기 구매 시) 딜러 판매 확인 → 완료. 구매 선택지는 시뮬레이터의 '딜러 판매 조건 확정 (데모 설정)'을 켜야 열립니다. '데모 초기화'로 처음부터 다시 할 수 있습니다.

## 한계

- 백엔드 없음 — 웹 사이트(`web/`)와 데이터를 공유하지 않고, 운영 시뮬레이터는 누구나 열 수 있습니다. 리워드는 실제로 지급되지 않습니다.
- Expo Go(iOS 시뮬레이터)와 웹 빌드에서 확인했습니다. 스토어 배포·실기기 설치 파일은 없습니다.
- 바탕화면 코드는 참고 단서일 뿐이고, 검토 표시는 자동 거절이 아닌 운영자 확인 신호입니다.
