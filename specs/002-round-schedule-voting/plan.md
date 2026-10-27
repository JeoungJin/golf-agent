# Implementation Plan: 라운딩 일정 관리 · 참석 투표

**Branch**: `002-round-schedule-voting` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-round-schedule-voting/spec.md`

## Summary

매니저가 라운딩(종류, 티오프, 장소, 비용, 선택 정원)을 등록·수정·취소하고, 승인된 회원이 참석/불참 투표를 한다.
정원이 가득 차면 참석 신청은 대기가 되고 빈자리가 생기면 대기 순서대로 자동 승격된다. 마감은 티오프 시각이다.
정원·대기·마감 규칙과 동시성은 Postgres RPC(행 잠금 + 단일 트랜잭션)에서 강제하고, 화면용 판단 로직
(입력 검증, KST 변환, 인원 집계, 다음 라운딩 선택, 경로 접근)은 순수 함수로 분리해 Vitest로 TDD 한다.
홈 "다음 라운딩" 카드는 개정(2026-10-27)으로 폐기되었다. 화면 구조는 003 참고.
조사 결과는 [research.md](./research.md) 참고.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (001과 동일)

**Primary Dependencies**: Next.js 15 (App Router, Server Actions), React 19, `@supabase/supabase-js`, `@supabase/ssr`, Tailwind CSS — 신규 의존성 없음

**Storage**: Supabase Postgres — `rounds` 확장(capacity, status, updated_at), `round_votes` 신규, RPC 7개(`create_round`, `update_round`, `set_round_cancelled`, `delete_round`, `cast_vote`, `withdraw_vote`, `round_vote_roster`) + 내부 함수 `promote_waitlist`

**Testing**: Vitest + RTL(도메인/컴포넌트), pgTAP `supabase test db`(RPC·RLS·승격·권한), Playwright(E2E 360px + 동시 투표 API 테스트)

**Target Platform**: 모바일 브라우저 PWA, 360px 이상

**Project Type**: web-application (단일 Next.js 프로젝트, 001과 동일)

**Performance Goals**: 투표 후 다른 회원 화면 반영 1분 이내(SC-007), 홈→상세→투표 3탭 이내(SC-002). 규모는 라운딩당 수십 건이라 별도 최적화 불필요.

**Constraints**: Vercel Hobby + Supabase Free 한도 내(신규 서비스 없음); 개인정보 추가 수집 없음(명단은 기존 닉네임); 한국어 UI; 쓰기는 RPC로만

**Scale/Scope**: 회원 수십 명, 신규 화면 4개(목록, 상세, 등록, 수정)

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 설계 후 재확인.*

| 원칙 | 판정 | 근거 |
|------|------|------|
| I. TDD | PASS | tasks에서 pgTAP·Vitest·Playwright 테스트 작업을 구현 앞에 배치, Red 확인 후 구현 |
| II. 순수 도메인 분리 | PASS | `validateRound`, `parseKstDateTime`, `summarizeVotes`, `canVote`, `pickNextRound`(수정), `access-route`(수정)를 `src/domain/`에 두고 100% 커버리지 유지 |
| III. 무료 티어 | PASS | 신규 서비스 없음, 테이블 1개 추가(research.md 8) |
| IV. 모바일 PWA | PASS | 모바일 우선 레이아웃, 360/414px E2E 가로 스크롤 검사 확대 |
| V. 카카오/최소 수집 | PASS | 새 개인정보 없음. 명단은 기존 닉네임만, `round_vote_roster` RPC가 필요한 열만 반환 |
| VI. RLS/단순함 | PASS (정당화 있음) | 쓰기를 RPC로만 허용하고 pgTAP로 검증. RPC 7개는 정원 동시성과 승격을 DB에서 보장하기 위해 필요(research.md 1·3). 외부 상태관리·ORM·실시간 구독 미도입 |

**Post-design 재확인**: 위반 없음.

## Project Structure

### Documentation (this feature)

```text
specs/002-round-schedule-voting/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md
│   └── database.md
└── tasks.md             # /speckit-tasks 에서 생성
```

### Source Code (repository root)

```text
src/
├── app/(member)/
│   ├── page.tsx                      # 홈: /notices 로 이동 (003)
│   └── rounds/
│       ├── page.tsx                  # 목록
│       ├── actions.ts                # createRound/updateRound/cancelRound/castVote/withdrawVote
│       ├── new/page.tsx
│       └── [id]/{page.tsx, edit/page.tsx}
├── components/                       # RoundForm, RoundListItem, VotePanel, VoteRoster, RoundManageButtons
├── domain/
│   ├── round-validation.ts           # validateRound, parseKstDateTime (신규)
│   ├── vote-summary.ts               # summarizeVotes, canVote (신규)
│   ├── next-round.ts                 # 폐기 대상 (홈 카드 폐기, T059)
│   ├── access-route.ts               # /rounds/new, /rounds/*/edit 매니저 전용 (수정)
│   ├── format.ts                     # 참석 인원 표기 등 (수정)
│   └── types.ts                      # Round 확장, Vote 타입 (수정)
└── lib/queries.ts                    # 라운딩·투표·명단 조회 (수정)
supabase/
├── migrations/0007_rounds_voting.sql # 스키마 + RLS + RPC
└── tests/                            # 50_round_write.sql, 60_voting.sql, 70_roster_access.sql (신규)
tests/
├── unit/{domain,components}/
└── e2e/{rounds.spec.ts, voting.spec.ts, vote-concurrency.spec.ts, layout.spec.ts(확대)}
```

**Structure Decision**: 001의 단일 Next.js 프로젝트와 Supabase(RLS+RPC) 구조를 그대로 확장한다. 도메인 규칙은 `src/domain/`에 두고,
DB는 최종 권위(정원·마감·권한)이며 앱의 검증은 사용자 안내용으로 같은 규칙을 미리 적용한다.

## Complexity Tracking

| 항목 | 필요한 이유 | 더 단순한 대안을 쓰지 않은 이유 |
|------|-------------|----------------------------------|
| 쓰기 RPC 7개 | 동시 참석 신청에서도 정원 초과 0건, 승격 원자성 | 앱 서버에서 읽고-판단-쓰기를 하면 경쟁 상태를 막을 수 없다(research.md 1) |
| 투표 상태 저장(`attending/waiting/declined`) | 정원 축소 시 기존 참석자 유지, 재신청 시 맨 뒤 이동 | 순서로 계산하면 정원 축소 시 참석자가 대기로 바뀐다(research.md 2) |
