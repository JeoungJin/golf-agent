begin;
select plan(19);

-- c1 = 매니저, c2 = 승인된 멤버, c3 = 승인 대기, c4 = 거절
select tests.create_user('00000000-0000-0000-0000-0000000000c1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000c2', '멤버');
select tests.create_user('00000000-0000-0000-0000-0000000000c3', '대기');
select tests.create_user('00000000-0000-0000-0000-0000000000c4', '거절');
update public.members set status = 'approved' where id = '00000000-0000-0000-0000-0000000000c2';
update public.members set status = 'rejected' where id = '00000000-0000-0000-0000-0000000000c4';

delete from public.rounds;

-- 스키마
select has_column('public', 'rounds', 'capacity', 'rounds.capacity 컬럼이 있다');
select has_column('public', 'rounds', 'status', 'rounds.status 컬럼이 있다');
select has_column('public', 'rounds', 'updated_at', 'rounds.updated_at 컬럼이 있다');
select has_table('public', 'round_votes', 'round_votes 테이블이 있다');

-- 제약 (테이블 소유자 권한으로 검사)
select throws_ok(
  $$insert into public.rounds (kind, starts_at, location, fee, capacity)
    values ('screen', now() + interval '1 day', '장소', 0, 0)$$,
  '23514', null, '정원 0 은 허용되지 않는다');
select lives_ok(
  $$insert into public.rounds (kind, starts_at, location, fee, capacity)
    values ('screen', now() + interval '1 day', '정원없음', 0, null)$$,
  '정원은 비울 수 있다 (제한 없음)');
select throws_ok(
  $$insert into public.rounds (kind, starts_at, location, fee) values ('screen', now(), '', 0)$$,
  '23514', null, '빈 장소는 허용되지 않는다');
select throws_ok(
  $$insert into public.rounds (kind, starts_at, location, fee) values ('screen', now(), '   ', 0)$$,
  '23514', null, '공백뿐인 장소는 허용되지 않는다');
select throws_ok(
  format($$insert into public.rounds (kind, starts_at, location, fee) values ('screen', now(), %L, 0)$$, repeat('가', 101)),
  '23514', null, '101자 장소는 허용되지 않는다');
select is(
  (select status::text from public.rounds where location = '정원없음'),
  'scheduled', '새 라운딩의 기본 상태는 scheduled 이다');

-- 투표 테이블
insert into public.rounds (id, kind, starts_at, location, fee, capacity)
  values ('10000000-0000-0000-0000-000000000001', 'screen', now() + interval '2 days', '투표대상', 0, 2);
insert into public.round_votes (round_id, member_id, status, requested_at)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'attending', now());
select throws_ok(
  $$insert into public.round_votes (round_id, member_id, status, requested_at)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c2', 'declined', now())$$,
  '23505', null, '회원당 라운딩당 투표는 1건뿐이다');

-- 승인된 멤버
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c2');
select is((select count(*)::int from public.round_votes), 1, '승인된 멤버는 round_votes 를 조회한다');
select throws_ok(
  $$insert into public.round_votes (round_id, member_id, status, requested_at)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'attending', now())$$,
  '42501', null, '멤버는 round_votes 를 직접 추가할 수 없다');
select throws_ok(
  $$update public.round_votes set status = 'declined'$$, '42501', null, '멤버는 round_votes 를 직접 수정할 수 없다');
select throws_ok($$delete from public.round_votes$$, '42501', null, '멤버는 round_votes 를 직접 삭제할 수 없다');

-- 매니저도 직접 쓰기 불가
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$update public.rounds set capacity = 99$$, '42501', null, '매니저도 rounds 를 직접 수정할 수 없다 (RPC 로만)');

-- 승인 대기 / 거절
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::int from public.round_votes), 0, '승인 대기 사용자는 round_votes 를 볼 수 없다');
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000c4');
select is((select count(*)::int from public.round_votes), 0, '거절된 사용자는 round_votes 를 볼 수 없다');

-- 비로그인
select tests.clear_auth();
select tests.authenticate_as_anon();
select throws_ok($$select * from public.round_votes$$, '42501', null, '비로그인은 round_votes 에 접근할 수 없다');

select * from finish();
rollback;
