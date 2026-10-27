---

description: "Task list for 화면 구조 개편 · 이름 입력/수정 · 응답 속도"
---

# Tasks: 화면 구조 개편 · 이름 입력/수정 · 응답 속도

**Input**: `/specs/003-ux-nickname-performance/` (spec.md, plan.md)

**Tests**: 헌법 I(TDD)에 따라 US4·US5의 테스트 작업은 구현보다 먼저 작성하고 **실패(Red)를 확인**한다. US1~US3은 구현 후 문서화된 항목이라 상태에 예외를 표기한다.

> 범례: `[X]` 완료, `[ ]` 미완료, `[~]` 일부 완료, `[-]` 폐기

## Phase 1: US1~US3 사후 기록 (구현 완료)

> 아래는 구현이 먼저였던 작업이다. 헌법 I 위반 기록이며, 테스트는 사후에 보강한다(Phase 4).

- [X] T001 [US1] 상단 고정 헤더: 이름, 이름 옆 로그아웃, `MainTabs`(공지사항/스크린/필드, 현재 위치 강조) — `src/components/Header.tsx`, `src/components/MainTabs.tsx`, `src/components/LogoutButton.tsx`
- [X] T002 [US1] 홈 `/`를 `/notices`로 이동, `/rounds`는 종류 없으면 스크린으로 이동, "전체" 탭·목록 이동 버튼 제거, 설치 안내를 레이아웃으로 이동 — `src/app/(member)/page.tsx`, `src/app/(member)/rounds/page.tsx`, `src/app/(member)/layout.tsx`
- [X] T003 [US1] 공지 작성·라운딩 등록 버튼을 각 목록 화면으로 이동, 상세의 뒤로가기 링크 정리 — `src/app/(member)/notices/page.tsx`, `src/app/(member)/rounds/**`
- [X] T004 [US2] 예정/지난 구역 구분(제목·테두리·점선·종료 배지·흑백), 예정 행 색 순환, 공지 행 교차색 — `src/app/(member)/rounds/page.tsx`, `src/components/RoundListItem.tsx`, `src/app/(member)/notices/page.tsx`
- [X] T005 [US3] 등록 화면 종류 초기값(`?kind=`), 폼·상세 바탕색 카드 — `src/app/(member)/rounds/new/page.tsx`, `src/components/RoundForm.tsx`, `src/components/NoticeForm.tsx`, 상세 페이지들
- [X] T006 [US1] 홈 카드 제거(`NextRoundCard`, `NoticeCard`)와 관련 단위·E2E 테스트 수정 — `tests/e2e/home.spec.ts`, `tests/e2e/notices.spec.ts`, `tests/e2e/rounds.spec.ts`, `tests/unit/components/round-form.test.tsx`
- [~] T007 [US1~3] 변경 화면 검증: 타입체크·린트·단위·빌드는 통과, **E2E는 미실행** (T-V01에서 닫는다)

---

## Phase 2: US4 - 이름 입력/수정 (Priority: P1) 🎯

**Goal**: 이름이 없는 회원은 이름을 입력해야 앱을 쓰고, 모두 이름을 고칠 수 있다.

**Independent Test**: 닉네임 없는 가입자가 이름 입력 화면에서 막히고, 입력 후 진행되며, 수정이 명단·헤더에 반영된다.

### Tests for US4 (먼저 작성하고 Red 확인)

- [X] T008 [P] [US4] 단위 테스트 `validateNickname`: 공백 제거, 빈 값·공백뿐·21자 거부, 20자 허용, 내부 공백 보존, 한글·이모지 길이 계산 — `tests/unit/domain/nickname-validation.test.ts`
- [X] T009 [P] [US4] 단위 테스트 `resolveAccess` 확장: 이름 미설정+승인대기/승인 → `/profile`로, `/profile` 자체는 허용, 거절 회원은 기존 규칙, 이름 설정됨이면 영향 없음 — `tests/unit/domain/access-route.test.ts`
- [X] T010 [P] [US4] pgTAP: 트리거가 메타데이터 있으면 `nickname_set=true`/없으면 `false`, `set_my_nickname`이 본인만 갱신·1~20자·공백 제거·거절 회원 `forbidden`·anon 불가, 타인 행 불변, 백필 규칙 — `supabase/tests/90_nickname.sql` — **Red 확인 후 구현, 로컬 DB에서 단독 실행 14/14 통과**
- [X] T011 [P] [US4] 컴포넌트 테스트 `NicknameForm`: 현재 값 채움, 빈 값·21자 오류 문구, 저장 중 중복 제출 방지, 서버 오류 표시 — `tests/unit/components/nickname-form.test.tsx`
- [~] T012 [US4] Playwright E2E: 닉네임 없는 가입자 → 이름 입력 화면에서 막힘(다른 주소 직접 이동도 되돌아옴) → 입력 후 승인 대기 화면, 승인된 회원이 헤더 이름으로 수정 → 명단·가입 신청 목록 반영, 360px 가로 스크롤 없음 — `tests/e2e/nickname.spec.ts` — **작성 완료. 로컬 DB에 실제 계정이 있어 전체 실행은 불가 → 동일 시나리오(미설정 가입자 → /profile → 입력 → /pending)를 임시 스펙으로 실행해 통과, 임시 스펙은 삭제**

### Implementation for US4

- [X] T013 [US4] 마이그레이션: `members.nickname_set` 추가, 기존 행 백필, `handle_new_user` 수정, `set_my_nickname` RPC(권한 `authenticated`) — `supabase/migrations/0012_nickname_set.sql` (T010 통과) — **set_my_nickname 이 가입 상태를 반환하도록 구현(승인 대기 화면으로 바로 이동). 운영 적용은 T019**
- [X] T014 [P] [US4] `src/domain/nickname-validation.ts` 구현 (T008 통과)
- [X] T015 [US4] `src/domain/access-route.ts` 확장과 `src/middleware.ts`의 회원 조회에 `nickname_set` 포함 (T009 통과)
- [X] T016 [US4] `NicknameForm`, `/profile` 페이지, 서버 액션 `updateNickname`(재검증 → RPC, 오류 한국어 변환) — `src/components/NicknameForm.tsx`, `src/app/(member)/profile/page.tsx`, `src/app/(member)/profile/actions.ts` (T011 통과)
- [X] T017 [US4] 헤더 이름을 `/profile` 링크로 — `src/components/Header.tsx`
- [X] T018 [US4] 스펙 001 개정: FR-004, 닉네임 Edge Case, data-model의 `nickname` 설명을 "이름 직접 입력 가능"으로 수정 (2026-10-27 문서 반영 완료)
- [~] T019 [US4] T008–T012 통과 확인, 운영 DB(서울)에 `db push` — **로컬 검증 완료, 운영(서울) db push 는 배포와 함께**

**Checkpoint**: 이름 없는 회원이 막히고 이름 수정이 가능

---

## Phase 3: US5 - 응답 속도 (Priority: P1)

**Goal**: SC-001의 속도 목표와 "성공했는데 실패 안내" 제거.

**Independent Test**: 개선 전후 같은 방법으로 측정해 목표 안에 든다.

- [~] T020 [US5] **기준값 측정**: 임시 `Server-Timing` 계측 후 주요 5화면(공지 목록, 스크린 목록, 라운딩 상세, 등록 저장, 투표)을 각 10회 측정해 research에 기록 — `specs/003-ux-nickname-performance/research.md`(신규) — **미측정: 인증 세션이 필요한 화면이라 사용자의 로그인 상태에서 측정해야 함**
- [X] T021 [US5] 프로젝트의 JWT 서명 키 종류(대칭/비대칭)를 확인하고 `getClaims()` 적용 가능 여부를 research에 기록 — **운영 프로젝트는 ES256 비대칭 키(JWKS 공개) → getClaims() 사용 가능**
- [X] T022 [P] [US5] 테스트 먼저: 미들웨어 헤더 전달 단위 테스트(클라이언트가 보낸 `x-member-*` 헤더는 제거·덮어쓰기됨) — `tests/unit/lib/middleware-headers.test.ts` — **src/lib/member-headers.ts + tests/unit/lib/member-headers.test.ts (Red 확인 후 구현)**
- [X] T023 [US5] 미들웨어에서 인증·회원 조회를 요청당 1회로 줄이고 결과를 요청 헤더로 전달, 레이아웃의 `getCurrentMember`는 헤더 우선 — `src/lib/supabase/middleware.ts`, `src/middleware.ts`, `src/lib/members.ts` (T022 통과) — **미들웨어: getUser→getClaims, 회원 조회 1회 후 요청 헤더로 전달, 레이아웃은 헤더 우선. 헤더 위조는 미들웨어가 먼저 제거**
- [X] T024 [P] [US5] `loading.tsx` 추가 — 공지·라운딩 목록, 라운딩 상세 — `src/app/(member)/**/loading.tsx` — **공지·라운딩 목록·상세 loading.tsx (ListSkeleton)**
- [~] T025 [US5] "저장 성공 후 실패 안내" 재현 테스트 작성(느린 응답을 흉내) 후 원인 수정 — `src/components/RoundForm.tsx`, `src/components/NoticeForm.tsx`, `tests/e2e/` — **redirect 예외를 오류로 취급하지 않도록 방어(isRedirectError). 실제 원인은 미확인 — 지연 개선 후 운영에서 재현 여부 확인 필요**
- [~] T026 [US5] **재측정** 후 SC-001 달성 여부와 수치를 research에 기록. 미달이면 원인(순차 쿼리, 번들 크기 등)을 추가 작업으로 분리 — **T020 이후**

**Checkpoint**: 목표 달성이 수치로 확인됨

---

## Phase 4: 검증·정리

- [ ] T-V01 별도 테스트용 DB로 `npm run test:db`, `npm run test:e2e` 전체 실행(로컬에 실제 계정이 있으면 `supabase db reset` 후) — 이전 변경(US1~3, 002 US4·5)의 E2E 미실행 건을 함께 닫는다
- [ ] T-V02 [P] 사후 테스트 보강: `Header`·`MainTabs`(현재 위치 강조), `RoundListItem isPast`, 목록 행 색 순환, `/rounds` 리다이렉트, 종류 초기값 — `tests/unit/components/`, `tests/e2e/`
- [ ] T-V03 [P] 360/414px 가로 스크롤 검사에 `/profile`과 상단 메뉴가 있는 모든 화면 추가 — `tests/e2e/layout.spec.ts`
- [ ] T-V04 배포 환경 모바일 기기(iOS/Android)에서 수동 검증: 카카오 로그인(닉네임 있음/없음), 이름 입력·수정, 탭 이동, 저장 속도
- [ ] T-V05 운영 정리: 인도 `jin-agent` 프로젝트 일시정지/삭제 확인 후 정리, README 배포 절차(서울 프로젝트, `vercel.json`, 환경변수 두 개) 갱신

---

## Dependencies & Execution Order

- Phase 1은 완료됨. Phase 2(US4)와 Phase 3(US5)는 서로 독립이라 병렬 가능하나, T015(미들웨어 수정)와 T023(미들웨어 수정)은 같은 파일을 건드리므로 **T015 → T023 순서**로 한다.
- 각 스토리 안에서 테스트(Red) → 구현(Green) 순서를 지킨다(헌법 I).
- T020(측정)은 T023 이전에 끝나야 비교가 가능하다.
- T-V01은 마지막에 한 번, 모든 마이그레이션 적용 뒤에 실행한다.

## Implementation Strategy

1. US4(T008~T019): 이름 입력은 운영 중 가입자를 곤란하게 하는 문제라 먼저 한다. MVP는 T013·T015·T016.
2. US5(T020~T026): 측정으로 시작해 수치로 끝낸다.
3. Phase 4로 이전 변경의 미검증분과 문서를 정리한다.
