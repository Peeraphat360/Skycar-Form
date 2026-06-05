import React from "react";

// ─── Section Card (การ์ดห่อหุ้มเนื้อหา) ───
// หน้าที่: กล่องสีขาวมีกรอบและมีหัวข้อด้านบน เอาไว้จัดกลุ่มเนื้อหาฟอร์มให้ดูอ่านง่าย
export function SectionCard({ icon, title, subtitle, children }: any) {
  return (
    // กรอบสีขาว พร้อมเงาเบาๆ
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        {icon && (
          // กล่องไอคอนด้านซ้ายของหัวข้อ
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 text-lg shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}