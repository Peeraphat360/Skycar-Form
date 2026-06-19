-- ─────────────────────────────────────────────────────────────────────────────
-- 002_customer_memory — "จดจำลูกค้าเดิม" ผ่าน LINE Login                [2026-06-19]
--
-- เป้าหมาย: ลูกค้าที่ login ด้วย LINE คนเดิม กลับมาจองซ้ำได้ข้อมูลรถ/เบอร์ pre-fill
--
-- การตัดสินใจที่ยึดตามของเดิม (อย่าทำซ้ำ/อย่าทับ):
--   • ตัวตนลูกค้า = ตาราง `users` เดิม (มี line_user_id UNIQUE อยู่แล้ว — 001_line_auth.sql)
--     → migration นี้แค่ "เพิ่มคอลัมน์ consent" ไม่สร้าง customers ใหม่
--   • รถ = ตาราง `vehicles` ใหม่ (normalized, FK→users) ลูกค้า 1 คนมีได้หลายคัน
--   • `bookings` มีอยู่แล้วและแชร์กับ Sky Dashboard + ขับด้วย RPC create_online_booking
--     → ห้ามสร้างทับ. ที่นี่แค่ "เพิ่มคอลัมน์ vehicle_id (nullable)" เป็น soft link
--   • RLS: ทำตาม pattern เดิม (rls-hardening.sql) — service_role (backend) bypass,
--     authenticated (แอดมิน dashboard) อ่านได้, anon เข้าไม่ได้เลย
--   • เบอร์โทร: ยังเก็บ plaintext (พึ่ง RLS + service_role + Supabase disk encryption)
--
-- รันครั้งเดียวบน Supabase/Postgres (idempotent — รันซ้ำได้ปลอดภัย)
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── helper: trigger ตั้ง updated_at อัตโนมัติ (ใช้ร่วมหลายตาราง) ──
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) users — เพิ่ม consent PDPA + timestamps (ขยายของเดิม ไม่สร้างใหม่)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists consent_pdpa boolean      not null default false,
  add column if not exists consent_at   timestamptz,
  add column if not exists created_at   timestamptz  not null default now(),
  add column if not exists updated_at   timestamptz  not null default now();

-- line_user_id UNIQUE index มีแล้วจาก 001_line_auth.sql (users_line_user_id_key)
-- — ตรงนี้แค่ย้ำว่ามันคือ index ที่ใช้ค้นหาลูกค้าเดิม ไม่ต้องสร้างซ้ำ

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) vehicles — รถของลูกค้า (1 user : หลายคัน) ใช้ pre-fill
--    เก็บ brand/model/type ครบ เพราะฟอร์มจองใช้ทั้ง 3 (type คุมราคา, brand→model cascade)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.vehicles (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  plate_number  text        not null,
  car_brand     text,
  car_model     text,
  vehicle_type  text,                       -- 'sedan' | 'pickup' | 'suv' | 'ev' | 'supercar' (db value)
  color         text,
  is_default    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ค้นรถของลูกค้าคนหนึ่ง (join ตอน pre-fill) — index บน FK
create index if not exists vehicles_user_id_idx on public.vehicles (user_id);

-- กันทะเบียนซ้ำต่อ "ลูกค้าคนเดียวกัน" (คนละคนใช้ทะเบียนเดียวกันได้ — รถบ้าน/เปลี่ยนมือ)
create unique index if not exists vehicles_user_plate_key
  on public.vehicles (user_id, plate_number);

-- บังคับให้มีรถ default ได้ "ไม่เกิน 1 คัน" ต่อลูกค้า (partial unique)
create unique index if not exists vehicles_one_default_per_user
  on public.vehicles (user_id)
  where is_default;

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) bookings — เพิ่ม soft link ไป vehicles (nullable, ไม่กระทบของเดิม/Dashboard/RPC)
--    booking เดิมไม่มี vehicle_id ก็ยังใช้ได้ (walk-in / ก่อน migration นี้ = NULL)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.bookings
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;

create index if not exists bookings_vehicle_id_idx on public.bookings (vehicle_id);
-- ค้น booking ล่าสุดของลูกค้า (fallback pre-fill เวลายังไม่มี vehicles) — index ตาม user_id+เวลา
create index if not exists bookings_user_created_idx
  on public.bookings (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS — defense-in-depth (DB นี้แชร์กับ Sky Dashboard)
--    backend ฟอร์มต่อด้วย service_role → bypass RLS ทั้งหมด (authorization คุมที่ app layer)
--    policy ด้านล่างไว้ให้ "แอดมิน dashboard (authenticated)" อ่านได้เท่านั้น; anon = เข้าไม่ได้
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.vehicles enable row level security;

-- ปิด default-deny ไว้ก่อน แล้วเปิดเฉพาะที่จำเป็น (ไม่มี policy = ปฏิเสธทุก role ที่ไม่ใช่ owner/service_role)
drop policy if exists "admin read vehicles" on public.vehicles;
create policy "admin read vehicles"
  on public.vehicles for select
  to authenticated using (true);

-- ไม่เปิด insert/update/delete ให้ authenticated หรือ anon เลย:
-- การเขียน vehicles ทำผ่าน backend (service_role) ที่ตรวจ ownership จาก JWT แล้วเท่านั้น

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- (ออปชัน — รันแยกถ้าต้องการ) Backfill: ดึงรถจาก bookings เดิมมาใส่ vehicles
--   ให้ลูกค้าที่เคยจองก่อน migration นี้ ได้ pre-fill ทันทีโดยไม่ต้องจองใหม่ก่อน
--   เลือกทะเบียนล่าสุดต่อ user เป็น default; ข้าม booking ที่ไม่มี plate
-- ─────────────────────────────────────────────────────────────────────────────
-- insert into public.vehicles (user_id, plate_number, car_brand, car_model, vehicle_type, is_default)
-- select distinct on (b.user_id, b.vehicle_plate)
--        b.user_id, b.vehicle_plate, b.vehicle_brand, b.vehicle_model, b.vehicle_type,
--        false
-- from public.bookings b
-- where b.vehicle_plate is not null and b.vehicle_plate <> '' and b.user_id is not null
-- on conflict (user_id, plate_number) do nothing;
