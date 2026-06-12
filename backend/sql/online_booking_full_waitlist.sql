-- ─────────────────────────────────────────────────────────────────────────────
-- จองออนไลน์ตอนช่องเต็ม → บันทึกเป็น "รายการเต็ม" (slot_id NULL) แทนการ error
-- [2026-06-12] ทำให้แอดมินเห็นรายการแล้วกด "แจ้งเตือนลูกค้า" ได้
--
-- เดิม create_online_booking ไม่เจอช่องว่าง → RAISE NO_SLOT_AVAILABLE → ลูกค้าจอง
-- ไม่สำเร็จตั้งแต่หน้าฟอร์ม แอดมินไม่เห็น
-- ใหม่: ไม่เจอช่อง → insert booking โดย slot_id = NULL (status PENDING)
--       slot_id NULL = สัญญาณว่า "เต็ม รอแจ้งเตือน" (dashboard จะขึ้นปุ่มแดง)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) slot_id ต้องว่างได้ เพื่อเก็บรายการที่หาช่องไม่ได้
alter table public.bookings alter column slot_id drop not null;

-- 2) RPC ใหม่ — ตอนเต็มไม่ error แล้ว แต่บันทึกแบบไม่มีช่อง
create or replace function public.create_online_booking(
  p_user_id            uuid,
  p_start_time         timestamp without time zone,
  p_end_time           timestamp without time zone,
  p_customer_name      text,
  p_customer_phone     text,
  p_customer_alt_phone text,
  p_vehicle_plate      text,
  p_vehicle_brand      text,
  p_vehicle_model      text,
  p_vehicle_type       text,
  p_fee                integer
)
returns bookings
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_slot_id uuid;
  v_booking public.bookings;
begin
  -- บีบให้การจัดสรรช่อง (เลือก + insert) ของคำขอออนไลน์ทำทีละคำขอ
  perform pg_advisory_xact_lock(hashtext('online_booking_slot_alloc'));

  select ps.id into v_slot_id
  from parking_slots ps
  where ps.status <> 'MAINTENANCE'
    and not exists (
      select 1 from bookings b
      where b.slot_id = ps.id
        and b.status in ('PENDING', 'CONFIRMED', 'PARKED')
        and b.start_time < p_end_time
        and b.end_time   > p_start_time
    )
  order by ps.number
  limit 1;

  -- v_slot_id อาจเป็น NULL ได้ (เต็ม) — ไม่ error แล้ว ปล่อยให้ insert แบบไม่มีช่อง
  insert into bookings (
    user_id, slot_id, start_time, end_time, status,
    customer_name, customer_phone, customer_alt_phone,
    vehicle_plate, vehicle_brand, vehicle_model, vehicle_type,
    fee, is_walk_in
  ) values (
    p_user_id, v_slot_id, p_start_time, p_end_time, 'PENDING',
    p_customer_name, p_customer_phone, p_customer_alt_phone,
    p_vehicle_plate, p_vehicle_brand, p_vehicle_model, p_vehicle_type,
    p_fee, false
  ) returning * into v_booking;

  return v_booking;
end $function$;

revoke execute on function public.create_online_booking(uuid, timestamp, timestamp, text, text, text, text, text, text, text, integer) from public, anon;
grant  execute on function public.create_online_booking(uuid, timestamp, timestamp, text, text, text, text, text, text, text, integer) to service_role;
