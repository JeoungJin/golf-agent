-- 라운딩 일정 관리 · 참석 투표 (002) 기반 스키마.
-- 쓰기는 이후 마이그레이션의 RPC 로만 허용한다. 여기서는 구조와 읽기 정책만 만든다.

create type public.round_status as enum ('scheduled', 'cancelled');
create type public.vote_status as enum ('attending', 'waiting', 'declined');
create type public.vote_choice as enum ('attend', 'decline');

alter table public.rounds
  add column capacity integer check (capacity >= 1),
  add column status public.round_status not null default 'scheduled',
  add column updated_at timestamptz not null default now(),
  add constraint rounds_location_check
    check (char_length(location) between 1 and 100 and btrim(location) <> '');

create table public.round_votes (
  round_id uuid not null references public.rounds (id),
  member_id uuid not null references public.members (id),
  status public.vote_status not null,
  requested_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (round_id, member_id)
);

create index round_votes_round_status_idx
  on public.round_votes (round_id, status, requested_at);

alter table public.round_votes enable row level security;

revoke all on public.round_votes from anon;
revoke insert, update, delete on public.round_votes from authenticated;

create policy "round_votes_select_approved"
  on public.round_votes for select
  to authenticated
  using (public.is_approved());
