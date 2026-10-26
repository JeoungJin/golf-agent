# Database Contract

## 트리거
- `auth.users` INSERT 시 `members` 행 생성 (닉네임·아바타는 `raw_user_meta_data`에서, 없으면 '회원'/null). 회원이 0명이면 manager+approved, 아니면 member+pending. `pg_advisory_xact_lock`으로 직렬화.

## 함수
- `is_approved() → boolean`, `is_manager() → boolean` (security definer, `auth.uid()` 기준, approved 상태 필요)
- `approve_member(target uuid) → void` — 매니저만, 대상이 pending일 때 approved로. 아니면 예외.
- `reject_member(target uuid) → void` — 동일 조건으로 rejected.

## 조회 계약
- 다음 라운딩: `rounds where starts_at > now() order by starts_at, created_at limit 1`
- 최신 공지: `notices order by created_at desc limit 1`
- 가입 대기 목록: `members where status = 'pending' order by created_at` (매니저만)

## pgTAP 검증 항목 (테스트 먼저 작성)
1. 첫 사용자 → manager/approved, 두 번째 → member/pending
2. pending/rejected 사용자는 notices·rounds SELECT 결과 0건
3. member는 notices INSERT/UPDATE/DELETE 거부, manager는 허용
4. member·pending이 approve_member/reject_member 호출 시 예외
5. 사용자가 자신의 members.role/status UPDATE 시도 시 거부
6. 비로그인(anon)은 모든 테이블 접근 거부
