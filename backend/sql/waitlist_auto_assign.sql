-- ─────────────────────────────────────────────────────────────────────────────
-- Waitlist จริง: จัดช่องให้รายการที่รอคิวแบบ FIFO อัตโนมัติเมื่อมีที่ว่าง  [2026-07-17]
--
-- บริบท: create_online_booking (online_booking_full_waitlist.sql) ตอนช่องเต็มจะ
-- บันทึก booking โดย slot_id = NULL (status PENDING, is_walk_in = false) = "เข้าคิวรอ".
-- ก่อนหน้านี้รายการพวกนี้ค้างไว้เฉยๆ ให้แอดมินกดปิดเอง — ไม่มีการจัดช่องอัตโนมัติ.
--
-- ไฟล์นี้เพิ่ม:
--   1) process_waitlist() — ไล่จัดช่องว่างให้คิวที่รอ เรียงตาม created_at (มาก่อน-ได้ก่อน)
--   2) trigger บน bookings — เมื่อ "ช่องถูกปล่อยว่าง" (ยกเลิก/ลบ booking ที่ครองช่องอยู่)
--      ให้เรียก process_waitlist() ทันทีในทรานแซกชันเดียวกัน
--
-- การแจ้งเตือนลูกค้า: เมื่อ process_waitlist() เซ็ต slot_id (NULL → ค่า) บน booking ที่
-- รออยู่ → Supabase Database Webhook (bookings UPDATE) ยิงไป line-service
-- /webhooks/slot-assigned → push LINE "ช่องว่างแล้ว" (idempotent). ตั้ง webhook ที่
-- Supabase dashboard — ดู WAITLIST-SETUP.md
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) จัดช่องให้คิวที่รอแบบ FIFO — คืน id ของ booking ที่เพิ่งได้ช่อง (เผื่อผู้เรียกใช้)
create or replace function public.process_waitlist()
returns setof uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_slot_id uuid;
begin
  -- ใช้ล็อกตัวเดียวกับ create_online_booking เพื่อไม่ให้แย่งช่องกับการจองใหม่ที่กำลังมา
  perform pg_advisory_xact_lock(hashtext('online_booking_slot_alloc'));

  -- คิวที่รอ = ยังไม่มีช่อง (slot_id NULL), ยัง PENDING, เป็นการจองออนไลน์ (ไม่ใช่ walk-in)
  -- เรียง created_at asc = มาก่อน-ได้ก่อน (FIFO)
  for r in
    select id, start_time, end_time
    from bookings
    where slot_id is null
      and status = 'PENDING'
      and is_walk_in = false
    order by created_at asc
  loop
    -- หาช่องที่ว่างตลอดช่วงเวลาที่ลูกค้ารายนี้ขอ (logic เดียวกับ create_online_booking)
    -- การ assign ที่เกิดใน loop ก่อนหน้าจะถูกนับด้วย (อยู่ในทรานแซกชันเดียวกัน) จึงไม่ซ้ำช่อง
    select ps.id into v_slot_id
    from parking_slots ps
    where ps.status <> 'MAINTENANCE'
      and not exists (
        select 1 from bookings b
        where b.slot_id = ps.id
          and b.status in ('PENDING', 'CONFIRMED', 'PARKED')
          and b.start_time < r.end_time
          and b.end_time   > r.start_time
      )
    order by ps.number
    limit 1;

    if v_slot_id is not null then
      update bookings set slot_id = v_slot_id where id = r.id;
      return next r.id;   -- ได้ช่องแล้ว → คืน id (webhook จะแจ้งลูกค้าเมื่อ slot_id เปลี่ยน)
    end if;
    -- v_slot_id NULL = ช่วงนี้ยังเต็ม → ข้ามรายการนี้ไป (ยังคงรอคิวต่อ)
  end loop;
end $function$;

revoke execute on function public.process_waitlist() from public, anon;
grant  execute on function public.process_waitlist() to service_role;

-- 2) Trigger: เมื่อช่องถูกปล่อยว่าง ให้ลองจัดคิวที่รอทันที
create or replace function public.trg_process_waitlist_on_release()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.process_waitlist();
  return null;   -- AFTER trigger — ค่าคืนถูกละทิ้ง
end $function$;

-- 2a) กรณียกเลิก/เปลี่ยนสถานะออกจากช่วง active ทั้งที่ยังครองช่องอยู่ (เช่น cancel_booking)
--     WHEN กันไม่ให้ยิงตอน assign คิว (NULL→ค่า, ยัง PENDING) → ไม่ recursion
drop trigger if exists bookings_release_waitlist_upd on public.bookings;
create trigger bookings_release_waitlist_upd
  after update on public.bookings
  for each row
  when (
    old.slot_id is not null
    and old.status in ('PENDING', 'CONFIRMED', 'PARKED')
    and new.status not in ('PENDING', 'CONFIRMED', 'PARKED')
  )
  execute function public.trg_process_waitlist_on_release();

-- 2b) กรณีลบ booking ที่ครองช่องอยู่ทิ้ง (เช่น ลูกค้ากดยกเลิกผ่าน DELETE /api/bookings/:id)
drop trigger if exists bookings_release_waitlist_del on public.bookings;
create trigger bookings_release_waitlist_del
  after delete on public.bookings
  for each row
  when (
    old.slot_id is not null
    and old.status in ('PENDING', 'CONFIRMED', 'PARKED')
  )
  execute function public.trg_process_waitlist_on_release();
