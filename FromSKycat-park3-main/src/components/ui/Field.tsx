import React from "react";

// ─── Field Component (ตัวห่อหุ้มช่องกรอกข้อมูล) ───
// หน้าที่: ใช้ครอบ Input หรือ Select เพื่อแสดง "หัวข้อ" (Label) ด้านบน และ "คำอธิบาย" (Hint) ด้านล่าง
// แก้ไขตรงจุดนี้: ถ้าอยากเปลี่ยนสี ขนาดฟอนต์ หรือระยะห่าง ของหัวข้อทุกๆ ช่องในเว็บ
export function Field({ label, hint, required, children }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* ส่วนแสดงหัวข้อ (Label) เช่น "ชื่อ-นามสกุล" สีเทา (slate-500) ตัวหนา (semibold) */}
      <label className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
        {label}
        {/* ถ้าข้อมูลบังคับกรอก (required = true) ให้แสดงดอกจันสีแดง (*) */}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {/* ส่วนของช่องกรอกข้อมูลที่ถูกครอบไว้ (เช่น กล่อง Input หรือ Select) */}
      {children}
      {/* ส่วนแสดงคำอธิบายเพิ่มเติมใต้ช่องกรอก (ถ้ามีการส่งข้อความ hint เข้ามา) */}
      {hint && <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
}