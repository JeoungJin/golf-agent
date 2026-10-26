# Research: 라운딩 일정 관리 · 참석 투표

001에서 정한 스택(Next.js 15 / Supabase / Vercel)과 접근 통제 방식을 그대로 쓴다. 이 문서는 002에서 새로 결정한 사항만 기록한다.

## 1. 정원·대기 승격을 어디서 처리할까

- **Decision**: Postgres 함수(RPC, security definer) 안에서 처리한다. 라운딩 행을 `select ... for update`로 잠근 뒤 투표 상태를 바꾸고 대기자를 승격하는 모든 과정을 하나의 트랜잭션으로 수행한다.
- **Rationale**: "마지막 한 자리에 동시에 둘이 신청해도 정원 초과 0건"(SC-003)과 "승격이 같은 처리 안에서 완료"(SC-004)는 애플리케이션 코드(읽고 → 판단하고 → 쓰기)로는 경쟁 상태를 피할 수 없다. 라운딩 단위 행 잠금으로 같은 라운딩의 투표 처리만 직렬화하고 다른 라운딩은 막지 않는다. 회원 수십 명 규모에서 성능 문제는 없다.
- **Alternatives**:
  - 앱 서버에서 처리 + 낙관적 재시도: 서버리스(Vercel)에서 재시도·순서 보장이 복잡하다.
  - 정원 초과를 막는 제약(트리거/unique)만 사용: 대기 순서와 자동 승격까지 표현하지 못한다.
  - 참석/대기를 저장하지 않고 신청 순서로 계산: 정원을 줄여도 기존 참석자를 유지한다는 요구(스펙 US5-2)와 충돌한다.

## 2. 참석/대기를 저장할까, 계산할까

- **Decision**: 투표 상태(`attending`/`waiting`/`declined`)를 컬럼으로 **저장**한다. 대기 순번은 같은 라운딩의 `waiting` 행을 `requested_at` 순으로 정렬해 계산한다(저장하지 않음).
- **Rationale**: 정원 축소 시 기존 참석자 유지, 재신청 시 맨 뒤 이동, 같은 선택 반복 시 순번 유지가 모두 "상태를 가진 행" 모델에서 단순하다. 순번은 파생값이라 어긋날 수 없다.
- **Alternatives**: 순번 컬럼 저장 — 승격마다 재번호 부여가 필요해 갱신 오류 위험이 커서 제외.

## 3. 쓰기를 RLS 직접 쓰기로 할까, RPC로 할까

- **Decision**: `rounds`와 `round_votes`의 클라이언트 직접 INSERT/UPDATE/DELETE는 모두 막고, 쓰기는 RPC(`create_round`, `update_round`, `cancel_round`, `cast_vote`, `withdraw_vote`)로만 허용한다. 조회는 승인된 회원에게 RLS select 정책으로 허용한다.
- **Rationale**: 001의 가입 승인(`approve_member`)과 같은 패턴이다. 마감·취소·정원·본인 투표만 변경 같은 규칙을 DB에서 한곳에 모아 강제할 수 있고(Constitution VI), 클라이언트가 우회할 경로가 없다.
- **Alternatives**: RLS의 with check만으로 규칙 표현 — 승격 같은 연쇄 변경을 표현할 수 없고 정책이 복잡해진다.

## 4. 참석자 닉네임을 어떻게 읽게 할까

- **Decision**: 명단은 RPC `round_roster(round_id)`로 읽는다(승인된 회원만 호출 가능). `members`의 select 정책은 넓히지 않는다.
- **Rationale**: 현재 `members`는 본인 행과 매니저만 읽을 수 있다. 정책을 "승인된 회원 전체 읽기"로 넓히면 역할·상태까지 노출된다. RPC는 필요한 열(닉네임·투표 상태·신청 시각)만 반환한다.
- **Alternatives**: members 정책 확장 / 닉네임 비정규화 컬럼을 votes에 복사 — 닉네임 변경 시 불일치 위험이 있어 제외.

## 5. 인원 집계 방식

- **Decision**: 목록·홈의 인원 수와 내 상태는 `round_votes`를 조회해 **순수 함수**(`summarizeVotes`)로 집계한다.
- **Rationale**: 회원 수십 명 규모라 집계용 뷰/컬럼이 필요 없다(YAGNI). 집계 규칙(참석·대기·불참 수, 내 대기 순번, 정원 초과 표시)이 테스트하기 쉬운 순수 함수가 된다(Constitution II).

## 6. 시간 입력과 마감 판단

- **Decision**: 화면은 KST 기준 `datetime-local` 입력을 받아 서버 액션에서 `+09:00`으로 변환해 저장한다(순수 함수 `parseKstDateTime`). 마감·"현재 이후" 검사는 **DB의 `now()`**를 기준으로 RPC가 최종 판단하고, 앱은 같은 규칙을 순수 함수로 미리 검증해 오류 메시지를 보여 준다.
- **Rationale**: 클라이언트 시계는 신뢰할 수 없고(FR-014), 요청 처리 시점 기준이어야 한다. 한국만 쓰므로 DST 걱정이 없다.

## 7. 취소 표현

- **Decision**: `rounds.status`(`scheduled`/`cancelled`) 컬럼. 삭제하지 않는다.
- **Rationale**: 투표 기록을 보존하고(FR-005), 이후 스코어 기능이 라운딩을 참조해도 깨지지 않는다.

## 8. 무료 티어 영향

- 새 의존 서비스 없음. 테이블 1개(`round_votes`)와 함수 몇 개만 추가되며 행 수는 라운딩당 수십 건 수준이라 Supabase Free 500MB 한도에 영향이 없다. Vercel Hobby 서버리스 호출은 투표·조회 요청 수준으로 한도 내다.
