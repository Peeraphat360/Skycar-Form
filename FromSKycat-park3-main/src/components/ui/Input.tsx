import React from "react";

// ─── Input Component (ช่องกรอกข้อความ) ───
// หน้าที่: ช่องสำหรับพิมพ์ข้อความ (เช่น ชื่อ, เบอร์โทร, ทะเบียนรถ, โค้ดส่วนลด)
export function Input({ className = "", ...props }: any) {
  return (
    <input
      // แก้ไขตรงจุดนี้: ปรับเปลี่ยนหน้าตาของช่องกรอกทั้งเว็บ
      // - rounded-xl: ความโค้งของมุม
      // - bg-slate-50: สีพื้นหลังตอนปกติ
      // - focus:border-sky-500: สีของขอบตอนที่ผู้ใช้คลิกพิมพ์ (ปัจจุบันเป็นสีฟ้า sky)
      className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}