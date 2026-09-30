# Try Before You Buy — 브랜드 로고

SPEC.md '다듬기 (2026-09-30) · 로고'에 맞춘 새 로고입니다. 겹쳐 선 노트북 두 대 — **앞 왼쪽의 얇은 MacBook Air(청록)**, **뒤 오른쪽의 MacBook Pro 14형(보라)** — 와
작은 코랄 반짝임 하나. 소개 페이지 히어로 그림과 같은 색·같은 반짝임 모양을 씁니다. Apple 로고·제품 사진은 쓰지 않습니다.

확인용 시트: `docs/screenshots/brand-logo-sheet.png` (16·32·64·256px, 라이트/다크, 파비콘 탭, 앱 아이콘 미리보기)

## 파일

| 파일 | 무엇 | 쓰는 곳 |
|---|---|---|
| `logo-mark.svg` | 마크 (64×64 격자, 투명 바탕) — 라이트 바탕용. 노트북 받침은 잉크 `#1F1B16` | 웹 헤더·푸터(라이트), 문서 |
| `logo-mark-dark.svg` | 마크 — 다크 바탕용. 받침은 크림 `#EBE2D5`, 화면 색은 눈부심 없게 살짝 낮춤 | 웹 헤더·푸터(다크) |
| `logo-lockup.svg` | 마크 + 워드마크 "Try Before You Buy" + 태그라인 "써 보고 고르는 맥북" — 라이트 바탕용. 글자는 윤곽선(글꼴 없이 보임) | 문서·발표 자료 |
| `logo-lockup-dark.svg` | 위와 같음 — 다크 바탕용 | 문서·발표 자료 |
| `app-icon.svg` → `app-icon-1024.png` | iOS 앱 아이콘. 1024×1024 꽉 찬 정사각형, **투명도 없음(RGB)**, 아이보리 바탕 + 히어로의 따뜻한 해 + 마크. 모서리는 iOS 가 둥글게 자름 | 앱 `icon` |
| `adaptive-foreground.svg` → `adaptive-foreground-1024.png` | 안드로이드 적응형 아이콘 앞면. 투명 바탕, 해+마크를 안전 원(108dp 중 지름 66dp ≈ 1024px 중 626px) 안에 | 앱 `android.adaptiveIcon.foregroundImage` |
| `adaptive-background.svg` → `adaptive-background-1024.png` | 적응형 아이콘 바탕 — 아이보리 `#FAF6EF` 단색, 투명도 없음 | 앱 `android.adaptiveIcon.backgroundImage` (또는 `backgroundColor: "#FAF6EF"`) |
| `favicon.svg` → `favicon-32.png` | 파비콘 — 둥근 아이보리 타일(모서리 14/64) + 마크(해 없음: 16–32px 에서 복잡해 보여서). 밝은 탭·어두운 탭 모두에서 보임 | 웹 `src/app/icon.svg`, 앱 웹 빌드 `favicon` |
| `favicon-180.png` | apple-touch 아이콘 — 앱 아이콘과 같은 그림, 180×180, 투명도 없음 | 웹 `src/app/apple-icon.png` |

SVG 가 원본입니다. PNG 는 `web/` 에서 `node scripts/brand.mjs` 로 다시 만듭니다(Chromium 으로 그린 뒤 앱 아이콘·적응형 바탕·apple-touch 는
알파 채널을 없앤 RGB PNG 로 저장). 같은 스크립트가 `web/src/app/icon.svg`·`apple-icon.png` 와 로고 시트도 갱신합니다.

## 색

| 부분 | 라이트 | 다크 |
|---|---|---|
| Air 화면 (그라데이션, 왼쪽 위 → 오른쪽 아래) | `#3DBBA4` → `#1A8F7C` | `#3BB9A3` → `#1E8D7B` |
| Pro 화면 | `#8466FF` → `#5A36F0` | `#8A74F0` → `#5E44D8` |
| 노트북 받침 | 잉크 `#1F1B16` | 크림 `#EBE2D5` |
| 카메라 점 | `#1F1B16` 55%·50% | `#16130F` 55%·50% |
| 반짝임 | 코랄 `#FF6B4A` | 코랄 `#FF8A6B` |
| 워드마크 / 태그라인 | `#1F1B16` / `#6B635A` | `#F3ECE2` / `#B4AA9D` |
| 아이콘 바탕 | 아이보리 `#FAF6EF` | — (아이콘은 한 가지) |
| 아이콘의 해 (방사형) | `#FFE3C0` → `#FFD9AE` → `#FFCF9C` | — |

Air·Pro·코랄·아이보리·잉크는 SPEC v2 감성 팔레트와 같은 값입니다. Pro 화면 그라데이션은 웹 히어로 노트북 화면과 같고, Air 화면은 로고 쪽이
조금 더 밝습니다 — 웹 히어로의 Air 화면(`#2CA893 → #148472`)은 흰 글자 문구를 올리려고 한 단계 깊게 했기 때문입니다(로고에는 글자가 없음).

## 모양 (64 격자)

- Pro 화면 `x23 y10 36×25 r3.6`, 받침 `x19–63` 두께 4.4 · Air 화면 `x5 y24 33×23 r3.4`, 받침 `x1–42` 두께 3 (Air 가 더 얇음).
  전체를 아래로 2.2 옮겨 가운데를 맞췄습니다.
- 겹친 곳은 Air 둘레 2.4 만큼 Pro 를 **마스크로 비워** 어느 바탕에서도 틈이 보입니다(바탕색으로 칠한 테두리가 아님).
- 반짝임: 네 갈래 별(히어로 `Sparkle` 과 같은 곡선) 중심 `13.5, 13.5` 반지름 5.5.
- 기울이지 않았습니다 — 기울인 그림은 히어로 하나만 둡니다.

## 글꼴

워드마크·태그라인은 **고운바탕(Gowun Batang) Bold** 를 윤곽선으로 바꾼 것입니다. 고운바탕은 SIL Open Font License 1.1 글꼴이며
(Copyright 2021 The Gowun Batang Project Authors), 윤곽선으로 바꿔 로고에 쓰는 것은 라이선스가 허용합니다.
웹에서는 `@fontsource/gowun-batang` 로 자체 호스팅합니다(`web/README.md`).

## 쓰는 법

- 마크 주변에 마크 높이의 1/4 이상 여백을 두세요. 16px 보다 작게 쓰지 않습니다.
- 색을 바꾸거나 두 노트북 자리를 바꾸지 않습니다 — 왼쪽 Air(청록) · 오른쪽 Pro(보라)는 서비스 전체에서 같은 약속입니다.
- 다크 바탕에서는 `-dark` 파일을 쓰세요(라이트 파일의 잉크 받침은 어두운 바탕에서 사라집니다).
