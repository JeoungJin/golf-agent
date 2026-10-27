# Data Model

## members
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK, FK→auth.users(id) | 카카오 계정과 1:1 |
| nickname | text not null | 카카오 닉네임, 없으면 기본값 '회원'에서 시작해 회원이 직접 입력(003 US4). `nickname_set`(계획)로 설정 여부 구별 |
| avatar_url | text null | |
| role | enum(manager, member) | 기본 member |
| status | enum(pending, approved, rejected) | 기본 pending |
| created_at | timestamptz | 신청 시각 |

**전이**: pending → approved | rejected (매니저 RPC만). 최초 가입자는 생성 시 manager/approved. 그 외 재전이는 범위 밖.

## notices
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| title | text not null, 길이 1..100 | 공백만 불가 |
| body | text not null, 길이 1..5000 | 공백만 불가 |
| author_id | uuid FK→members | |
| created_at, updated_at | timestamptz | |

## rounds (이 기능에서는 읽기 전용)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| kind | enum(screen, field) | |
| starts_at | timestamptz not null | |
| location | text not null | |
| fee | integer not null, ≥ 0 | 원 단위 |
| created_at | timestamptz | |

등록/수정 기능은 후속 스펙. 이 기능의 테스트는 시드 데이터로 검증한다.

## RLS 요약
| 테이블 | SELECT | INSERT/UPDATE/DELETE |
|--------|--------|----------------------|
| members | 본인 행, 매니저는 전체 | 불가(트리거·RPC 전용) |
| notices | approved 회원 | 매니저만 |
| rounds | approved 회원 | 이 기능에서는 불가 |
