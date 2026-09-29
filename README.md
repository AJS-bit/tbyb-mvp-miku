# Try Before You Buy — MVP (MIKU)

MacBook Air · 14형 Pro 비교팩을 **내 작업으로 두 대 비교한 뒤 사는** 서비스의 시연용 MVP.
기준 문서: [MIKU·TETO 최종 기획서](https://claude.ai/code/artifact/bb310018-f190-47d8-9ce6-bc0ea1a15f48)

- 웹: https://ajs-bit.github.io/tbyb-mvp-miku/
- 앱 (Expo 웹 미리보기): https://ajs-bit.github.io/tbyb-mvp-miku/app/ — 네이티브 실행은 `app/README.md`
- 스크린샷: `docs/screenshots/` (web-*, app-*)

> 시연용 데모입니다. 실제 예약·결제·연락이 없고, 입력 내용은 그 기기(브라우저/앱) 안에만 저장됩니다.
> 체험료·기간·보증·할인·제휴 매장은 딜러 계약 후 확정 — 숫자를 만들지 않았습니다.

## 구성

| 경로 | 내용 |
|---|---|
| `shared/domain.ts` | 상태 전이·가드·문구·데모 데이터 **원본**. 웹·앱이 같은 규칙을 쓴다 |
| `shared/domain.test.ts` | 규칙 테스트 (`node --test shared/domain.test.ts`) |
| `web/` | Next.js 정적 웹: 소개·비교팩·데모 일정 요청·내 체험(기록·결정)·운영 시뮬레이터 |
| `app/` | Expo(React Native) 앱: 체험 기간에 반복해서 여는 도구 — 상태·비교 기록·리마인드·결정·반납 + 운영 시뮬레이터 |
| `scripts/sync-domain.sh` | `shared/domain.ts` → `web/src/lib/domain.ts`, `app/src/domain.ts` 복사 (`--check` 로 검사) |
| `scripts/deploy-pages.sh` | 웹 + 앱 웹 빌드를 GitHub Pages(gh-pages)로 배포 |
| `SPEC.md` | 구현 원칙·역할 분담·디자인 토큰 |

## 지키는 규칙 (TETO 합의)

- 예약은 운영자가 **두 기기 확보 → 결제 대기(기한) → 거래내역 대조** 후에만 확정. 결제 캡처로 확정 없음, 기한 지나면 자동 확정 없음.
- 단계 건너뛰기 불가, 운영자 상태 변경은 사유 필수, 고객은 출고 전 취소만.
- 구매 의향 ≠ 판매: 체험 기기 구매 선택은 딜러 판매 확인 전까지 '판매 확인 대기'. 불성립이면 그 기기도 반납·검수. 판매 확정 전엔 완료 불가.
- 한 대 구매 시 나머지 한 대 반납·검수. 검수(상태·부속품·로그아웃/나의 찾기 해제·초기화) 끝나기 전 그 기기 재대여 불가.
- 비교 요약은 같은 기록에서 두 기기 모두 측정한 항목만 평균 ("n개 기록 기준").
- 저장본이 손상되면 덮어쓰지 않고 오류 표시, 명시적 초기화만 덮어씀. 저장 실패를 성공으로 표시하지 않음.

## 한계

- 백엔드 없음: 웹과 앱은 서로 데이터를 공유하지 않는다. 운영 시뮬레이터는 누구나 열 수 있다 (실제 운영자 인증 없음).
- 앱은 Expo Go(iOS 시뮬레이터)에서 검증. 스토어 배포·실기기 설치 파일 없음. 리마인드는 iOS 로컬 알림(조용한 알림 권한).
- 다음 단계 후보: Supabase(RLS) 저장소·전화번호 인증, 계약된 결제 링크 연동 — 기획서 기술 섹션 참고.
