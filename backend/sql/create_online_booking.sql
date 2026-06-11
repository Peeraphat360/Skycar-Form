-- ─────────────────────────────────────────────────────────────────────────────
-- create_online_booking — จองออนไลน์แบบ atomic (กัน double-booking)  [2026-06-11]
--
-- เดิม backend ทำ 2 จังหวะแยกกัน: (1) query หาช่องว่าง (2) insert
-- → ลูกค้า 2 คนกดพร้อมกันอาจได้ช่องเดียวกัน
--
-- ฟังก์ชันนี้รวมการจัดสรรช่อง + insert ไว้ในทรานแซกชันเดียว และใช้
-- pg_advisory_xact_lock บีบให้การจัดสรรช่องของคำขอออนไลน์ทำทีละคำขอ
-- (ปลดล็อกอัตโนมัติเมื่อจบทรานแซกชัน) — ปริมาณจองออนไลน์ต่ำ ใช้ล็อกเดียวพอ
--
-- ช่องถือว่าไม่ว่างในช่วงเวลาที่ขอ ถ้ามี booking สถานะ PENDING/CONFIRMED/PARKED
-- ที่ช่วงเวลาทับกัน (start < p_end AND end > p_start) — half-open ตามโค้ดเดิม
-- ไม่แตะ parking_slots.status (PENDING ยังไม่จอง; confirm_booking ค่อยตั้ง RESERVED)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_online_booking(
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
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot_id uuid;
  v_booking public.bookings;
BEGIN
  -- บีบให้การจัดสรรช่อง (เลือก + insert) ของคำขอออนไลน์ทำทีละคำขอ
  PERFORM pg_advisory_xact_lock(hashtext('online_booking_slot_alloc'));

  SELECT ps.id INTO v_slot_id
  FROM parking_slots ps
  WHERE ps.status <> 'MAINTENANCE'
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.slot_id = ps.id
        AND b.status IN ('PENDING', 'CONFIRMED', 'PARKED')
        AND b.start_time < p_end_time
        AND b.end_time   > p_start_time
    )
  ORDER BY ps.number
  LIMIT 1;

  IF v_slot_id IS NULL THEN
    RAISE EXCEPTION 'NO_SLOT_AVAILABLE';
  END IF;

  INSERT INTO bookings (
    user_id, slot_id, start_time, end_time, status,
    customer_name, customer_phone, customer_alt_phone,
    vehicle_plate, vehicle_brand, vehicle_model, vehicle_type,
    fee, is_walk_in
  ) VALUES (
    p_user_id, v_slot_id, p_start_time, p_end_time, 'PENDING',
    p_customer_name, p_customer_phone, p_customer_alt_phone,
    p_vehicle_plate, p_vehicle_brand, p_vehicle_model, p_vehicle_type,
    p_fee, false
  ) RETURNING * INTO v_booking;

  RETURN v_booking;
END $function$;

-- form backend ต่อ DB ด้วย service_role; ปิดสิทธิ์ public/anon ไม่ให้เรียกตรง
REVOKE EXECUTE ON FUNCTION public.create_online_booking(uuid, timestamp, timestamp, text, text, text, text, text, text, text, integer) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.create_online_booking(uuid, timestamp, timestamp, text, text, text, text, text, text, text, integer) TO service_role;
