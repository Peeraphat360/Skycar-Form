# สำรองและกู้คืนฐานข้อมูล (Skycar)

## การสำรอง (อัตโนมัติ)
- Workflow: [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml)
- รันทุกคืนเวลา **03:00 น. (เวลาไทย)** หรือกดรันเองที่แท็บ **Actions → Nightly DB backup → Run workflow**
- ผลลัพธ์: ไฟล์ `skycar-db-backup-YYYY-MM-DD.sql.gz` เก็บเป็น **artifact** (เก็บไว้ 30 วัน)
- ดาวน์โหลด: แท็บ Actions → เลือก run → ส่วน **Artifacts** ด้านล่าง

### ตั้งค่าครั้งแรก (จำเป็น)
GitHub repo `Skycar-Form` → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `SUPABASE_DB_URL`
- Value: `postgresql://postgres.jkibbcyrohqgbdvnljcx:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`

## การกู้คืน
ไฟล์ dump เป็น SQL ธรรมดา (รวม schema `public` + `auth.users`) กู้คืนได้ด้วย `psql`:

```bash
# 1) แตกไฟล์
gunzip skycar-db-backup-2026-06-11.sql.gz

# 2) กู้เข้า DB เป้าหมาย (เช่น Supabase project ใหม่ หรือ Postgres local)
#    ใช้ docker เพื่อให้ client version ตรง (Postgres 17)
docker run --rm -i -v "$PWD":/b postgres:17-alpine \
  psql "postgresql://postgres.<ref>:<password>@...pooler.supabase.com:5432/postgres" \
  -f /b/skycar-db-backup-2026-06-11.sql
```

### หมายเหตุ
- ตาราง business ทั้งหมดอยู่ใน schema `public` (bookings, payments, users, ฯลฯ)
- `auth.users` เก็บบัญชีแอดมิน dashboard + ตัวตน LINE — รวมอยู่ใน dump แล้ว
- ถ้ากู้เข้า Supabase project เดิมที่ยังมีข้อมูล อาจชน object เดิม — ควรกู้เข้า project/DB เปล่า
- ขนาด DB ปัจจุบัน ~12 MB (dump บีบอัด ~64 KB)
