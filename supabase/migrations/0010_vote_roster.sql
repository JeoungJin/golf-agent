-- 라운딩 참석자 명단: 승인된 회원이면 같은 라운딩의 투표자 닉네임을 볼 수 있다.
-- members 테이블 자체는 본인 행만 조회되므로, 닉네임만 돌려주는 함수로 제한해 노출한다.
create or replace function public.round_vote_roster(p_round uuid)
returns table (member_id uuid, nickname text, status public.vote_status, requested_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select v.member_id, m.nickname, v.status, v.requested_at
    from public.round_votes v
    join public.members m on m.id = v.member_id
   where v.round_id = p_round and public.is_approved();
$$;

revoke execute on function public.round_vote_roster(uuid) from public, anon;
grant execute on function public.round_vote_roster(uuid) to authenticated;
