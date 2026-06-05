import React from "react";
import { Select } from "./Select";

// ─── Time Picker (ตัวเลือกเวลา) ───
// หน้าที่: แสดงช่องกรอก/เลือก เวลาเป็นชั่วโมงและนาทีให้สวยงาม
export function TimePicker({ hour, minute, onHourChange, onMinuteChange }: any) {
  // แก้ไขตรงจุดนี้: ถ้าเวลาให้บริการของลานจอดรถเปลี่ยนไป ให้แก้ตัวเลขที่นี่ครับ
  // MIN_HOUR = เปิดกี่โมง (8 โมงเช้า) | MAX_HOUR = ปิดกี่โมง (3 ทุ่ม หรือ 21)
  const MIN_HOUR = 8;
  const MAX_HOUR = 21;
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let v = parseInt(e.target.value);
    if (isNaN(v)) v = MIN_HOUR;
    v = Math.max(MIN_HOUR, Math.min(MAX_HOUR, v));
    onHourChange(String(v).padStart(2, "0"));
  };

  // If hour is 21, lock minutes to 00
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onHourChange(e.target.value);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const h = parseInt(hour);
    // If hour is 21, only allow 00
    if (h >= MAX_HOUR) {
      onMinuteChange("00");
      return;
    }
    onMinuteChange(e.target.value);
  };

  const effectiveMinutes = parseInt(hour) >= MAX_HOUR ? ["00"] : minutes;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={MIN_HOUR}
        max={MAX_HOUR}
        value={hour}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 text-center outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
        placeholder="08"
      />
      <span className="text-slate-400 font-bold">:</span>
      <Select
        value={parseInt(hour) >= MAX_HOUR ? "00" : minute}
        onChange={handleMinuteChange}
        className="w-20"
      >
        {effectiveMinutes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </Select>
      <span className="text-xs text-slate-400 font-medium">น.</span>
    </div>
  );
}