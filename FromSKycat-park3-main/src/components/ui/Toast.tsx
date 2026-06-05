import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export const NOTIFICATION_DURATION = 5000;

// ─── Toast Notification Component (กล่องแจ้งเตือนเด้งมุมจอ) ───
// หน้าที่: โชว์ข้อความแจ้งเตือนข้อผิดพลาดหรือทำรายการสำเร็จ
export function Toast({ notifications, onDismiss }: any) {
  return (
    // แก้ไขตรงจุดนี้: เปลี่ยนตำแหน่งเด้ง (ปัจจุบัน fixed top-5 right-5 = ลอยอยู่มุมขวาบน)
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((n: any) => (
        <div
          key={n.id}
          // แก้ไขตรงจุดนี้: ปรับโครงสร้างกล่องแจ้งเตือน ความฟุ้ง (shadow) และสีของแต่ละประเภท
          className={`flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-xl shadow-slate-900/10 backdrop-blur-sm transition-all duration-300 ${
            n.type === "error"
              ? "border-red-200 bg-white text-red-700"
              : n.type === "success"
              ? "border-emerald-200 bg-white text-emerald-700"
              : "border-sky-200 bg-white text-sky-700"
          }`}
        >
          <span className="mt-0.5 text-lg leading-none shrink-0">
            {/* แก้ไขตรงจุดนี้: เปลี่ยน Icon (อีโมจิ) ที่โชว์หน้าข้อความ */}
            {n.type === "error" ? (
              <AlertCircle className="w-5 h-5" />
            ) : n.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">{n.title}</p>
            {n.message && <p className="mt-1 text-xs opacity-80 leading-relaxed">{n.message}</p>}
          </div>
          <button
            onClick={() => onDismiss(n.id)}
            className="text-current opacity-40 hover:opacity-80 transition-opacity shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}