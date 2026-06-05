// พิมพ์เขียว (Interface) หลักสำหรับข้อมูลการจอง 1 รายการ
// หากต้องการเพิ่มช่องเก็บข้อมูลในระบบ ให้มาใส่ประเภทข้อมูล (type) ที่นี่
export interface Booking {
  id: string;
  name: string;
  phone: string;
  phoneAlt?: string; // ? หมายถึง เป็นข้อมูลตัวเลือก (จะมีหรือไม่มีก็ได้)
  email?: string; 
  plate: string;
  type?: string;     // ประเภทรถ (เช่น รถเก๋ง, รถกระบะ)
  brand?: string;    // ยี่ห้อรถ
  model?: string;    // รุ่นรถ
  slot?: string;     // ช่องจอดรถ

  // ── Date/Time (Legacy) ──
  // ข้อมูลวันเวลาแบบเก่า (เผื่อใช้รองรับข้อมูลเดิม)
  checkin?: string;
  time?: string;
  checkout?: string;
  checkoutTime?: string;

  // ── Date/Time (New) ──
  // ข้อมูลวันเวลาที่ใช้ในฟอร์มเวอร์ชันปัจจุบัน แยกวันที่กับเวลา(ชั่วโมง/นาที) ชัดเจน
  checkinDate?: string;
  checkinHour?: string;
  checkinMinute?: string;
  checkoutDate?: string;
  checkoutHour?: string;
  checkoutMinute?: string;

  // ── ข้อมูลการคิดเงิน ──
  days?: number | string;
  duration?: number | string;
  period?: string;
  extraHours?: number;

  // ── ส่วนลดและหมายเหตุ ──
  discount?: number;
  coupon?: string;
  note?: string;
  specialNote?: string;

  // ── สรุปผล ──
  total: number;
  priceLabel?: string;
  // สถานะนี้ถูกล็อกไว้ให้เป็นได้แค่ 4 ค่านี้เท่านั้น พิมพ์ผิดระบบจะเตือนทันที
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt?: string;
}

// ข้อมูลแบบขยาย สำหรับการแสดงผลหน้า Dashboard (มีข้อมูลคำนวณสดเพิ่มเข้ามา)
export interface LiveBooking extends Booking {
  liveExtra: number;
  liveTotal: number;
  isOverdue: boolean;
}
