-- 이름(닉네임) 설정 여부. 카카오가 닉네임을 주지 않아 기본값 '회원'으로 가입한 회원은
-- nickname_set = false 이며, 앱이 이름 입력 화면으로 보낸다.
alter table public.members
  add column nickname_set boolean not null default false;

-- 기존 회원: 기본값이 아닌 이름을 가졌으면 설정된 것으로 본다.
update public.members set nickname_set = (nickname <> '회원');

-- 가입 트리거: 카카오 메타데이터에서 이름을 얻었으면 설정됨, 기본값을 썼으면 미설정.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first boolean;
  v_name text;
begin
  -- 동시 가입 경쟁 시 "최초 가입자"가 둘이 되지 않도록 직렬화 (트랜잭션 종료 시 해제)
  perform pg_advisory_xact_lock(hashtext('public.members.bootstrap'));

  select not exists (select 1 from public.members) into v_first;

  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), '')
  );

  insert into public.members (id, nickname, nickname_set, avatar_url, role, status)
  values (
    new.id,
    coalesce(v_name, '회원'),
    v_name is not null,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    case when v_first then 'manager'::public.member_role else 'member'::public.member_role end,
    case when v_first then 'approved'::public.member_status else 'pending'::public.member_status end
  );
  return new;
end;
$$;

-- 본인 이름 설정/수정. 대상은 항상 호출한 본인(auth.uid())이다. 거절된 회원은 불가.
-- 가입 상태를 돌려줘 앱이 승인 대기 화면 또는 홈으로 바로 이동할 수 있게 한다.
create or replace function public.set_my_nickname(p_nickname text)
returns public.member_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_nickname, ''));
  v_status public.member_status;
begin
  select status into v_status from public.members where id = (select auth.uid());
  if v_status is null or v_status = 'rejected' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if char_length(v_name) not between 1 and 20 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  update public.members
     set nickname = v_name, nickname_set = true
   where id = (select auth.uid());

  return v_status;
end;
$$;

revoke execute on function public.set_my_nickname(text) from public, anon;
grant execute on function public.set_my_nickname(text) to authenticated;
