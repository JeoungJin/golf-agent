-- pgTAP 공용 헬퍼. 다른 테스트 파일 앞에서 실행되도록 00 접두어를 사용한다.
-- (supabase test db는 파일명 순으로 각 파일을 별도 트랜잭션에서 실행)
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;

-- 테스트 사용자 생성. auth.users INSERT가 members 트리거를 발동시킨다.
create or replace function tests.create_user(p_id uuid, p_nickname text default null)
returns uuid language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_id::text || '@test.local',
    case when p_nickname is null then '{}'::jsonb
         else jsonb_build_object('name', p_nickname, 'avatar_url', 'https://example.com/a.png') end,
    now(), now()
  );
  return p_id;
end $$;

-- 해당 사용자로 전환 (RLS 적용). 되돌릴 때는 tests.clear_auth().
create or replace function tests.authenticate_as(p_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function tests.authenticate_as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;

create or replace function tests.clear_auth()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- 테스트 중 역할을 전환한 뒤에도 헬퍼를 호출할 수 있어야 한다.
grant usage on schema tests to anon, authenticated;
grant execute on all functions in schema tests to anon, authenticated;

-- pg_prove가 유효한 TAP 출력으로 인식하도록 최소 계획을 둔다.
select plan(2);
select has_schema('tests', 'tests 헬퍼 스키마가 존재한다');
select has_function('tests', 'authenticate_as', array['uuid'], '사용자 전환 헬퍼가 존재한다');
select * from finish();
