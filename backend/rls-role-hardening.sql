-- ─────────────────────────────────────────────────────────────────────────────
-- RLS role-hardening (2026-06-23)
-- ปัญหาเดิม (rls-hardening.sql): policy เป็น `to authenticated using (true)` →
-- ผู้ใช้ที่ login ผ่าน Supabase Auth "คนใดก็ได้" อ่าน/แก้การจอง + ข้อมูลลูกค้าทุกคนได้
-- (ถ้าเปิดให้สมัครเอง = ใครก็เข้าถึง PII ได้). ไฟล์นี้บีบให้เหลือเฉพาะบัญชีที่มี
-- claim app_metadata.dashboard_role ∈ (admin, manager) เท่านั้น
--
-- ⚠️ ก่อนรัน: ตั้ง claim ให้บัญชีแอดมินทุกคนก่อน ไม่งั้นจะ "ล็อกตัวเองออก"
--    ทำผ่าน Supabase Dashboard → Authentication → Users → (เลือก user) → แก้
--    "App Metadata" ให้มี:  { "dashboard_role": "admin" }  หรือ  "manager"
--    และไปปิดการสมัครเอง: Authentication → Sign In/Providers → ปิด "Allow new users to sign up"
--
-- backend ทุกตัวใช้ service_role / ต่อ DB ตรงในฐานะ owner → bypass RLS → ไม่กระทบ
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- helper: อ่าน role จาก JWT (app_metadata.dashboard_role)
create or replace function public.dashboard_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb
      -> 'app_metadata' ->> 'dashboard_role',
    ''
  );
$$;

create or replace function public.is_dashboard_staff()
returns boolean
language sql
stable
as $$
  select public.dashboard_role() in ('admin', 'manager');
$$;

-- ── bookings ──
drop policy if exists "admin read bookings" on public.bookings;
drop policy if exists "admin edit bookings" on public.bookings;
create policy "staff read bookings" on public.bookings
  for select to authenticated using (public.is_dashboard_staff());
create policy "staff edit bookings" on public.bookings
  for update to authenticated using (public.is_dashboard_staff()) with check (public.is_dashboard_staff());

-- ── payments ──
drop policy if exists "admin read payments" on public.payments;
create policy "staff read payments" on public.payments
  for select to authenticated using (public.is_dashboard_staff());

-- ── users (มี PII: ชื่อ/เบอร์/line id) ──
drop policy if exists "admin read users" on public.users;
drop policy if exists "admin edit users" on public.users;
create policy "staff read users" on public.users
  for select to authenticated using (public.is_dashboard_staff());
create policy "staff edit users" on public.users
  for update to authenticated using (public.is_dashboard_staff()) with check (public.is_dashboard_staff());

-- ── parking_zones (ไม่ sensitive — แต่ทำให้สอดคล้อง) ──
-- public read zones (anon) ของเดิมยังคงไว้สำหรับหน้า /book
drop policy if exists "admin read zones" on public.parking_zones;
create policy "staff read zones" on public.parking_zones
  for select to authenticated using (public.is_dashboard_staff());

commit;
