# Implementation Plan: 화면 구조 개편 · 이름 입력/수정 · 응답 속도

**Branch**: `003-ux-nickname-performance` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

## Summary

US1~US3(상단 고정 메뉴, 목록 구분, 바탕색, 종류 초기값)은 구현되어 있고 이 문서가 사후 기록한다.
남은 일은 두 가지다. (1) 카카오 닉네임이 없는 회원이 이름을 입력/수정하게 하는 기능: `members`에 "이름 설정됨" 상태를 두고, 미설정이면 미들웨어가 이름 입력 화면으로 보낸다. 저장은 본인 한정 DB 함수가 맡는다. (2) 응답 속도: 지역 불일치는 이미 해결했고(서울 DB + 서울 함수), 남은 지연의 원인인 **요청당 중복 인증·회원 조회**를 줄이고 로딩 표시를 더한다. 개선 전에 반드시 기준값을 측정한다.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (001·002와 동일)

**Primary Dependencies**: Next.js 15 (App Router, Server Actions), React 19, `@supabase/supabase-js`, `@supabase/ssr`, Tailwind CSS — 신규 의존성 없음

**Storage**: Supabase Postgres(서울 `ap-northeast-2`, 프로젝트 `faulrutxvpbezqcrcozo`) — `members`에 `nickname_set boolean` 추가, RPC `set_my_nickname` 신규

**Testing**: Vitest + RTL(도메인/컴포넌트), pgTAP(RPC·RLS), Playwright(E2E 360/414px)

**Target Platform**: 모바일 브라우저 PWA, 360px 이상

**Project Type**: web-application (단일 Next.js 프로젝트)

**Performance Goals**: SC-001 (서버 응답 p75 500ms, 저장 2초 이내)

**Constraints**: Vercel Hobby + Supabase Free 한도 내; 개인정보는 이름 하나만 추가 입력; 한국어 UI

**Scale/Scope**: 회원 수십 명, 신규 화면 1개(`/profile`), 기존 화면 수정

## Constitution Check

| 원칙 | 판정 | 근거 |
|------|------|------|
| I. TDD | **조건부** | US1~US3은 헌법 순서(테스트 먼저)를 지키지 않고 구현된 뒤 사후 문서화됨 → 위반 기록. US4·US5는 tasks에서 테스트를 앞에 둔다. 기존 E2E는 변경된 화면에 맞춰 수정했으나 로컬 DB 제약으로 전체 실행 못 함(T-V01 에서 해소) |
| II. 순수 도메인 | PASS | 이름 검증 `validateNickname`과 이름 미설정 접근 규칙(`access-route` 확장)을 `src/domain/`에 두고 100% 커버 |
| III. 무료 티어 | PASS | 신규 서비스 없음. 서울 프로젝트로 이전해도 Free 한도 내(활성 프로젝트 2개 제한 주의 — 인도 프로젝트는 정리 대상) |
| IV. 모바일 PWA | PASS | 360/414px 검사에 이름 입력·상단 메뉴 화면 포함 |
| V. 카카오/최소 수집 | PASS (정당화) | 사용자가 직접 입력하는 이름 한 항목만 추가. 이메일 등은 계속 요청하지 않음 |
| VI. RLS/단순함 | PASS | 이름 변경은 테이블 직접 쓰기 대신 `auth.uid()` 본인 한정 RPC로만 허용(`members`는 쓰기 정책 없음 유지). 신규 복잡성은 `nickname_set` 컬럼 하나 |

## 설계

### 1. 이름 입력/수정 (US4)

- **데이터**: `members.nickname_set boolean not null default false`.
  - 트리거 `handle_new_user`: 카카오 메타데이터(`name`/`nickname`/`preferred_username`)에서 값을 얻으면 `true`, 기본값 `'회원'`을 쓰면 `false`.
  - 마이그레이션 백필: 기존 행 중 `nickname <> '회원'`이면 `true`, 아니면 `false`(FR-014).
- **RPC `set_my_nickname(p_nickname text) → void`**: `auth.uid()` 본인 행만 갱신. 앞뒤 공백 제거 후 1~20자 검증(`invalid_input`). 거절(`rejected`) 회원은 `forbidden`. 승인 대기·승인 회원은 허용. `nickname_set = true`로 함께 갱신. `execute`는 `authenticated`에게만.
- **접근 규칙**: 미들웨어가 가져오는 회원 행에 `nickname_set`을 포함하고, `resolveAccess`를 확장한다 — 로그인했고 거절이 아니며 `nickname_set = false`이면 `/profile` 외 모든 경로를 `/profile`로 보낸다. 로그아웃(클라이언트 동작)과 `/auth/*`, 정적 자원은 제외.
- **화면**: `/profile`(이름 입력·수정 겸용). 미설정이면 "사용할 이름을 입력해 주세요" 안내, 설정됨이면 현재 값이 채워진 수정 폼. 저장 성공 시 기본 `redirect('/')`(미들웨어가 승인 상태에 맞게 분기). 헤더의 이름이 `/profile` 링크.
- **서버 액션** `updateNickname(value)`: 도메인 `validateNickname`으로 재검증 → RPC. 오류 코드는 한국어 문구로 변환(002 `round-errors`와 같은 방식).
- **영향 화면**: 헤더, 투표 명단, 가입 신청 목록은 이미 `members.nickname`을 읽으므로 변경 없음.

### 2. 응답 속도 (US5)

원인 분석(코드 기준): 한 화면 요청에서 인증 서버 호출(`auth.getUser`)이 미들웨어와 레이아웃에서 각각 일어나고, `members` 조회도 미들웨어·레이아웃(`getCurrentMember`)에서 따로 일어난다. 지역 불일치가 이 왕복 비용을 키웠고(서버 미국 동부 ↔ DB 인도), 서울 이전·`icn1` 지정으로 완화됐으나 중복 호출은 남아 있다.

- **측정(먼저)**: 변경 전에 기준값을 잰다. Vercel 함수 로그의 실행 시간과 `Server-Timing` 헤더(인증/회원/데이터 구간)를 임시로 남겨 주요 화면 5곳(공지 목록, 스크린 목록, 라운딩 상세, 등록 저장, 투표)을 각 10회 측정한다. 결과를 research에 기록한다.
- **인증 호출 줄이기**: 미들웨어에서 서버 호출 `getUser()` 대신 로컬 검증 가능한 `getClaims()`를 쓰는 방안을 검토한다. 전제: 프로젝트의 JWT 서명 키가 비대칭 키(JWKS)여야 한다. 확인되면 적용, 아니면 호출 횟수를 요청당 1회로 묶는 방식(미들웨어가 한 번 확인한 사용자·역할·상태·이름 설정 여부를 **요청 헤더로 레이아웃에 전달**)으로 대체한다.
- **헤더 전달의 안전**: 미들웨어는 클라이언트가 보낸 같은 이름의 헤더를 **먼저 제거**한 뒤 자신이 계산한 값만 설정한다(위조 방지). 이 값은 화면 표시용이며, 권한의 최종 강제는 계속 DB(RLS·RPC)가 한다(헌법 VI).
- **레이아웃의 `getCurrentMember`**: 위 헤더가 있으면 DB 조회를 생략하고, 없을 때만 조회(fallback).
- **로딩 표시**: `loading.tsx`를 공지·라운딩 목록과 상세에 추가해 빈 화면 대신 골격을 보인다.
- **쓰기 후 이동**: 서버 액션의 `redirect` 이후 클라이언트가 오류 안내를 띄우지 않도록 `RoundForm`/`NoticeForm`의 성공·실패 처리 흐름을 점검한다(FR-017). 원인이 지연이면 위 개선으로 해소되고, 아니면 별도로 수정한다.
- **성공 기준 확인**: 개선 후 같은 방법으로 재측정해 SC-001을 확인한다.

### 3. 이미 구현된 화면 구조 (US1~US3, 사후 기록)

- 헤더(`Header`): 상단 고정, 이름 옆 `LogoutButton`, `MainTabs`(클라이언트, `usePathname`/`useSearchParams`로 현재 위치 강조).
- 홈 `(member)/page.tsx`: `/notices`로 `redirect`. `/rounds` 종류 없음 → `/rounds?kind=screen`.
- 라운딩 목록: `Section`(예정/지난), `UPCOMING_ROW_COLORS` 순환, `RoundListItem`의 `isPast`(종료 배지·흑백). 공지 목록: 회색 교차 행.
- 등록: `/rounds/new?kind=…`로 종류 초기 선택. 폼·상세에 바탕색 카드.
- 제거: `NextRoundCard`, `NoticeCard`(홈 카드).

## Project Structure

### Documentation

```text
specs/003-ux-nickname-performance/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (변경 예정/기존)

```text
src/
├── app/(member)/
│   ├── page.tsx                  # /notices 로 이동 (기존)
│   ├── profile/page.tsx          # 이름 입력·수정 (신규, US4)
│   ├── profile/actions.ts        # updateNickname (신규)
│   ├── loading.tsx, notices/loading.tsx, rounds/loading.tsx, rounds/[id]/loading.tsx  # (신규, US5)
├── components/                   # Header, MainTabs (기존), NicknameForm (신규)
├── domain/
│   ├── nickname-validation.ts    # validateNickname (신규)
│   └── access-route.ts           # 이름 미설정 규칙 (수정)
├── lib/
│   ├── members.ts                # 헤더 우선 사용 (수정)
│   └── supabase/middleware.ts    # 헤더 전달 (수정)
├── middleware.ts                 # nickname_set 조회·헤더 설정 (수정)
supabase/
├── migrations/0012_nickname_set.sql    # 컬럼·백필·트리거 수정·set_my_nickname (신규)
└── tests/                        # 닉네임 pgTAP (신규)
```

## 측정 (SC-001 정의)

- 서버 응답: Vercel 함수 로그의 요청 처리 시간과 `Server-Timing`. 지역은 `icn1` 고정, 콜드 스타트 첫 요청은 제외.
- 체감 저장 시간: Playwright에서 저장 버튼 클릭부터 URL 이동까지 시간.
- 각 시나리오 10회, 75퍼센타일 사용.
