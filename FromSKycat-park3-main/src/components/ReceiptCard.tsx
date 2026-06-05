import React from "react";
import { SkyPriceResult } from "../constants/pricing";

// ─── โครงสร้างข้อมูลใบเสร็จ ───
// กำหนดว่าใบเสร็จ 1 ใบต้องรับข้อมูลอะไรบ้าง
export interface ReceiptData {
  bookingId: string;
  form: {
    name: string;
    phone: string;
    phoneAlt: string;
    plate: string;
    type: string;
    brand: string;
    model: string;
    checkinDate: string;
    checkinHour: string;
    checkinMinute: string;
    checkoutDate: string;
    checkoutHour: string;
    checkoutMinute: string;
    coupon: string;
    specialNote: string;
  };
  priceResult: SkyPriceResult;
  discount: number;
  total: number;
}

// ฟังก์ชันช่วยใส่ลูกน้ำ (,) ให้ตัวเลข
function fmt(n: number) {
  return new Intl.NumberFormat("th-TH").format(n);
}

// ฟังก์ชันช่วยจัดรูปแบบวันที่
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ─── ReceiptCard Component ───
// ใช้ React.forwardRef เพื่อให้หน้าจอก่อนหน้าสามารถ "ชี้" มาที่ตัว Component นี้ 
// แล้วใช้ไลบรารีวาดออกมาเป็นรูปภาพ .jpg ได้
const ReceiptCard = React.forwardRef<HTMLDivElement, { data: ReceiptData }>(
  ({ data }, ref) => {
    const { bookingId, form, priceResult, discount, total } = data;
    const today = new Date().toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    });

    return (
      <div
        ref={ref}
        // แก้ไขตรงจุดนี้: หากต้องการเปลี่ยนฟอนต์ของใบเสร็จที่ถูกดาวน์โหลดออกมา
        style={{
          fontFamily: "'Sarabun', 'Noto Sans Thai', system-ui, sans-serif",
          backgroundColor: "#ffffff",
        }}
        className="w-full rounded-none border-none bg-white"
      >
        {/* ── Header ── */}
        <div style={{ background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)" }}
          className="px-6 py-5 text-white">
            <div className="flex justify-between items-center">
              <p className="text-xs text-white font-medium">ใบยืนยันการจอง เลขที่ :</p>
              <p className="text-xs text-white font-black mt-0.5">{bookingId}</p>
            </div>
            <p className="text-xs text-white mt-2">{today}</p>
        </div>

        {/* ── Body (เนื้อหาใบเสร็จ) ── */}
        <div className="px-8 py-6 space-y-5 bg-white">
          {/* Customer */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black mb-3">ข้อมูลลูกค้า</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                ["ชื่อ-นามสกุล", form.name],
                ["เบอร์โทร", form.phone + (form.phoneAlt ? ` / ${form.phoneAlt}` : "")],
                form.plate ? ["ทะเบียนรถ", form.plate] : null,
              ].filter(Boolean).map(([l, v]: any) => (
                <div key={l}>
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="text-sm font-semibold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200" />

          {/* Vehicle (ข้อมูลรถ) */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black mb-3">ข้อมูลรถยนต์</p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                ["ประเภท", form.type],
                ["ยี่ห้อ / รุ่น", `${form.brand} ${form.model}`],
              ].map(([l, v]: any) => (
                <div key={l}>
                  <p className="text-xs text-slate-400">{l}</p>
                  <p className="text-sm font-semibold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200" />

          {/* Schedule (กำหนดการ) */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black mb-3">กำหนดการ</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">
                <p className="text-xs font-bold text-sky-600 mb-1">เข้าจอด</p>
                <p className="text-sm font-bold text-slate-800">{fmtDate(form.checkinDate)}</p>
                <p className="text-xs text-slate-500 mt-0.5">เวลา {form.checkinHour}:{form.checkinMinute} น.</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-xs font-bold text-emerald-600 mb-1">รับรถ</p>
                <p className="text-sm font-bold text-slate-800">{fmtDate(form.checkoutDate)}</p>
                <p className="text-xs text-slate-500 mt-0.5">เวลา {form.checkoutHour}:{form.checkoutMinute} น.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-200" />

          {/* Pricing (ส่วนสรุปราคา) */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black mb-3">ค่าบริการ</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">ค่าจอดรถ ({priceResult.label})</span>
                <span className="font-semibold text-slate-800">฿{fmt(priceResult.price)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">ส่วนลด ({form.coupon})</span>
                  <span className="font-semibold text-emerald-600">-฿{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-700">ยอดรวมโดยประมาณ</span>
                <span className="text-2xl font-black text-sky-700">฿{fmt(total)}</span>
              </div>
            </div>
            {form.specialNote && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
                <p className="text-xs text-amber-700">
                  <span className="font-bold">หมายเหตุ:</span> {form.specialNote}
                </p>
              </div>
            )}
          </div>
            <div className="perforation px-0">
              <div className="perf-line" />
            </div>
          <div style={{ padding: '12px 20px 16px', textAlign: 'center' }}>
            {/* แก้ไขตรงจุดนี้: ข้อความเบอร์ติดต่อท้ายสุดของหน้าจอ */}
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6 }}>
              📞 ติดต่อสอบถาม: <strong style={{ color: '#64748b' }}>082-325-8380</strong>
            </p>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              เปิดให้บริการ 08:00–21:00 น. ทุกวัน
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ReceiptCard.displayName = "ReceiptCard";
export default ReceiptCard;