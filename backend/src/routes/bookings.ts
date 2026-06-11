import { Router, Request, Response } from "express";
import { supabase } from "../db";
import type { AuthUser } from "../types/auth";

const router = Router();

// ── GET /api/bookings ──
router.get("/", async (_req, res: Response) => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
});

// ── GET /api/bookings/:id ──
router.get("/:id", async (req, res: Response) => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data });
});

// ── POST /api/bookings ──
router.post("/", async (req: Request, res: Response) => {
  const b = req.body;

  // Validation
  if (!b.name?.trim())  return res.status(400).json({ error: "name required" });
  if (!b.phone?.trim()) return res.status(400).json({ error: "phone required" });
  if (b.total === undefined) return res.status(400).json({ error: "total required" });

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
  // Cast explicitly so this doesn't rely on the global Express.User augmentation.
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
        const { data: anyUser } = await supabase
          .from("users")
          .select("id")
          .limit(1);
        if (anyUser && anyUser.length > 0) {
          userId = anyUser[0].id;
        }
      }
    } catch (err) {
      console.error("Failed to query user:", err);
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
  const mappedCarType = typeMapToEng[b.car_type] || b.car_type || null;

  // จัดสรรช่อง + บันทึกการจองแบบ atomic ใน RPC เดียว — กัน double-booking เมื่อ
  // ลูกค้าหลายคนกดจองช่วงเวลาเดียวกันพร้อมกัน (ดู sql/create_online_booking.sql)
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
      p_fee:                b.total,
    })
    .single();

  if (error) {
    if (error.message.includes("NO_SLOT_AVAILABLE")) {
      return res.status(400).json({ error: "No available parking slots for the selected period." });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
  res.status(201).json({ success: true, data });
});

// ── PATCH /api/bookings/:id/status ──
router.patch("/:id/status", async (req, res: Response) => {
  const { status } = req.body;
  const allowed = ["pending", "confirmed", "completed", "cancelled"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  let dbStatus = status.toUpperCase();
  if (dbStatus === "COMPLETED") dbStatus = "CONFIRMED";

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: dbStatus })
    .eq("id", req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data });
});

// ── DELETE /api/bookings/:id ──
router.delete("/:id", async (req, res: Response) => {
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, message: "Deleted" });
});

export default router;