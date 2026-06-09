import React from "react";
import { Select } from "./Select";

// ─── Time Picker (ตัวเลือกเวลา) ───
// เลือกชั่วโมง/นาทีจาก dropdown ได้เลย — รูปแบบ 24 ชม. (00–23)
// นอกเวลา 08:00–21:00 มีค่าบริการรับส่งเพิ่ม 50 บาท/เที่ยว
export function TimePicker({ hour, minute, onHourChange, onMinuteChange }: any) {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={hour}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onHourChange(e.target.value)}
        className="w-20"
      >
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </Select>
      <span className="text-slate-400 font-bold">:</span>
      <Select
        value={minute}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onMinuteChange(e.target.value)}
        className="w-20"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </Select>
      <span className="text-xs text-slate-400 font-medium">น.</span>
    </div>
  );
}
