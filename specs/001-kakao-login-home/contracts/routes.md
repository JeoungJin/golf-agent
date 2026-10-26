# UI Route Contract

| 경로 | 접근 | 동작 |
|------|------|------|
| `/login` | 비로그인 | 카카오 로그인 버튼. 로그인 상태면 상태별 경로로 이동 |
| `/auth/callback` | OAuth 복귀 | 세션 교환 후 상태별 경로로 이동 |
| `/pending` | status=pending | 승인 대기 안내 |
| `/rejected` | status=rejected | 거절 안내 |
| `/` | approved | 홈: 다음 라운딩 카드 + 최신 공지 카드 + 설치 팝업 |
| `/notices/[id]` | approved | 공지 전문 |
| `/notices/new`, `/notices/[id]/edit` | manager | 공지 작성·수정·삭제 |
| `/admin/members` | manager | 승인 대기 목록, 승인/거절 |

## 라우팅 규칙 (`domain/access-route.ts`)
입력 `(session 유무, status, role, 요청 경로)` → 출력 `허용 | 리다이렉트(경로)`.
- 비로그인 → `/login`
- pending → `/pending`, rejected → `/rejected` (그 외 경로 접근 시)
- approved 비매니저가 manager 전용 경로 접근 → `/`
- approved가 `/login`, `/pending`, `/rejected` 접근 → `/`
