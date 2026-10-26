# Research: 카카오 로그인 · 홈 대시보드

## 1. 카카오 인증
- **Decision**: Supabase Auth의 `kakao` provider 사용. 로그인 시 스코프를 `profile_nickname profile_image`로 명시하고 이메일은 요청하지 않는다.
- **Rationale**: 카카오 OAuth를 별도 서버 없이 지원하고 세션/쿠키(@supabase/ssr)까지 제공한다. 개인정보 최소 수집(Constitution V) 충족.
- **확인 필요**: Supabase 카카오 설정에서 이메일 없이 로그인 허용 옵션이 있는지, 카카오 개발자 콘솔 동의항목(닉네임, 프로필 이미지) 설정이 필요한지 구현 시 실제 설정 화면에서 검증한다.
- **Alternatives**: Auth.js + 카카오 — 세션과 RLS 연동을 별도 구성해야 해서 기각. Firebase 커스텀 토큰 — 구현량 증가로 기각.

## 2. 접근 통제(승인제)
- **Decision**: `members` 테이블에 `status`(pending/approved/rejected), `role`(manager/member). `auth.users` INSERT 트리거가 members 행 생성: 회원이 0명이면 manager+approved, 아니면 member+pending. 동시 가입 경쟁은 `pg_advisory_xact_lock`으로 직렬화.
- **Rationale**: 최초 가입자 매니저 규칙(스펙 Assumptions)을 DB에서 원자적으로 보장.
- **Alternatives**: 앱 코드에서 판정 — 경쟁 조건과 우회 가능성 때문에 기각.

## 3. 권한 강제 방식
- **Decision**: RLS 정책 + 보안 정의 헬퍼(`is_approved()`, `is_manager()`). 가입 승인/거절은 RPC(`approve_member`, `reject_member`)로만 가능하고 members 직접 UPDATE 정책은 두지 않는다(role/status 자기 승격 차단).
- **Rationale**: 컬럼 단위 변조를 가장 단순하게 차단. Constitution VI.
- **Alternatives**: 컬럼 권한/트리거 가드 — RPC보다 복잡.

## 4. 테스트 전략 (TDD)
- **Decision**: 도메인/컴포넌트는 Vitest+RTL, RLS/RPC/트리거는 pgTAP(`supabase test db`), 핵심 흐름은 Playwright. 카카오 실로그인은 E2E 자동화가 어려우므로 테스트 전용 세션 주입(서비스 롤로 사용자 생성 후 세션 쿠키 설정)을 사용한다.
- **주의**: pgTAP와 로컬 Supabase는 Docker가 필요하다. 구현 시작 전에 Docker Desktop 설치 여부를 확인한다.

## 5. PWA 및 설치 안내
- **Decision**: `app/manifest.ts` + 최소 `public/sw.js` + 아이콘. 설치 여부는 `display-mode: standalone` / `navigator.standalone`로 판별, Android는 `beforeinstallprompt`로 설치 버튼 제공, iOS는 수동 안내 문구. 닫기 시각과 '다시 보지 않기'는 localStorage.
- **Rationale**: 추가 라이브러리 없이 요구 충족(YAGNI). 판단 로직은 `domain/install-prompt.ts` 순수 함수로 분리.
- **Alternatives**: next-pwa/Serwist — 오프라인 캐싱은 요구되지 않아 보류.

## 6. 무료 티어 한도 (구현 시 재확인)
- Vercel Hobby: 비상업 용도 한정, 소규모 모임에 적합.
- Supabase Free: DB 500MB, MAU 5만, 약 1주 비활성 시 프로젝트 일시 중지 — 운영 시 주기적 접속 필요(quickstart에 기재).

## 7. 시간 처리
- **Decision**: DB는 `timestamptz` 저장, 표시는 KST(`Asia/Seoul`). "가장 가까운 라운딩"은 `starts_at > now()` 중 최소값, 동률은 `created_at` 오름차순.
