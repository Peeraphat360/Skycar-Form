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
    formTopRef, scrollToForm,
    carTypes, carBrands, carModels,  // ← ข้อมูลรถจาก API
  } = booking;

  const today = new Date().toISOString().split("T")[0];

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
          <SectionCard icon={<Calendar className="w-5 h-5" />} title="วันและเวลาจอดรถ (Parking Schedule)" subtitle="กรุณาระบุวันเวลาเข้าจอดและรับรถ เปิดบริการ 08:00–21:00 น.">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-600 shadow-sm shadow-sky-600/40" />
                    วันที่เข้าจอด <span className="text-slate-400">(CHECK-IN)</span><span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.checkinDate}
                    min={today}
                    onChange={(e: any) => handleChange("checkinDate", e.target.value)}
                    aria-label="วันที่เข้าจอด"
                    className="h-16 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-900 shadow-sm outline-none transition-all scheme-light focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/15 hover:border-slate-300"
                  />
                  <div className="flex min-h-12 items-center gap-3 rounded-xl border-l-8 border-sky-600 bg-slate-900 px-4 py-3 text-white shadow-sm">
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
                  <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> พิมพ์หรือกดลูกศรเพื่อเปลี่ยนชั่วโมง (08–21)
                  </p>
                </Field>
              </div>
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
                    วันที่รับรถ <span className="text-slate-400">(CHECK-OUT)</span><span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.checkoutDate}
                    min={form.checkinDate}
                    onChange={(e: any) => handleChange("checkoutDate", e.target.value)}
                    aria-label="วันที่รับรถ"
                    className="h-16 w-full cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-bold text-slate-900 shadow-sm outline-none transition-all scheme-light focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 hover:border-slate-300"
                  />
                  <div className="flex min-h-12 items-center gap-3 rounded-xl border-l-8 border-emerald-500 bg-slate-900 px-4 py-3 text-white shadow-sm">
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
                  <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> แนะนำ 21:00 น. หรือตามเวลาเครื่องลง
                  </p>
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
              <div>
                <p className="text-sky-200 text-sm font-medium">ยอดรวมโดยประมาณ</p>
                <p className="text-2xl font-black tracking-tight mt-1">฿{fmt(total)}</p>
              </div>
            </div>
          </SectionCard>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>หมายเหตุ:</strong> กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดยืนยัน<br />
              เมื่อยืนยันแล้ว คุณสามารถดาวน์โหลดใบเสร็จเพื่อนำไปส่งให้เจ้าหน้าที่ในภายหลังได้
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
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              <Check className="w-5 h-5" /> ยืนยันการจอง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
