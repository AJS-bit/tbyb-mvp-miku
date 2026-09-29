# Try Before You Buy — 웹 데모

MacBook Air · 14형 Pro 비교팩 시연용 웹. Next.js(App Router) 정적 빌드이며 서버·분석 도구·실제 결제가 없습니다.
모든 데이터는 브라우저 `localStorage`(`tbyb-miku-demo-v1`)에만 저장됩니다.

- 화면: 소개 `/` · 비교팩 `/pack` · 데모 일정 요청 `/request` · 내 체험 `/my?id=` · 비교 기록 `/my/record?id=` · 마지막 날 결정 `/my/decide?id=` · 운영 시뮬레이터 `/ops`
- 규칙·문구·데모 데이터는 `src/lib/domain.ts`(= `../shared/domain.ts` 복사본)에서만 옵니다. 직접 고치지 말고 원본을 고친 뒤 `../scripts/sync-domain.sh` 로 복사하세요.

## 실행

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
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

- `e2e/flow.spec.ts` — 요청부터 완료까지 전체 흐름(고객 화면 390px, 운영 시뮬레이터 1280px), 단계 건너뛰기·사유 필수·새로고침 복원·검수 대기 기기 배정 불가·결제 기한 만료·손상된 저장본·저장 실패
- `e2e/screenshots.spec.ts` — `../docs/screenshots/web-*.png` 를 다시 찍습니다
- `e2e/serve.mjs` — GitHub Pages 처럼 `/tbyb-mvp-miku/` 아래에서 `out/` 을 서빙하는 의존성 없는 정적 서버
