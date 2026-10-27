begin;
select plan(14);

-- 닉네임이 있는 가입자 / 없는 가입자 / 대기 / 거절
select tests.create_user('00000000-0000-0000-0000-0000000000e1', '카카오닉네임');
select tests.create_user('00000000-0000-0000-0000-0000000000e2');
select tests.create_user('00000000-0000-0000-0000-0000000000e3');
select tests.create_user('00000000-0000-0000-0000-0000000000e4');
update public.members set status = 'rejected' where id = '00000000-0000-0000-0000-0000000000e4';

select is(
  (select nickname_set from public.members where id = '00000000-0000-0000-0000-0000000000e1'),
  true, '카카오 닉네임이 있으면 nickname_set 이 true 이다');
select is(
  (select nickname_set from public.members where id = '00000000-0000-0000-0000-0000000000e2'),
  false, '닉네임이 없으면 nickname_set 이 false 이다');
select is(
  (select nickname from public.members where id = '00000000-0000-0000-0000-0000000000e2'),
  '회원', '닉네임이 없으면 기본값 회원으로 시작한다');

-- 이름 미설정 회원이 본인 이름을 설정한다 (승인 대기 상태)
select tests.authenticate_as('00000000-0000-0000-0000-0000000000e2');
select lives_ok($$select public.set_my_nickname('  홍길동  ')$$, '승인 대기 회원도 이름을 설정할 수 있다');
select results_eq(
  $$select nickname, nickname_set from public.members where id = '00000000-0000-0000-0000-0000000000e2'$$,
  $$values ('홍길동', true)$$, '앞뒤 공백이 제거되고 nickname_set 이 true 가 된다');

-- 검증
select throws_ok($$select public.set_my_nickname('   ')$$, 'P0001', 'invalid_input', '공백뿐인 이름은 거부된다');
select throws_ok($$select public.set_my_nickname('')$$, 'P0001', 'invalid_input', '빈 이름은 거부된다');
select throws_ok($$select public.set_my_nickname(repeat('가', 21))$$, 'P0001', 'invalid_input', '21자 이름은 거부된다');
select lives_ok($$select public.set_my_nickname(repeat('가', 20))$$, '20자 이름은 허용된다');

-- 다른 회원 행은 바뀌지 않는다
select tests.clear_auth();
select is(
  (select nickname from public.members where id = '00000000-0000-0000-0000-0000000000e3'),
  '회원', '다른 회원의 이름은 바뀌지 않는다');

-- 거절된 회원 / anon
select tests.authenticate_as('00000000-0000-0000-0000-0000000000e4');
select throws_ok($$select public.set_my_nickname('거절자')$$, '42501', 'forbidden', '거절된 회원은 이름을 바꿀 수 없다');
select tests.authenticate_as_anon();
select throws_ok($$select public.set_my_nickname('익명')$$, '42501', null, 'anon 은 실행할 수 없다');
select tests.clear_auth();

-- 승인된 회원은 이름 수정 가능
select tests.authenticate_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$select public.set_my_nickname('바꾼이름')$$, '승인 여부와 무관하게 설정된 회원도 수정할 수 있다');
select is(
  (select nickname from public.members where id = '00000000-0000-0000-0000-0000000000e1'),
  '바꾼이름', '수정된 이름이 저장된다');

select * from finish();
rollback;
