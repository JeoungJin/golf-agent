# Routes & UI Contract (002)

모든 경로는 승인된 회원만 접근한다(미들웨어, 001과 동일). `/rounds/new`, `/rounds/[id]/edit`는 매니저 전용이며 멤버가 접근하면 홈(`/`)으로 보낸다. `access-route`의 순수 함수가 이 규칙을 담당한다.

| 경로 | 설명 | 권한 |
|------|------|------|
| `/rounds` | 라운딩 목록: 예정(티오프 빠른 순) + 지난 최근 10건 구역. 취소된 항목은 "취소됨" 배지. 매니저에게는 "라운딩 등록" 버튼 | 승인된 회원 |
| `/rounds/[id]` | 상세: 종류·일시·장소·비용·정원, 참석/대기/불참 명단과 인원수, 내 투표 상태와 투표 버튼(참석/불참/철회). 매니저에게는 시작 전·미취소일 때 "수정"·"취소" | 승인된 회원 |
| `/rounds/new` | 등록 폼 | 매니저 |
| `/rounds/[id]/edit` | 수정 폼(시작 전·미취소만) | 매니저 |
| `/` (홈) | `/notices`로 이동 (003) | 승인된 회원 |

상단 고정 메뉴(003)에서 스크린/필드 탭으로 `/rounds?kind=…`에 이동한다. 존재하지 않는 id는 404.

## 서버 액션 (`src/app/(member)/rounds/actions.ts`)

| 액션 | 동작 | 결과 |
|------|------|------|
| `createRound(input)` | 서버에서 `validateRound` 재검증 → `create_round` RPC | 성공 시 `/rounds/[id]`로 이동, 실패 시 `{ error }` |
| `updateRound(id, input)` | 재검증 → `update_round` | 성공 시 상세로 이동 |
| `setRoundCancelled(id, cancelled)` | `set_round_cancelled` | 성공 시 상세 갱신 |
| `deleteRound(id, kind)` | `delete_round` | 성공 시 해당 종류 목록으로 이동 |
| `castVote(roundId, choice)` | `cast_vote` | 새 상태 반환, 경로 revalidate (`/`, `/rounds`, `/rounds/[id]`) |
| `withdrawVote(roundId)` | `withdraw_vote` | 동일 |

RPC 예외 메시지(오류 코드)는 한국어 문구로 변환한다.

| 코드 | 화면 문구 |
|------|-----------|
| `round_closed` | 이미 시작한 라운딩이라 변경할 수 없습니다 |
| `round_cancelled` | 취소된 라운딩입니다 |
| `starts_in_past` | 티오프 일시는 현재 이후여야 합니다 |
| `invalid_input` | 입력값을 확인해 주세요 |
| `forbidden` | 권한이 없습니다 |
| 그 외/네트워크 | 처리하지 못했습니다. 잠시 후 다시 시도해 주세요 |

## 폼 필드 (등록/수정)

| 필드 | 입력 | 규칙(순수 함수 `validateRound`) |
|------|------|----------------------------------|
| 종류 | 라디오(스크린/필드) | 필수 |
| 티오프 일시 | `datetime-local` (KST) | 필수, 현재 이후 |
| 장소 | 텍스트 | trim 후 1~100자 |
| 비용(원) | 숫자 | 0 이상 정수, 기본 0 |
| 정원 | 숫자(선택) | 비우면 제한 없음, 입력 시 1 이상 정수 |

수정 화면에서 정원을 현재 참석 인원보다 작게 입력하면 "이미 참석한 회원은 유지되고, 새 신청은 대기가 됩니다" 안내를 보여 준다.
