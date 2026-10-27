# Quickstart: 검증 가이드 (002)

## 사전 준비
- 001과 동일(Node 20+, Docker Desktop, 로컬 Supabase 실행 중, `.env.local`).
- 새 마이그레이션 적용: `npx supabase db reset` (마이그레이션 + 시드).
- 카카오 실로그인으로 확인하려면 `supabase/.env`에 카카오 키가 있어야 한다(README 참고). 자동 테스트는 세션 주입을 쓰므로 불필요.

## 테스트
```bash
npm run check          # lint + tsc + Vitest (도메인 100%)
npx supabase db reset && npm run test:db     # pgTAP: RPC·RLS·승격·동시성 전제
npm run test:e2e       # Playwright (360px)
```

## 시나리오 검증
1. 매니저로 로그인 → `/rounds/new`에서 라운딩 등록(정원 2) → 목록·홈에 표시 (US1)
2. 멤버로 로그인 → 목록에 보이고 등록/수정/취소 수단이 없음, `/rounds/new` 접근 시 홈으로 이동 (US1, US2)
3. 멤버 A·B·C가 차례로 참석 → A·B 참석, C 대기 1번 (US3)
4. A가 불참으로 변경 → C가 참석으로 승격, 상세 명단에 반영 (US3)
5. 불참한 A가 다시 참석 → 대기열 맨 뒤 (US3)
6. 매니저가 정원을 3으로 늘림 → 대기자 자동 승격 / 정원을 1로 줄임 → 기존 참석자 유지 + 안내 표시 (US5)
7. 상세의 투표 현황에 참석/대기/불참 이름이 보이고 내 이름이 강조됨 (US4)
8. 매니저가 라운딩 취소 → "취소됨" 표시, 투표 불가, 홈 "다음 라운딩"에서 제외 (US5, US4)
9. 티오프가 지난 라운딩은 투표/수정/취소 수단이 없고 직접 요청도 거부 (US3, US5)
10. 동시 요청: 정원 2 라운딩에 5명이 동시에 참석 → 참석 정확히 2, 대기 3 (SC-003)
11. 360px/414px에서 목록·상세·등록·수정 화면 가로 스크롤 없음 (SC-008)

## 배포 시 주의
- `npx supabase db push`로 0007 이후 마이그레이션을 운영에 적용한다. 기존 라운딩 행은 `capacity = null`, `status = 'scheduled'`로 유지된다.
