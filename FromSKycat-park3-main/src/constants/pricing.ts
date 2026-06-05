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

export interface SkyPriceResult {
  price: number;
  label: string;
  type: "hour" | "day" | "month";
  monthCount?: number;
  remainLabel?: string;
}

// ─── คำนวณราคาย่อยสำหรับวัน (ไม่ถึง 20 วัน) ───
function calcDayPrice(totalHours: number): { price: number; label: string } {
  // ไม่ถึง 1 วัน
  if (totalHours < 24) {
    if (totalHours < 1) return { price: 20, label: "< 1 ชั่วโมง" };
    if (totalHours <= 3) return { price: 50, label: `${Math.ceil(totalHours)} ชั่วโมง` };
    if (totalHours <= 6) return { price: 80, label: `${Math.ceil(totalHours)} ชั่วโมง` };
    return { price: 150, label: `${Math.ceil(totalHours)} ชั่วโมง` };
  }

  const fullDays = Math.floor(totalHours / 24);
  const remainHours = totalHours % 24;

  if (fullDays >= 20) return { price: 2000, label: "รายเดือน" };

  const basePrice = DAY_RATES[fullDays] ?? 150;
  const extraPrice = DAY_RATES_EXTRA[fullDays] ?? basePrice + 75;

  if (remainHours === 0 || remainHours <= 2) {
    return { price: basePrice, label: `${fullDays} วัน` };
  }
  if (remainHours <= 18) {
    return { price: extraPrice, label: `${fullDays} วัน ${Math.round(remainHours)} ชั่วโมง` };
  }
  // เกินมาก → ปัดขึ้นวันถัดไป
  const nextDay = fullDays + 1;
  if (nextDay >= 20) return { price: 2000, label: "รายเดือน" };
  return { price: DAY_RATES[nextDay] ?? basePrice + 150, label: `${nextDay} วัน` };
}

// ─── นับเดือนแบบ Calendar (วันเดียวกันของเดือนถัดไป = 1 เดือน) ───
function countCalendarMonths(inDate: Date, outDate: Date): { months: number; remainMs: number } {
  let months = 0;
  let cursor = new Date(inDate);

  while (true) {
    // คำนวณวันที่ครบเดือนถัดไป
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + 1);

    if (next > outDate) break; // ยังไม่ครบอีกเดือน

    months++;
    cursor = next;
  }

  const remainMs = outDate.getTime() - cursor.getTime();
  return { months, remainMs };
}

// ─── Main export ───
export function calcSkyPrice(
  totalHours: number,
  inDate?: Date,
  outDate?: Date
): SkyPriceResult {

  // ถ้ามีวันที่จริง และเวลารวม >= 20 วัน → คำนวณเดือนแบบ calendar
  if (inDate && outDate && totalHours >= 480) {
    const { months, remainMs } = countCalendarMonths(inDate, outDate);
    const monthPrice = months * 2000;

    if (remainMs <= 0 || months === 0) {
      // ครบเดือนพอดีหรือยังไม่ถึง 1 เดือน (กรณี edge)
      if (months === 0) {
        // fallthrough ไปคำนวณแบบวัน (จะ hit >=20 วัน แต่ inDate/outDate ไม่ได้ส่ง)
        // ไม่ควรเกิด เพราะ totalHours >= 480 แต่ months = 0 หมายถึง < 1 เดือน calendar
        const day = calcDayPrice(totalHours);
        return { price: day.price, label: day.label, type: "day" };
      }
      return {
        price: monthPrice,
        label: `${months} เดือน`,
        type: "month",
        monthCount: months,
      };
    }

    // มีเศษวัน/ชั่วโมงหลังครบเดือน → คำนวณเศษแบบปกติ
    const remainHours = remainMs / 3600000;
    const remainPart = calcDayPrice(remainHours);
    const total = monthPrice + remainPart.price;

    return {
      price: total,
      label: `${months} เดือน + ${remainPart.label}`,
      type: "month",
      monthCount: months,
      remainLabel: remainPart.label,
    };
  }

  // < 20 วัน หรือไม่มีวันที่ → คิดแบบวันปกติ
  if (totalHours < 480) {
    const day = calcDayPrice(totalHours);
    return {
      price: day.price,
      label: day.label,
      type: totalHours < 24 ? "hour" : "day",
    };
  }

  // Fallback กรณีไม่มี inDate/outDate แต่ totalHours >= 480
  const roughMonths = Math.floor(totalHours / (24 * 30));
  const remainHours = totalHours % (24 * 30);
  const remainPart = calcDayPrice(remainHours);
  const total = roughMonths * 2000 + (remainHours > 0 ? remainPart.price : 0);
  return {
    price: total,
    label: remainHours > 0 ? `${roughMonths} เดือน + ${remainPart.label}` : `${roughMonths} เดือน`,
    type: "month",
    monthCount: roughMonths,
  };
}