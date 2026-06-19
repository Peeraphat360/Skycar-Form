import { ShieldCheck } from "lucide-react";

// PDPA consent — แสดงทับหน้าจอก่อนเก็บข้อมูลครั้งแรก (เมื่อ user.consentPdpa = false)
// ต้องกดยอมรับก่อนถึงจะจองได้ (useBookingForm กัน submit ไว้อีกชั้น)
export default function ConsentModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100">
            <ShieldCheck className="h-6 w-6 text-sky-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">ความยินยอมการเก็บข้อมูล</h2>
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          เพื่อให้บริการจองที่จอดรถและจดจำข้อมูลของคุณสำหรับการจองครั้งถัดไป
          เราจำเป็นต้องเก็บข้อมูล <strong>ชื่อ-นามสกุล เบอร์โทร และข้อมูลรถ</strong> ของคุณ
          ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA)
        </p>
        <p className="mt-2 text-xs text-slate-400">
          คุณสามารถขอลบข้อมูลส่วนบุคคลได้ทุกเมื่อจากหน้าจอง
        </p>

        <button
          onClick={onAccept}
          className="mt-5 w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          ยินยอมและดำเนินการต่อ
        </button>
      </div>
    </div>
  );
}
