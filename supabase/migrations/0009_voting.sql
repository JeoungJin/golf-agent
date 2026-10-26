-- 참석/불참 투표와 정원 대기. 같은 라운딩의 투표는 라운딩 행 잠금(for update)으로 직렬화해
-- 동시에 신청해도 참석 인원이 정원을 넘지 않게 하고, 승격까지 한 트랜잭션에서 끝낸다.
-- 투표 대상은 항상 호출한 본인(auth.uid())이다. 타인을 지정하는 인자는 없다.

-- 내부용: 빈 자리만큼 대기자를 신청 순서대로 참석으로 올린다.
-- 호출자는 이미 라운딩 행을 잠근 상태여야 하며, 로그인 사용자가 직접 실행할 수 없다.
create or replace function public.promote_waitlist(p_round uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_attending integer;
  v_slots integer;
begin
  select capacity into v_capacity from public.rounds where id = p_round;

  if v_capacity is null then
    update public.round_votes
       set status = 'attending', updated_at = now()
     where round_id = p_round and status = 'waiting';
    return;
  end if;

  select count(*) into v_attending
    from public.round_votes where round_id = p_round and status = 'attending';
  v_slots := v_capacity - v_attending;

  if v_slots > 0 then
    update public.round_votes v
       set status = 'attending', updated_at = now()
     where v.round_id = p_round
       and v.member_id in (
         select w.member_id from public.round_votes w
          where w.round_id = p_round and w.status = 'waiting'
          order by w.requested_at, w.member_id
          limit v_slots
       );
  end if;
end;
$$;

create or replace function public.cast_vote(p_round uuid, p_choice public.vote_choice)
returns public.vote_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_round public.rounds;
  v_current public.vote_status;
  v_count integer;
  v_new public.vote_status;
begin
  if not public.is_approved() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_round from public.rounds where id = p_round for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
  if v_round.status = 'cancelled' then
    raise exception 'round_cancelled' using errcode = 'P0001';
  end if;
  if now() >= v_round.starts_at then
    raise exception 'round_closed' using errcode = 'P0001';
  end if;

  select status into v_current
    from public.round_votes where round_id = p_round and member_id = v_uid;

  if p_choice = 'attend' then
    -- 이미 참석/대기 중이면 상태와 신청 시각(대기 순서)을 그대로 둔다.
    if v_current in ('attending', 'waiting') then
      return v_current;
    end if;

    select count(*) into v_count
      from public.round_votes where round_id = p_round and status = 'attending';
    v_new := case
      when v_round.capacity is null or v_count < v_round.capacity then 'attending'
      else 'waiting'
    end;

    insert into public.round_votes (round_id, member_id, status, requested_at)
    values (p_round, v_uid, v_new, clock_timestamp())
    on conflict (round_id, member_id) do update
      set status = excluded.status,
          requested_at = excluded.requested_at,
          updated_at = now();
    return v_new;
  end if;

  -- decline
  if v_current = 'declined' then
    return v_current;
  end if;

  insert into public.round_votes (round_id, member_id, status, requested_at)
  values (p_round, v_uid, 'declined', clock_timestamp())
  on conflict (round_id, member_id) do update
    set status = 'declined', requested_at = excluded.requested_at, updated_at = now();

  if v_current = 'attending' then
    perform public.promote_waitlist(p_round);
  end if;
  return 'declined';
end;
$$;

create or replace function public.withdraw_vote(p_round uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_round public.rounds;
  v_current public.vote_status;
begin
  if not public.is_approved() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_round from public.rounds where id = p_round for update;
  if not found then
    raise exception 'round_not_found' using errcode = 'P0001';
  end if;
  if v_round.status = 'cancelled' then
    raise exception 'round_cancelled' using errcode = 'P0001';
  end if;
  if now() >= v_round.starts_at then
    raise exception 'round_closed' using errcode = 'P0001';
  end if;

  delete from public.round_votes
   where round_id = p_round and member_id = v_uid
  returning status into v_current;

  if v_current = 'attending' then
    perform public.promote_waitlist(p_round);
  end if;
end;
$$;

revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke execute on function public.cast_vote(uuid, public.vote_choice) from public, anon;
revoke execute on function public.withdraw_vote(uuid) from public, anon;
grant execute on function public.cast_vote(uuid, public.vote_choice) to authenticated;
grant execute on function public.withdraw_vote(uuid) to authenticated;
