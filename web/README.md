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
`../scripts/sync-domain.sh` 로 복사하세요. 화면 전용 문구는 `src/lib/copy.ts`.

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
- 일러스트: `src/components/illustrations.tsx` — 히어로(기울어진 두 노트북·해), 미션 아이콘 6개, 흐름 아이콘 4개, 선물 봉투, 작은 노트북.
  직접 그린 인라인 SVG이며 Apple 로고·제품 사진은 쓰지 않습니다.
- 움직임: `.fade-up` 페이드업 — `prefers-reduced-motion: reduce` 이면 움직이지 않습니다.

## 실행

```bash
npm install          # ~/.npmrc 의 allow-scripts 때문에 막히면: NPM_CONFIG_USERCONFIG=/dev/null npm install
npm run dev          # http://localhost:3000
npm run lint
npx tsc --noEmit
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
- `e2e/screenshots.spec.ts` — `../docs/screenshots/web-*.png` 를 다시 찍습니다
  (intro-mobile · intro-desktop · pack · request · my · missions · decide · ops-reward)
- `e2e/serve.mjs` — GitHub Pages 처럼 `/tbyb-mvp-miku/` 아래에서 `out/` 을 서빙하는 의존성 없는 정적 서버
