import React from "react";

// ─── Select Component (ช่องตัวเลือก Dropdown) ───
// หน้าที่: ช่องให้คลิกเพื่อเลือกรายการ (เช่น ประเภทรุ, ยี่ห้อรถ, รุ่นรถ)
export function Select({ className = "", children, ...props }: any) {
  return (
    <select
      // แก้ไขตรงจุดนี้: ปรับเปลี่ยนหน้าตาของ Dropdown เช่น สีขอบ ความโค้ง 
      // (หน้าตาจะอิง Class ของ Tailwind เหมือนกับ Input ด้านบนเพื่อให้ดีไซน์เป็นไปในทางเดียวกัน)
      className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}