begin;
select plan(9);

select tests.create_user('00000000-0000-0000-0000-0000000000a1', '첫번째');
select tests.create_user('00000000-0000-0000-0000-0000000000a2');

select is(
  (select role::text || '/' || status::text from public.members
    where id = '00000000-0000-0000-0000-0000000000a1'),
  'manager/approved', '첫 가입자는 manager/approved');

select is(
  (select role::text || '/' || status::text from public.members
    where id = '00000000-0000-0000-0000-0000000000a2'),
  'member/pending', '두 번째 가입자는 member/pending');

select is(
  (select nickname from public.members where id = '00000000-0000-0000-0000-0000000000a1'),
  '첫번째', '메타데이터 name 을 닉네임으로 사용');

select is(
  (select avatar_url from public.members where id = '00000000-0000-0000-0000-0000000000a1'),
  'https://example.com/a.png', '메타데이터 avatar_url 을 프로필 이미지로 사용');

select is(
  (select nickname from public.members where id = '00000000-0000-0000-0000-0000000000a2'),
  '회원', '닉네임 메타데이터가 없으면 기본값 회원');

select is(
  (select avatar_url from public.members where id = '00000000-0000-0000-0000-0000000000a2'),
  null, '프로필 이미지가 없으면 null');

select is((select count(*)::int from public.members), 2, '가입자마다 members 행이 하나씩 생긴다');

-- RLS: 본인 행만 조회 가능 (US1 범위)
select tests.authenticate_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.members), 1, '일반 사용자는 본인 행만 조회');
select is(
  (select id::text from public.members),
  '00000000-0000-0000-0000-0000000000a2', '조회되는 행은 본인 행');

select * from finish();
rollback;
