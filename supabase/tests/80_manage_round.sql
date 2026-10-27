begin;
select plan(9);

select tests.create_user('00000000-0000-0000-0000-0000000000d1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000d2', '멤버');
update public.members set status = 'approved' where id = '00000000-0000-0000-0000-0000000000d2';

delete from public.round_votes;
delete from public.rounds;
insert into public.rounds (id, kind, starts_at, location, fee, capacity)
values ('00000000-0000-0000-0000-00000000aa01', 'screen', now() + interval '3 days', '원래 장소', 1000, 1),
       ('00000000-0000-0000-0000-00000000aa02', 'screen', now() - interval '1 day', '지난 장소', 0, null);
insert into public.round_votes (round_id, member_id, status, requested_at)
values ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d1', 'attending', now()),
       ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-0000000000d2', 'waiting', now());

-- 멤버는 거부된다
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d2');
select throws_ok(
  $$select public.delete_round('00000000-0000-0000-0000-00000000aa01')$$,
  'forbidden', null, '멤버는 삭제할 수 없다');
select throws_ok(
  $$select public.set_round_cancelled('00000000-0000-0000-0000-00000000aa01', true)$$,
  'forbidden', null, '멤버는 취소할 수 없다');

-- 매니저
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$select public.update_round('00000000-0000-0000-0000-00000000aa01', 'field',
      now() + interval '5 days', ' 새 장소 ', 2000, 2)$$,
  '매니저는 시작 전 라운딩을 수정한다');
select results_eq(
  $$select kind::text, location, fee, capacity from public.rounds
     where id = '00000000-0000-0000-0000-00000000aa01'$$,
  $$values ('field', '새 장소', 2000, 2)$$, '수정 값이 저장된다');
select is(
  (select status::text from public.round_votes
    where round_id = '00000000-0000-0000-0000-00000000aa01'
      and member_id = '00000000-0000-0000-0000-0000000000d2'),
  'attending', '정원이 늘면 대기자가 참석으로 승격된다');
select throws_ok(
  $$select public.update_round('00000000-0000-0000-0000-00000000aa02', 'screen',
      now() + interval '1 day', 'x', 0, null)$$,
  'round_closed', null, '이미 시작한 라운딩은 수정할 수 없다');
select lives_ok(
  $$select public.set_round_cancelled('00000000-0000-0000-0000-00000000aa01', true)$$,
  '취소할 수 있다');
select lives_ok(
  $$select public.delete_round('00000000-0000-0000-0000-00000000aa01')$$,
  '삭제할 수 있다');
select is(
  (select count(*)::int from public.round_votes
    where round_id = '00000000-0000-0000-0000-00000000aa01'),
  0, '삭제하면 투표도 함께 지워진다');

select * from finish();
rollback;
