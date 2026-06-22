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
export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  try {
    const res = await fetch(`${API_URL}/api/customer/profile`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null; // ลูกค้าใหม่ / session ยังไม่พร้อม → ไม่ pre-fill (ไม่ logout)
    return (await res.json()) as CustomerProfile;
  } catch {
    return null;
  }
}

// POST /api/customer/consent — บันทึก consent PDPA
export async function postConsent(): Promise<boolean> {
  try {
    await apiFetch("/api/customer/consent", { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

// DELETE /api/customer/me — PDPA right-to-erasure (ลบข้อมูลส่วนบุคคล + logout)
export async function deleteMyData(): Promise<boolean> {
  try {
    await apiFetch("/api/customer/me", { method: "DELETE" });
    return true;
  } catch {
    return false;
  }
}
