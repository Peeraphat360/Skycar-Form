import { apiFetch, API_URL } from "./client";

// รถที่บันทึกไว้ของลูกค้า (ตรงกับ public.vehicles)
export interface SavedVehicle {
  id: string;
  plate_number: string;
  car_brand: string | null;
  car_model: string | null;
  vehicle_type: string | null; // db value: sedan|pickup|suv|ev|supercar
  color: string | null;
  is_default: boolean;
}

// ค่าที่พร้อมเอาไป pre-fill ฟอร์ม (backend คำนวณให้แล้ว)
export interface CustomerPrefill {
  name: string;
  phone: string;
  phone_alt: string;
  plate: string;
  car_brand: string;
  car_model: string;
  vehicle_type: string; // db value
  color: string;
}

export interface CustomerProfile {
  user: { id: string; displayName: string; consentPdpa: boolean; consentAt: string | null };
  vehicles: SavedVehicle[];
  prefill: CustomerPrefill;
}

// GET /api/customer/profile — ข้อมูลจดจำลูกค้าเดิม (ต้อง login)
// ใช้ raw fetch แทน apiFetch โดยตั้งใจ: นี่คือการดึงข้อมูลแบบ passive เพื่อ pre-fill
// ถ้า 401/พลาด ให้ "ข้ามการ pre-fill" เฉยๆ — ห้าม dispatch UNAUTHORIZED_EVENT ไป
// logout/redirect ผู้ใช้ (กัน loop redirect บนเบราว์เซอร์ที่ cookie ไม่ติดทันที)
let profilePromise: Promise<CustomerProfile | null> | null = null;
let cachedProfile: { data: CustomerProfile | null; timestamp: number } | null = null;
const PROFILE_CACHE_TTL = 30000; // 30 seconds

export async function getCustomerProfile(forceRefresh = false): Promise<CustomerProfile | null> {
  const now = Date.now();
  if (!forceRefresh && cachedProfile && now - cachedProfile.timestamp < PROFILE_CACHE_TTL) {
    return cachedProfile.data;
  }

  if (profilePromise) return profilePromise;

  profilePromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/customer/profile`, {
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        cachedProfile = { data: null, timestamp: Date.now() };
        return null;
      }
      const data = (await res.json()) as CustomerProfile;
      cachedProfile = { data, timestamp: Date.now() };
      return data;
    } catch {
      return null;
    } finally {
      profilePromise = null;
    }
  })();

  return profilePromise;
}

// ผลลัพธ์การค้นลูกค้าเดิมด้วยเบอร์ (จำแนกใหม่/เก่า + pre-fill จากประวัติ)
export interface CustomerLookup {
  found: boolean;
  visitCount?: number;
  prefill?: CustomerPrefill & { province?: string };
  plates?: string[];
}

// ── In-Memory Memoization & Request Deduplication Cache ──
const phoneLookupCache = new Map<string, { data: CustomerLookup; timestamp: number }>();
const inFlightLookups = new Map<string, Promise<CustomerLookup>>();
const LOOKUP_CACHE_TTL = 60000; // 1 minute

// GET /api/customer/lookup?phone= — พอลูกค้ากรอกเบอร์ครบ เช็กว่าเคยมาไหม
export async function lookupCustomerByPhone(phone: string): Promise<CustomerLookup> {
  const cleanPhone = (phone || "").replace(/\D/g, "");
  if (cleanPhone.length < 9) return { found: false };

  // 1. Check local cache
  const cached = phoneLookupCache.get(cleanPhone);
  if (cached && Date.now() - cached.timestamp < LOOKUP_CACHE_TTL) {
    return cached.data;
  }

  // 2. Deduplicate in-flight requests for the same phone number
  const inFlight = inFlightLookups.get(cleanPhone);
  if (inFlight) return inFlight;

  const fetchPromise = (async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/customer/lookup?phone=${encodeURIComponent(cleanPhone)}`,
        {
          credentials: "include",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        const notFound: CustomerLookup = { found: false };
        phoneLookupCache.set(cleanPhone, { data: notFound, timestamp: Date.now() });
        return notFound;
      }
      const data = (await res.json()) as CustomerLookup;
      phoneLookupCache.set(cleanPhone, { data, timestamp: Date.now() });
      return data;
    } catch {
      return { found: false };
    } finally {
      inFlightLookups.delete(cleanPhone);
    }
  })();

  inFlightLookups.set(cleanPhone, fetchPromise);
  return fetchPromise;
}

// POST /api/customer/consent — บันทึก consent PDPA
export async function postConsent(): Promise<boolean> {
  try {
    await apiFetch("/api/customer/consent", { method: "POST" });
    if (cachedProfile?.data) {
      cachedProfile.data.user.consentPdpa = true;
    }
    return true;
  } catch {
    return false;
  }
}

// DELETE /api/customer/me — PDPA right-to-erasure (ลบข้อมูลส่วนบุคคล + logout)
export async function deleteMyData(): Promise<boolean> {
  try {
    await apiFetch("/api/customer/me", { method: "DELETE" });
    cachedProfile = null;
    phoneLookupCache.clear();
    return true;
  } catch {
    return false;
  }
}
