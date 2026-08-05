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

export const MONTHLY_RATE = 2000;
export const MONTH_EXTRA_DAY_RATE = 67;

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

  if (fullDays >= 20) return { price: MONTHLY_RATE, label: "1 เดือน" };

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
  if (nextDay >= 20) return { price: MONTHLY_RATE, label: "1 เดือน" };
  return { price: DAY_RATES[nextDay] ?? basePrice + 150, label: `${nextDay} วัน` };
}

// ─── คำนวณเศษวัน/ชั่วโมงที่เกินจากรายเดือน (วันละ 67 บาท) ───
function calcExtraAfterMonth(remainHours: number): {
  price: number;
  label: string;
  isFullMonth: boolean;
} {
  if (remainHours <= 2) {
    return { price: 0, label: "", isFullMonth: false };
  }

  const fullDays = Math.floor(remainHours / 24);
  const extraHours = remainHours % 24;

  // ถ้าเศษวันเกินมาถึง 20 วันขึ้นไป → นับเป็น 1 เดือน (2,000 บาท)
  if (fullDays >= 20) {
    return { price: MONTHLY_RATE, label: "1 เดือน", isFullMonth: true };
  }

  const basePrice = fullDays * MONTH_EXTRA_DAY_RATE;
  const halfDayExtra = 35; // ครึ่งวัน (2-18 ชม.) คิด 35 บาท

  // ไม่เกิน 2 ชม. (grace period)
  if (extraHours === 0 || extraHours <= 2) {
    if (fullDays === 0) return { price: 0, label: "", isFullMonth: false };
    return { price: basePrice, label: `${fullDays} วัน`, isFullMonth: false };
  }

  // เกินมา 2-18 ชม.
  if (extraHours <= 18) {
    if (fullDays === 0) {
      return { price: halfDayExtra, label: `${Math.round(extraHours)} ชั่วโมง`, isFullMonth: false };
    }
    return {
      price: basePrice + halfDayExtra,
      label: `${fullDays} วัน ${Math.round(extraHours)} ชั่วโมง`,
      isFullMonth: false,
    };
  }

  // เกิน > 18 ชม. → ปัดขึ้นเป็นอีก 1 วัน
  const nextDay = fullDays + 1;
  if (nextDay >= 20) {
    return { price: MONTHLY_RATE, label: "1 เดือน", isFullMonth: true };
  }
  return { price: nextDay * MONTH_EXTRA_DAY_RATE, label: `${nextDay} วัน`, isFullMonth: false };
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

  // < 20 วัน (480 ชม.) → คิดแบบวันปกติ (วันที่ 1-19)
  if (totalHours < 480) {
    const day = calcDayPrice(totalHours);
    return {
      price: day.price,
      label: day.label,
      type: totalHours < 24 ? "hour" : "day",
    };
  }

  // มีวันที่จริง และเวลารวม >= 20 วัน (480 ชม.)
  if (inDate && outDate) {
    const { months, remainMs } = countCalendarMonths(inDate, outDate);

    // กรณี 20-30 วัน แต่ยังไม่ครบ 1 เดือนตามปฏิทิน (months = 0)
    if (months === 0) {
      return {
        price: MONTHLY_RATE,
        label: "1 เดือน",
        type: "month",
        monthCount: 1,
      };
    }

    const remainHours = remainMs > 0 ? remainMs / 3600000 : 0;
    const extra = calcExtraAfterMonth(remainHours);

    // ถ้าเศษที่เกินมาถึง 20 วัน → นับเพิ่มเป็นอีก 1 เดือน
    if (extra.isFullMonth) {
      const totalMonths = months + 1;
      return {
        price: totalMonths * MONTHLY_RATE,
        label: `${totalMonths} เดือน`,
        type: "month",
        monthCount: totalMonths,
      };
    }

    // มีเศษวันเกินมา (1-19 วัน คิดวันละ 67 บาท)
    if (extra.price > 0 && extra.label) {
      return {
        price: months * MONTHLY_RATE + extra.price,
        label: `${months} เดือน + ${extra.label}`,
        type: "month",
        monthCount: months,
        remainLabel: extra.label,
      };
    }

    // ครบเดือนพอดี
    return {
      price: months * MONTHLY_RATE,
      label: `${months} เดือน`,
      type: "month",
      monthCount: months,
    };
  }

  // Fallback กรณีไม่มี inDate/outDate แต่ totalHours >= 480 (20 วันขึ้นไป)
  // 20-30 วัน (480 - 720 ชม.) = 1 เดือน
  if (totalHours <= 720) {
    return {
      price: MONTHLY_RATE,
      label: "1 เดือน",
      type: "month",
      monthCount: 1,
    };
  }

  const roughMonths = Math.floor(totalHours / (24 * 30));
  const remainHours = totalHours % (24 * 30);
  const extra = calcExtraAfterMonth(remainHours);

  if (extra.isFullMonth) {
    const totalMonths = roughMonths + 1;
    return {
      price: totalMonths * MONTHLY_RATE,
      label: `${totalMonths} เดือน`,
      type: "month",
      monthCount: totalMonths,
    };
  }

  const total = roughMonths * MONTHLY_RATE + extra.price;
  return {
    price: total,
    label: extra.label ? `${roughMonths} เดือน + ${extra.label}` : `${roughMonths} เดือน`,
    type: "month",
    monthCount: roughMonths,
    remainLabel: extra.label || undefined,
  };
}