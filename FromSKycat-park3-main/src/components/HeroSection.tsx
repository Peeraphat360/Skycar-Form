import React from "react";
import { Car, Cctv, Van, MapPin } from "lucide-react";

export default function HeroSection() {
  return (
    <div className="mb-8 rounded-3xl bg-gray-900 px-7 py-8 text-white shadow-xl shadow-sky-900/20 overflow-hidden relative">
      {/* เลเยอร์ที่ 1: รูปภาพพื้นหลัง */}
      <div className="absolute inset-0 bg-[url('/src/assets/bgSkycar02.png')] bg-cover bg-bottom opacity-50" />
      {/* เลเยอร์ที่ 2: สีไล่ระดับทับรูปภาพแบบโปร่งแสง (เพื่อให้ข้อความอ่านง่าย) */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/50 px-3 py-1.5 text-xs font-semibold text-sky-100 mb-4">
            <Car className="w-4 h-4" /> จองที่จอดรถออนไลน์ (Online Parking Reservation)
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            ฝากรถใกล้สนามบินเชียงใหม่<br />
            <span className="text-lg md:text-xl font-semibold text-sky-200">Chiang Mai Airport Parking</span>
          </h1>
          <p className="mt-3 text-sm text-sky-100/80 max-w-lg leading-relaxed">
            บริการรับฝากรถ ปลอดภัย มีคนคอยดูแลตลอด 24 ชั่วโมง
          </p>
          <p className="text-sm text-sky-100/80 max-w-lg leading-relaxed">
            เปิดบริการเวลา 08:00 – 21:00 น. ทุกวัน
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              [<Cctv key="cctv" className="w-4 h-4" />, "CCTV 24 ชม."],
              [<Van key="van" className="w-4 h-4" />, "รับ-ส่งถึงสนามบิน"],
              [<MapPin key="map" className="w-4 h-4" />, "ใกล้สนามบินเชียงใหม่"],
            ].map(([icon, label]) => (
              <span key={label as string} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-sky-100">{icon} {label}</span>
            ))}
          </div>
      </div>
    </div>
  );
}