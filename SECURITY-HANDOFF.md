# 🔐 SECURITY HANDOFF — Skycar-Form & Sky-dashboard

เอกสารส่งต่องานสำหรับการนำขึ้นเซิร์ฟเวอร์ (deploy) — **ทำตามลำดับให้ครบทุกข้อ**
อัปเดต: 2026-06-23

> บริบท: ระหว่างพัฒนา ความลับ (service_role key, SESSION_SECRET, LINE secret) เคยถูก
> commit ขึ้น GitHub repo ที่เป็น **public** จึงต้องถือว่า **ความลับเดิมทั้งหมดรั่วแล้ว
> และใช้ไม่ได้อีก** ต้องสร้างใหม่ทั้งหมดก่อนขึ้นโปรดักชัน (ตอนนี้ repo ถูกตั้งเป็น
> private แล้ว — หยุดการรั่วต่อสาธารณะ)

---

## ✅ สถานะปัจจุบัน (ทำในโค้ดเรียบร้อยแล้ว)
- ถอด `.env`, `dist/`, `node_modules/` ออกจาก git + เพิ่มใน `.gitignore`
- Skycar-Form: คำนวณราคาฝั่ง server (กันลูกค้าแก้ยอด), ลบ endpoint `POST /api/cars/seed` ที่ไม่ต้อง login
- Sky-dashboard: เพิ่ม helmet + rate-limit + บังคับ SESSION_SECRET, ใส่ guard กัน IDOR ที่ `GET /bookings/user/:userId`
- อุด npm vulnerabilities เท่าที่ไม่ทำของพัง
- เขียน `backend/rls-role-hardening.sql` (รอรันบน Supabase)
- ตั้ง repo ทั้งสองเป็น private แล้ว

---

## 🔴 ขั้นตอนที่หัวหน้าต้องทำตอน deploy (สำคัญสุด)

### 1) Rotate ความลับทั้งหมด (ความลับเดิมรั่วแล้ว ใช้ไม่ได้)
- [ ] **Supabase → Settings → API → Reset `service_role` key** (key เดิมเปิดฐานข้อมูลทั้งหมดได้)
- [ ] **Supabase → Settings → API → Rotate JWT Secret** (จะ logout ทุก session — ปกติ)
- [ ] **เปลี่ยนรหัสผ่าน Database** (Supabase → Settings → Database → Reset password) — รหัสเดิม `Peeraphat123` อ่อนและรั่ว
- [ ] **สร้าง `SESSION_SECRET` ใหม่** (คนละค่าต่อแอป): `openssl rand -base64 48`
- [ ] **LINE Developers Console → เปลี่ยน Channel Secret** ของทั้ง 2 channel
  - Skycar-Form channel id `2010272002`
  - Sky-dashboard channel id `2010300313`

### 2) ตั้ง Environment Variables บนเซิร์ฟเวอร์ (อย่า commit ลงไฟล์)
**Skycar-Form backend:**
```
NODE_ENV=production
PORT=3002
SUPABASE_URL=...                 # ของ project ที่จะใช้จริง
SUPABASE_SERVICE_ROLE_KEY=...    # key ใหม่ที่ reset แล้ว
DATABASE_URL=...                 # ใช้สำหรับ session store (connect-pg-simple)
SESSION_SECRET=...               # สุ่มใหม่
CORS_ORIGINS=https://<frontend-domain>
FRONTEND_URL=https://<frontend-domain>
CLIENT_URL=https://<frontend-domain>
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...          # secret ใหม่
LINE_CALLBACK_URL=https://<backend-domain>/api/auth/line/callback
```
**Skycar-Form frontend:** `VITE_API_URL=https://<backend-domain>`

**Sky-dashboard backend** (ระวัง: ตัวแปรชื่อ `SUPABASE_SERVICE_KEY` ไม่ใช่ `_ROLE_KEY`):
```
NODE_ENV=production
PORT=3001
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...         # key ใหม่
JWT_SECRET=...
SESSION_SECRET=...               # สุ่มใหม่ (จำเป็น — โปรดักชันจะ throw ถ้าไม่ตั้ง)
FRONTEND_URL=https://<dashboard-domain>
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...
LINE_CALLBACK_URL=https://<backend-domain>/auth/line/callback
```
**Sky-dashboard frontend:**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...       # anon key เปิดเผยได้ (ความปลอดภัยอยู่ที่ RLS)
VITE_API_URL=https://<backend-domain>
```

### 3) ตั้งค่าฝั่ง Supabase
- [ ] รัน `backend/rls-hardening.sql` (ถ้ายังไม่เคยรันบน project ที่จะใช้)
- [ ] รัน `backend/rls-role-hardening.sql` (เปลี่ยน RLS ให้เช็ก role)
- [ ] **Authentication → ปิด "Allow new users to sign up"** (กันคนนอกสมัครเองแล้วเห็นข้อมูลลูกค้า)
- [ ] ตั้ง **App Metadata** ให้บัญชีแอดมินทุกคน: `{ "dashboard_role": "admin" }` หรือ `"manager"`
      (ไม่งั้นจะเข้า dashboard ไม่ได้หลังเปิด RLS แบบเช็ก role)

### 4) ตรวจสอบหลัง deploy
- [ ] เปิดเว็บ → login แอดมินได้, จองได้, ราคาถูกต้อง
- [ ] ลองเรียก service_role key **เก่า** กับ Supabase → ต้อง **ใช้ไม่ได้แล้ว**
- [ ] repo ยังเป็น private และไม่มี `.env` ใน git (`git ls-files | grep .env` ต้องว่าง)

---

## 🟡 แนะนำเพิ่ม (ไม่บังคับ แต่ควรทำ)
- **Purge git history**: service_role key เก่ายังอยู่ในประวัติ commit (แม้ repo เป็น private)
  ถ้า rotate key แล้วถือว่าปลอดภัยระดับนึง แต่ถ้าต้องการสะอาดจริงให้ใช้ `git filter-repo`
  หรือ BFG ลบ `backend/.env` ออกจากทุก commit แล้ว force-push
- **Sky-dashboard backend session**: ตอนนี้ยังใช้ MemoryStore (session หายตอน restart)
  ควรเปลี่ยนเป็น connect-pg-simple เหมือน Skycar-Form (มี `pg` ติดตั้งแล้ว)
- เปิด **GitHub secret scanning** / ใช้ `gitleaks` ใน CI กันความลับหลุดซ้ำ
- npm vulnerabilities ที่เหลือเป็น dev/build tooling เท่านั้น (ไม่ติดไป production) —
  จะเคลียร์ก็ต่อเมื่ออัป vite/NestJS major แบบตั้งใจและทดสอบให้ครบ
