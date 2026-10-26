begin;
select plan(16);

-- c1 = 매니저, c2 = 승인된 멤버, c3 = 승인 대기, c4 = 거절
select tests.create_user('00000000-0000-0000-0000-0000000000c1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000c2', '멤버');
select tests.create_user('00000000-0000-0000-0000-0000000000c3', '대기');
select tests.create_user('00000000-0000-0000-0000-0000000000c4', '거절');
update public.members set status = 'approved' where id = '00000000-0000-0000-0000-0000000000c2';
update public.members set status = 'rejected' where id = '00000000-0000-0000-0000-0000000000c4';

-- 시드 데이터와 무관하게 동작하도록 비우고 시작한다 (트랜잭션 롤백으로 복구됨)
delete from public.rounds;
insert into public.rounds (kind, starts_at, location, fee)
  values ('screen', now() + interval '3 days', '원본장소', 20000);
insert into public.notices (title, body, author_id)
  values ('공지', '내용', '00000000-0000-0000-0000-0000000000c1');

-- 승인된 멤버
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is((select count(*)::int from public.rounds), 1, '승인된 멤버는 rounds 를 조회한다');
select is((select count(*)::int from public.notices), 1, '승인된 멤버는 notices 를 조회한다');
select throws_ok(
  $$insert into public.rounds (kind, starts_at, location, fee) values ('field', now(), 'x', 0)$$,
  '42501', null, '멤버는 rounds 를 등록할 수 없다');

-- 매니저
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.rounds), 1, '매니저도 rounds 를 조회한다');
select is((select count(*)::int from public.notices), 1, '매니저도 notices 를 조회한다');
select throws_ok(
  $$insert into public.rounds (kind, starts_at, location, fee) values ('field', now(), 'x', 0)$$,
  '42501', null, '이 기능에서는 매니저도 rounds 를 등록할 수 없다');
select throws_ok(
  $$update public.rounds set location = '변조'$$, '42501', null, '매니저도 rounds 를 수정할 수 없다');
select is(
  (select location from public.rounds), '원본장소', 'rounds UPDATE 로 값이 바뀌지 않는다');
select throws_ok($$delete from public.rounds$$, '42501', null, '매니저도 rounds 를 삭제할 수 없다');
select is((select count(*)::int from public.rounds), 1, 'rounds DELETE 로 행이 지워지지 않는다');

-- 승인 대기
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::int from public.rounds), 0, '승인 대기 사용자는 rounds 를 볼 수 없다');
select is((select count(*)::int from public.notices), 0, '승인 대기 사용자는 notices 를 볼 수 없다');

-- 거절
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c4');
select is((select count(*)::int from public.rounds), 0, '거절된 사용자는 rounds 를 볼 수 없다');
select is((select count(*)::int from public.notices), 0, '거절된 사용자는 notices 를 볼 수 없다');

-- 비로그인
select tests.clear_auth();
select tests.authenticate_as_anon();
select throws_ok($$select * from public.rounds$$, '42501', null, '비로그인은 rounds 에 접근할 수 없다');
select throws_ok($$select * from public.notices$$, '42501', null, '비로그인은 notices 에 접근할 수 없다');

select * from finish();
rollback;
