begin;
select plan(18);

-- d1 = 매니저, d2 = 승인된 멤버, d3 = 승인 대기
select tests.create_user('00000000-0000-0000-0000-0000000000d1', '매니저');
select tests.create_user('00000000-0000-0000-0000-0000000000d2', '멤버');
select tests.create_user('00000000-0000-0000-0000-0000000000d3', '대기');
update public.members set status = 'approved' where id = '00000000-0000-0000-0000-0000000000d2';

-- 멤버/대기 테스트 대상 공지 (슈퍼유저로 삽입)
insert into public.notices (id, title, body, author_id)
  values ('11111111-1111-1111-1111-111111111111', '원본 제목', '원본 내용',
          '00000000-0000-0000-0000-0000000000d1');

-- 매니저
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d1');

select lives_ok(
  $$insert into public.notices (id, title, body, author_id, created_at, updated_at)
    values ('22222222-2222-2222-2222-222222222222', '제목', '내용',
            '00000000-0000-0000-0000-0000000000d1',
            now() - interval '1 day', now() - interval '1 day')$$,
  '매니저는 공지를 등록할 수 있다');
select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('제목', '내용', '00000000-0000-0000-0000-0000000000d2')$$,
  '42501', null, '매니저라도 다른 사람 명의로 등록할 수 없다');

select lives_ok(
  $$update public.notices set title = '수정됨' where id = '22222222-2222-2222-2222-222222222222'$$,
  '매니저는 공지를 수정할 수 있다');
select is(
  (select title from public.notices where id = '22222222-2222-2222-2222-222222222222'),
  '수정됨', '수정 내용이 반영된다');
select ok(
  (select updated_at > created_at from public.notices
    where id = '22222222-2222-2222-2222-222222222222'),
  '수정하면 updated_at 이 갱신된다');

select lives_ok(
  $$delete from public.notices where id = '22222222-2222-2222-2222-222222222222'$$,
  '매니저는 공지를 삭제할 수 있다');
select is(
  (select count(*)::int from public.notices where id = '22222222-2222-2222-2222-222222222222'),
  0, '삭제되어 조회되지 않는다');

select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('', '내용', '00000000-0000-0000-0000-0000000000d1')$$,
  '23514', null, '빈 제목은 거부된다');
select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('제목', '   ', '00000000-0000-0000-0000-0000000000d1')$$,
  '23514', null, '공백뿐인 내용은 거부된다');
select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values (repeat('가', 101), '내용', '00000000-0000-0000-0000-0000000000d1')$$,
  '23514', null, '101자 제목은 거부된다');
select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('제목', repeat('가', 5001), '00000000-0000-0000-0000-0000000000d1')$$,
  '23514', null, '5001자 내용은 거부된다');

-- 승인된 일반 멤버
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d2');

select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('제목', '내용', '00000000-0000-0000-0000-0000000000d2')$$,
  '42501', null, '멤버는 공지를 등록할 수 없다');
select lives_ok(
  $$update public.notices set title = '변조' where id = '11111111-1111-1111-1111-111111111111'$$,
  '멤버의 UPDATE 는 오류 없이 0건 처리된다');
select is(
  (select title from public.notices where id = '11111111-1111-1111-1111-111111111111'),
  '원본 제목', '멤버의 UPDATE 로 값이 바뀌지 않는다');
select lives_ok(
  $$delete from public.notices where id = '11111111-1111-1111-1111-111111111111'$$,
  '멤버의 DELETE 는 오류 없이 0건 처리된다');
select is(
  (select count(*)::int from public.notices where id = '11111111-1111-1111-1111-111111111111'),
  1, '멤버의 DELETE 로 지워지지 않는다');

-- 승인 대기 / 비로그인
select tests.clear_auth();
select tests.authenticate_as('00000000-0000-0000-0000-0000000000d3');
select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('제목', '내용', '00000000-0000-0000-0000-0000000000d3')$$,
  '42501', null, '승인 대기 사용자는 공지를 등록할 수 없다');

select tests.clear_auth();
select tests.authenticate_as_anon();
select throws_ok(
  $$insert into public.notices (title, body, author_id)
    values ('제목', '내용', '00000000-0000-0000-0000-0000000000d1')$$,
  '42501', null, '비로그인은 공지를 등록할 수 없다');

select * from finish();
rollback;
