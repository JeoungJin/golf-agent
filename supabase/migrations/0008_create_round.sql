-- 라운딩 등록 (매니저 전용). 클라이언트는 테이블에 직접 쓸 수 없고 이 함수로만 등록한다.
-- 오류는 메시지에 오류 코드를 담아 알리고, 앱이 한국어 문구로 바꾼다.

create or replace function public.create_round(
  p_kind public.round_kind,
  p_starts_at timestamptz,
  p_location text,
  p_fee integer,
  p_capacity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_location text := btrim(coalesce(p_location, ''));
  v_id uuid;
begin
  if not public.is_manager() then
    raise exception 'forbidden' using errcode = '42501';
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

  insert into public.rounds (kind, starts_at, location, fee, capacity)
  values (p_kind, p_starts_at, v_location, p_fee, p_capacity)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_round(public.round_kind, timestamptz, text, integer, integer)
  from public, anon;
grant execute on function public.create_round(public.round_kind, timestamptz, text, integer, integer)
  to authenticated;
