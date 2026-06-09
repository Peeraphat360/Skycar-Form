import React from "react";
import { Select } from "./Select";

// ─── Time Picker (ตัวเลือกเวลา) ───
// หน้าที่: แสดงช่องกรอก/เลือก เวลาเป็นชั่วโมงและนาทีให้สวยงาม
export function TimePicker({ hour, minute, onHourChange, onMinuteChange }: any) {
  // รูปแบบ 24 ชั่วโมง: เลือกได้ 00–23 น. (นอกเวลา 08:00–21:00 มีค่าบริการเพิ่ม 50 บาท)
  const MIN_HOUR = 0;
  const MAX_HOUR = 23;
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let v = parseInt(e.target.value);
    if (isNaN(v)) v = MIN_HOUR;
    v = Math.max(MIN_HOUR, Math.min(MAX_HOUR, v));
    onHourChange(String(v).padStart(2, "0"));
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onHourChange(e.target.value);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMinuteChange(e.target.value);
  };

  // 24 ชั่วโมง: เลือกนาทีได้ทุกค่า
  const effectiveMinutes = minutes;

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