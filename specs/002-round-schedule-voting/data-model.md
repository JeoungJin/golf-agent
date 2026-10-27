# Data Model: 라운딩 일정 관리 · 참석 투표

변경은 새 마이그레이션 `0007_rounds_voting.sql`(및 필요 시 추가 파일)로만 수행한다.

## rounds (확장)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK (기존) |
| kind | round_kind | not null — `screen` / `field` (기존) |
| starts_at | timestamptz | not null (기존) |
| location | text | not null, **`char_length(btrim(location)) between 1 and 100`** (신규 제약) |
| fee | integer | not null, `fee >= 0` (기존) |
| **capacity** | integer | null 허용(= 정원 제한 없음), `capacity >= 1` |
| **status** | round_status | not null default `scheduled` — `scheduled` / `cancelled` |
| created_at | timestamptz | 기존 |
| **updated_at** | timestamptz | not null default now() |

- 기존 시드·행은 `capacity = null`, `status = 'scheduled'`로 그대로 유효하다.
- 기존 행의 `location`이 새 제약을 위반하는지 마이그레이션 전에 확인한다(시드는 모두 1~100자).

## round_votes (신규)

| 컬럼 | 타입 | 제약 |
|------|------|------|
| round_id | uuid | not null, FK → rounds(id) |
| member_id | uuid | not null, FK → members(id) |
| status | vote_status | not null — `attending` / `waiting` / `declined` |
| requested_at | timestamptz | not null — 참석 신청이 접수된 시각(대기 순서의 기준) |
| updated_at | timestamptz | not null default now() |
| | | **PK (round_id, member_id)** — 회원당 라운딩당 1건 |

- 인덱스: `(round_id, status, requested_at)` — 명단·승격 조회용.
- `declined` 행의 `requested_at`은 의미가 없지만 not null 유지를 위해 마지막 변경 시각을 넣는다.
- 철회 = 행 삭제(미투표 상태).

## 상태 전이 (회원 한 명의 투표)

```text
(없음) --참석--> attending (자리 있음) | waiting (정원 가득)
(없음) --불참--> declined
attending --참석 반복--> attending            (변화 없음, requested_at 유지)
waiting   --참석 반복--> waiting              (변화 없음, 순번 유지)
attending --불참--> declined  + 대기 승격
waiting   --불참--> declined
declined  --참석--> attending | waiting       (새 신청: requested_at = now, 대기열 맨 뒤)
declined  --불참 반복--> declined             (변화 없음)
attending --철회--> (없음) + 대기 승격
waiting / declined --철회--> (없음)
```

- 승격: `waiting` 중 `requested_at`이 가장 이른 행부터 `attending`으로 바꾼다. `attending` 수가 정원에 도달하거나(정원 제한 없으면 대기자가 없어질 때까지) 대기자가 없을 때 멈춘다. 승격 시 `requested_at`은 바꾸지 않는다.
- 정원 축소로 `attending` 수가 정원을 넘으면 기존 참석자는 유지한다(초과 상태). 이때 `attending` 수가 정원 미만이 될 때까지 새 참석 신청은 `waiting`이다.

## 파생 값 (저장하지 않음)

- 대기 순번 = 같은 라운딩의 `waiting` 행을 `requested_at, member_id` 순으로 정렬한 1부터의 위치.
- 정원 초과 여부 = `capacity is not null and attending수 > capacity`.
- 마감 = `now() >= starts_at`. 취소 = `status = 'cancelled'`.

## 접근 통제 요약

| 대상 | 승인된 멤버 | 매니저 | 그 외(대기/거절/비로그인) |
|------|-------------|--------|--------------------------|
| rounds SELECT | 허용 | 허용 | 거부 |
| rounds 쓰기 | 직접 쓰기 거부 | RPC(`create/update/cancel_round`)만 | 거부 |
| round_votes SELECT | 허용 | 허용 | 거부 |
| round_votes 쓰기 | RPC(`cast_vote`/`withdraw_vote`) — **본인 투표만** | 동일 | 거부 |
| 명단(닉네임) | RPC `round_vote_roster` | 동일 | 거부 |

## 도메인 타입 (src/domain/types.ts 확장)

- `Round`에 `capacity: number | null`, `status: "scheduled" | "cancelled"`, `updatedAt` 추가.
- `VoteStatus = "attending" | "waiting" | "declined"`, `Vote { roundId, memberId, status, requestedAt }`.
- `RosterEntry { memberId, nickname, status, requestedAt, waitPosition: number | null }`.
