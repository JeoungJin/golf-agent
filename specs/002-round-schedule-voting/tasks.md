---

description: "Task list for 라운딩 일정 관리 · 참석 투표"
---

# Tasks: 라운딩 일정 관리 · 참석 투표

**Input**: Design documents from `/specs/002-round-schedule-voting/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (routes.md, database.md), quickstart.md

**Tests**: Constitution I(TDD, NON-NEGOTIABLE)에 따라 테스트 작업은 필수이며, 각 스토리에서 구현 작업보다 먼저 작성하고 **실패(Red)를 확인**한 뒤 구현한다. 마이그레이션은 스토리별로 나눠 `0007`(기반) → `0008`(등록) → `0009`(투표) → `0010`(명단) → `0011`(수정·취소) 순으로 추가한다(plan.md의 `0007_rounds_voting.sql`은 이 파일들의 합을 뜻한다).

**Organization**: 사용자 스토리별로 묶어 독립 구현·검증이 가능하다. 스토리 순서: US1(등록) → US2(목록·상세) → US3(투표·대기) → US4(명단·홈 카드) → US5(수정·취소).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 가능 (서로 다른 파일, 미완료 작업에 의존 없음)
- **[Story]**: US1 ~ US5

## Path Conventions

단일 Next.js 프로젝트: `src/`, `tests/`, `supabase/` (저장소 루트 기준, plan.md 참고)

---

## Phase 1: Foundational (모든 스토리의 선행 조건)

**Purpose**: 스키마 기반, 도메인 타입, 테스트 헬퍼. 이 단계가 끝나기 전에는 스토리 작업을 시작할 수 없다.

- [X] T001 pgTAP 스키마 테스트 먼저 작성(Red 확인): `rounds`에 `capacity`(null 허용, `>= 1`)·`status`(기본 `scheduled`)·`updated_at` 컬럼, `location` 길이 1..100·공백만 불가 제약, `round_votes`(PK `(round_id, member_id)`, `status`/`requested_at` not null), `round_votes` RLS(승인된 회원만 SELECT, 승인 대기·거절·anon 0건/거부), `authenticated`의 `round_votes`·`rounds` INSERT/UPDATE/DELETE 권한 없음 — `supabase/tests/50_round_schema.sql`
- [X] T002 스키마 마이그레이션: enum `round_status(scheduled, cancelled)`, `vote_status(attending, waiting, declined)`, `vote_choice(attend, decline)`; `rounds` 컬럼 추가 및 location 제약(data-model.md 그대로); `round_votes` 테이블 + 인덱스 `(round_id, status, requested_at)`; RLS 활성화, `round_votes_select_approved` 정책, `authenticated`의 쓰기 권한 revoke — `supabase/migrations/0007_rounds_schema.sql` (T001 통과)
- [X] T003 [P] 도메인 타입 확장: `Round`에 `capacity: number | null`, `status`, `updatedAt` 추가, `VoteStatus`, `Vote`, `RosterEntry` 정의. 기존 타입 사용처(`src/lib/queries.ts`의 `toRound`, 테스트 픽스처)를 함께 맞춰 `npx tsc --noEmit` 통과 — `src/domain/types.ts`, `src/lib/queries.ts`, `tests/unit/**`
- [X] T004 [P] E2E 헬퍼 확장: `seedRound`에 `capacity`·`status` 옵션, 서비스 롤로 투표를 직접 심는 `seedVote`, 승인된 멤버를 만드는 `createApprovedMember`, 매니저/멤버 컨텍스트 생성 헬퍼 — `tests/e2e/helpers/session.ts`
- [X] T005 기반 확인: `npx supabase db reset` 후 `npm run test:db`, `npm run check`, `npm run test:e2e`가 기존 테스트와 함께 모두 통과

**Checkpoint**: 기반 준비 완료

---

## Phase 2: User Story 1 - 매니저가 라운딩 일정 등록 (Priority: P1) 🎯 MVP

**Goal**: 매니저가 라운딩을 등록하고, 멤버는 등록·수정·취소할 수 없다.

**Independent Test**: 매니저가 등록한 라운딩이 저장되고(정원 비움 = 제한 없음), 잘못된 입력은 항목별 오류로 거부되며, 멤버의 직접 요청은 거부된다.

### Tests for User Story 1 (먼저 작성하고 Red 확인)

- [X] T006 [P] [US1] pgTAP `create_round`: 매니저 성공 후 id 반환·`scheduled`, 멤버·승인 대기·거절은 `42501`, anon은 execute 거부, 입력 검증(빈/101자 장소, 음수 비용, 정원 0, 과거 일시, 정원 null 허용)별 오류 코드(`invalid_input`, `starts_in_past`) — `supabase/tests/60_create_round.sql`
- [X] T007 [P] [US1] 단위 테스트 `validateRound`(종류 필수, 장소 trim 후 1..100자, 비용 0 이상 정수·기본 0, 정원 비움 허용·1 이상 정수, 일시 필수·`now` 이후, 항목별 한국어 오류 메시지)와 `parseKstDateTime`(`2026-11-10T14:00` → `2026-11-10T05:00:00.000Z`, 잘못된 형식은 null) — `tests/unit/domain/round-validation.test.ts`
- [X] T008 [P] [US1] 단위 테스트 `resolveAccess` 확장: `/rounds/new`는 매니저만 허용, 멤버는 `/`로 리다이렉트(기존 케이스 유지, 100% 커버리지) — `tests/unit/domain/access-route.test.ts`
- [X] T009 [P] [US1] 컴포넌트 테스트 `RoundForm`: 필드 렌더링, 빈 제출 시 항목별 오류 표시와 `onSubmit` 미호출, 정상 제출 시 정규화된 값 전달, 서버 오류 메시지 표시 — `tests/unit/components/round-form.test.tsx`
- [X] T010 [US1] Playwright E2E: 매니저가 `/rounds/new`에서 등록 → 상세 이동, 정원 비움 허용, 빈 값 오류, 멤버는 `/rounds/new` 접근 시 홈으로 이동 — `tests/e2e/rounds.spec.ts`

### Implementation for User Story 1

- [X] T011 [US1] 마이그레이션 `create_round`(매니저 검증, 입력 검증, 오류 코드, security definer, `anon` 제외 execute) — `supabase/migrations/0008_create_round.sql` (T006 통과)
- [X] T012 [P] [US1] `src/domain/round-validation.ts` 구현(`validateRound`, `parseKstDateTime`) (T007 통과)
- [X] T013 [US1] `src/domain/access-route.ts`에 `/rounds/new`, `/rounds/[id]/edit` 매니저 전용 규칙 추가 (T008 통과)
- [X] T014 [US1] `RoundForm` 컴포넌트(종류 라디오, `datetime-local`, 장소, 비용, 정원, 모바일 레이아웃) — `src/components/RoundForm.tsx` (T009 통과)
- [X] T015 [US1] 서버 액션 `createRound`(서버 재검증 → RPC, 오류 코드의 한국어 변환 `src/lib/round-errors.ts`) 와 `/rounds/new` 페이지 — `src/app/(member)/rounds/actions.ts`, `src/app/(member)/rounds/new/page.tsx`
- [X] T016 [US1] T006–T010 통과 확인 및 `db push` 전 마이그레이션 검토

**Checkpoint**: 매니저가 라운딩을 등록할 수 있음 (MVP)

---

## Phase 3: User Story 2 - 멤버가 라운딩 목록·상세 확인 (Priority: P1)

**Goal**: 승인된 회원이 예정/지난 라운딩 목록과 상세 정보를 본다.

**Independent Test**: 예정·지난·취소 라운딩을 준비하고 목록의 구역·정렬·배지, 상세 내용, 빈 상태, 접근 제한을 확인한다.

### Tests for User Story 2 (먼저 작성하고 Red 확인)

- [X] T017 [P] [US2] 단위 테스트 `format` 확장: 정원 표기(`formatCapacity` — 정원 있으면 "N/정원", 없으면 "N명"), 라운딩 상태 라벨 — `tests/unit/domain/format.test.ts`
- [X] T018 [P] [US2] 컴포넌트 테스트 `RoundListItem`: 종류·일시·장소·비용·참석 인원 표시, 취소됨 배지, 상세 링크 — `tests/unit/components/round-list-item.test.tsx`
- [X] T019 [US2] Playwright E2E: 목록 구역·정렬(예정 빠른 순, 지난 최근 순 최대 10건), 취소됨 표시, 빈 상태, 상세 표시, 승인 대기 사용자 접근 거부, 360px 가로 스크롤 없음 — `tests/e2e/rounds.spec.ts`

### Implementation for User Story 2

- [X] T020 [P] [US2] `src/domain/format.ts` 확장 (T017 통과)
- [X] T021 [US2] `src/lib/queries.ts`에 예정/지난(10건) 라운딩 조회, 단건 조회, 투표 조회 추가(`fetchRounds`, `fetchRound`, `fetchVotes`)
- [X] T022 [US2] `RoundListItem` 컴포넌트 (T018 통과) — `src/components/RoundListItem.tsx`
- [X] T023 [US2] `/rounds` 목록 페이지(매니저에게는 "라운딩 등록" 버튼, 오류 시 `RefreshRetry`)와 `/rounds/[id]` 상세 페이지(기본 정보만, 404 처리) — `src/app/(member)/rounds/page.tsx`, `src/app/(member)/rounds/[id]/page.tsx`
- [X] T024 [US2] 홈과 헤더에서 `/rounds`로 가는 "라운딩" 링크 추가 — `src/components/Header.tsx`, `src/app/(member)/page.tsx`
- [X] T025 [US2] T017–T019 통과 확인

**Checkpoint**: 등록 + 조회가 동작

---

## Phase 4: User Story 3 - 참석/불참 투표와 정원 대기 (Priority: P1)

**Goal**: 회원이 투표하고, 정원 초과는 대기, 빈자리는 대기 순서대로 자동 승격된다. 동시 요청에서도 정원을 넘지 않는다.

**Independent Test**: 정원 2에 3명이 참석 → 참석 2·대기 1, 참석자가 불참 → 대기자 승격, 마감/취소/타인 투표는 거부, 동시 5명 요청 → 참석 정확히 2.

### Tests for User Story 3 (먼저 작성하고 Red 확인)

- [X] T026 [P] [US3] pgTAP 투표: database.md의 검증 항목 3~10(정원 없음 → 항상 참석, 정원 2에 3명 순차, 불참/철회 시 승격, 재신청은 맨 뒤, 같은 선택 반복 시 `requested_at` 불변, `round_closed`/`round_cancelled`, 직접 쓰기 거부, 승인되지 않은 사용자 `forbidden`) — `supabase/tests/70_voting.sql`
- [X] T027 [P] [US3] 단위 테스트 `canVote`(미래·미취소만 true, 정확히 티오프 시각이면 false, 취소면 false)와 `summarizeVotes`(참석·대기·불참 수, 내 상태, 내 대기 순번, 정원 초과 여부, 투표 없음) — `tests/unit/domain/vote-summary.test.ts`
- [X] T028 [P] [US3] 컴포넌트 테스트 `VotePanel`: 상태별 문구(미투표/참석/대기 N번/불참), 버튼 동작(`onVote`, `onWithdraw` 호출), 마감·취소 시 버튼 숨김과 안내, 처리 중 비활성화, 오류 메시지와 재시도 — `tests/unit/components/vote-panel.test.tsx`
- [X] T029 [US3] Playwright E2E: 참석 → 대기 → 승격 흐름, 불참/철회/재신청, 마감된 라운딩에 투표 수단 없음, 새로고침 후 상태 유지 — `tests/e2e/voting.spec.ts`
- [X] T030 [US3] Playwright API 레벨 동시성 테스트: 정원 2 라운딩에 서로 다른 5명이 `cast_vote`를 `Promise.all`로 동시 호출 → 참석 정확히 2·대기 3, 정원 없음이면 전원 참석(여러 번 반복해 안정성 확인) — `tests/e2e/vote-concurrency.spec.ts`

### Implementation for User Story 3

- [X] T031 [US3] 마이그레이션 `cast_vote`, `withdraw_vote`, 내부용 `promote_waitlist`(`execute`를 `authenticated`에 부여하지 않음), 라운딩 행 `for update` 잠금 — `supabase/migrations/0009_voting.sql` (T026, T030 통과)
- [X] T032 [P] [US3] `src/domain/vote-summary.ts` 구현(`canVote`, `summarizeVotes`) (T027 통과, 100% 커버리지)
- [X] T033 [US3] `VotePanel` 컴포넌트 — `src/components/VotePanel.tsx` (T028 통과)
- [X] T034 [US3] 서버 액션 `castVote`, `withdrawVote`(경로 revalidate, 오류 코드 한국어 변환)와 상세 페이지에 `VotePanel` 연결 — `src/app/(member)/rounds/actions.ts`, `src/app/(member)/rounds/[id]/page.tsx`
- [X] T035 [US3] T026–T030 통과 확인

**Checkpoint**: 투표와 대기가 동작

---

## Phase 5: User Story 4 - 참석 현황 명단과 홈 카드 (Priority: P2)

**Goal**: 상세에서 참석·대기·불참 명단을, 홈 카드에서 현황과 내 상태를 본다.

**Independent Test**: 투표가 섞인 라운딩에서 명단·인원 수와 홈 카드가 일치하고, 취소된 라운딩은 홈 "다음 라운딩"에서 제외된다.

### Tests for User Story 4 (먼저 작성하고 Red 확인)

- [ ] T036 [P] [US4] pgTAP `round_roster`: 승인된 회원만 호출(대기/거절/anon `forbidden`), 정렬(참석 → 대기 순번 → 불참), `wait_position` 값, 닉네임만 노출 — `supabase/tests/80_roster.sql`
- [ ] T037 [P] [US4] 단위 테스트 `pickNextRound` 확장: 취소된 라운딩 제외, 가장 가까운 것이 취소면 다음 예정 라운딩 선택(기존 케이스·100% 유지) — `tests/unit/domain/next-round.test.ts`
- [ ] T038 [P] [US4] 컴포넌트 테스트 `RosterList`(세 구역 명단과 인원 수, 대기 순번, 빈 구역 안내)와 확장된 `NextRoundCard`(참석 인원 "N/정원", 대기 인원, 내 상태, 상세 링크) — `tests/unit/components/roster-list.test.tsx`, `tests/unit/components/home-cards.test.tsx`
- [ ] T039 [US4] Playwright E2E: 상세 명단 일치, 홈 카드 현황·내 상태·클릭 이동, 취소된 가장 가까운 라운딩 제외 — `tests/e2e/rounds.spec.ts`

### Implementation for User Story 4

- [ ] T040 [US4] 마이그레이션 `round_roster` 함수 — `supabase/migrations/0010_round_roster.sql` (T036 통과)
- [ ] T041 [P] [US4] `src/domain/next-round.ts` 취소 제외 (T037 통과)
- [ ] T042 [US4] `RosterList` 컴포넌트와 상세 페이지 연결, `fetchRoster` 쿼리 — `src/components/RosterList.tsx`, `src/lib/queries.ts`, `src/app/(member)/rounds/[id]/page.tsx`
- [ ] T043 [US4] `NextRoundCard` 확장(참석·대기 인원, 내 상태, 링크)과 `fetchHomeData`가 투표를 함께 조회하도록 수정 — `src/components/NextRoundCard.tsx`, `src/lib/queries.ts`, `src/app/(member)/page.tsx` (T038 통과)
- [ ] T044 [US4] T036–T039 통과 확인

**Checkpoint**: 명단과 홈 카드 완성

---

## Phase 6: User Story 5 - 매니저가 라운딩 수정·취소 (Priority: P2)

**Goal**: 매니저가 시작 전 라운딩을 수정(기존 투표 유지)·취소한다.

**Independent Test**: 투표가 있는 라운딩의 정보·정원을 수정해 투표가 유지되고 승격이 일어나는지, 취소 후 투표가 막히는지, 지난 라운딩은 변경이 거부되는지 확인한다.

### Tests for User Story 5 (먼저 작성하고 Red 확인)

- [ ] T045 [P] [US5] pgTAP `update_round`/`cancel_round`: 멤버 `42501`, 지난·취소된 라운딩 거부(`round_closed`/`round_cancelled`), 수정해도 투표 유지, 정원 증가·제한 해제 시 승격, 정원 축소 시 기존 참석자 유지·새 신청은 대기, 취소 시 투표 행 보존, 입력 검증 — `supabase/tests/90_update_cancel.sql`
- [ ] T046 [P] [US5] 컴포넌트 테스트 `CancelRoundButton`(확인 후 호출, 오류 표시)과 `RoundForm` 수정 모드(초기값, 정원이 참석 인원보다 작을 때 안내 문구) — `tests/unit/components/cancel-round-button.test.tsx`, `tests/unit/components/round-form.test.tsx`
- [ ] T047 [US5] Playwright E2E: 수정 반영(목록·상세·홈), 정원 변경에 따른 승격, 취소 후 "취소됨"·투표 불가·홈 제외, 지난 라운딩에는 수정·취소 수단 없음, 멤버 직접 접근 시 홈으로 이동 — `tests/e2e/rounds.spec.ts`

### Implementation for User Story 5

- [ ] T048 [US5] 마이그레이션 `update_round`, `cancel_round`(수정 후 `promote_waitlist` 호출) — `supabase/migrations/0011_update_cancel_round.sql` (T045 통과)
- [ ] T049 [US5] 서버 액션 `updateRound`, `cancelRound`, `/rounds/[id]/edit` 페이지, `CancelRoundButton`, 상세의 매니저 전용 "수정"·"취소" (시작 전·미취소일 때만 노출) — `src/app/(member)/rounds/actions.ts`, `src/app/(member)/rounds/[id]/edit/page.tsx`, `src/components/CancelRoundButton.tsx`, `src/components/RoundForm.tsx` (T046 통과)
- [ ] T050 [US5] T045–T047 통과 확인

**Checkpoint**: 모든 사용자 스토리 완료

---

## Phase 7: Polish & Cross-Cutting

- [ ] T051 [P] `src/domain/` 커버리지 100% 확인 및 미달 파일 보강 (Constitution II)
- [ ] T052 [P] 360px·414px 가로 스크롤 검사를 새 화면(목록·상세·등록·수정, 긴 장소명·긴 닉네임·많은 참석자)으로 확대 — `tests/e2e/layout.spec.ts`
- [ ] T053 [P] 네트워크/DB 오류 시 목록·상세·명단의 오류 안내와 재시도 동작 점검 (FR-018)
- [ ] T054 보안 점검: 새 테이블 RLS 활성, `round_votes`·`rounds` 직접 쓰기 불가, 내부 함수 `promote_waitlist` execute 불가, 클라이언트 번들에 서비스 롤 키 없음 (Constitution V, VI)
- [ ] T055 `npm run check`, `npx supabase db reset && npm run test:db`, `npm run test:e2e` 전체 통과
- [ ] T056 운영 반영: `npx supabase db push`로 0007~0011 적용 후 README의 운영 메모(라운딩 직접 입력 안내 삭제) 갱신
- [ ] T057 quickstart.md 11개 시나리오를 배포 환경 모바일 기기(iOS/Android)에서 수동 검증

---

## Dependencies & Execution Order

- Phase 1 → US1 → US2 → US3 → US4 → US5 → Polish 순서가 기본이다.
- US2는 US1의 등록 데이터 없이도 시드로 검증 가능하지만 같은 `actions.ts`·`queries.ts`를 공유하므로 순차 진행한다.
- US3의 `promote_waitlist`는 US5의 `update_round`가 재사용한다. US4의 `round_roster`는 US3 이후 어느 시점에도 추가 가능하다.
- 각 스토리 안에서는 테스트 → Red 확인 → 구현 → Green → 리팩터링 순서를 지킨다. [P] 표시는 서로 다른 파일의 테스트/구현 작업이다.
- 마이그레이션은 이미 운영에 적용된 0001~0006을 수정하지 않는다.

## Implementation Strategy

1. Phase 1 + US1: 등록이 되면 운영에서 DB 직접 입력이 필요 없어진다(MVP).
2. US2 + US3: 보고 투표하는 핵심 가치 완성. 여기까지가 조편성의 입력 데이터가 된다.
3. US4·US5: 현황 가시성과 운영 편의.
4. 각 스토리가 끝날 때마다 세 계층 테스트 결과와 함께 보고하고 승인 후 다음 단계로 진행한다.
