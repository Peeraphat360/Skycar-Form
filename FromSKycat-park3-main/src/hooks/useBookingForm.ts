import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { calcSkyPrice, SkyPriceResult } from "../constants/pricing";
import { DEFAULT_CAR_MASTER_DATA, GroupedCarData } from "../constants/cars";
import { ReceiptData } from "../components/ReceiptCard";
import { submitBooking } from "../api/bookings";
import {
  getCustomerProfile,
  lookupCustomerByPhone,
  postConsent,
  deleteMyData,
} from "../api/customer";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Constants & Types ────────────────────────────────────────────────────────
export interface BookingFormData {
  name: string;
  phone: string;
  phoneAlt: string;
  plate: string;
  type: string;
  brand: string;
  model: string;
  checkinDate: string;
  checkinHour: string;
  checkinMinute: string;
  checkoutDate: string;
  checkoutHour: string;
  checkoutMinute: string;
  coupon: string;
  specialNote: string;
}

// map vehicle_type (db value) → ชื่อประเภทไทยที่ฟอร์มใช้ (ตรงกับ routes/cars.ts)
const TYPE_DB_TO_THAI: Record<string, string> = {
  sedan: "รถเก๋ง (Sedan)",
  pickup: "รถกระบะ (Pickup)",
  suv: "รถ SUV",
  ev: "รถไฟฟ้า (EV)",
  supercar: "รถซุปเปอร์คาร์ (Supercar)",
};

// ค่าบริการรับส่งนอกเวลา (นอกเวลา 06:00–24:00 น. คือก่อน 06:00 น. → +50 ต่อเที่ยว)
export const OFF_HOURS_FEE = 50;

// COUPONS: รายการโค้ดส่วนลด (โค้ด → จำนวนเงินลด)
export const COUPONS: Record<string, number> = {
  PROMO50: 50,
  WELCOME100: 100,
  SAVE20: 20,
  SKY20: 20,
};

function getLocalTodayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function generateBookingId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randStr = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SKY-${dateStr}-${randStr}`;
}

function checkIsOffHours(hour: string, minute: string): boolean {
  const t = parseInt(hour || "0", 10) * 60 + parseInt(minute || "0", 10);
  return t < 6 * 60; // ก่อน 06:00 น.
}

// ── In-Memory Global Car Data Cache (Instant default from local master data) ──
let globalCarTree: Record<string, GroupedCarData> = DEFAULT_CAR_MASTER_DATA;
let globalCarTreePromise: Promise<Record<string, GroupedCarData> | null> | null = null;

async function fetchAllCarData(): Promise<Record<string, GroupedCarData> | null> {
  if (globalCarTreePromise) return globalCarTreePromise;

  globalCarTreePromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/cars`, {
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        globalCarTree = { ...DEFAULT_CAR_MASTER_DATA, ...json.data };
        return globalCarTree;
      }
      return null;
    } catch {
      return null;
    } finally {
      globalCarTreePromise = null;
    }
  })();

  return globalCarTreePromise;
}

// ─── Hook Definition ──────────────────────────────────────────────────────────
export function useBookingForm(
  addNotif: (title: string, message: string, type?: string) => void
) {
  // ── State ──
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // ── ข้อมูลรถยนต์ (Instant Local Master Tree) ──
  const [carTree, setCarTree] = useState<Record<string, GroupedCarData>>(globalCarTree);
  const [carTypes, setCarTypes] = useState<string[]>(() => Object.keys(globalCarTree));

  const today = useMemo(() => getLocalTodayString(), []);
  const initialType = useMemo(() => Object.keys(globalCarTree)[0] || "รถเก๋ง (Sedan)", []);

  const [form, setForm] = useState<BookingFormData>(() => ({
    name: "",
    phone: "",
    phoneAlt: "",
    plate: "",
    type: initialType,
    brand: "",
    model: "",
    checkinDate: today,
    checkinHour: "08",
    checkinMinute: "00",
    checkoutDate: today,
    checkoutHour: "08",
    checkoutMinute: "00",
    coupon: "",
    specialNote: "",
  }));

  // ── ซิงค์ข้อมูลรถยนต์ใหม่จาก API เบื้องหลัง (ไม่บล็อก UI) ──
  useEffect(() => {
    let active = true;
    fetchAllCarData()
      .then((tree) => {
        if (!active || !tree) return;
        setCarTree(tree);
        const types = Object.keys(tree);
        setCarTypes(types);
      })
      .catch(() => {
        // เงียบไว้เนื่องจากมี DEFAULT_CAR_MASTER_DATA สำรองอยู่แล้ว ไม่ทำให้ผู้ใช้สะดุด
      });

    return () => {
      active = false;
    };
  }, []);

  // Derived Instant Brands (0ms)
  const carBrands = useMemo(() => {
    if (!carTree || !form.type) return [];
    return carTree[form.type]?.brands || [];
  }, [carTree, form.type]);

  // Derived Instant Models (0ms)
  const carModels = useMemo(() => {
    if (!carTree || !form.type || !form.brand || form.brand === "อื่นๆ") return [];
    return carTree[form.type]?.models[form.brand] || [];
  }, [carTree, form.type, form.brand]);

  // ── จดจำลูกค้าเดิม: ดึงโปรไฟล์มา pre-fill + เช็ค consent PDPA ──
  const [consentRequired, setConsentRequired] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const prefillRef = useRef<{
    name: string;
    phone: string;
    phoneAlt: string;
    plate: string;
    type: string;
    brand: string;
    model: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await getCustomerProfile();
      if (!active || !profile) return;

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
      prefillRef.current = pf;

      setForm((f) => ({
        ...f,
        name: f.name || pf.name,
        phone: f.phone || pf.phone,
        phoneAlt: f.phoneAlt || pf.phoneAlt,
        plate: f.plate || pf.plate,
        type: f.type || pf.type || initialType,
        brand: f.brand || pf.brand,
        model: f.model || pf.model,
      }));

      if (pf.name || pf.plate) setPrefilled(true);
    })();

    return () => {
      active = false;
    };
  }, [initialType]);

  // ── จำลูกค้าเดิมจากเบอร์โทร (พร้อม In-Memory Cache) ──
  const [returningVisits, setReturningVisits] = useState<number | null>(null);
  const lastLookupRef = useRef<string>("");

  const checkReturningByPhone = useCallback(async (rawPhone: string) => {
    const digits = (rawPhone || "").replace(/\D/g, "");
    if (digits.length < 9) {
      setReturningVisits(null);
      return;
    }
    if (lastLookupRef.current === digits) return;
    lastLookupRef.current = digits;

    const r = await lookupCustomerByPhone(digits);
    if (!r.found || !r.prefill) {
      setReturningVisits(null);
      return;
    }
    setReturningVisits(r.visitCount ?? 0);

    const p = r.prefill;
    setForm((f) => {
      const noVehicleYet = !f.brand && !f.model;
      return {
        ...f,
        name: f.name || p.name || "",
        phoneAlt: f.phoneAlt || p.phone_alt || "",
        plate: f.plate || p.plate || "",
        type: noVehicleYet && p.vehicle_type ? (TYPE_DB_TO_THAI[p.vehicle_type] || f.type) : f.type,
        brand: noVehicleYet ? (p.car_brand || f.brand) : f.brand,
        model: noVehicleYet ? (p.car_model || f.model) : f.model,
      };
    });
    if (p.name || p.plate) setPrefilled(true);
  }, []);

  // ยอมรับ consent
  const acceptConsent = useCallback(async () => {
    const ok = await postConsent();
    if (ok) setConsentRequired(false);
    else addNotif("บันทึกความยินยอมไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง", "error");
  }, [addNotif]);

  // ลบข้อมูล PDPA
  const requestErasure = useCallback(async () => {
    const ok = await deleteMyData();
    if (ok) {
      window.location.href = "/login";
    } else {
      addNotif("ลบข้อมูลไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง", "error");
    }
  }, [addNotif]);

  // ── handleChange ──
  const handleChange = useCallback((field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "type") {
        next.brand = "";
        next.model = "";
      }
      if (field === "brand") {
        next.model = "";
      }
      return next;
    });
  }, []);

  // ── คำนวณเวลาและราคา (Memoized) ──
  const totalHours = useMemo(() => {
    const dIn = new Date(
      `${form.checkinDate}T${form.checkinHour.padStart(2, "0")}:${form.checkinMinute}:00`
    ).getTime();
    const dOut = new Date(
      `${form.checkoutDate}T${form.checkoutHour.padStart(2, "0")}:${form.checkoutMinute}:00`
    ).getTime();
    return Math.max(0, (dOut - dIn) / 3600000);
  }, [form.checkinDate, form.checkinHour, form.checkinMinute, form.checkoutDate, form.checkoutHour, form.checkoutMinute]);

  const priceResult: SkyPriceResult = useMemo(() => {
    const inDateObj = new Date(
      `${form.checkinDate}T${form.checkinHour.padStart(2, "0")}:${form.checkinMinute}:00`
    );
    const outDateObj = new Date(
      `${form.checkoutDate}T${form.checkoutHour.padStart(2, "0")}:${form.checkoutMinute}:00`
    );
    return calcSkyPrice(totalHours, inDateObj, outDateObj);
  }, [totalHours, form.checkinDate, form.checkinHour, form.checkinMinute, form.checkoutDate, form.checkoutHour, form.checkoutMinute]);

  const checkinOffHours = useMemo(
    () => checkIsOffHours(form.checkinHour, form.checkinMinute),
    [form.checkinHour, form.checkinMinute]
  );
  const checkoutOffHours = useMemo(
    () => checkIsOffHours(form.checkoutHour, form.checkoutMinute),
    [form.checkoutHour, form.checkoutMinute]
  );

  const offHoursSurcharge = useMemo(() => {
    return (checkinOffHours ? OFF_HOURS_FEE : 0) + (checkoutOffHours ? OFF_HOURS_FEE : 0);
  }, [checkinOffHours, checkoutOffHours]);

  // ── คูปองและส่วนลด ──
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");
  const [couponError, setCouponError] = useState<string>("");
  const discount = useMemo(() => COUPONS[appliedCoupon] ?? 0, [appliedCoupon]);
  const total = useMemo(
    () => Math.max(0, priceResult.price + offHoursSurcharge - discount),
    [priceResult.price, offHoursSurcharge, discount]
  );

  const applyCoupon = useCallback(() => {
    const code = form.coupon.trim().toUpperCase();
    if (!code) {
      setCouponError("กรุณาพิมพ์โค้ดส่วนลดก่อน");
      return;
    }
    if (COUPONS[code] !== undefined) {
      setAppliedCoupon(code);
      setCouponError("");
    } else {
      setAppliedCoupon("");
      setCouponError("โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว");
    }
  }, [form.coupon]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon("");
    setCouponError("");
    setForm((f) => ({ ...f, coupon: "" }));
  }, []);

  // ── Validation ──
  const validateStep1 = useCallback(() => {
    if (!form.name.trim()) {
      addNotif("กรุณากรอกชื่อ-นามสกุล", "ชื่อเป็นข้อมูลสำคัญสำหรับการจอง", "error");
      return false;
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 9) {
      addNotif("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง", "ต้องมีเลขอย่างน้อย 9 หลัก", "error");
      return false;
    }
    if (!form.brand) {
      addNotif("กรุณาเลือกยี่ห้อรถ", "เลือกประเภทรถก่อน จากนั้นเลือกยี่ห้อรถ", "error");
      return false;
    }
    if (!form.model) {
      addNotif("กรุณาเลือกรุ่นรถ", "เลือกยี่ห้อรถก่อน จากนั้นเลือกรุ่นรถ", "error");
      return false;
    }
    return true;
  }, [form.name, form.phone, form.brand, form.model, addNotif]);

  const validateStep2 = useCallback(() => {
    if (totalHours <= 0) {
      addNotif("วันที่/เวลาออกรถไม่ถูกต้อง", "วันที่ออกรถต้องมาหลังวันที่เข้าจอด", "error");
      return false;
    }
    return true;
  }, [totalHours, addNotif]);

  // ── Booking ID และ Receipt Data ──
  const bookingIdRef = useRef<string>(generateBookingId());

  const receiptData: ReceiptData = useMemo(() => ({
    bookingId: bookingIdRef.current,
    form,
    priceResult,
    discount,
    total,
    surcharge: offHoursSurcharge,
    surchargeIn: checkinOffHours ? OFF_HOURS_FEE : 0,
    surchargeOut: checkoutOffHours ? OFF_HOURS_FEE : 0,
  }), [form, priceResult, discount, total, offHoursSurcharge, checkinOffHours, checkoutOffHours]);

  // ── Submit ส่งข้อมูลไป Backend ──
  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || submitted) return;
    if (consentRequired) {
      addNotif("กรุณายอมรับความยินยอมก่อน", "ต้องยินยอมการเก็บข้อมูลส่วนบุคคลก่อนทำการจอง", "error");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const resp = await submitBooking({
        id: bookingIdRef.current,
        name: form.name,
        phone: form.phone,
        phone_alt: form.phoneAlt || null,
        plate: form.plate || null,
        car_type: form.type,
        car_brand: form.brand,
        car_model: form.model,
        checkin_date: form.checkinDate,
        checkin_hour: form.checkinHour,
        checkin_minute: form.checkinMinute,
        checkout_date: form.checkoutDate,
        checkout_hour: form.checkoutHour,
        checkout_minute: form.checkoutMinute,
        coupon: appliedCoupon || (form.coupon ? form.coupon.trim().toUpperCase() : null),
        discount: discount,
        price_label: priceResult.label,
        period: priceResult.type,
        total: total,
        status: "pending",
      });

      const isWaitlisted = !!(resp as any)?.waitlisted;
      setWaitlisted(isWaitlisted);
      setSubmitted(true);
      if (isWaitlisted) {
        addNotif("ตอนนี้โรงจอดเต็ม", "เราบันทึกคุณเข้าคิวรอแล้ว จะแจ้งทาง LINE อัตโนมัติเมื่อมีที่ว่าง", "info");
      } else {
        addNotif("บันทึกข้อมูลเรียบร้อยแล้ว", "กำลังสร้างใบเสร็จการจอง", "success");
      }
    } catch (error: any) {
      addNotif("เกิดข้อผิดพลาด", error.message || "ไม่สามารถส่งข้อมูลการจองได้", "error");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    submitted,
    consentRequired,
    form,
    appliedCoupon,
    discount,
    priceResult,
    total,
    addNotif,
  ]);

  // ── UI Helpers ──
  const formTopRef = useRef<HTMLDivElement>(null);
  const scrollToForm = useCallback(() => {
    if (formTopRef.current) {
      const y = formTopRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  const resetForm = useCallback(() => {
    setSubmitted(false);
    setWaitlisted(false);
    submittingRef.current = false;
    setIsSubmitting(false);
    setStep(1);
    const pf = prefillRef.current;
    setForm((f) => ({
      ...f,
      name: f.name || pf?.name || "",
      phone: f.phone || pf?.phone || "",
      phoneAlt: f.phoneAlt || pf?.phoneAlt || "",
      plate: f.plate || pf?.plate || "",
      type: f.type || pf?.type || initialType,
      brand: f.brand || pf?.brand || "",
      model: f.model || pf?.model || "",
      coupon: "",
      specialNote: "",
    }));
    setAppliedCoupon("");
    setCouponError("");
    bookingIdRef.current = generateBookingId();
  }, [initialType]);

  // ── Return ทุกอย่างรวมกัน ──
  return {
    step,
    setStep,
    form,
    handleChange,
    submitted,
    setSubmitted,
    waitlisted,
    isSubmitting,
    totalHours,
    priceResult,
    discount,
    total,
    offHoursSurcharge,
    checkinOffHours,
    checkoutOffHours,
    validateStep1,
    validateStep2,
    receiptData,
    formTopRef,
    scrollToForm,
    resetForm,
    handleSubmit,
    carTypes,
    carBrands,
    carModels,
    consentRequired,
    prefilled,
    acceptConsent,
    requestErasure,
    checkReturningByPhone,
    returningVisits,
    appliedCoupon,
    applyCoupon,
    couponError,
    removeCoupon,
  };
}

export type UseBookingFormReturn = ReturnType<typeof useBookingForm>;