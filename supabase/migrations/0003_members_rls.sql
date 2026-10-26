-- 본인 행은 항상 조회할 수 있다 (가입 상태 확인용). 쓰기 정책은 두지 않는다.
create policy "members_select_own"
  on public.members for select
  to authenticated
  using (id = (select auth.uid()));
