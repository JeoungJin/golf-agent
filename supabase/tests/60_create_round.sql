begin;
select plan(18);

-- c1 = 매니저, c2 = 승인된 멤버, c3 = 승인 대기, c4 = 거절
select tests.create_user('00000000-0000-0000-0000-0000000000c1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000c2', '멤버');
select tests.create_user('00000000-0000-0000-0000-0000000000c3', '대기');
select tests.create_user('00000000-0000-0000-0000-0000000000c4', '거절');
update public.members set status = 'approved' where id = '00000000-0000-0000-0000-0000000000c2';
update public.members set status = 'rejected' where id = '00000000-0000-0000-0000-0000000000c4';

delete from public.rounds;

-- 매니저: 성공
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');
create temp table created as
  select public.create_round('field', now() + interval '3 days', '  레이크사이드 CC  ', 180000, 8) as id;
grant select on created to authenticated;

select isnt((select id from created), null, '매니저는 라운딩을 등록하고 id 를 돌려받는다');
select results_eq(
  $$select kind::text, location, fee, capacity, status::text
      from public.rounds where id = (select id from created)$$,
  $$values ('field', '레이크사이드 CC', 180000, 8, 'scheduled')$$,
  '입력값이 저장되고 장소 앞뒤 공백은 제거되며 상태는 scheduled 이다');
select lives_ok(
  $$select public.create_round('screen', now() + interval '1 day', '정원없음 룸', 0, null)$$,
  '정원은 비울 수 있고 비용은 0원일 수 있다');
select is(
  (select capacity from public.rounds where location = '정원없음 룸'), null, '정원을 비우면 null(제한 없음)로 저장된다');

-- 입력 검증
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '', 0, null)$$,
  'P0001', 'invalid_input', '빈 장소는 거부된다');
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '   ', 0, null)$$,
  'P0001', 'invalid_input', '공백뿐인 장소는 거부된다');
select throws_ok(
  format($$select public.create_round('screen', now() + interval '1 day', %L, 0, null)$$, repeat('가', 101)),
  'P0001', 'invalid_input', '101자 장소는 거부된다');
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '장소', -1, null)$$,
  'P0001', 'invalid_input', '음수 비용은 거부된다');
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '장소', 0, 0)$$,
  'P0001', 'invalid_input', '정원 0 은 거부된다');
select throws_ok(
  $$select public.create_round(null, now() + interval '1 day', '장소', 0, null)$$,
  'P0001', 'invalid_input', '종류가 없으면 거부된다');
select throws_ok(
  $$select public.create_round('screen', null, '장소', 0, null)$$,
  'P0001', 'invalid_input', '티오프 일시가 없으면 거부된다');
select throws_ok(
  $$select public.create_round('screen', now() - interval '1 minute', '장소', 0, null)$$,
  'P0001', 'starts_in_past', '과거 일시는 거부된다');

-- 멤버
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '장소', 0, null)$$,
  '42501', 'forbidden', '멤버는 라운딩을 등록할 수 없다');

-- 승인 대기
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '장소', 0, null)$$,
  '42501', 'forbidden', '승인 대기 사용자는 라운딩을 등록할 수 없다');

-- 거절
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c4');
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '장소', 0, null)$$,
  '42501', 'forbidden', '거절된 사용자는 라운딩을 등록할 수 없다');

-- 비로그인
select tests.clear_auth();
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.create_round('screen', now() + interval '1 day', '장소', 0, null)$$,
  '42501', null, '비로그인은 함수를 실행할 수 없다');

-- 거부된 요청은 아무것도 저장하지 않는다
select tests.clear_auth();
select is((select count(*)::int from public.rounds), 2, '거부된 요청으로 라운딩이 늘어나지 않는다');

-- 직접 INSERT 는 여전히 불가
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$insert into public.rounds (kind, starts_at, location, fee) values ('screen', now() + interval '1 day', 'x', 0)$$,
  '42501', null, '매니저도 테이블에 직접 INSERT 할 수 없다');

select * from finish();
rollback;
