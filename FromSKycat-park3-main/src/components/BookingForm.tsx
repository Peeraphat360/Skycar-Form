import { SectionCard } from "./ui/SectionCard";
import { Field } from "./ui/Field";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { TimePicker } from "./ui/TimePicker";
import { ReviewRow } from "./ui/ReviewRow";
import { User, Car, Calendar, ClipboardList, Clock, AlertTriangle, Check, ArrowRight, ArrowLeft } from "lucide-react";

export default function BookingForm({ booking, addNotif }: any) {
  const {
    step, setStep,
    form, handleChange,
    priceResult, discount, total,
    validateStep1, validateStep2,
    handleSubmit,          // ← รับจาก hook แทน local function
    isSubmitting,          // ← กันกดยืนยันซ้ำ
    checkinOffHours, checkoutOffHours,   // ← เวลานอก 08:00–21:00 (เตือน +50)
    formTopRef, scrollToForm,
    carTypes, carBrands, carModels,  // ← ข้อมูลรถจาก API
  } = booking;

  // วันที่ปัจจุบันแบบ local (ไม่ใช้ toISOString ที่เป็น UTC — กันเพี้ยนข้ามวันตอนเช้ามืด)
  const today = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  const fmt = (n: number) => new Intl.NumberFormat("th-TH").format(n);
  const fmtDate = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  };
  const getDateParts = (d: string) => {
    if (!d) return null;
    const [year, month, day] = d.split("-").map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day, date: new Date(year, month - 1, day) };
  };

  const fmtFullThaiDate = (d: string) => {
    const parts = getDateParts(d);
    if (!parts) return "กรุณาเลือกวันที่";

    const weekdays = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    return `${weekdays[parts.date.getDay()]}ที่ ${parts.day} ${months[parts.month - 1]} ${parts.year + 543}`;
  };

  return (
    <div ref={formTopRef} className="mx-auto max-w-3xl space-y-6">


      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="fade-in space-y-5">

          {/* ข้อมูลลูกค้า */}
          <SectionCard icon={<User className="w-5 h-5" />} title="ข้อมูลลูกค้า (Customer Information)" subtitle="กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อ-นามสกุล" required>
                <Input
                  value={form.name}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    if (/^[a-zA-Z0-9\u0E00-\u0E7F\s]*$/.test(val)) handleChange("name", val);
                  }}
                  placeholder="สมชาย ใจดี"
                />
              </Field>
              <Field label="เบอร์โทรหลัก (Phone)" required>
                <Input
                  value={form.phone}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    if (/^\d{0,10}$/.test(val)) handleChange("phone", val);
                  }}
                  placeholder="08X-XXX-XXXX"
                  type="tel"
                  maxLength={10}
                />
              </Field>
              <Field label="เบอร์โทรสำรอง (Alternative Phone)">
                <Input
                  value={form.phoneAlt}
                  onChange={(e: any) => {
                    const val = e.target.value;
                    if (/^\d{0,10}$/.test(val)) handleChange("phoneAlt", val);
                  }}
                  placeholder="กรณีติดต่อไม่ได้ (Optional)"
                  type="tel"
                  maxLength={10}
                />
              </Field>
              <Field label="ทะเบียนรถ (License Plate)">
                <Input
                  value={form.plate}
                  onChange={(e: any) => handleChange("plate", e.target.value.toUpperCase())}
                  placeholder="ไม่จำเป็นต้องกรอก (Optional)"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ข้อมูลรถยนต์ — ดึงจาก API */}
          <SectionCard icon={<Car className="w-5 h-5" />} title="ข้อมูลรถยนต์ (Vehicle Information)" subtitle="เลือกประเภทรถก่อน จากนั้นระบบจะแสดงยี่ห้อและรุ่นรถที่ตรงกัน">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
              <Field label="ประเภทรถ (Vehicle Type)" required>
                <Select value={form.type} onChange={(e: any) => handleChange("type", e.target.value)}>
                  {carTypes?.map((t: string) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="ยี่ห้อรถ (Brand)" required>
                <Select
                  value={form.brand}
                  onChange={(e: any) => handleChange("brand", e.target.value)}
                  disabled={!form.type}
                >
                  <option value="">-- เลือกยี่ห้อรถ --</option>
                  {carBrands?.map((b: string) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="อื่นๆ">อื่นๆ (Other)</option>
                </Select>
              </Field>
              <Field label="รุ่นรถ (Model)" required>
                {form.brand === "อื่นๆ" ? (
                  <Input
                    value={form.model}
                    onChange={(e: any) => handleChange("model", e.target.value)}
                    placeholder="พิมพ์รุ่นรถ"
                  />
                ) : (
                  <Select
                    value={form.model}
                    onChange={(e: any) => handleChange("model", e.target.value)}
                    disabled={!form.brand || !carModels?.length}
                  >
                    <option value="">-- เลือกรุ่นรถ --</option>
                    {carModels?.map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    <option value="อื่นๆ">อื่นๆ (Other)</option>
                  </Select>
                )}
              </Field>
            </div>
          </SectionCard>

          {/* วันเวลาจอดรถ */}
          <SectionCard icon={<Calendar className="w-5 h-5" />} title="วันและเวลาจอดรถ (Parking Schedule)" subtitle="กรุณาระบุวันเวลาเข้าจอดและรับรถ">
            {/* หมายเหตุแจ้งลูกค้า — บริการรับส่งฟรีในเวลาทำการ */}
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <span className="text-sky-500 text-base leading-none mt-0.5">ℹ️</span>
              <p className="text-xs leading-relaxed text-sky-900">
                <span className="font-bold">บริการรับส่งฟรี เวลา 08.00–21.00 น.</span>
                <span className="block text-[11px] text-sky-600 mt-0.5">
                  Free shuttle service 08:00–21:00.
                </span>
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-600 shadow-sm shadow-sky-600/40" />
                    วันที่เข้าจอด <span className="text-slate-400">(CHECK-IN)</span><span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.checkinDate}
                      min={today}
                      onChange={(e: any) => {
                        // ล็อกย้อนหลัง: ถ้าเลือกก่อนวันนี้ (มือถือบางตัวไม่บังคับ min) snap เป็นวันนี้
                        const v = e.target.value;
                        handleChange("checkinDate", v && v < today ? today : v);
                      }}
                      aria-label="วันที่เข้าจอด"
                      className="block w-full min-h-12 min-w-0 max-w-full box-border appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all scheme-light [&::-webkit-date-and-time-value]:text-left focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15 hover:border-slate-300"
                    />
                    <Calendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-sky-500" />
                  </div>
                  <div className="flex min-h-12 items-center gap-3 rounded-xl border-l-8 border-sky-300 bg-gradient-to-r from-sky-900 to-sky-700 px-4 py-3 text-white shadow-sm">
                    <Calendar className="h-5 w-5 shrink-0 text-sky-400" />
                    <span className="text-sm font-semibold leading-6">{fmtFullThaiDate(form.checkinDate)}</span>
                  </div>
                </div>
                <Field label="เวลาเข้าจอด (08:00–21:00 น.)">
                  <TimePicker
                    hour={form.checkinHour} minute={form.checkinMinute}
                    onHourChange={(h: string) => handleChange("checkinHour", h)}
                    onMinuteChange={(m: string) => handleChange("checkinMinute", m)}
                  />
                  {checkinOffHours ? (
                    <p className="mt-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <span>⚠️</span> นอกเวลา 08:00–21:00 น. — คิดค่าบริการรับส่งเพิ่ม 50 บาท
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> เลือกชั่วโมง/นาทีได้เลย (00–23)
                    </p>
                  )}
                </Field>
              </div>
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
                    วันที่รับรถ <span className="text-slate-400">(CHECK-OUT)</span><span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.checkoutDate}
                      min={form.checkinDate || today}
                      onChange={(e: any) => {
                        // วันรับรถต้องไม่ก่อนวันเข้าจอด และไม่ย้อนหลัง
                        const v = e.target.value;
                        const lo = (form.checkinDate || today) > today ? form.checkinDate : today;
                        handleChange("checkoutDate", v && v < lo ? lo : v);
                      }}
                      aria-label="วันที่รับรถ"
                      className="block w-full min-h-12 min-w-0 max-w-full box-border appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-11 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all scheme-light [&::-webkit-date-and-time-value]:text-left focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 hover:border-slate-300"
                    />
                    <Calendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="flex min-h-12 items-center gap-3 rounded-xl border-l-8 border-emerald-300 bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3 text-white shadow-sm">
                    <Calendar className="h-5 w-5 shrink-0 text-emerald-400" />
                    <span className="text-sm font-semibold leading-6">{fmtFullThaiDate(form.checkoutDate)}</span>
                  </div>
                </div>
                <Field label="เวลารับรถ (08:00–21:00 น.)">
                  <TimePicker
                    hour={form.checkoutHour} minute={form.checkoutMinute}
                    onHourChange={(h: string) => handleChange("checkoutHour", h)}
                    onMinuteChange={(m: string) => handleChange("checkoutMinute", m)}
                  />
                  {checkoutOffHours ? (
                    <p className="mt-1.5 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <span>⚠️</span> นอกเวลา 08:00–21:00 น. — คิดค่าบริการรับส่งเพิ่ม 50 บาท
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> เลือกชั่วโมง/นาทีได้เลย (00–23) ตามเวลาเครื่องลง
                    </p>
                  )}
                </Field>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              onClick={() => {
                let valid = true;
                if (validateStep1 && !validateStep1()) valid = false;
                if (valid && validateStep2 && !validateStep2()) valid = false;
                if (valid) { setStep(2); if (scrollToForm) scrollToForm(); }
              }}
              className="flex items-center gap-2 rounded-2xl bg-sky-700 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-700/20 transition hover:-translate-y-0.5 hover:bg-sky-800"
            >
              ถัดไป: ยืนยันการจอง <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="fade-in space-y-5">
          <SectionCard icon={<ClipboardList className="w-5 h-5" />} title="ตรวจสอบข้อมูลการจอง (Review Booking)" subtitle="กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน">
            <div className="flex flex-col gap-4 px-2 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1">ข้อมูลลูกค้า</p>
                <ReviewRow label="ชื่อ-นามสกุล" value={form.name} />
                <ReviewRow label="เบอร์โทร" value={`${form.phone}${form.phoneAlt ? ` / ${form.phoneAlt}` : ""}`} />
              </div>
              <div className="border-t border-dashed border-slate-200" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1">ข้อมูลรถยนต์</p>
                <ReviewRow label="ประเภท" value={form.type} />
                <ReviewRow label="ยี่ห้อ / รุ่น" value={`${form.brand} ${form.model}`} />
                {form.plate && <ReviewRow label="ทะเบียน" value={form.plate} />}
              </div>
              <div className="border-t border-dashed border-slate-200" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-800 mb-1">กำหนดการ</p>
                <ReviewRow label="เข้าจอด" value={`${fmtDate(form.checkinDate)} เวลา ${form.checkinHour}:${form.checkinMinute} น.`} />
                <ReviewRow label="รับรถ" value={`${fmtDate(form.checkoutDate)} เวลา ${form.checkoutHour}:${form.checkoutMinute} น.`} />
                <ReviewRow label="ระยะเวลา" value={priceResult.label} />
              </div>
              <div className="border-t border-dashed border-slate-200" />
              <div className="pt-2 pb-2">
                <Field label="โค้ดส่วนลด (Coupon Code)">
                  <Input
                    value={form.coupon}
                    onChange={(e: any) => handleChange("coupon", e.target.value.toUpperCase())}
                    placeholder="(ถ้ามี)"
                    className="uppercase bg-slate-50"
                  />
                  {discount > 0 && (
                    <p className="mt-1 text-xs font-bold text-emerald-600">✓ ส่วนลด ฿{fmt(discount)} บาท</p>
                  )}
                </Field>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-sky-700 p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-right">
                <p className="text-sky-200 text-xs leading-relaxed">
                  เมื่อกดยืนยัน ระบบจะแสดงใบเสร็จ<br />เพื่อใช้เป็นหลักฐานการจอง
                </p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-sky-200 text-sm font-medium">ยอดรวมโดยประมาณ</p>
                <p className="text-2xl font-black tracking-tight mt-1">{fmt(total)} บาท</p>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>หมายเหตุ:</strong> กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยัน<br />
              เมื่อยืนยันแล้ว ระบบจะส่งสลิปการจองเข้า LINE ของคุณโดยอัตโนมัติ
              <span className="block mt-1.5 text-[11px] text-amber-600 font-normal">
                Note: Please review your details before confirming. Once confirmed, your booking slip will be sent to your LINE automatically.
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <button
              onClick={() => { setStep(1); if (scrollToForm) scrollToForm(); }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:hover:bg-emerald-500"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" /> ยืนยันการจอง
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
