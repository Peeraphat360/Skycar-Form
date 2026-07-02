import { Router, Request, Response } from "express";
import { supabase } from "../db";
import { requireAuth } from "../middleware/auth";
import { parseBody, vehicleUpsertSchema } from "../lib/validate";
import type { AuthUser } from "../types/auth";

const router = Router();

// ทุก endpoint ในไฟล์นี้ต้อง login ก่อน — และ "ตัวตน" มาจาก session (req.user.id)
// เท่านั้น ไม่เคยอ่าน user_id/line_user_id จาก body หรือ query (กัน IDOR)
router.use(requireAuth);

function uid(req: Request): string {
  return (req.user as AuthUser).id;
}

// normalize เบอร์ให้เทียบกันได้: ตัดอักขระไม่ใช่ตัวเลข, แปลง +66/66 นำหน้า → 0
function normalizePhone(raw: string): string {
  let p = (raw || "").trim().replace(/[^\d+]/g, "");
  p = p.replace(/^\+?66/, "0"); // +66xxxxxxxxx / 66xxxxxxxxx → 0xxxxxxxxx
  return p.replace(/\D/g, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/profile — ข้อมูลสำหรับ pre-fill ฟอร์มจอง
//   { user: {…, consent}, vehicles: [...], lastBooking: {…} }
//   vehicles เรียงรถ default ก่อน; lastBooking ไว้ fallback ตอนยังไม่มี vehicles
// ─────────────────────────────────────────────────────────────────────────────
router.get("/profile", async (req: Request, res: Response) => {
  const userId = uid(req);

  const [{ data: user, error: uErr }, { data: vehicles, error: vErr }, { data: lastBooking }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, display_name, consent_pdpa, consent_at")
        .eq("id", userId)
        .single(),
      supabase
        .from("vehicles")
        .select("id, plate_number, car_brand, car_model, vehicle_type, color, is_default")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("customer_name, customer_phone, customer_alt_phone, vehicle_plate, vehicle_brand, vehicle_model, vehicle_type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (uErr || !user) {
    return res.status(404).json({ success: false, error: "Customer not found" });
  }
  if (vErr) {
    return res.status(500).json({ success: false, error: "Failed to load vehicles" });
  }

  // prefill ที่พร้อมใช้: ถ้ามีรถ default ใช้รถนั้น; ไม่งั้น fallback จาก booking ล่าสุด
  const defaultVehicle = (vehicles ?? []).find((v) => v.is_default) ?? (vehicles ?? [])[0] ?? null;
  const prefill = {
    name: lastBooking?.customer_name ?? user.display_name ?? "",
    phone: lastBooking?.customer_phone ?? "",
    phone_alt: lastBooking?.customer_alt_phone ?? "",
    plate: defaultVehicle?.plate_number ?? lastBooking?.vehicle_plate ?? "",
    car_brand: defaultVehicle?.car_brand ?? lastBooking?.vehicle_brand ?? "",
    car_model: defaultVehicle?.car_model ?? lastBooking?.vehicle_model ?? "",
    vehicle_type: defaultVehicle?.vehicle_type ?? lastBooking?.vehicle_type ?? "",
    color: defaultVehicle?.color ?? "",
  };

  res.json({
    success: true,
    user: {
      id: user.id,
      displayName: user.display_name,
      consentPdpa: user.consent_pdpa,
      consentAt: user.consent_at,
    },
    vehicles: vehicles ?? [],
    prefill,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/lookup?phone= — จำลูกค้าเดิมจาก "เบอร์โทร" (สะพานเชื่อมข้อมูลเก่า
//   ที่เป็น walk-in/logbook — ไม่มี LINE — กับลูกค้าที่เพิ่ง login LINE ครั้งแรก)
//   เบอร์เป็นตัวตนหลัก: unique ต่อคน + ลูกค้าให้ทุกครั้งที่จอง (ทะเบียน/รุ่นเปลี่ยนได้)
//   ต้อง login ก่อน (requireAuth ครอบทั้งไฟล์); คืนเฉพาะข้อมูลเท่าที่ pre-fill ต้องใช้
// ─────────────────────────────────────────────────────────────────────────────
router.get("/lookup", async (req: Request, res: Response) => {
  const phone = normalizePhone(String(req.query.phone ?? ""));
  if (phone.length < 9) return res.json({ success: true, found: false });

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "customer_name, customer_phone, customer_alt_phone, vehicle_plate, vehicle_province, vehicle_brand, vehicle_model, vehicle_type, start_time, status",
    )
    .or(`customer_phone.eq.${phone},customer_alt_phone.eq.${phone}`)
    .order("start_time", { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ success: false, error: "Lookup failed" });
  const rows = data ?? [];
  if (rows.length === 0) return res.json({ success: true, found: false });

  const last = rows[0];
  // จำนวนครั้งที่ใช้บริการ = booking ที่ไม่ถูกยกเลิก
  const visitCount = rows.filter((r) => r.status !== "CANCELLED").length;
  const plates = [...new Set(rows.map((r) => r.vehicle_plate).filter(Boolean))].slice(0, 5);

  res.json({
    success: true,
    found: true,
    visitCount,
    prefill: {
      name: last.customer_name ?? "",
      phone: last.customer_phone ?? phone,
      phone_alt: last.customer_alt_phone ?? "",
      plate: last.vehicle_plate ?? "",
      province: last.vehicle_province ?? "",
      car_brand: last.vehicle_brand ?? "",
      car_model: last.vehicle_model ?? "",
      vehicle_type: last.vehicle_type ?? "",
      color: "",
    },
    plates,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/customer/consent — บันทึก consent PDPA (เก็บหลักฐานเวลา)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/consent", async (req: Request, res: Response) => {
  const userId = uid(req);
  const { error } = await supabase
    .from("users")
    .update({ consent_pdpa: true, consent_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return res.status(500).json({ success: false, error: "Failed to save consent" });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customer/vehicles — รถของฉัน
// ─────────────────────────────────────────────────────────────────────────────
router.get("/vehicles", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, plate_number, car_brand, car_model, vehicle_type, color, is_default")
    .eq("user_id", uid(req))
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: "Failed to load vehicles" });
  res.json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/customer/vehicles — เพิ่ม/อัปเดตรถ (upsert ตาม user_id+plate ของฉัน)
//   user_id ผูกจาก session เสมอ — ปฏิเสธค่า user_id ใดๆ ที่ส่งมาใน body
// ─────────────────────────────────────────────────────────────────────────────
router.post("/vehicles", async (req: Request, res: Response) => {
  const body = parseBody(vehicleUpsertSchema, req, res);
  if (!body) return;
  const userId = uid(req);

  // ถ้าตั้งคันนี้เป็น default → ปลด default คันอื่นก่อน (กันชน partial-unique index)
  if (body.is_default) {
    await supabase.from("vehicles").update({ is_default: false }).eq("user_id", userId);
  } else {
    // ถ้ายังไม่มีรถเลย คันแรกตั้งเป็น default ให้อัตโนมัติ
    const { count } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (!count) body.is_default = true;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .upsert(
      { ...body, user_id: userId },
      { onConflict: "user_id,plate_number" },
    )
    .select("id, plate_number, car_brand, car_model, vehicle_type, color, is_default")
    .single();

  if (error) return res.status(500).json({ success: false, error: "Failed to save vehicle" });
  res.status(201).json({ success: true, data });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/customer/vehicles/:id — ลบรถของฉัน (ownership: user_id = session)
//   ใส่ .eq('user_id', …) ในตัว query → คนอื่นลบรถเราไม่ได้ แม้รู้ id (กัน IDOR)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/vehicles/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", uid(req))
    .select("id");
  if (error) return res.status(500).json({ success: false, error: "Failed to delete vehicle" });
  if (!data || data.length === 0) {
    return res.status(404).json({ success: false, error: "Vehicle not found" });
  }
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/customer/me — PDPA right-to-erasure
//   ลบ "ตัวตน + ข้อมูลส่วนบุคคล" ของลูกค้า แต่คงแถวการจอง (เชิงธุรกรรม/บัญชี) ไว้
//   แบบไม่ระบุตัวตน:
//     • ลบ vehicles ทั้งหมด (FK → bookings.vehicle_id ถูกตั้ง NULL อัตโนมัติ)
//     • ลบ PII บน bookings ของลูกค้า (ชื่อ/เบอร์) → placeholder
//     • anonymize แถว users: ตัด line_user_id (เพื่อ login ครั้งหน้าจะไม่ผูกคนเดิม),
//       ชื่อ/รูป/อีเมล, รีเซ็ต consent
//   จากนั้น logout เคลียร์ session ทันที
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/me", async (req: Request, res: Response) => {
  const userId = uid(req);

  const { error: vErr } = await supabase.from("vehicles").delete().eq("user_id", userId);
  if (vErr) return res.status(500).json({ success: false, error: "Erasure failed (vehicles)" });

  const { error: bErr } = await supabase
    .from("bookings")
    .update({
      customer_name: "ลบข้อมูลแล้ว",
      customer_phone: null,
      customer_alt_phone: null,
    })
    .eq("user_id", userId);
  if (bErr) return res.status(500).json({ success: false, error: "Erasure failed (bookings)" });

  const { error: uErr } = await supabase
    .from("users")
    .update({
      line_user_id: null,
      display_name: "ผู้ใช้ที่ลบข้อมูล",
      name: "ผู้ใช้ที่ลบข้อมูล",
      picture_url: null,
      email: null,
      consent_pdpa: false,
      consent_at: null,
    })
    .eq("id", userId);
  if (uErr) return res.status(500).json({ success: false, error: "Erasure failed (profile)" });

  // เคลียร์ session — best effort
  req.logout(() => {
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("skycar.sid");
        res.json({ success: true, message: "ลบข้อมูลส่วนบุคคลเรียบร้อย" });
      });
    } else {
      res.clearCookie("skycar.sid");
      res.json({ success: true, message: "ลบข้อมูลส่วนบุคคลเรียบร้อย" });
    }
  });
});

export default router;
