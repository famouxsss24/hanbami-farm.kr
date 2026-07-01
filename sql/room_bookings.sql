-- ============================================================
-- 한배미마을 — 숙소 예약 시스템
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요
-- (room_status.sql 실행 이후에 실행)
-- ============================================================

create extension if not exists btree_gist;

create table if not exists room_bookings (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null references room_status(room_id),
  guest_name  text not null default '',
  guest_phone text not null default '',
  start_date  date not null,               -- 체크인
  end_date    date not null,               -- 체크아웃
  source      text not null default 'web'  -- web: 홈페이지 / admin: 전화(관리자 등록)
              check (source in ('web', 'admin')),
  status      text not null default 'confirmed'
              check (status in ('confirmed', 'cancelled')),
  note        text not null default '',
  created_at  timestamptz not null default now(),

  check (end_date > start_date),

  -- 같은 방에 확정 예약 날짜가 겹치지 않도록 DB 차원에서 차단
  -- (체크아웃 날 = 다른 팀 체크인 날 허용: '[)' 반개구간)
  constraint room_bookings_no_overlap
    exclude using gist (
      room_id with =,
      daterange(start_date, end_date, '[)') with &&
    ) where (status = 'confirmed')
);

alter table room_bookings enable row level security;

-- 홈페이지 방문자: 웹 예약 신청(insert)만 가능. 조회는 아래 뷰로만.
create policy "bookings_public_insert"
  on room_bookings for insert
  with check (
    source = 'web'
    and status = 'confirmed'
    and start_date >= current_date
    and end_date <= current_date + interval '1 year'
  );

-- 관리자: 전체 조회/등록/수정/삭제
create policy "bookings_admin_select" on room_bookings for select
  using (exists (select 1 from notice_admins where user_id = auth.uid()));
create policy "bookings_admin_insert" on room_bookings for insert
  with check (exists (select 1 from notice_admins where user_id = auth.uid()));
create policy "bookings_admin_update" on room_bookings for update
  using (exists (select 1 from notice_admins where user_id = auth.uid()));
create policy "bookings_admin_delete" on room_bookings for delete
  using (exists (select 1 from notice_admins where user_id = auth.uid()));

-- 공개용 뷰: 개인정보(이름·연락처) 없이 마감된 날짜 구간만 노출
create or replace view public_booked_ranges as
  select room_id, start_date, end_date
  from room_bookings
  where status = 'confirmed';

grant select on public_booked_ranges to anon, authenticated;
