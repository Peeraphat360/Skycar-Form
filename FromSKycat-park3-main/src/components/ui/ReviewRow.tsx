import React from "react";

// ─── ReviewRow (บรรทัดสรุปข้อมูล) ───
// หน้าที่: เอาไว้แสดงข้อมูลในหน้าสุดท้ายก่อนกดยืนยัน เช่น แสดง "ชื่อ-นามสกุล" ซ้ายมือ และ "สมชาย ใจดี" ทางขวามือ
export function ReviewRow({ label, value }: any) {
  return (
    // แก้ไขตรงจุดนี้: จัดระยะห่าง หรือดีไซน์เส้นคั่นระหว่างบรรทัด
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      {/* หัวข้อด้านซ้าย (Label) สีเทา ตัวพิมพ์ใหญ่ */}
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">{label}</span>
      {/* ค่าของข้อมูลด้านขวา (Value) สีเข้ม */}
      <span className="text-xs font-semibold text-slate-500 sm:text-right wrap-break-word">{value || "—"}</span>
    </div>
  );
}