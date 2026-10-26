<!--
Sync Impact Report
- Version change: (unfilled template) → 1.0.0
- Modified principles: none (initial ratification)
- Added sections: Core Principles I–VI, Technology & Operating Constraints, Development Workflow, Governance
- Removed sections: none
- Deferred TODOs: none
-->
# 소모임 골프 (Screen & Field Golf Club) Constitution

## Core Principles

### I. Test-First / TDD (NON-NEGOTIABLE)
모든 기능은 Red-Green-Refactor 순서를 따른다. 실패하는 테스트를 먼저 작성하고, 실패를 확인한 뒤,
통과시키는 최소 구현을 작성하고, 그 후에 리팩터링한다. 테스트 없는 프로덕션 코드는 병합할 수 없다.
- 단위/통합 테스트는 Vitest, E2E 테스트는 Playwright를 사용한다.
- 버그 수정은 버그를 재현하는 실패 테스트를 먼저 추가해야 한다.
- 근거: 소수 인원이 운영하는 프로젝트에서 회귀를 막는 유일하게 지속 가능한 방법이다.

### II. 순수 도메인 로직 분리
조편성, 핸디캡(최근 5게임 평균 타수) 계산, 랭킹 등 도메인 규칙은 UI·Supabase·네트워크에
의존하지 않는 순수 함수(`src/domain/`)로 구현해야 한다. 도메인 모듈은 단위 테스트
커버리지 100%를 목표로 하며, 엣지 케이스(기록 5게임 미만, 인원 나누어떨어지지 않음 등)를
테스트로 명시해야 한다.

### III. 무료 티어 한도 내 운영
모든 인프라(Vercel Hobby, Supabase Free)는 무료 한도 내에서 동작해야 한다. 유료 서비스·유료
플랜이 필요한 기능은 도입할 수 없다. 새 의존 서비스 추가 시 무료 한도를 plan 문서에 기록해야 한다.

### IV. 모바일 우선 PWA
UI는 모바일 화면을 기준으로 설계하고 한국어로 제공해야 한다. 웹 앱 매니페스트와 서비스 워커를
제공하며, 홈 화면에 추가되지 않은 사용자에게 '홈 화면에 추가' 안내 팝업을 표시해야 한다
(iOS/Android 안내 구분, 닫기 후 재표시 억제).

### V. 카카오 로그인과 개인정보 최소 수집
인증은 Supabase Auth의 카카오 OAuth만 사용한다. 닉네임·프로필 이미지 등 서비스 운영에 필요한
최소 정보만 저장하며, 비밀키·서비스 롤 키는 저장소에 커밋하거나 클라이언트에 노출해서는 안 된다.

### VI. 권한 분리와 단순함
멤버/매니저 권한은 Supabase RLS 정책으로 DB 레벨에서 강제해야 하며, 클라이언트 검사만으로
대체할 수 없다. RLS 정책은 테스트로 검증한다. 요구되지 않은 기능은 만들지 않는다(YAGNI);
복잡성을 추가하려면 plan 문서에 정당화를 기록해야 한다.

## Technology & Operating Constraints

- 스택: Next.js (TypeScript, App Router), Supabase (Postgres, Auth, RLS), Vercel 배포.
- 핵심 범위: 홈 대시보드(가까운 라운딩·공지), 라운딩 일정 등록과 참석/불참/대기 투표,
  자동 조편성, 스코어 기록 및 최근 5게임 기반 핸디캡/랭킹.
- 스키마 변경은 버전 관리되는 마이그레이션 파일로만 수행한다.
- 환경변수는 `.env.local`/Vercel 설정으로 관리하고 `.env.example`만 커밋한다.

## Development Workflow

- 작업 흐름: constitution → specify → plan → tasks → implement (Spec Kit).
- tasks 문서에서 각 구현 작업은 해당 테스트 작업보다 뒤에 위치해야 한다.
- 병합 전 게이트: 린트, 타입 체크, Vitest 전체 통과, 핵심 사용자 흐름의 Playwright E2E 통과.
- 모든 변경은 이 헌법 준수 여부를 검토한다.

## Governance

이 헌법은 다른 개발 관행보다 우선한다. 개정은 변경 사유를 문서화하고 Sync Impact Report를
갱신하는 방식으로 수행한다. 버전은 의미적 버전 규칙을 따른다: 원칙 삭제·재정의는 MAJOR,
원칙/섹션 추가·실질적 확장은 MINOR, 문구 명확화는 PATCH. 모든 plan/PR 리뷰에서 원칙 준수
여부를 확인해야 하며, 위반은 정당화 기록 없이는 허용되지 않는다.

**Version**: 1.0.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-26
