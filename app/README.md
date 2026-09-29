# Try Before You Buy — 앱 (Expo)

MacBook Air · 14형 Pro 비교팩 **시연용 데모 앱**입니다. 체험 기간에 반복해서 여는 도구(내 체험 상태 · 작업 유형별 체크리스트 · 두 기기 같은 기준 기록 · 마지막 날 결정 · 반납 안내)와, 데모 진행용 **운영 시뮬레이터**(실제 운영자 기능 아님)가 들어 있습니다. 서버·실제 결제·연락·개인정보 수집이 없고, 데이터는 기기 안(AsyncStorage / 웹은 localStorage)에만 저장됩니다.

- 도메인 규칙: `src/domain.ts` 는 `shared/domain.ts` 의 **자동 복사본**입니다. 직접 고치지 말고 루트에서 `bash scripts/sync-domain.sh` 를 실행하세요 (`--check` 로 일치 여부만 확인).
- Expo SDK 57 · expo-router · TypeScript. 화면은 `src/app/` (탭 4개 + 운영 시뮬레이터 모달).

## 준비

```bash
cd app
npm install
```

## iOS 시뮬레이터 / Expo Go

```bash
npx expo start --port 8090          # 8081 이 비어 있으면 포트 생략 가능
```

- 시뮬레이터: 터미널에서 `i` 를 누르거나, 원하는 시뮬레이터에 Expo Go 를 설치한 뒤 `exp://127.0.0.1:8090` 을 엽니다.
  - 확인창 없이 열기: `xcrun simctl launch <UDID> host.exp.Exponent --initialUrl exp://127.0.0.1:8090`
- 실제 iPhone: 같은 Wi‑Fi 에서 Expo Go 앱으로 터미널의 QR 코드를 찍습니다.
- 리마인드 알림은 `expo-notifications` 로 **기기 로컬 알림을 실제 예약**합니다(체험 둘째 날 · 마지막 날 전날 오전 10시, 겹치면 1건). iOS 에서는 확인창 없는 '조용한 알림(provisional)'으로 허용을 받아 알림 센터로 전달됩니다. 웹에서는 계획만 표시합니다.

## 웹 미리보기 · 정적 내보내기

```bash
npx expo start --web                                   # 개발용
EXPO_BASE_URL=/tbyb-mvp-miku/app npx expo export --platform web --output-dir dist
```

- `dist/` 를 GitHub Pages 의 `/tbyb-mvp-miku/app/` 경로에 올리면 됩니다. 라우트는 정적 HTML(`index.html`, `my/`, `log/`, `decide/`, `simulator.html` 등)로 나옵니다.
- `_expo/` 폴더가 있으므로 Pages 를 브랜치(Jekyll)로 배포한다면 **사이트 루트에 `.nojekyll`** 이 있어야 합니다 (`public/.nojekyll` 이 `dist/` 에 함께 복사되지만, 하위 경로 배포라면 사이트 루트에도 필요). GitHub Actions(`upload-pages-artifact`)로 배포하면 필요 없습니다.
- `dist/` 는 `.gitignore` 에 들어 있습니다.

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `EXPO_BASE_URL` | (빈 값 = 루트) | 웹 내보내기 하위 경로. 예: `/tbyb-mvp-miku/app` → `experiments.baseUrl` |

## 확인 명령

```bash
npx tsc --noEmit
npx expo-doctor
bash ../scripts/sync-domain.sh --check
node --test ../shared/domain.test.ts
```

## 데모 진행 순서 (운영 시뮬레이터)

비교팩 탭에서 데모 일정 요청 → 헤더의 **운영 시뮬레이터** → 사유 입력 후 단계 진행(운영 확인 · 기기 확보 · 결제 대기 · 거래 대조 · 출고 기록 · 체험 시작) → 비교 기록/결정·반납 탭에서 고객 입력 → 시뮬레이터에서 반납 접수 · 검수 · (체험 기기 구매 시) 딜러 판매 확인 → 완료. 구매 선택지는 시뮬레이터의 '딜러 판매 조건 확정 (데모 설정)'을 켜야 열립니다. '데모 초기화'로 처음부터 다시 할 수 있습니다.
