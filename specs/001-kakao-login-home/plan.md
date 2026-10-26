# Implementation Plan: 카카오 로그인 · 홈 화면 추가 안내 · 홈 대시보드

**Branch**: `001-kakao-login-home` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kakao-login-home/spec.md`

## Summary

카카오 로그인(Supabase Auth)으로 회원을 식별하고, 매니저 승인제로 접근을 통제하며, 승인된 회원에게
홈 대시보드(가장 가까운 라운딩 + 최신 공지)를 보여 준다. 매니저는 공지 CRUD와 가입 승인/거절을 수행한다.
미설치 브라우저 접속자에게 '홈 화면에 추가' 안내 팝업을 표시한다. 접근 통제는 Postgres RLS와 RPC로
DB 레벨에서 강제하고, 판단 로직(다음 라운딩 선택, 팝업 표시 여부, 가입 상태별 라우팅)은 순수 함수로
분리해 Vitest로 TDD 한다. 조사 결과는 [research.md](./research.md) 참고.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (로컬 24 확인)

**Primary Dependencies**: Next.js 15 (App Router), React 19, `@supabase/supabase-js`, `@supabase/ssr`, Tailwind CSS

**Storage**: Supabase Postgres (members, notices, rounds) + RLS; 팝업 상태는 브라우저 localStorage

**Testing**: Vitest + React Testing Library(단위/컴포넌트), pgTAP via `supabase test db`(RLS/RPC), Playwright(E2E)

**Target Platform**: 모바일 브라우저(iOS Safari, Android Chrome) PWA, 360px 이상

**Project Type**: web-application (단일 Next.js 프로젝트)

**Performance Goals**: 홈 데이터 표시 3초 이내(SC-002), 로그인→홈 30초 이내(SC-001)

**Constraints**: Vercel Hobby + Supabase Free 한도 내; 개인정보는 닉네임·프로필 이미지만 저장; 한국어 UI

**Scale/Scope**: 회원 수십 명, 화면 6개(로그인, 승인대기/거절, 홈, 공지 상세/작성, 가입 신청 관리)

## Constitution Check

*GATE: Phase 0 전 통과, Phase 1 설계 후 재확인.*

| 원칙 | 판정 | 근거 |
|------|------|------|
| I. TDD | PASS | tasks에서 테스트 작업을 구현 앞에 배치; Vitest/pgTAP/Playwright 3계층 |
| II. 순수 도메인 분리 | PASS | `src/domain/`에 next-round, install-prompt, access-route, notice-summary |
| III. 무료 티어 | PASS | Vercel Hobby, Supabase Free만 사용 (research.md 한도 기록) |
| IV. 모바일 PWA | PASS | manifest + 최소 서비스 워커 + 설치 안내 팝업 |
| V. 카카오/최소 수집 | PASS | 카카오 OAuth 단독, 스코프 닉네임·프로필 이미지만 |
| VI. RLS/단순함 | PASS | RLS + 보안 정의 RPC, pgTAP로 검증; 외부 상태관리·ORM 미도입 |

**Post-design 재확인**: 위반 없음. Complexity Tracking 항목 없음.

## Project Structure

### Documentation (this feature)

```text
specs/001-kakao-login-home/
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
├── app/
│   ├── layout.tsx
│   ├── manifest.ts
│   ├── login/page.tsx
│   ├── auth/callback/route.ts
│   ├── pending/page.tsx
│   ├── rejected/page.tsx
│   ├── (member)/
│   │   ├── page.tsx                     # 홈 대시보드
│   │   ├── notices/[id]/page.tsx        # 상세, edit/, new/
│   │   └── admin/members/page.tsx       # 가입 신청 관리(매니저)
├── components/                          # NextRoundCard, NoticeCard, InstallPrompt ...
├── domain/                              # 순수 함수 (UI/DB 무의존)
│   ├── next-round.ts
│   ├── install-prompt.ts
│   ├── access-route.ts
│   └── notice-summary.ts
├── lib/supabase/                        # server/client/middleware 클라이언트
└── middleware.ts                        # 세션 갱신 + 접근 라우팅
public/sw.js, public/icons/
supabase/
├── migrations/                          # 스키마, RLS, 트리거, RPC
└── tests/                               # pgTAP
tests/
├── unit/                                # domain, components
└── e2e/                                 # Playwright
```

**Structure Decision**: 단일 Next.js 프로젝트. 별도 백엔드 없이 Supabase(RLS+RPC)를 데이터 계층으로 사용한다.
도메인 로직은 `src/domain/`에 격리해 Constitution II를 만족한다.

## Complexity Tracking

위반 없음.
