-- 개발용 시드: 홈 대시보드에서 라운딩이 보이도록 상대 일정 3건을 만든다.
-- (공지는 작성자(members)가 필요하므로 앱에서 매니저로 직접 등록한다.)
insert into public.rounds (kind, starts_at, location, fee) values
  ('screen', now() + interval '2 days', '강남 스크린골프 A룸', 25000),
  ('field',  now() + interval '9 days', '레이크사이드 CC', 180000),
  ('screen', now() - interval '5 days', '지난 모임 장소', 25000);
