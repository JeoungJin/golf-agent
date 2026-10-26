begin;
select plan(34);

-- c1 = 매니저, c2~c6 = 승인된 멤버, c7 = 승인 대기, c8 = 거절
select tests.create_user('00000000-0000-0000-0000-0000000000c1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000c2', '멤버2');
select tests.create_user('00000000-0000-0000-0000-0000000000c3', '멤버3');
select tests.create_user('00000000-0000-0000-0000-0000000000c4', '멤버4');
select tests.create_user('00000000-0000-0000-0000-0000000000c5', '멤버5');
select tests.create_user('00000000-0000-0000-0000-0000000000c6', '멤버6');
select tests.create_user('00000000-0000-0000-0000-0000000000c7', '대기');
select tests.create_user('00000000-0000-0000-0000-0000000000c8', '거절');
update public.members set status = 'approved'
  where id in ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3',
               '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c5',
               '00000000-0000-0000-0000-0000000000c6');
update public.members set status = 'rejected' where id = '00000000-0000-0000-0000-0000000000c8';

delete from public.rounds;
-- A: 정원 2 / B: 정원 없음 / C: 이미 시작 / D: 취소됨
insert into public.rounds (id, kind, starts_at, location, fee, capacity, status) values
  ('20000000-0000-0000-0000-00000000000a', 'screen', now() + interval '2 days', 'A 정원2', 0, 2, 'scheduled'),
  ('20000000-0000-0000-0000-00000000000b', 'screen', now() + interval '2 days', 'B 무제한', 0, null, 'scheduled'),
  ('20000000-0000-0000-0000-00000000000c', 'screen', now() - interval '1 hour', 'C 지난', 0, 2, 'scheduled'),
  ('20000000-0000-0000-0000-00000000000d', 'screen', now() + interval '2 days', 'D 취소', 0, 2, 'cancelled');

-- ── 정원 2: c2, c3 참석, c4, c5 대기 ─────────────────────────────
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'attending',
  '자리가 있으면 참석이 된다 (c2)');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'attending',
  '정원까지는 참석이 된다 (c3)');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c4');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'waiting',
  '정원이 가득 차면 대기가 된다 (c4)');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c5');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'waiting',
  '정원이 가득 차면 대기가 된다 (c5)');

-- 같은 선택 반복: 상태와 신청 시각이 바뀌지 않는다
select tests.clear_auth();
create temp table snap as
  select member_id, status::text as status, requested_at from public.round_votes
  where round_id = '20000000-0000-0000-0000-00000000000a';
grant select on snap to authenticated;
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c4');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'waiting',
  '대기 중 다시 참석을 눌러도 대기 그대로다');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'attending',
  '참석 중 다시 참석을 눌러도 참석 그대로다');
select tests.clear_auth();
select is(
  (select count(*)::int from public.round_votes v join snap s using (member_id)
    where v.round_id = '20000000-0000-0000-0000-00000000000a'
      and v.requested_at = s.requested_at and v.status::text = s.status),
  4, '반복해도 4명 모두 상태와 신청 시각이 그대로다');

-- 참석자가 불참 → 가장 이른 대기자(c4)만 승격
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'decline')::text, 'declined',
  '참석자가 불참으로 바꾼다 (c2)');
select tests.clear_auth();
select is(
  (select status::text from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and member_id = '00000000-0000-0000-0000-0000000000c4'),
  'attending', '가장 먼저 신청한 대기자(c4)가 참석으로 승격된다');
select is(
  (select status::text from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and member_id = '00000000-0000-0000-0000-0000000000c5'),
  'waiting', '다음 대기자(c5)는 그대로 대기다');

-- 참석자가 철회 → c5 승격, 행 삭제
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select lives_ok($$select public.withdraw_vote('20000000-0000-0000-0000-00000000000a')$$,
  '참석자가 투표를 철회한다 (c3)');
select tests.clear_auth();
select is(
  (select count(*)::int from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and member_id = '00000000-0000-0000-0000-0000000000c3'),
  0, '철회하면 투표 행이 사라진다');
select is(
  (select status::text from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and member_id = '00000000-0000-0000-0000-0000000000c5'),
  'attending', '철회로 생긴 자리에 c5 가 승격된다');

-- 투표가 없는 상태에서 철회: 아무 일도 없다
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select lives_ok($$select public.withdraw_vote('20000000-0000-0000-0000-00000000000a')$$,
  '투표가 없을 때 철회해도 오류 없이 무시된다');

-- 불참했던 c2 가 다시 참석 → 자리가 없어 대기열 맨 뒤
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'waiting',
  '불참 후 다시 참석하면 새 신청으로 대기가 된다');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c6');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'attend')::text, 'waiting',
  '그 뒤에 신청한 c6 은 c2 보다 뒤에 선다');
select tests.clear_auth();
select ok(
  (select requested_at from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and member_id = '00000000-0000-0000-0000-0000000000c2')
  > (select requested_at from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and member_id = '00000000-0000-0000-0000-0000000000c5'),
  '재신청한 c2 의 신청 시각은 기존 신청자보다 늦다');

-- 대기 중 불참: 승격 없이 상태만 바뀐다
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'decline')::text, 'declined',
  '대기 중 불참으로 바꾼다');
select tests.clear_auth();
select is(
  (select count(*)::int from public.round_votes where round_id = '20000000-0000-0000-0000-00000000000a' and status = 'attending'),
  2, '정원 2 가 계속 유지된다 (c4, c5)');
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'decline')::text, 'declined',
  '불참을 반복해도 불참 그대로다');

-- 참석하지 않은 회원이 바로 불참 투표
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000a', 'decline')::text, 'declined',
  '투표 이력이 없어도 불참을 투표할 수 있다');

-- ── 정원 없음 ────────────────────────────────────────────────────
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000b', 'attend')::text, 'attending',
  '정원이 없으면 항상 참석이다 (c2)');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000b', 'attend')::text, 'attending',
  '정원이 없으면 항상 참석이다 (c3)');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c4');
select is(public.cast_vote('20000000-0000-0000-0000-00000000000b', 'attend')::text, 'attending',
  '정원이 없으면 항상 참석이다 (c4)');

-- ── 마감 / 취소 / 없는 라운딩 ───────────────────────────────────
select throws_ok($$select public.cast_vote('20000000-0000-0000-0000-00000000000c', 'attend')$$,
  'P0001', 'round_closed', '이미 시작한 라운딩에는 투표할 수 없다');
select throws_ok($$select public.withdraw_vote('20000000-0000-0000-0000-00000000000c')$$,
  'P0001', 'round_closed', '이미 시작한 라운딩에서는 철회할 수 없다');
select throws_ok($$select public.cast_vote('20000000-0000-0000-0000-00000000000d', 'attend')$$,
  'P0001', 'round_cancelled', '취소된 라운딩에는 투표할 수 없다');
select throws_ok($$select public.withdraw_vote('20000000-0000-0000-0000-00000000000d')$$,
  'P0001', 'round_cancelled', '취소된 라운딩에서는 철회할 수 없다');
select throws_ok($$select public.cast_vote('99999999-0000-0000-0000-000000000000', 'attend')$$,
  'P0001', 'round_not_found', '없는 라운딩에는 투표할 수 없다');

-- ── 승인되지 않은 사용자 / 비로그인 ─────────────────────────────
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c7');
select throws_ok($$select public.cast_vote('20000000-0000-0000-0000-00000000000b', 'attend')$$,
  '42501', 'forbidden', '승인 대기 사용자는 투표할 수 없다');
select tests.clear_auth(); select tests.authenticate_as('00000000-0000-0000-0000-0000000000c8');
select throws_ok($$select public.withdraw_vote('20000000-0000-0000-0000-00000000000b')$$,
  '42501', 'forbidden', '거절된 사용자는 철회할 수 없다');
select tests.clear_auth(); select tests.authenticate_as_anon();
select throws_ok($$select public.cast_vote('20000000-0000-0000-0000-00000000000b', 'attend')$$,
  '42501', null, '비로그인은 함수를 실행할 수 없다');

-- ── 권한 구조: 대상 회원 인자가 없고 내부 함수는 외부 실행 불가 ───
select tests.clear_auth();
select is(
  (select pronargs::int from pg_proc where proname = 'cast_vote' and pronamespace = 'public'::regnamespace),
  2, 'cast_vote 는 라운딩과 선택만 받는다 (타인 대상 인자 없음)');
select is(
  has_function_privilege('authenticated', 'public.promote_waitlist(uuid)', 'execute'),
  false, 'promote_waitlist 는 로그인 사용자가 직접 실행할 수 없다');

select * from finish();
rollback;
