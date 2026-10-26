-- 모임 정보(라운딩·공지)는 승인된 회원만 조회할 수 있다.
-- 비로그인(anon)에게는 테이블 권한 자체를 주지 않는다.
revoke all on public.members, public.notices, public.rounds from anon;

create policy "rounds_select_approved"
  on public.rounds for select
  to authenticated
  using (public.is_approved());

create policy "notices_select_approved"
  on public.notices for select
  to authenticated
  using (public.is_approved());

-- rounds 는 이 단계에서 읽기 전용이다 (등록·수정은 후속 기능).
revoke insert, update, delete on public.rounds from authenticated;
