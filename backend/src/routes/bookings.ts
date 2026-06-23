import { Router, Request, Response } from "express";
import { supabase } from "../db";
import { requireAuth } from "../middleware/auth";
import { parseBody, bookingCreateSchema, bookingStatusSchema } from "../lib/validate";
import { computeBookingTotal } from "../lib/pricing";
import type { AuthUser } from "../types/auth";

const router = Router();

// ── GET /api/bookings ── เฉพาะการจองของลูกค้าที่ login อยู่ (เดิมคืนทั้งตาราง = data leak)
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).id;
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: "Failed to load bookings" });
  res.json({ success: true, data });
});

// ── GET /api/bookings/:id ── ต้องเป็นการจองของตัวเอง (กัน IDOR)
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).id;
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", userId) // ownership คุมในตัว query — ไม่เจอ = ไม่ใช่ของเรา
    .maybeSingle();
  if (error) return res.status(500).json({ success: false, error: "Failed to load booking" });
  if (!data) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data });
});

// ── POST /api/bookings ── สร้างการจอง (login หรือไม่ก็ได้ — รองรับ walk-in)
router.post("/", async (req: Request, res: Response) => {
  const b = parseBody(bookingCreateSchema, req, res);
  if (!b) return;

  // Format start and end times
  const checkinDate = b.checkin_date || new Date().toISOString().split("T")[0];
  const checkinHour = (b.checkin_hour || "08").padStart(2, "0");
  const checkinMinute = (b.checkin_minute || "00").padStart(2, "0");
  const startTime = `${checkinDate}T${checkinHour}:${checkinMinute}:00`;

  const checkoutDate = b.checkout_date || new Date().toISOString().split("T")[0];
  const checkoutHour = (b.checkout_hour || "08").padStart(2, "0");
  const checkoutMinute = (b.checkout_minute || "00").padStart(2, "0");
  const endTime = `${checkoutDate}T${checkoutHour}:${checkoutMinute}:00`;

  // Get user_id — prefer the logged-in LINE customer; otherwise fall back to walk-in.
  const authUser = req.user as AuthUser | undefined;
  let userId = authUser?.id ?? "fe346324-ff72-4656-9f0a-478da7c91afa"; // fallback UUID
  if (!authUser?.id) {
    try {
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("email", "walkin@skycarpark.com")
        .limit(1);

      if (users && users.length > 0) {
        userId = users[0].id;
      } else {
        const { data: anyUser } = await supabase.from("users").select("id").limit(1);
        if (anyUser && anyUser.length > 0) userId = anyUser[0].id;
      }
    } catch (err) {
      console.error("Failed to query user");
    }
  }

  // Map car type from Thai display name to English db value
  const typeMapToEng: Record<string, string> = {
    "รถเก๋ง (Sedan)": "sedan",
    "รถกระบะ (Pickup)": "pickup",
    "รถกระบะตู้ทึบ (Pickup Camper)": "pickup",
    "รถ SUV": "suv",
    "รถไฟฟ้า (EV)": "ev",
    "รถซุปเปอร์คาร์ (Supercar)": "supercar",
  };
  const mappedCarType = typeMapToEng[b.car_type ?? ""] || b.car_type || null;

  // ── ราคา: คำนวณฝั่ง server เสมอ — ไม่เชื่อ b.total ที่ client ส่งมา ──
  // (เดิมใช้ b.total ตรงๆ → ลูกค้าแก้ยอดเป็นเท่าไรก็ได้). ใช้ค่าเดียวกับ frontend
  const { total: serverFee } = computeBookingTotal({
    checkinDate, checkinHour, checkinMinute,
    checkoutDate, checkoutHour, checkoutMinute,
    coupon: b.coupon,
  });

  // จัดสรรช่อง + บันทึกการจองแบบ atomic ใน RPC เดียว — กัน double-booking
  const { data, error } = await supabase
    .rpc("create_online_booking", {
      p_user_id:            userId,
      p_start_time:         startTime,
      p_end_time:           endTime,
      p_customer_name:      b.name.trim(),
      p_customer_phone:     b.phone.trim(),
      p_customer_alt_phone: b.phone_alt || null,
      p_vehicle_plate:      b.plate || null,
      p_vehicle_brand:      b.car_brand || null,
      p_vehicle_model:      b.car_model || null,
      p_vehicle_type:       mappedCarType,
      p_fee:                serverFee,
    })
    .single<{ id: string }>();

  if (error) {
    if (error.message.includes("NO_SLOT_AVAILABLE")) {
      return res.status(400).json({ error: "No available parking slots for the selected period." });
    }
    return res.status(500).json({ success: false, error: "Failed to create booking" });
  }

  // ── จดจำรถของลูกค้า (เฉพาะตอน login) — pre-fill ครั้งหน้า ──
  // ทำหลัง insert booking สำเร็จ และไม่ให้พังคำขอถ้า step นี้ล้มเหลว (best-effort)
  if (authUser?.id && b.plate) {
    void rememberVehicle(authUser.id, data.id, {
      plate_number: b.plate.trim(),
      car_brand: b.car_brand || null,
      car_model: b.car_model || null,
      vehicle_type: mappedCarType,
      color: b.color || null,
    });
  }

  res.status(201).json({ success: true, data });
});

// upsert รถเข้าโปรไฟล์ลูกค้า + ผูก bookings.vehicle_id (best-effort, ไม่ throw ออกนอก)
async function rememberVehicle(
  userId: string,
  bookingId: string,
  v: { plate_number: string; car_brand: string | null; car_model: string | null; vehicle_type: string | null; color: string | null },
) {
  try {
    // คันแรกของลูกค้า → ตั้งเป็น default
    const { count } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: veh, error } = await supabase
      .from("vehicles")
      .upsert(
        { ...v, user_id: userId, is_default: !count },
        { onConflict: "user_id,plate_number" },
      )
      .select("id")
      .single();
    if (error || !veh) return;

    await supabase.from("bookings").update({ vehicle_id: veh.id }).eq("id", bookingId);
  } catch {
    /* best-effort — การจองสำเร็จไปแล้ว ไม่ต้องรบกวนลูกค้า */
  }
}

// ── PATCH /api/bookings/:id/status ── เปลี่ยนสถานะการจองของตัวเอง (กัน IDOR)
router.patch("/:id/status", requireAuth, async (req: Request, res: Response) => {
  const parsed = parseBody(bookingStatusSchema, req, res);
  if (!parsed) return;
  const userId = (req.user as AuthUser).id;

  let dbStatus = parsed.status.toUpperCase();
  if (dbStatus === "COMPLETED") dbStatus = "CONFIRMED";

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: dbStatus })
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ success: false, error: "Failed to update booking" });
  if (!data) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data });
});

// ── DELETE /api/bookings/:id ── ยกเลิกการจองของตัวเอง (กัน IDOR)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).id;
  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", userId)
    .select("id");
  if (error) return res.status(500).json({ success: false, error: "Failed to delete booking" });
  if (!data || data.length === 0) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, message: "Deleted" });
});

export default router;
