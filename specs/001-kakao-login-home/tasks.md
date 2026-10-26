---

description: "Task list for 카카오 로그인 · 홈 화면 추가 안내 · 홈 대시보드"
---

# Tasks: 카카오 로그인 · 홈 화면 추가 안내 · 홈 대시보드

**Input**: Design documents from `/specs/001-kakao-login-home/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (routes.md, database.md), quickstart.md

**Tests**: Constitution I(TDD, NON-NEGOTIABLE)에 따라 테스트 작업은 필수이며, 각 스토리에서 구현 작업보다 먼저 작성하고 **실패(Red)를 확인**한 뒤 구현한다.

**Organization**: 사용자 스토리별로 묶어 독립 구현·검증이 가능하다. 스토리 순서: US1(로그인) → US1-B(가입 승인) → US2(홈) → US3(공지 관리) → US4(설치 팝업).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (서로 다른 파일, 미완료 작업에 의존 없음)
- **[Story]**: US1, US1B, US2, US3, US4

## Path Conventions

단일 Next.js 프로젝트: `src/`, `tests/`, `supabase/` (저장소 루트 기준, plan.md 참고)

---

## Phase 1: Setup

**Purpose**: 프로젝트 초기화

- [X] T001 저장소 루트에 Next.js 15(App Router, TypeScript, Tailwind, src 디렉터리, ESLint) 프로젝트 생성 (`npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`; 기존 `.specify`, `.claude`, `specs` 폴더는 유지)
- [X] T002 런타임 의존성 설치: `@supabase/supabase-js`, `@supabase/ssr` — `package.json`
- [X] T003 [P] Vitest + React Testing Library + jsdom 설정, `npm run test` 스크립트 추가 — `vitest.config.ts`, `tests/setup.ts`, `package.json`
- [X] T004 [P] Playwright 설정(모바일 뷰포트 360x740 프로젝트 포함), `npm run test:e2e` 스크립트 추가 — `playwright.config.ts`, `package.json`
- [X] T005 [P] Supabase CLI를 devDependency로 설치하고 `npx supabase init` 실행 — `supabase/config.toml`, `package.json`
- [X] T006 [P] `.env.example`(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY[테스트 전용] 키 이름만)과 `.gitignore`에 `.env*.local` 포함 확인
- [X] T007 [P] `<html lang="ko">`, 모바일 viewport, 한국어 기본 레이아웃(최대 폭 480px 중앙 정렬) 설정 — `src/app/layout.tsx`, `src/app/globals.css`

---

## Phase 2: Foundational (모든 스토리의 선행 조건)

**Purpose**: 스키마 뼈대, Supabase 클라이언트, 테스트 헬퍼

**⚠️ CRITICAL**: 이 단계가 끝나기 전에는 사용자 스토리 작업을 시작할 수 없다.

- [X] T008 `npx supabase start`로 로컬 Supabase 기동 확인(Docker 필요) 후 출력된 로컬 URL/anon key를 `.env.local`에 기록 (커밋 금지)
- [X] T009 기본 스키마 마이그레이션 작성: enum `member_role(manager, member)`, `member_status(pending, approved, rejected)`, `round_kind(screen, field)`; 테이블 `members`, `notices`, `rounds`를 data-model.md 그대로 생성하고(`notices.title` 길이 1..100·공백만 불가, `notices.body` 길이 1..5000·공백만 불가, `rounds.fee` integer ≥ 0, `members.nickname` 기본값 '회원', `members.role` 기본 member, `members.status` 기본 pending), 세 테이블 모두 `enable row level security`(정책 없음 = 전면 거부) — `supabase/migrations/0001_schema.sql`
- [X] T010 [P] pgTAP 공용 헬퍼 작성: 테스트 사용자 생성(`auth.users` insert)과 `request.jwt.claims` 설정으로 사용자 전환하는 함수 — `supabase/tests/00_helpers.sql`
- [X] T011 [P] Supabase 브라우저 클라이언트 — `src/lib/supabase/client.ts`
- [X] T012 [P] Supabase 서버 클라이언트(쿠키 기반 `@supabase/ssr`) — `src/lib/supabase/server.ts`
- [X] T013 [P] 미들웨어용 세션 갱신 헬퍼 — `src/lib/supabase/middleware.ts`
- [X] T014 [P] 도메인 타입 정의(`Member`, `Notice`, `Round`, `MemberStatus`, `MemberRole`) — `src/domain/types.ts`
- [X] T015 [P] E2E 테스트 세션 헬퍼: 서비스 롤로 사용자 생성/삭제 및 로그인 세션 쿠키 주입(카카오 실로그인 우회, 테스트 전용) — `tests/e2e/helpers/session.ts`
- [X] T016 `npx supabase db reset`이 오류 없이 완료되고 `npx supabase test db`가 실행 가능한지 확인 (빈 테스트 통과)

**Checkpoint**: 기반 준비 완료

---

## Phase 3: User Story 1 - 카카오 계정으로 로그인 (Priority: P1) 🎯 MVP

**Goal**: 카카오 로그인/로그아웃, 비로그인 접근 차단, 세션 유지

**Independent Test**: 비로그인으로 보호 경로 접근 시 `/login`으로 이동, 로그인 후 상태별 경로로 이동, 로그아웃 시 `/login` 복귀

### Tests for User Story 1 (먼저 작성, 실패 확인) ⚠️

- [X] T017 [P] [US1] `access-route` 단위 테스트: 비로그인→`/login`, pending→`/pending`, rejected→`/rejected`, approved가 `/login` 접근 시→`/`, approved 비매니저의 manager 전용 경로(`/notices/new`, `/notices/[id]/edit`, `/admin/members`)→`/`, 허용 경로는 통과 — `tests/unit/domain/access-route.test.ts`
- [X] T018 [P] [US1] pgTAP: 첫 `auth.users` 가입자는 `members`에 role=manager, status=approved; 두 번째는 member/pending; 닉네임 메타데이터가 없으면 nickname='회원', avatar_url null; 동일 사용자 재삽입 불가 — `supabase/tests/10_member_trigger.sql`
- [X] T019 [P] [US1] 로그인 페이지 컴포넌트 테스트: "카카오로 로그인" 버튼 렌더링, 클릭 시 `signInWithOAuth({provider:'kakao', options:{scopes:'profile_nickname profile_image'}})` 호출, 인증 실패 쿼리(`?error=`) 시 한국어 오류 문구와 재시도 가능 — `tests/unit/components/login.test.tsx`
- [X] T020 [US1] Playwright E2E: 비로그인으로 `/` 접속 시 `/login` 이동; 테스트 세션 주입 후 홈 표시; 로그아웃 후 `/login` 복귀 — `tests/e2e/login.spec.ts`

### Implementation for User Story 1

- [X] T021 [US1] `src/domain/access-route.ts` 구현(T017 통과): 입력 `{session, status, role, path}` → `{type:'allow'} | {type:'redirect', to}` (contracts/routes.md 규칙)
- [X] T022 [US1] 회원 생성 트리거 마이그레이션(T018 통과): `auth.users` insert 시 `pg_advisory_xact_lock` 후 `members` 0명이면 manager+approved, 아니면 member+pending; `raw_user_meta_data`의 닉네임·프로필 이미지 사용, 없으면 '회원'/null — `supabase/migrations/0002_member_trigger.sql`
- [X] T023 [US1] members SELECT RLS 정책 추가(본인 행 조회 가능) — `supabase/migrations/0003_members_rls.sql`
- [X] T024 [US1] 로그인 페이지 및 카카오 로그인 버튼(T019 통과), 한국어 오류 안내 — `src/app/login/page.tsx`, `src/components/KakaoLoginButton.tsx`
- [X] T025 [US1] OAuth 콜백 라우트: 코드 교환 후 `members.status`를 조회해 `access-route` 규칙대로 이동, 실패 시 `/login?error=...` — `src/app/auth/callback/route.ts`
- [X] T026 [US1] 미들웨어: 세션 갱신 + `access-route`로 모든 경로(`/login`, `/auth/*`, 정적 자원 제외) 보호 — `src/middleware.ts`
- [X] T027 [US1] 로그아웃 액션/버튼(헤더 포함, 닉네임 표시) — `src/components/Header.tsx`, `src/app/(member)/layout.tsx`
- [X] T028 [US1] T017–T020 전체 통과 확인 (`npm run test`, `npx supabase test db`, `npm run test:e2e`)

**Checkpoint**: 로그인/로그아웃과 접근 차단 동작 (MVP 기반)

---

## Phase 4: User Story 1-B - 가입 승인 (Priority: P1)

**Goal**: 승인 대기/거절 상태 화면과 매니저의 승인·거절

**Independent Test**: 새 계정은 `/pending`만 접근, 매니저 승인 후 홈 접근, 권한 없는 승인 시도 거부

### Tests for User Story 1-B ⚠️

- [X] T029 [P] [US1B] pgTAP: `approve_member`/`reject_member`는 매니저만 호출 가능(멤버·pending·anon은 예외), pending 대상만 전이, approved/rejected 대상에 호출 시 예외; 사용자가 자신의 `members.role`/`status`를 직접 UPDATE하면 거부; 매니저는 members 전체 SELECT, 일반 멤버는 본인 행만 — `supabase/tests/20_member_approval.sql`
- [X] T030 [P] [US1B] 컴포넌트 테스트: 가입 신청 목록이 닉네임·신청 시각을 표시하고 승인/거절 버튼이 해당 액션을 호출, 목록이 비면 "대기 중인 신청이 없습니다" — `tests/unit/components/pending-list.test.tsx`
- [X] T031 [US1B] Playwright E2E: 첫 계정=매니저로 홈 진입, 둘째 계정은 `/pending`만 접근(홈 직접 접근 시 `/pending`으로 이동), 매니저 승인 후 둘째 계정 홈 접근, 거절된 계정은 `/rejected` — `tests/e2e/approval.spec.ts`

### Implementation for User Story 1-B

- [X] T032 [US1B] 마이그레이션(T029 통과): `is_approved()`, `is_manager()`(security definer, `auth.uid()` 기준, approved 상태 필요), `approve_member(target uuid)`, `reject_member(target uuid)`, 매니저 members SELECT 정책 — `supabase/migrations/0004_approval.sql`
- [X] T033 [P] [US1B] 승인 대기 안내 페이지(한국어, 새로고침/다시 확인 버튼) — `src/app/pending/page.tsx`
- [X] T034 [P] [US1B] 거절 안내 페이지 — `src/app/rejected/page.tsx`
- [X] T035 [US1B] 가입 신청 관리 페이지와 목록 컴포넌트(T030 통과), 승인/거절 server action — `src/app/(member)/admin/members/page.tsx`, `src/components/PendingMemberList.tsx`, `src/app/(member)/admin/members/actions.ts`
- [X] T036 [US1B] 매니저에게만 헤더에 "가입 신청" 링크 노출 — `src/components/Header.tsx`
- [X] T037 [US1B] T029–T031 통과 확인

**Checkpoint**: 접근 통제 완성 (비승인자는 모임 정보 열람 불가, SC-008)

---

## Phase 5: User Story 2 - 홈 대시보드 (Priority: P1)

**Goal**: 가장 가까운 라운딩 1건 + 최신 공지 1건을 한눈에 표시

**Independent Test**: 시드 라운딩·공지가 있을 때 둘 다 표시, 없으면 빈 상태 안내

### Tests for User Story 2 ⚠️

- [X] T038 [P] [US2] `next-round` 단위 테스트: 현재 이후 중 가장 빠른 1건 선택, 과거만 있으면 null, 시작 시각이 정확히 현재면 제외, 동일 시각이면 `created_at`이 먼저인 것, 빈 배열이면 null — `tests/unit/domain/next-round.test.ts`
- [X] T039 [P] [US2] `notice-summary` 단위 테스트: 길이 초과 시 말줄임(…) 처리, 짧으면 그대로, 줄바꿈 공백 정규화, 빈 문자열 처리 — `tests/unit/domain/notice-summary.test.ts`
- [X] T040 [P] [US2] 포맷터 단위 테스트: KST 기준 일시 표기("10월 31일(토) 오후 1:30" 형식), 비용 천 단위 구분("30,000원"), 종류 라벨(스크린/필드) — `tests/unit/domain/format.test.ts`
- [X] T041 [P] [US2] pgTAP: approved 사용자는 `rounds`·`notices` SELECT 가능, pending/rejected/anon은 0건 또는 거부; `rounds` INSERT/UPDATE/DELETE는 모든 역할 거부 — `supabase/tests/30_read_policies.sql`
- [X] T042 [P] [US2] 컴포넌트 테스트: `NextRoundCard`(종류·일시·장소·비용 표시, null이면 "예정된 라운딩이 없습니다"), `NoticeCard`(제목·요약 표시, 클릭 시 상세 링크, null이면 "등록된 공지가 없습니다"), 데이터 로드 실패 시 오류 문구와 "다시 시도" 버튼 — `tests/unit/components/home-cards.test.tsx`
- [X] T043 [US2] Playwright E2E(360px 뷰포트): 시드 데이터로 홈에 두 카드 표시, 데이터 없을 때 빈 상태, `document.documentElement.scrollWidth <= 360`(가로 스크롤 없음) — `tests/e2e/home.spec.ts`

### Implementation for User Story 2

- [X] T044 [P] [US2] `src/domain/next-round.ts` 구현(T038 통과)
- [X] T045 [P] [US2] `src/domain/notice-summary.ts` 구현(T039 통과)
- [X] T046 [P] [US2] `src/domain/format.ts` 구현(T040 통과, 시간대 `Asia/Seoul`)
- [X] T047 [US2] rounds·notices SELECT RLS 정책(approved만) 마이그레이션(T041 통과) — `supabase/migrations/0005_read_policies.sql`
- [X] T048 [P] [US2] 개발/E2E용 시드 데이터(미래 라운딩 2건, 과거 1건, 공지 2건) — `supabase/seed.sql`
- [X] T049 [P] [US2] `NextRoundCard`, `NoticeCard`, 오류 재시도 컴포넌트(T042 통과) — `src/components/NextRoundCard.tsx`, `src/components/NoticeCard.tsx`, `src/components/ErrorRetry.tsx`
- [X] T050 [US2] 홈 페이지: 서버에서 rounds(미래 후보)와 최신 공지 1건 조회 후 `next-round`로 선택해 카드 렌더링 — `src/app/(member)/page.tsx`
- [X] T051 [US2] 공지 상세 페이지(전문 표시, 존재하지 않는 id는 404) — `src/app/(member)/notices/[id]/page.tsx`
- [X] T052 [US2] T038–T043 통과 확인

**Checkpoint**: 핵심 가치(홈 대시보드) 완성

---

## Phase 6: User Story 3 - 매니저 공지 등록·수정 (Priority: P2)

**Goal**: 매니저만 공지를 작성·수정·삭제

**Independent Test**: 매니저 등록 공지가 멤버 홈에 표시되고, 멤버의 쓰기 시도는 UI 노출과 무관하게 거부

### Tests for User Story 3 ⚠️

- [X] T053 [P] [US3] pgTAP: 매니저는 notices INSERT/UPDATE/DELETE 가능, 멤버·pending·anon은 거부; 빈/공백 제목·본문, 제목 100자 초과, 본문 5000자 초과 거부; 수정 시 `updated_at` 갱신 — `supabase/tests/40_notice_write.sql`
- [X] T054 [P] [US3] 공지 입력 검증 단위 테스트: 제목 1..100자·공백만 불가, 본문 1..5000자·공백만 불가, 오류 메시지는 한국어 — `tests/unit/domain/notice-validation.test.ts`
- [X] T055 [P] [US3] 공지 폼 컴포넌트 테스트: 빈 값 제출 시 오류 안내 표시 및 제출 안 됨, 유효 값 제출 시 액션 호출 — `tests/unit/components/notice-form.test.tsx`
- [X] T056 [US3] Playwright E2E: 매니저가 공지 등록 → 멤버 홈에 최신 공지로 표시; 수정·삭제 반영; 멤버에게는 작성/수정/삭제 버튼이 없고 `/notices/new` 직접 접근 시 `/`로 이동 — `tests/e2e/notices.spec.ts`

### Implementation for User Story 3

- [X] T057 [US3] `src/domain/notice-validation.ts` 구현(T054 통과)
- [X] T058 [US3] notices 쓰기 RLS 정책(매니저만) 및 `updated_at` 갱신 트리거 마이그레이션(T053 통과) — `supabase/migrations/0006_notice_write.sql`
- [X] T059 [US3] 공지 폼 컴포넌트(T055 통과) — `src/components/NoticeForm.tsx`
- [X] T060 [US3] 공지 작성·수정 페이지와 server action(등록/수정/삭제, 서버에서도 `notice-validation` 재검증) — `src/app/(member)/notices/new/page.tsx`, `src/app/(member)/notices/[id]/edit/page.tsx`, `src/app/(member)/notices/actions.ts`
- [X] T061 [US3] 매니저에게만 홈/상세에 "공지 작성·수정·삭제" 버튼 노출 — `src/components/NoticeCard.tsx`, `src/app/(member)/notices/[id]/page.tsx`
- [X] T062 [US3] T053–T056 통과 확인

**Checkpoint**: 공지 운영 가능

---

## Phase 7: User Story 4 - 홈 화면 추가 안내 팝업 (Priority: P2)

**Goal**: 미설치 브라우저 접속자에게 OS별 설치 안내 팝업

**Independent Test**: 미설치 브라우저에서 팝업 표시, 닫기 후 7일 미표시, '다시 보지 않기' 영구 미표시, standalone 실행 시 미표시

### Tests for User Story 4 ⚠️

- [X] T063 [P] [US4] `install-prompt` 단위 테스트(순수 함수 `shouldShowInstallPrompt({isStandalone, dismissedAt, neverShow, now})`와 `detectPlatform(userAgent)`): standalone이면 false, neverShow면 false, 닫은 지 7일 미만이면 false, 정확히 7일 경과 시 true, 기록 없으면 true; iOS/Android/기타 판별 — `tests/unit/domain/install-prompt.test.ts`
- [X] T064 [P] [US4] `InstallPrompt` 컴포넌트 테스트: iOS는 "공유 버튼 → 홈 화면에 추가" 안내, Android에서 `beforeinstallprompt` 수신 시 "추가하기" 버튼이 `prompt()` 호출, 닫기 시 localStorage에 시각 저장, '다시 보지 않기' 저장, localStorage 접근 실패 시에도 오류 없이 동작 — `tests/unit/components/install-prompt.test.tsx`
- [X] T065 [US4] Playwright E2E: 첫 접속 시 팝업 표시, 닫기 후 새로고침해도 미표시, standalone 에뮬레이션 시 미표시 — `tests/e2e/install-prompt.spec.ts`

### Implementation for User Story 4

- [X] T066 [US4] `src/domain/install-prompt.ts` 구현(T063 통과)
- [X] T067 [US4] `InstallPrompt` 컴포넌트(T064 통과)를 홈에 배치 — `src/components/InstallPrompt.tsx`, `src/app/(member)/page.tsx`
- [X] T068 [P] [US4] 웹 앱 매니페스트(이름, 한국어 설명, `display: standalone`, 테마 색, 아이콘) — `src/app/manifest.ts`
- [X] T069 [P] [US4] 앱 아이콘 192/512 및 maskable 생성 — `public/icons/`
- [X] T070 [P] [US4] 최소 서비스 워커 등록(캐싱 없이 설치 가능성 충족) — `public/sw.js`, `src/components/ServiceWorkerRegister.tsx`
- [X] T071 [US4] T063–T065 통과 확인

**Checkpoint**: 모든 스토리 완료

---

## Phase 8: Polish & Cross-Cutting

- [ ] T072 [P] `src/domain/` 단위 테스트 커버리지 측정(Vitest coverage) 및 100% 미달 파일 보강 (Constitution II) — `vitest.config.ts`
- [ ] T073 [P] 360px·414px 뷰포트에서 모든 화면 가로 스크롤/잘림 점검 및 수정 — `tests/e2e/layout.spec.ts`
- [ ] T074 [P] 네트워크 오류 시 홈·승인 목록의 오류 안내와 재시도 동작 점검 (FR-014)
- [ ] T075 [P] 린트·타입 체크(`npm run lint`, `npx tsc --noEmit`)를 통과시키고 `package.json`에 `npm run check`(lint+tsc+test) 스크립트 추가
- [ ] T076 보안 점검: 클라이언트 번들에 서비스 롤 키 미포함, `.env.local` 미커밋, 모든 테이블 RLS 활성 확인 (Constitution V, VI)
- [ ] T077 배포: Supabase 프로젝트 생성·마이그레이션 적용(`npx supabase db push`), 카카오 개발자 콘솔 Redirect URI와 Supabase Auth 설정, Vercel 환경변수 등록 및 배포 — `README.md`에 절차 기록
- [ ] T078 quickstart.md 8개 시나리오를 배포 환경 모바일 기기(iOS/Android)에서 수동 검증

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → 이후 스토리**. Phase 2 완료 전 스토리 작업 불가.
- **US1** 먼저(트리거·미들웨어·로그인). **US1B**는 US1의 members 트리거/미들웨어에 의존. **US2**는 US1B의 `is_approved()`에 의존(T047). **US3**는 US2의 notices 조회/상세 페이지에 의존. **US4**는 홈(T050)에 배치하므로 US2 이후(도메인·컴포넌트 작성은 독립).
- 각 스토리 내부: 테스트 작성(Red 확인) → 도메인/DB → 컴포넌트 → 페이지 → 통과 확인(Green) → 리팩터링.

### Parallel Opportunities

- Setup: T003–T007 병렬
- Foundational: T010–T015 병렬
- US1 테스트 T017–T019 병렬; US2 테스트 T038–T042 병렬, 구현 T044–T046·T048·T049 병렬
- US4의 T063·T064, T068–T070은 US2와 병행 가능(홈 배치 T067만 US2 이후)

## Implementation Strategy

1. **MVP**: Phase 1–2 + US1 + US1B + US2 → 로그인·승인·홈 대시보드 (SC-001~003, SC-008)
2. 이후 US3(공지 운영) → US4(설치 팝업) → Polish → 배포(T077)
3. 각 체크포인트에서 `npm run check`, `npx supabase test db`, `npm run test:e2e` 통과 후 다음 단계로 진행
