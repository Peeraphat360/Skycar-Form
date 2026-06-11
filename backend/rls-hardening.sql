-- ─────────────────────────────────────────────────────────────────────────────
-- RLS hardening (2026-06-11)
-- ปิดช่องโหว่: anon key (ฝังในเว็บ) เคยอ่าน/เขียนได้ทุกตาราง
-- หลังรัน: เฉพาะแอดมินที่ login ผ่าน Supabase Auth (authenticated) เท่านั้นที่เข้าถึง
-- backend ทุกตัวใช้ service role / ต่อ DB ตรงในฐานะ owner → ไม่กระทบ
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- 1) เปิด RLS ทุกตารางที่ยังปิดอยู่ (parking_slots เปิดอยู่แล้ว)
alter table public.bookings       enable row level security;
alter table public.payments       enable row level security;
alter table public.users          enable row level security;
alter table public.parking_zones  enable row level security;
alter table public.notifications  enable row level security;
alter table public.audit_logs     enable row level security;
alter table public.car_models     enable row level security;
alter table public.user_sessions  enable row level security;

-- 2) สิทธิ์ของแอดมิน (authenticated) — เท่าที่ dashboard ใช้จริง
--    insert/สถานะการจองทำผ่าน RPC (security definer) จึงไม่ต้องเปิด insert ตรง
create policy "admin read bookings"  on public.bookings      for select to authenticated using (true);
create policy "admin edit bookings"  on public.bookings      for update to authenticated using (true) with check (true);
create policy "admin read payments"  on public.payments      for select to authenticated using (true);
create policy "admin read users"     on public.users         for select to authenticated using (true);
create policy "admin edit users"     on public.users         for update to authenticated using (true) with check (true);
create policy "admin read zones"     on public.parking_zones for select to authenticated using (true);

-- 3) หน้า /book (ลูกค้า ไม่ login) อ่านชื่อโซนได้อย่างเดียว — ไม่มีข้อมูลส่วนบุคคล
create policy "public read zones"    on public.parking_zones for select to anon using (true);

-- car_models = ข้อมูลอ้างอิงยี่ห้อ/รุ่นรถ (ไม่ sensitive) — AddBookingModal อ่านตอน
-- เพิ่มการจอง; เปิดอ่านให้ทั้งแอดมินและลูกค้า แต่เขียนไม่ได้ (ไม่มี insert/update policy)
create policy "read car_models"      on public.car_models    for select to authenticated, anon using (true);

-- 4) ล็อค RPC (เป็น SECURITY DEFINER — ถ้าไม่ revoke คนนอกยังเรียกยกเลิก/เช็คเอาท์ได้)
revoke execute on function public.cancel_booking(uuid)                         from public, anon;
revoke execute on function public.check_in_booking(uuid)                       from public, anon;
revoke execute on function public.confirm_booking(uuid)                        from public, anon;
revoke execute on function public.move_booking(uuid, uuid)                     from public, anon;
revoke execute on function public.checkout_booking(uuid, payment_method, numeric, text) from public, anon;
revoke execute on function public.create_walkin_booking(uuid, uuid, timestamp, timestamp, text, text, text, text, text, text, text, text, integer, text) from public, anon;

grant execute on function public.cancel_booking(uuid)                          to authenticated, service_role;
grant execute on function public.check_in_booking(uuid)                        to authenticated, service_role;
grant execute on function public.confirm_booking(uuid)                         to authenticated, service_role;
grant execute on function public.move_booking(uuid, uuid)                      to authenticated, service_role;
grant execute on function public.checkout_booking(uuid, payment_method, numeric, text) to authenticated, service_role;
grant execute on function public.create_walkin_booking(uuid, uuid, timestamp, timestamp, text, text, text, text, text, text, text, text, integer, text) to authenticated, service_role;

commit;
