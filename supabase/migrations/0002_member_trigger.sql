-- auth.users 가입 시 members 행을 만든다.
-- 회원이 한 명도 없으면 최초 가입자를 manager/approved 로, 이후는 member/pending 으로 만든다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first boolean;
begin
  -- 동시 가입 경쟁 시 "최초 가입자"가 둘이 되지 않도록 직렬화 (트랜잭션 종료 시 해제)
  perform pg_advisory_xact_lock(hashtext('public.members.bootstrap'));

  select not exists (select 1 from public.members) into v_first;

  insert into public.members (id, nickname, avatar_url, role, status)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
      '회원'
    ),
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
