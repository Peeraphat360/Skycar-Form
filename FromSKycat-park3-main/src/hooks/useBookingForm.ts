import { useState, useRef, useEffect } from "react";
import { calcSkyPrice } from "../constants/pricing";
import { ReceiptData } from "../components/ReceiptCard";
import { submitBooking } from "../api/bookings";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useBookingForm(addNotif: (title: string, message: string, type?: string) => void) {

  // ── State ──
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
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
        if (res.data?.length) setForm(f => ({ ...f, type: res.data[0] }));
      })
      .catch(() => addNotif("โหลดข้อมูลรถไม่ได้", "ไม่สามารถเชื่อมต่อ API", "error"));
  }, []);

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
  };

  // ── Submit ส่งข้อมูลไป Backend ──
  const handleSubmit = async () => {
    if (submittingRef.current || submitted) return;   // กันกดซ้ำ (sync — กันกดรัวๆ)
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await submitBooking({
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
      setSubmitted(true);   // ไปหน้าใบเสร็จ — คง isSubmitting ไว้กันกดซ้ำ
      addNotif("บันทึกข้อมูลเรียบร้อยแล้ว", "กำลังสร้างใบเสร็จการจอง", "success");
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
    submittingRef.current = false;
    setIsSubmitting(false);
    setStep(1);
    setForm(f => ({ ...f, name: "", phone: "", phoneAlt: "", plate: "", coupon: "", specialNote: "" }));
    bookingIdRef.current = `SKY-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  };

  // ── Return ทุกอย่างรวมกัน ──
  return {
    step, setStep, form, handleChange, submitted, setSubmitted, isSubmitting,
    totalHours, priceResult, discount, total, offHoursSurcharge,
    validateStep1, validateStep2, receiptData,
    formTopRef, scrollToForm, resetForm,
    handleSubmit,
    carTypes, carBrands, carModels,
  };
}