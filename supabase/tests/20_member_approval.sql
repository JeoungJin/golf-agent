begin;
select plan(15);

-- a1 = 첫 가입자(매니저), a2~a4 = 승인 대기
select tests.create_user('00000000-0000-0000-0000-0000000000b1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000b2', '신청자2');
select tests.create_user('00000000-0000-0000-0000-0000000000b3', '신청자3');
select tests.create_user('00000000-0000-0000-0000-0000000000b4', '신청자4');

-- 매니저
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b1');

select is((select count(*)::int from public.members), 4, '매니저는 members 전체를 조회한다');
select is(
  (select count(*)::int from public.members where status = 'pending'), 3,
  '매니저는 승인 대기 목록을 조회한다');

select lives_ok(
  $$select public.approve_member('00000000-0000-0000-0000-0000000000b2')$$,
  '매니저는 pending 회원을 승인할 수 있다');
select is(
  (select status::text from public.members where id = '00000000-0000-0000-0000-0000000000b2'),
  'approved', '승인 후 status 는 approved');

select lives_ok(
  $$select public.reject_member('00000000-0000-0000-0000-0000000000b3')$$,
  '매니저는 pending 회원을 거절할 수 있다');
select is(
  (select status::text from public.members where id = '00000000-0000-0000-0000-0000000000b3'),
  'rejected', '거절 후 status 는 rejected');

select throws_ok(
  $$select public.approve_member('00000000-0000-0000-0000-0000000000b3')$$,
  'P0001', null, '이미 거절된 회원은 승인할 수 없다 (pending 만 전이)');
select throws_ok(
  $$select public.reject_member('00000000-0000-0000-0000-0000000000b2')$$,
  'P0001', null, '이미 승인된 회원은 거절할 수 없다');

select throws_ok(
  $$update public.members set role = 'member' where id = '00000000-0000-0000-0000-0000000000b1'$$,
  '42501', null, '매니저도 members 를 직접 UPDATE 할 수 없다');

-- 승인된 일반 멤버(b2)
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b2');

select throws_ok(
  $$select public.approve_member('00000000-0000-0000-0000-0000000000b4')$$,
  '42501', null, '일반 멤버는 승인할 수 없다');
select is((select count(*)::int from public.members), 1, '일반 멤버는 본인 행만 조회한다');
select throws_ok(
  $$update public.members set role = 'manager' where id = '00000000-0000-0000-0000-0000000000b2'$$,
  '42501', null, '멤버는 자신의 role 을 직접 올릴 수 없다');

-- 승인 대기 사용자(b4)
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000b4');

select throws_ok(
  $$select public.approve_member('00000000-0000-0000-0000-0000000000b4')$$,
  '42501', null, '승인 대기 사용자는 스스로 승인할 수 없다');
select throws_ok(
  $$update public.members set status = 'approved' where id = '00000000-0000-0000-0000-0000000000b4'$$,
  '42501', null, '승인 대기 사용자는 status 를 직접 바꿀 수 없다');

-- 비로그인
select tests.clear_auth();
select tests.authenticate_as_anon();
select throws_ok(
  $$select public.approve_member('00000000-0000-0000-0000-0000000000b4')$$,
  '42501', null, '비로그인은 승인 함수를 호출할 수 없다');

select * from finish();
rollback;
