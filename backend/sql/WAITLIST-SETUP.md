# Waitlist จริง — ขั้นตอนติดตั้ง (manual steps)

ระบบคิวรอที่จอด (FIFO) + แจ้งเตือนอัตโนมัติเมื่อมีที่ว่าง. โค้ดอยู่ในหลายที่แล้ว
แต่มี **2 ขั้นตอนที่ต้องทำมือบน Supabase** (รันไม่ได้จากในโค้ด) ให้ครบก่อนถึงจะทำงาน

## ภาพรวมการทำงาน

1. ลูกค้าจองตอนช่องเต็ม → `create_online_booking` บันทึก booking `slot_id = NULL` (PENDING) = **เข้าคิวรอ**
   ฟอร์มขึ้นหน้า "ตอนนี้โรงจอดเต็ม — คุณอยู่ในคิวรอแล้ว" (ไม่ใช่ใบเสร็จจองสำเร็จ)
2. เมื่อมีช่องถูกปล่อยว่าง (ยกเลิก/ลบ booking ที่ครองช่องอยู่) → trigger เรียก `process_waitlist()`
3. `process_waitlist()` ไล่คิว **ตาม created_at (มาก่อน-ได้ก่อน)** จัด `slot_id` ให้รายที่ช่วงเวลาว่างแล้ว
4. `slot_id` เปลี่ยน NULL→ค่า → **Supabase webhook** ยิงไป line-service `/webhooks/slot-assigned`
   → push LINE "มีที่จอดว่างแล้ว!" (idempotent — ส่งครั้งเดียว)

## ขั้นตอนที่ 1 — รัน SQL บน Supabase (SQL Editor)

รันไฟล์นี้ (idempotent — รันซ้ำได้):

```
backend/sql/waitlist_auto_assign.sql
```

สร้าง `process_waitlist()` + trigger `bookings_release_waitlist_upd` / `_del` บนตาราง `bookings`.

> ต้องมี `create_online_booking` เวอร์ชัน waitlist (`online_booking_full_waitlist.sql`) ติดตั้งอยู่ก่อน
> — ยืนยันแล้วว่า prod ใช้เวอร์ชันนี้ (2026-07-17)

## ขั้นตอนที่ 2 — ตั้ง Supabase Database Webhook

Supabase Dashboard → **Database → Webhooks → Create a new hook**

- **Table**: `bookings`
- **Events**: `UPDATE` เท่านั้น
- **Type**: HTTP Request → `POST`
- **URL**: `https://<line-service>/webhooks/slot-assigned`
- **HTTP Headers**: `X-Webhook-Secret: <WEBHOOK_SECRET>` (ค่าเดียวกับ env ของ line-service)

line-service กรอง edge เอง (`old.slot_id NULL → record.slot_id มีค่า`, ยัง PENDING, ไม่ใช่ walk-in)
รายอื่นตอบ `sent=false, reason=not_a_slot_assign_edge` — ตั้ง event เป็น UPDATE กว้างๆ ได้ ไม่ต้องกรองที่ Supabase

## ขั้นตอนที่ 3 — อัปเดต idempotency index (กันส่ง LINE ซ้ำ)

`send_slot_available` ใช้ insert-first claim กันส่งซ้ำ แต่ partial unique index เดิม
(`Sky-dashboard/skycar-line-service/notifications_idempotency.sql`) ครอบแค่
`BOOKING_CONFIRMED`/`RECEIPT_SENT` — **ต้อง re-run ไฟล์นั้น** (เวอร์ชันล่าสุดเพิ่ม
`SLOT_AVAILABLE` เข้า index แล้ว) ไม่งั้นถ้า webhook ยิงซ้ำ ลูกค้าจะได้ "ช่องว่างแล้ว" ซ้ำได้

## ทดสอบ

- แมนนวล: `POST /notifications/{booking_id}/slot-available` (ยิงตรง ข้าม webhook)
- e2e: ทำให้ช่องเต็ม → จองผ่านฟอร์ม (ต้องได้หน้า "เข้าคิวรอ") → ยกเลิก booking ที่ครองช่องบน dashboard
  → คิวที่รอควรได้ `slot_id` อัตโนมัติ + ลูกค้าได้ LINE "มีที่จอดว่างแล้ว"

## หมายเหตุ

- รายการที่รอคิว (`slot_id NULL`) **ไม่กินช่อง** (availability check นับเฉพาะ booking ที่มี slot_id) → ไม่บล็อกคนอื่น
- ปุ่ม "แจ้งลูกค้า (อยู่ในคิว)" บน dashboard = แจ้งเชิงรุกว่าเต็ม/อยู่ในคิว **ไม่ยกเลิกรายการแล้ว** (เดิมเคยยกเลิก)
- ลูกค้า walk-in ไม่มี `line_id` → ส่ง LINE ไม่ได้ (ตอบ 422/recipient_not_friend) แต่คิวยังทำงานปกติ
