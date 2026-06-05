import { Booking } from "../types/index";

// ── ค่าเริ่มต้นสำหรับการจอง (ถ้าไม่มีใน LocalStorage) ──
export const BOOKINGS_INIT: Booking[] = [];

// ── ค่าเริ่มต้นสำหรับช่องจอดที่ถูกใช้งาน ──
export const OCC_INIT: string[] = [];

// ── รายชื่อช่องจอดทั้งหมด (ตัวอย่างเช่น โซน A, B, C) ──
export const SLOTS: string[] = [
  ...Array.from({ length: 10 }, (_, i) => `A${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `B${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `C${i + 1}`),
];

// ── การตั้งค่าสถานะการจอง พร้อมสี UI (Text, Background, Border) ──
export const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "รอชำระเงิน", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  confirmed: { label: "ยืนยันแล้ว", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  cancelled: { label: "ยกเลิก", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  completed: { label: "เสร็จสิ้น", color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" }
};