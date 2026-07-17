import { useState, useRef, useEffect } from "react";
import { calcSkyPrice } from "../constants/pricing";
import { ReceiptData } from "../components/ReceiptCard";
import { submitBooking } from "../api/bookings";
import { getCustomerProfile, lookupCustomerByPhone, postConsent, deleteMyData } from "../api/customer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// map vehicle_type (db value) → ชื่อประเภทไทยที่ฟอร์มใช้ (ตรงกับ routes/cars.ts)
const TYPE_DB_TO_THAI: Record<string, string> = {
  sedan: "รถเก๋ง (Sedan)",
  pickup: "รถกระบะ (Pickup)",
  suv: "รถ SUV",
  ev: "รถไฟฟ้า (EV)",
  supercar: "รถซุปเปอร์คาร์ (Supercar)",
};

export function useBookingForm(addNotif: (title: string, message: string, type?: string) => void) {

  // ── State ──
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);       // true = ตอนจองช่องเต็ม → เข้าคิวรอ (ยังไม่มีที่จอด)
  const [isSubmitting, setIsSubmitting] = useState(false);   // กันกดยืนยันซ้ำ (ใช้คุม UI)
  const submittingRef = useRef(false);                       // กันกดรัวๆ ใน frame เดียว (sync)

  // ── ข้อมูลรถจาก API ──
  const [carTypes, setCarTypes]   = useState<string[]>([]);
  const [carBrands, setCarBrands] = useState<string[]>([]);
  const [carModels, setCarModels] = useState<string[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    name: "", phone: "", phoneAlt: "", plate: "",
    type: "", brand: "", model: "",
    checkinDate: today, checkinHour: "08", checkinMinute: "00",
    checkoutDate: today, checkoutHour: "08", checkoutMinute: "00",
    coupon: "", specialNote: "",
  });

  // ── โหลดประเภทรถตอนเริ่ม ──
  useEffect(() => {
    fetch(`${API_URL}/api/cars/types`)
      .then(r => r.json())
      .then(res => {
        setCarTypes(res.data || []);
        // ตั้ง default เฉพาะตอนยังว่าง — กันทับค่าที่ prefill จากโปรไฟล์ลูกค้าเดิม
        if (res.data?.length) setForm(f => ({ ...f, type: f.type || res.data[0] }));
      })
      .catch(() => addNotif("โหลดข้อมูลรถไม่ได้", "ไม่สามารถเชื่อมต่อ API", "error"));
  }, []);

  // ── จดจำลูกค้าเดิม: ดึงโปรไฟล์มา pre-fill + เช็ค consent PDPA (หน้า /book login แล้วเสมอ) ──
  const [consentRequired, setConsentRequired] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  // เก็บค่าที่ใช้ pre-fill ไว้ (รูปแบบพร้อมใส่ฟอร์ม) เพื่อนำกลับมาใช้ตอนกด "จองใหม่"
  const prefillRef = useRef<{
    name: string; phone: string; phoneAlt: string; plate: string;
    type: string; brand: string; model: string;
  } | null>(null);
  useEffect(() => {
    (async () => {
      const profile = await getCustomerProfile();
      if (!profile) return;
      setConsentRequired(!profile.user.consentPdpa);
      const p = profile.prefill;
      const pf = {
        name: p.name || "",
        phone: p.phone || "",
        phoneAlt: p.phone_alt || "",
        plate: p.plate || "",
        type: TYPE_DB_TO_THAI[p.vehicle_type] || "",
        brand: p.car_brand || "",
        model: p.car_model || "",
      };
      prefillRef.current = pf; // เก็บไว้ใช้ตอน resetForm (กด "จองใหม่")
      // เติมเฉพาะช่องที่ยังว่าง — ไม่ทับสิ่งที่ผู้ใช้เริ่มพิมพ์ไปแล้ว
      setForm(f => ({
        ...f,
        name:     f.name     || pf.name,
        phone:    f.phone    || pf.phone,
        phoneAlt: f.phoneAlt || pf.phoneAlt,
        plate:    f.plate    || pf.plate,
        type:     f.type     || pf.type,
        brand:    f.brand    || pf.brand,
        model:    f.model    || pf.model,
      }));
      if (pf.name || pf.plate) setPrefilled(true);
    })();
  }, []);

  // ── จำลูกค้าเดิมจาก "เบอร์โทร" — พอกรอกเบอร์ครบ เช็กประวัติ (รองรับลูกค้าเก่าที่
  //    เพิ่ง login LINE ครั้งแรก: ข้อมูลเดิมเป็น walk-in ไม่มี LINE → /profile หาไม่เจอ) ──
  const [returningVisits, setReturningVisits] = useState<number | null>(null); // null=ยังไม่รู้/ลูกค้าใหม่
  const lastLookupRef = useRef<string>("");
  const checkReturningByPhone = async (rawPhone: string) => {
    const digits = (rawPhone || "").replace(/\D/g, "");
    if (digits.length < 9) { setReturningVisits(null); return; }
    if (lastLookupRef.current === digits) return;   // กันยิงซ้ำเบอร์เดิม
    lastLookupRef.current = digits;

    const r = await lookupCustomerByPhone(digits);
    if (!r.found || !r.prefill) { setReturningVisits(null); return; }
    setReturningVisits(r.visitCount ?? 0);

    const p = r.prefill;
    setForm(f => {
      // เติมรถให้ก็ต่อเมื่อผู้ใช้ยังไม่เริ่มเลือกยี่ห้อ/รุ่นเอง (default brand/model = "")
      const noVehicleYet = !f.brand && !f.model;
      return {
        ...f,
        name:     f.name     || p.name || "",
        phoneAlt: f.phoneAlt || p.phone_alt || "",
        plate:    f.plate    || p.plate || "",
        type:     noVehicleYet && p.vehicle_type ? (TYPE_DB_TO_THAI[p.vehicle_type] || f.type) : f.type,
        brand:    noVehicleYet ? (p.car_brand || f.brand) : f.brand,
        model:    noVehicleYet ? (p.car_model || f.model) : f.model,
      };
    });
    if (!prefilled && (p.name || p.plate)) setPrefilled(true);
  };

  // ยอมรับ consent → บันทึกหลักฐานที่ backend
  const acceptConsent = async () => {
    const ok = await postConsent();
    if (ok) setConsentRequired(false);
    else addNotif("บันทึกความยินยอมไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง", "error");
  };

  // PDPA: ขอลบข้อมูลส่วนบุคคล → backend ลบ/ปกปิด แล้ว logout → กลับหน้า login
  const requestErasure = async () => {
    const ok = await deleteMyData();
    if (ok) {
      window.location.href = "/login";
    } else {
      addNotif("ลบข้อมูลไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง", "error");
    }
  };

  // ── โหลดยี่ห้อเมื่อเปลี่ยนประเภท ──
  useEffect(() => {
    if (!form.type) return;
    fetch(`${API_URL}/api/cars/brands?type=${encodeURIComponent(form.type)}`)
      .then(r => r.json())
      .then(res => setCarBrands(res.data || []));
  }, [form.type]);

  // ── โหลดรุ่นเมื่อเปลี่ยนยี่ห้อ ──
  useEffect(() => {
    if (!form.type || !form.brand || form.brand === "อื่นๆ") {
      setCarModels([]);
      return;
    }
    fetch(`${API_URL}/api/cars/models?type=${encodeURIComponent(form.type)}&brand=${encodeURIComponent(form.brand)}`)
      .then(r => r.json())
      .then(res => setCarModels(res.data || []));
  }, [form.type, form.brand]);

  // ── handleChange ──
  const handleChange = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "type")  { next.brand = ""; next.model = ""; }
      if (field === "brand") { next.model = ""; }
      return next;
    });
  };

  // ── คำนวณเวลาและราคา ──
  const getTotalHours = (): number => {
    const dIn  = new Date(`${form.checkinDate}T${form.checkinHour.padStart(2,"0")}:${form.checkinMinute}:00`).getTime();
    const dOut = new Date(`${form.checkoutDate}T${form.checkoutHour.padStart(2,"0")}:${form.checkoutMinute}:00`).getTime();
    return Math.max(0, (dOut - dIn) / 3600000);
  };

  const totalHours = getTotalHours();
  const inDateObj  = new Date(`${form.checkinDate}T${form.checkinHour.padStart(2,"0")}:${form.checkinMinute}:00`);
  const outDateObj = new Date(`${form.checkoutDate}T${form.checkoutHour.padStart(2,"0")}:${form.checkoutMinute}:00`);
  const priceResult = calcSkyPrice(totalHours, inDateObj, outDateObj);

  // ── ค่าบริการรับส่งนอกเวลา (ก่อน 08:00 หรือหลัง 21:00 → +50 ต่อเที่ยว) ──
  const OFF_HOURS_FEE = 50;
  const isOffHours = (hour: string, minute: string): boolean => {
    const t = parseInt(hour || "0", 10) * 60 + parseInt(minute || "0", 10);
    return t < 8 * 60 || t > 21 * 60;          // ก่อน 08:00 หรือ หลัง 21:00
  };
  const checkinOffHours  = isOffHours(form.checkinHour, form.checkinMinute);
  const checkoutOffHours = isOffHours(form.checkoutHour, form.checkoutMinute);
  const offHoursSurcharge =
    (checkinOffHours ? OFF_HOURS_FEE : 0) + (checkoutOffHours ? OFF_HOURS_FEE : 0);

  // ── คูปองและส่วนลด ──
  const COUPONS: Record<string, number> = { PROMO50: 50, WELCOME100: 100, SAVE20: 20 };
  const discount = COUPONS[form.coupon] ?? 0;
  const total    = Math.max(0, priceResult.price + offHoursSurcharge - discount);

  // ── Validation ──
  const validateStep1 = () => {
    if (!form.name.trim())  { addNotif("กรุณากรอกชื่อ-นามสกุล", "ชื่อเป็นข้อมูลสำคัญสำหรับการจอง", "error"); return false; }
    if (!form.phone.trim() || form.phone.replace(/\D/g,"").length < 9) { addNotif("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง", "ต้องมีเลขอย่างน้อย 9 หลัก", "error"); return false; }
    if (!form.brand) { addNotif("กรุณาเลือกยี่ห้อรถ", "เลือกประเภทรถก่อน จากนั้นเลือกยี่ห้อรถ", "error"); return false; }
    if (!form.model) { addNotif("กรุณาเลือกรุ่นรถ", "เลือกยี่ห้อรถก่อน จากนั้นเลือกรุ่นรถ", "error"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (totalHours <= 0) { addNotif("วันที่/เวลาออกรถไม่ถูกต้อง", "วันที่ออกรถต้องมาหลังวันที่เข้าจอด", "error"); return false; }
    return true;
  };

  // ── Booking ID และ Receipt ──
  const bookingIdRef = useRef(`SKY-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);

  const receiptData: ReceiptData = {
    bookingId: bookingIdRef.current,
    form, priceResult, discount, total,
    surcharge: offHoursSurcharge,
    surchargeIn: checkinOffHours ? OFF_HOURS_FEE : 0,
    surchargeOut: checkoutOffHours ? OFF_HOURS_FEE : 0,
  };

  // ── Submit ส่งข้อมูลไป Backend ──
  const handleSubmit = async () => {
    if (submittingRef.current || submitted) return;   // กันกดซ้ำ (sync — กันกดรัวๆ)
    if (consentRequired) {                            // ต้องยอมรับ PDPA ก่อนเก็บข้อมูล
      addNotif("กรุณายอมรับความยินยอมก่อน", "ต้องยินยอมการเก็บข้อมูลส่วนบุคคลก่อนทำการจอง", "error");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const resp = await submitBooking({
        id:            bookingIdRef.current,
        name:          form.name,
        phone:         form.phone,
        phone_alt:     form.phoneAlt || null,
        plate:         form.plate || null,
        car_type:      form.type,
        car_brand:     form.brand,
        car_model:     form.model,
        checkin_date:  form.checkinDate,
        checkin_hour:  form.checkinHour,
        checkin_minute: form.checkinMinute,
        checkout_date: form.checkoutDate,
        checkout_hour: form.checkoutHour,
        checkout_minute: form.checkoutMinute,
        coupon:        form.coupon || null,
        discount:      discount,
        price_label:   priceResult.label,
        period:        priceResult.type,
        total:         total,
        status:        "pending",
      });
      // backend คืน waitlisted=true เมื่อช่องเต็ม (booking ถูกเก็บเป็นรายการรอคิว)
      const isWaitlisted = !!(resp as any)?.waitlisted;
      setWaitlisted(isWaitlisted);
      setSubmitted(true);   // ไปหน้าผลลัพธ์ — คง isSubmitting ไว้กันกดซ้ำ
      if (isWaitlisted) {
        addNotif("ตอนนี้โรงจอดเต็ม", "เราบันทึกคุณเข้าคิวรอแล้ว จะแจ้งทาง LINE อัตโนมัติเมื่อมีที่ว่าง", "info");
      } else {
        addNotif("บันทึกข้อมูลเรียบร้อยแล้ว", "กำลังสร้างใบเสร็จการจอง", "success");
      }
    } catch (error: any) {
      addNotif("เกิดข้อผิดพลาด", error.message, "error");
      submittingRef.current = false;
      setIsSubmitting(false);   // ส่งไม่สำเร็จ → ให้กดใหม่ได้
    }
  };

  // ── UI Helpers ──
  const formTopRef = useRef<HTMLDivElement>(null);
  const scrollToForm = () => {
    if (formTopRef.current) {
      const y = formTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setWaitlisted(false);
    submittingRef.current = false;
    setIsSubmitting(false);
    setStep(1);
    // กด "จองใหม่" → คงข้อมูลลูกค้า/รถที่เพิ่งกรอกไว้ (เหมือนเดิม) ให้จองซ้ำได้สะดวก
    // ถ้าช่องไหนว่าง ค่อย fallback ไปค่าที่ prefill ไว้ตอนแรก; ล้างเฉพาะคูปอง/หมายเหตุ
    const pf = prefillRef.current;
    setForm(f => ({
      ...f,
      name:     f.name     || pf?.name     || "",
      phone:    f.phone    || pf?.phone    || "",
      phoneAlt: f.phoneAlt || pf?.phoneAlt || "",
      plate:    f.plate    || pf?.plate    || "",
      type:     f.type     || pf?.type     || "",
      brand:    f.brand    || pf?.brand    || "",
      model:    f.model    || pf?.model    || "",
      coupon: "",
      specialNote: "",
    }));
    bookingIdRef.current = `SKY-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  };

  // ── Return ทุกอย่างรวมกัน ──
  return {
    step, setStep, form, handleChange, submitted, setSubmitted, waitlisted, isSubmitting,
    totalHours, priceResult, discount, total, offHoursSurcharge,
    checkinOffHours, checkoutOffHours,
    validateStep1, validateStep2, receiptData,
    formTopRef, scrollToForm, resetForm,
    handleSubmit,
    carTypes, carBrands, carModels,
    consentRequired, prefilled, acceptConsent, requestErasure,
    checkReturningByPhone, returningVisits,
  };
}