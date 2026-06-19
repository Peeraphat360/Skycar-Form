import rateLimit from "express-rate-limit";

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiters (per-IP). app.set('trust proxy', 1) ใน index.ts ทำให้นับ IP จริง
// หลัง Render proxy ได้ถูกต้อง. ส่ง 429 พร้อมข้อความกลางๆ ไม่ leak อะไร
// ─────────────────────────────────────────────────────────────────────────────

const json429 = {
  success: false,
  error: "Too many requests, please try again later.",
};

// auth: กัน brute-force/abuse บน /api/auth (login kickoff, claim, me, logout)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: json429,
});

// booking: กันสแปมสร้างการจอง (จองจริงต่ำมาก 60/ชม.ต่อ IP เหลือเฟือ)
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชม.
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: json429,
});

// customer: โปรไฟล์/รถ/ขอลบข้อมูล — กลางๆ
export const customerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: json429,
});
