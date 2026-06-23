// ─────────────────────────────────────────────────────────────────────────────
// Server-side price calculation — มิเรอร์จาก frontend (constants/pricing.ts +
// useBookingForm.ts) แบบ 1:1 เพื่อให้ราคาตรงกัน แต่ "ฝั่ง server เป็นผู้ตัดสิน"
// เหตุผล: เดิม backend เชื่อค่า `total` ที่ client ส่งมาตรงๆ → ลูกค้าแก้ยอดเป็น 0 ได้
// ตอนนี้ backend คำนวณใหม่จาก วันที่/เวลา/คูปอง เอง ไม่เชื่อ total จาก client
// ─────────────────────────────────────────────────────────────────────────────

// ราคาครบวัน (วันที่ 1-19)
const DAY_RATES: Record<number, number> = {
  1: 150, 2: 300, 3: 390, 4: 520, 5: 650, 6: 660, 7: 770,
  8: 880, 9: 990, 10: 1100, 11: 1100, 12: 1000, 13: 1300,
  14: 1400, 15: 1500, 16: 1600, 17: 1700, 18: 1800, 19: 1900,
};

// ราคาเมื่อเกินจากวันเต็มมา 2-18 ชั่วโมง (ครึ่งวัน)
const DAY_RATES_EXTRA: Record<number, number> = {
  1: 225, 2: 375, 3: 455, 4: 585, 5: 715, 6: 715, 7: 825,
  8: 935, 9: 1045, 10: 1155, 11: 1150, 12: 1050, 13: 1350,
  14: 1450, 15: 1550, 16: 1650, 17: 1750, 18: 1850, 19: 1950,
};

function calcDayPrice(totalHours: number): { price: number } {
  if (totalHours < 24) {
    if (totalHours < 1) return { price: 20 };
    if (totalHours <= 3) return { price: 50 };
    if (totalHours <= 6) return { price: 80 };
    return { price: 150 };
  }

  const fullDays = Math.floor(totalHours / 24);
  const remainHours = totalHours % 24;

  if (fullDays >= 20) return { price: 2000 };

  const basePrice = DAY_RATES[fullDays] ?? 150;
  const extraPrice = DAY_RATES_EXTRA[fullDays] ?? basePrice + 75;

  if (remainHours === 0 || remainHours <= 2) return { price: basePrice };
  if (remainHours <= 18) return { price: extraPrice };

  const nextDay = fullDays + 1;
  if (nextDay >= 20) return { price: 2000 };
  return { price: DAY_RATES[nextDay] ?? basePrice + 150 };
}

function countCalendarMonths(inDate: Date, outDate: Date): { months: number; remainMs: number } {
  let months = 0;
  let cursor = new Date(inDate);
  while (true) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);
    if (next > outDate) break;
    months++;
    cursor = next;
  }
  const remainMs = outDate.getTime() - cursor.getTime();
  return { months, remainMs };
}

function calcSkyPrice(totalHours: number, inDate?: Date, outDate?: Date): number {
  if (inDate && outDate && totalHours >= 480) {
    const { months, remainMs } = countCalendarMonths(inDate, outDate);
    const monthPrice = months * 2000;

    if (remainMs <= 0 || months === 0) {
      if (months === 0) return calcDayPrice(totalHours).price;
      return monthPrice;
    }
    const remainHours = remainMs / 3600000;
    return monthPrice + calcDayPrice(remainHours).price;
  }

  if (totalHours < 480) return calcDayPrice(totalHours).price;

  const roughMonths = Math.floor(totalHours / (24 * 30));
  const remainHours = totalHours % (24 * 30);
  return roughMonths * 2000 + (remainHours > 0 ? calcDayPrice(remainHours).price : 0);
}

// ── ค่าบริการรับส่งนอกเวลา (ก่อน 08:00 หรือหลัง 21:00 → +50 ต่อเที่ยว) ──
const OFF_HOURS_FEE = 50;
function isOffHours(hour: string, minute: string): boolean {
  const t = parseInt(hour || "0", 10) * 60 + parseInt(minute || "0", 10);
  return t < 8 * 60 || t > 21 * 60;
}

// ── คูปองและส่วนลด (ตรงกับ useBookingForm.ts) ──
const COUPONS: Record<string, number> = { PROMO50: 50, WELCOME100: 100, SAVE20: 20 };

export interface PricingInput {
  checkinDate: string;
  checkinHour: string;
  checkinMinute: string;
  checkoutDate: string;
  checkoutHour: string;
  checkoutMinute: string;
  coupon?: string | null;
}

export interface PricingResult {
  total: number;
  totalHours: number;
  basePrice: number;
  surcharge: number;
  discount: number;
}

// คำนวณยอดที่ต้องชำระ "ฝั่ง server" — ใช้ค่านี้บันทึกลง DB เสมอ (ไม่เชื่อ client)
export function computeBookingTotal(input: PricingInput): PricingResult {
  const ci = `${input.checkinDate}T${input.checkinHour.padStart(2, "0")}:${input.checkinMinute.padStart(2, "0")}:00`;
  const co = `${input.checkoutDate}T${input.checkoutHour.padStart(2, "0")}:${input.checkoutMinute.padStart(2, "0")}:00`;
  const inDate = new Date(ci);
  const outDate = new Date(co);
  const totalHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / 3600000);

  const basePrice = calcSkyPrice(totalHours, inDate, outDate);
  const surcharge =
    (isOffHours(input.checkinHour, input.checkinMinute) ? OFF_HOURS_FEE : 0) +
    (isOffHours(input.checkoutHour, input.checkoutMinute) ? OFF_HOURS_FEE : 0);
  const discount = COUPONS[(input.coupon ?? "").trim().toUpperCase()] ?? 0;
  const total = Math.max(0, basePrice + surcharge - discount);

  return { total, totalHours, basePrice, surcharge, discount };
}
