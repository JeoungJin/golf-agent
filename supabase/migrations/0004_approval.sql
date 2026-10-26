-- 가입 승인: 헬퍼 함수, 승인/거절 RPC, 매니저 조회 정책.
-- members 는 클라이언트가 직접 쓸 수 없고(트리거·RPC 전용), 상태 전이는 RPC 로만 가능하다.

revoke insert, update, delete on public.members from anon, authenticated;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members
    where id = (select auth.uid()) and status = 'approved'
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members
    where id = (select auth.uid()) and role = 'manager' and status = 'approved'
  );
$$;

create or replace function public.set_member_status(target uuid, new_status public.member_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_status;
begin
  if not public.is_manager() then
    raise exception 'forbidden: manager only' using errcode = '42501';
  end if;

  select status into v_current from public.members where id = target for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0001';
  end if;
  if v_current <> 'pending' then
    raise exception 'only pending members can be changed (current: %)', v_current
      using errcode = 'P0001';
  end if;

  update public.members set status = new_status where id = target;
end;
$$;

create or replace function public.approve_member(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$ select public.set_member_status(target, 'approved'); $$;

create or replace function public.reject_member(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$ select public.set_member_status(target, 'rejected'); $$;

-- 함수 실행 권한: 로그인 사용자만. (내부에서 매니저 여부를 다시 검사한다)
revoke execute on function public.is_approved() from public, anon;
revoke execute on function public.is_manager() from public, anon;
revoke execute on function public.set_member_status(uuid, public.member_status) from public, anon, authenticated;
revoke execute on function public.approve_member(uuid) from public, anon;
revoke execute on function public.reject_member(uuid) from public, anon;
grant execute on function public.is_approved() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.reject_member(uuid) to authenticated;

-- 매니저는 모든 회원을 조회할 수 있다 (가입 신청 관리)
create policy "members_select_manager"
  on public.members for select
  to authenticated
  using (public.is_manager());
