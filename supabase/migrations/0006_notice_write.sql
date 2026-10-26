-- 공지 쓰기는 승인된 매니저만 가능하다. 작성자 명의는 본인으로 고정한다.
create policy "notices_insert_manager"
  on public.notices for insert
  to authenticated
  with check (public.is_manager() and author_id = (select auth.uid()));

create policy "notices_update_manager"
  on public.notices for update
  to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy "notices_delete_manager"
  on public.notices for delete
  to authenticated
  using (public.is_manager());

-- 수정 시 updated_at 을 갱신하고, 작성자·작성 시각은 바뀌지 않게 고정한다.
create or replace function public.touch_notice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notices_touch
  before update on public.notices
  for each row execute function public.touch_notice();
