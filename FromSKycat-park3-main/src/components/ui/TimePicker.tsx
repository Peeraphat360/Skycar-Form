import React, { useState, useRef, useEffect, useCallback } from "react";

// ─── Time Picker (เลือกเวลาแบบ wheel / drum roller) ───
// แสดงปุ่มเวลา → กดแล้วเปิด modal เลื่อนเลือก ชั่วโมง:นาที (เฉพาะเวลา ไม่รวมวัน)

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const DRUM_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ─── Drum Roller (ล้อหมุนเลือกค่า) ───
interface DrumProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: number;
}

const DrumRoller: React.FC<DrumProps> = ({ items, selectedIndex, onSelect, width = 88 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const animFrame = useRef<number | undefined>(undefined);
  const velocityRef = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    const target = index * ITEM_HEIGHT;
    if (smooth) el.scrollTo({ top: target, behavior: "smooth" });
    else el.scrollTop = target;
  }, []);

  useEffect(() => {
    scrollToIndex(selectedIndex, false);
  }, [selectedIndex, scrollToIndex]);

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const snapped = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, snapped));
    scrollToIndex(clamped);
    onSelect(clamped);
  }, [items.length, onSelect, scrollToIndex]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDragging.current = true;
    startY.current = e.clientY;
    startScrollTop.current = el.scrollTop;
    lastY.current = e.clientY;
    lastTime.current = Date.now();
    velocityRef.current = 0;
    el.setPointerCapture(e.pointerId);
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = containerRef.current;
    if (!el) return;
    const now = Date.now();
    const dt = now - lastTime.current;
    const dy = e.clientY - lastY.current;
    if (dt > 0) velocityRef.current = dy / dt;
    lastY.current = e.clientY;
    lastTime.current = now;
    el.scrollTop = startScrollTop.current - (e.clientY - startY.current);
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = containerRef.current;
    if (!el) return;
    let v = velocityRef.current * -15;
    const momentum = () => {
      if (Math.abs(v) < 0.5) { snapToNearest(); return; }
      el.scrollTop += v;
      v *= 0.85;
      animFrame.current = requestAnimationFrame(momentum);
    };
    animFrame.current = requestAnimationFrame(momentum);
  };

  return (
    <div style={{ width, position: "relative", flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
        background: `linear-gradient(to bottom,
          rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 25%,
          transparent 40%, transparent 60%,
          rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.95) 100%)`,
        borderRadius: 12,
      }} />
      <div style={{
        position: "absolute", left: 4, right: 4, zIndex: 1,
        top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT,
        background: "rgba(2,132,199,0.08)", borderRadius: 10,
        border: "1.5px solid rgba(2,132,199,0.25)", pointerEvents: "none",
      }} />
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          height: DRUM_HEIGHT, overflowY: "scroll", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch", cursor: "grab", userSelect: "none",
          touchAction: "none", borderRadius: 12, position: "relative", zIndex: 0,
        }}
      >
        <div style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => { scrollToIndex(i); onSelect(i); }}
            style={{
              height: ITEM_HEIGHT, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: i === selectedIndex ? 19 : 16,
              fontWeight: i === selectedIndex ? 700 : 400,
              color: i === selectedIndex ? "#0369a1" : "#94a3b8",
              transition: "all 0.15s ease", cursor: "pointer",
            }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: ITEM_HEIGHT * 2 }} />
      </div>
    </div>
  );
};

// ─── TimePicker ───
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export function TimePicker({ hour, minute, onHourChange, onMinuteChange }: any) {
  const [open, setOpen] = useState(false);

  const hourIdx0 = Math.max(0, HOURS.indexOf(String(hour).padStart(2, "0")));
  const minIdx0 = Math.max(0, MINUTES.indexOf(String(minute).padStart(2, "0")));

  const [hIdx, setHIdx] = useState(hourIdx0);
  const [mIdx, setMIdx] = useState(minIdx0);

  // เปิด modal → sync ค่าปัจจุบัน
  const openModal = () => {
    setHIdx(Math.max(0, HOURS.indexOf(String(hour).padStart(2, "0"))));
    setMIdx(Math.max(0, MINUTES.indexOf(String(minute).padStart(2, "0"))));
    setOpen(true);
  };

  const confirm = () => {
    onHourChange(HOURS[hIdx]);
    onMinuteChange(MINUTES[mIdx]);
    setOpen(false);
  };

  return (
    <>
      {/* ปุ่มแสดงเวลา — ขนาด/ฟอนต์เท่าช่องวันที่ */}
      <button
        type="button"
        onClick={openModal}
        className="flex min-h-12 w-full box-border items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left shadow-sm transition hover:border-sky-400 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/15"
      >
        <span className="text-sm font-bold text-slate-900 tabular-nums">
          {String(hour).padStart(2, "0")} : {String(minute).padStart(2, "0")}
        </span>
        <span className="ml-1.5 text-xs font-normal text-slate-400">น.</span>
      </button>

      {/* Modal เลือกเวลา */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-1 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                ยกเลิก
              </button>
              <span className="text-sm font-bold text-slate-700">เลือกเวลา</span>
              <button type="button" onClick={confirm} className="text-sm font-bold text-sky-600 hover:text-sky-700">
                ตกลง
              </button>
            </div>

            {/* Column labels */}
            <div className="flex justify-center gap-6 px-4 text-xs font-medium text-slate-400">
              <span className="w-[88px] text-center">ชั่วโมง</span>
              <span className="w-4" />
              <span className="w-[88px] text-center">นาที</span>
            </div>

            {/* Drums */}
            <div className="flex items-center justify-center gap-6 px-4 pt-1">
              <DrumRoller items={HOURS} selectedIndex={hIdx} onSelect={setHIdx} />
              <span className="text-2xl font-bold text-slate-300">:</span>
              <DrumRoller items={MINUTES} selectedIndex={mIdx} onSelect={setMIdx} />
            </div>

            {/* Preview */}
            <div className="mx-4 mb-3 mt-2 rounded-xl bg-sky-50 py-3 text-center">
              <span className="text-base font-bold text-sky-700 tabular-nums">
                {HOURS[hIdx]} : {MINUTES[mIdx]} น.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
