# Database Contract (002)

모든 함수는 `security definer`, `set search_path = public`, `auth.uid()` 기준이며 `authenticated`에게만 execute를 부여한다(`anon`은 거부). 규칙 위반은 아래 **오류 코드**를 메시지로 하는 예외로 알린다(앱이 한국어 문구로 변환). 권한 없음은 SQLSTATE `42501`, 그 외 규칙 위반은 `P0001`.

## 오류 코드 (예외 메시지)

| 메시지 | SQLSTATE | 의미 |
|--------|----------|------|
| `forbidden` | 42501 | 승인된 회원이 아니거나(투표/조회), 매니저가 아님(라운딩 쓰기) |
| `round_not_found` | P0001 | 대상 라운딩 없음 |
| `round_closed` | P0001 | 티오프 시각이 지났음(`now() >= starts_at`) |
| `round_cancelled` | P0001 | 취소된 라운딩 |
| `invalid_input` | P0001 | 위치 길이, 비용 음수, 정원 < 1, 필수값 누락 |
| `starts_in_past` | P0001 | 새 티오프 일시가 현재 이전 |

## 쓰기 함수

### `create_round(p_kind round_kind, p_starts_at timestamptz, p_location text, p_fee integer, p_capacity integer) → uuid`
- 매니저만. `p_location`은 trim 후 1~100자, `p_fee >= 0`, `p_capacity is null or >= 1`, `p_starts_at > now()`.
- 새 라운딩 id 반환. `status = 'scheduled'`.

### `update_round(p_id uuid, p_kind, p_starts_at, p_location, p_fee, p_capacity) → void`
- 매니저만. 대상 행을 `for update`로 잠근다. 취소됨 → `round_cancelled`, 이미 시작함 → `round_closed`.
- 입력 검증과 `p_starts_at > now()`는 create와 동일. 기존 투표는 건드리지 않는다.
- 갱신 후 대기 승격(`promote_waitlist`)을 실행한다(정원 증가·제한 해제 대응). 정원이 줄어도 `attending` 행은 변경하지 않는다.

### `set_round_cancelled(p_id uuid, p_cancelled boolean) → void`
- 매니저만. `true`면 `cancelled`, `false`면 `scheduled`로 전환. 투표 행은 보존한다. 라운딩이 없으면 `round_not_found`.
- **계약**: 시작 전(`now() < starts_at`)에만 전환할 수 있어야 한다(`round_closed`). ※ 현 구현은 이 검사가 없다 → T058.

### `delete_round(p_id uuid) → void`
- 매니저만. 라운딩을 `for update`로 잠근 뒤 `round_votes`의 해당 행과 라운딩을 삭제한다. 없으면 `round_not_found`. 시작 여부와 무관하게 삭제할 수 있다.

### `cast_vote(p_round uuid, p_choice vote_choice) → vote_status`
- `vote_choice`는 `attend` / `decline`. 승인된 회원만(`forbidden`). 대상은 항상 `auth.uid()` 본인이다(타인 대상 인자는 없다).
- 라운딩을 `for update`로 잠근 뒤: 취소 → `round_cancelled`, `now() >= starts_at` → `round_closed`.
- `attend`: 기존 상태가 `attending`/`waiting`이면 변화 없이 그 상태를 반환. 아니면(없음/`declined`) `attending` 수가 정원 미만(또는 정원 없음)이면 `attending`, 아니면 `waiting`으로 저장하고 `requested_at = clock_timestamp()`.
- `decline`: 기존이 `declined`면 변화 없음. `attending`이었다면 `declined`로 바꾼 뒤 승격 실행. `waiting`/없음이면 `declined`로 저장.
- 변경 후 이 회원의 최종 `vote_status`를 반환한다.

### `withdraw_vote(p_round uuid) → void`
- 승인된 회원만, 본인 행만. 잠금 후 취소/마감 검사는 `cast_vote`와 동일. 행이 없으면 아무 일도 하지 않는다. `attending`이었다면 삭제 후 승격 실행.

### `promote_waitlist(p_round uuid) → void` (내부용)
- `execute` 권한을 `authenticated`에게 **주지 않는다**(다른 함수 안에서만 호출). 호출자는 이미 라운딩 행을 잠근 상태여야 한다.
- 정원이 없으면 모든 `waiting`을, 있으면 `정원 − attending수`가 양수인 만큼 `waiting`을 `requested_at, member_id` 순으로 `attending`으로 바꾼다.

## 읽기

- **RLS select**: `rounds`, `round_votes`는 `is_approved()`일 때 전체 조회 가능. `anon`은 테이블 권한 없음.
- **쓰기 권한 회수**: `rounds`, `round_votes`에서 `authenticated`의 INSERT/UPDATE/DELETE를 revoke(기존 `rounds`는 이미 revoke됨, `round_votes`는 신규).
- `round_vote_roster(p_round uuid) → table(member_id uuid, nickname text, status vote_status, requested_at timestamptz)`
  - 승인된 회원만(아니면 빈 결과). 닉네임만 노출한다. 대기 순번은 앱이 `requested_at` 순으로 매긴다(FR-021).

## 조회 계약 (앱 쿼리)

- 예정 라운딩 목록: `rounds where starts_at > now() order by starts_at, created_at` (취소 포함 — 목록에는 "취소됨"으로 표시)
- 지난 라운딩: `rounds where starts_at <= now() order by starts_at desc limit 10`
- (폐기) 다음 라운딩(홈): 예정 라운딩 중 `status = 'scheduled'`인 가장 가까운 1건. 순수 함수 `pickNextRound`가 취소를 제외한다.
- 인원·내 상태: 대상 라운딩들의 `round_votes(round_id, member_id, status, requested_at)`를 조회해 `summarizeVotes`로 집계.

## pgTAP 검증 항목 (테스트 먼저 작성)

1. 멤버가 `create_round`/`update_round`/`set_round_cancelled`/`delete_round` 호출 시 `42501`; 승인 대기·거절 사용자도 동일; `anon`은 execute 거부
2. `create_round` 입력 검증: 빈 위치/101자 위치/음수 비용/정원 0/과거 일시 → 각각 오류 코드
3. `cast_vote`: 정원 없음 → 항상 `attending`; 정원 2 + 3명 순차 참석 → attending, attending, waiting
4. 참석자가 `decline` 또는 `withdraw_vote` → 가장 이른 대기자가 `attending`으로 승격, 두 번째 대기자는 그대로
5. 정원 증가(`update_round`) → 늘어난 수만큼, 정원 제한 해제 → 전원 승격
6. 정원 축소 → 기존 `attending` 유지(초과), 새 참석 신청은 `waiting`
7. `declined`였던 회원이 다시 참석 → 새 `requested_at`으로 대기열 맨 뒤
8. 같은 선택 반복 → 상태·`requested_at` 불변
9. 티오프 지난 라운딩·취소된 라운딩에서 `cast_vote`/`withdraw_vote` → `round_closed`/`round_cancelled`
10. 직접 `insert/update/delete`(round_votes, rounds) 거부, 타인 `member_id`를 쓸 방법이 없음 확인(함수 시그니처에 대상 회원 인자 없음)
11. `round_votes`/`round_vote_roster`는 승인된 회원만 조회 가능, 대기/거절/anon은 0건 또는 `forbidden`
12. `round_vote_roster` 닉네임·상태 반환
13. 취소된 라운딩의 투표 행 보존
14. `delete_round`: 투표 행도 함께 삭제됨, 멤버는 `42501`
