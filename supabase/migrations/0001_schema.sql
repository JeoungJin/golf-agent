-- 기본 스키마. 모든 테이블은 RLS 활성 + 정책 없음(= 전면 거부)으로 시작하고,
-- 각 사용자 스토리 마이그레이션에서 필요한 정책만 추가한다.

create type public.member_role as enum ('manager', 'member');
create type public.member_status as enum ('pending', 'approved', 'rejected');
create type public.round_kind as enum ('screen', 'field');

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '회원',
  avatar_url text,
  role public.member_role not null default 'member',
  status public.member_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null
    check (char_length(title) between 1 and 100 and btrim(title) <> ''),
  body text not null
    check (char_length(body) between 1 and 5000 and btrim(body) <> ''),
  author_id uuid not null references public.members (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  kind public.round_kind not null,
  starts_at timestamptz not null,
  location text not null,
  fee integer not null check (fee >= 0),
  created_at timestamptz not null default now()
);

create index notices_created_at_idx on public.notices (created_at desc);
create index rounds_starts_at_idx on public.rounds (starts_at);

alter table public.members enable row level security;
alter table public.notices enable row level security;
alter table public.rounds enable row level security;
