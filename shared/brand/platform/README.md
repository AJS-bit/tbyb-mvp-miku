# 플랫폼 로고안 (MIKU · 2026-09-30)

Administrator 요청: 맥북에서 끝나지 않는 **비교 체험 플랫폼**(헤드폰·스피커·마우스·키보드·모니터·노트북 … 나중엔 자동차) 로고.
원칙: 특정 제품 모양을 그리지 않고 "두 선택지를 비교해 → 나에게 맞는 걸 고른다"만 담는다. 이름("Try Before You Buy")이 바뀌어도 심볼은 그대로 쓸 수 있게.

| 안 | 이름 | 뜻 | 원본 |
|---|---|---|---|
| 1 (추천) | 겹침 | 두 카드(청록·보라)가 겹친 칸(코랄 + 체크) = 써 보고 찾은 "내 답". 두 칸에 카테고리 아이콘을 넣으면 그대로 A vs B 프레임 | `svg/1-overlap.svg`, `svg/1-overlap-dark.svg` |
| 2 | 비교 슬라이더 | 전·후 비교 손잡이 — 한 장면을 반씩 나눠 두 제품을 오가며 비교 | `svg/2-slider.svg`, `svg/2-slider-dark.svg` |
| 3 | 두 색 체크 | 체크의 짧은 획(청록)·긴 획(보라) = 두 제품, 만나는 코랄 점 = 고른 순간 | `svg/3-paths.svg`, `svg/3-paths-dark.svg` |

- 색: A 청록 #1E9E8A / B 보라 #6D4AFF / 선택 코랄 #FF6B4A / 잉크 #1F1B16 / 아이보리 #FAF6EF (다크: #3CC4AE / #9A85FF / #FF8A6B / #F3ECE2 / #16130F) — 지금 서비스 팔레트 그대로.
- 워드마크(시안): "Try Before You Buy" 산세리프 굵게, 태그라인 "써 보고 고르는 모든 것".
- 제안 시트: `docs/screenshots/platform-logo-overview.png`, `platform-logo-1-overlap.png`, `-2-slider.png`, `-3-paths.png` (라이트·다크, 앱 아이콘, 16·32px 실제 픽셀, 카테고리 적용).
- 다시 만들기: 저장소 루트에서 `node shared/brand/platform/render.mjs` (심볼은 `marks.mjs`).
- 이 문서는 시안이다. 선택되면 현재 앱·웹 로고(`shared/brand/*`)를 교체한다.
