-- ============================================================
-- 한배미마을 — 숙소 예약현황 테이블
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요
-- ============================================================

create table if not exists room_status (
  room_id    text primary key,
  room_name  text not null,
  status     text not null default 'available'
             check (status in ('available', 'limited', 'full', 'closed')),
  note       text not null default '',
  updated_at timestamptz not null default now()
);

-- 4개 독채 초기 데이터
insert into room_status (room_id, room_name) values
  ('bomi',     '보미'),
  ('yeoreumi', '여르미'),
  ('gaeuri',   '가으리'),
  ('gyeouri',  '겨우리')
on conflict (room_id) do nothing;

alter table room_status enable row level security;

-- 누구나 조회 가능
create policy "room_status_public_read"
  on room_status for select
  using (true);

-- notice_admins 에 등록된 관리자만 수정 가능
create policy "room_status_admin_update"
  on room_status for update
  using (exists (select 1 from notice_admins where user_id = auth.uid()))
  with check (exists (select 1 from notice_admins where user_id = auth.uid()));
