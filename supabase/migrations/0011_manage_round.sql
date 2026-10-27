-- 라운딩 수정·취소·삭제 (매니저 전용). 클라이언트는 테이블에 직접 쓸 수 없고 이 함수들로만 변경한다.
-- 오류는 메시지에 오류 코드를 담아 알리고, 앱이 한국어 문구로 바꾼다.

-- 수정: 시작 전 라운딩만 가능하다. 정원이 늘면 대기자를 승격하고, 줄어도 기존 참석은 유지한다.
create or replace function public.update_round(
  p_id uuid,
  p_kind public.round_kind,
  p_starts_at timestamptz,
  p_location text,
  p_fee integer,
  p_capacity integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location text := btrim(coalesce(p_location, ''));
  v_current timestamptz;
begin
  if not public.is_manager() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select starts_at into v_current from public.rounds where id = p_id for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
  if v_current <= now() then
    raise exception 'round_closed' using errcode = 'P0001';
  end if;

  if p_kind is null
     or p_starts_at is null
     or p_fee is null or p_fee < 0
     or char_length(v_location) not between 1 and 100
     or (p_capacity is not null and p_capacity < 1) then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if p_starts_at <= now() then
    raise exception 'starts_in_past' using errcode = 'P0001';
  end if;

  update public.rounds
     set kind = p_kind, starts_at = p_starts_at, location = v_location,
         fee = p_fee, capacity = p_capacity, updated_at = now()
   where id = p_id;

  perform public.promote_waitlist(p_id);
end;
$$;

-- 취소/취소 해제.
create or replace function public.set_round_cancelled(p_id uuid, p_cancelled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.rounds
     set status = case when p_cancelled then 'cancelled'::public.round_status
                       else 'scheduled'::public.round_status end,
         updated_at = now()
   where id = p_id;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- 삭제: 그 라운딩의 투표도 함께 지운다.
create or replace function public.delete_round(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_manager() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform 1 from public.rounds where id = p_id for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;

  delete from public.round_votes where round_id = p_id;
  delete from public.rounds where id = p_id;
end;
$$;

revoke execute on function public.update_round(uuid, public.round_kind, timestamptz, text, integer, integer)
  from public, anon;
revoke execute on function public.set_round_cancelled(uuid, boolean) from public, anon;
revoke execute on function public.delete_round(uuid) from public, anon;
grant execute on function public.update_round(uuid, public.round_kind, timestamptz, text, integer, integer)
  to authenticated;
grant execute on function public.set_round_cancelled(uuid, boolean) to authenticated;
grant execute on function public.delete_round(uuid) to authenticated;
