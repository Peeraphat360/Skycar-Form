import { z } from "zod";
import type { Request, Response } from "express";

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas + a tiny helper to validate request bodies.
// กฎ: ห้าม leak ค่าที่ผู้ใช้ส่งมา (เช่น เบอร์โทร) กลับไปใน error — ส่งแค่ path+message
// ─────────────────────────────────────────────────────────────────────────────

const phone = z
  .string()
  .trim()
  .regex(/^\d{9,10}$/, "must be 9–10 digits");

// ฟอร์มส่งฟิลด์เสริมที่เว้นว่างมาเป็น null (เช่น `form.plate || null`) — ต้องรับทั้ง
// null/undefined/"" ไม่งั้น booking ที่ไม่กรอกเบอร์สำรอง/ทะเบียน/คูปอง จะโดนปฏิเสธ 400
const optionalPhone = z
  .string()
  .trim()
  .regex(/^\d{9,10}$/, "must be 9–10 digits")
  .or(z.literal(""))
  .nullish();

// helper: string ที่ปล่อยว่าง/null ได้
const optText = (max: number) => z.string().trim().max(max).nullish();

// POST /api/bookings — ตรงกับ field ที่ routes/bookings.ts อ่าน (ปล่อย field เสริมอื่นผ่านได้)
export const bookingCreateSchema = z
  .object({
    name: z.string().trim().min(1, "required").max(120),
    phone,
    phone_alt: optionalPhone,
    plate: optText(20),
    car_type: optText(60),
    car_brand: optText(60),
    car_model: optText(60),
    color: optText(40),
    checkin_date: optText(10),
    checkin_hour: optText(2),
    checkin_minute: optText(2),
    checkout_date: optText(10),
    checkout_hour: optText(2),
    checkout_minute: optText(2),
    total: z.coerce.number().int().min(0).max(1_000_000),
    coupon: optText(40),
    specialNote: optText(500),
  })
  .passthrough();

// POST /api/customer/vehicles — เพิ่ม/แก้รถ (user_id มาจาก session เท่านั้น ไม่รับจาก body)
export const vehicleUpsertSchema = z.object({
  plate_number: z.string().trim().min(1, "required").max(20),
  car_brand: z.string().trim().max(60).optional(),
  car_model: z.string().trim().max(60).optional(),
  vehicle_type: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
  is_default: z.boolean().optional(),
});

// PATCH /api/bookings/:id/status
export const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

// ── helper: parse + ส่ง 400 พร้อม issues ที่ปลอดภัย (ไม่มีค่า input) ──
export function parseBody<T>(
  schema: z.ZodType<T>,
  req: Request,
  res: Response,
): T | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      // เฉพาะ path + message — ไม่ส่งค่าที่ผู้ใช้กรอกกลับไป (กัน sensitive leak / reflected echo)
      details: result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return null;
  }
  return result.data;
}
