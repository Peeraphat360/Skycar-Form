"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// ── GET /api/bookings ──
router.get("/", async (_req, res) => {
    const { data, error } = await db_1.supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, data });
});
// ── GET /api/bookings/:id ──
router.get("/:id", async (req, res) => {
    const { data, error } = await db_1.supabase
        .from("bookings")
        .select("*")
        .eq("id", req.params.id)
        .single();
    if (error)
        return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data });
});
// ── POST /api/bookings ──
router.post("/", async (req, res) => {
    const b = req.body;
    // Validation
    if (!b.name?.trim())
        return res.status(400).json({ error: "name required" });
    if (!b.phone?.trim())
        return res.status(400).json({ error: "phone required" });
    if (b.total === undefined)
        return res.status(400).json({ error: "total required" });
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
    const authUser = req.user;
    let userId = authUser?.id ?? "fe346324-ff72-4656-9f0a-478da7c91afa"; // fallback UUID
    if (!authUser?.id) {
        try {
            const { data: users } = await db_1.supabase
                .from("users")
                .select("id")
                .eq("email", "walkin@skycarpark.com")
                .limit(1);
            if (users && users.length > 0) {
                userId = users[0].id;
            }
            else {
                const { data: anyUser } = await db_1.supabase
                    .from("users")
                    .select("id")
                    .limit(1);
                if (anyUser && anyUser.length > 0) {
                    userId = anyUser[0].id;
                }
            }
        }
        catch (err) {
            console.error("Failed to query user:", err);
        }
    }
    // Allocate an available slot
    let slotId = null;
    try {
        // 1. Get list of occupied slots during this period
        const { data: occupiedBookings, error: occupiedError } = await db_1.supabase
            .from("bookings")
            .select("slot_id")
            .in("status", ["PENDING", "CONFIRMED"])
            .lt("start_time", endTime)
            .gt("end_time", startTime);
        if (occupiedError) {
            return res.status(500).json({ success: false, error: `Failed to check occupied slots: ${occupiedError.message}` });
        }
        const occupiedSlotIds = occupiedBookings
            ? occupiedBookings.map((ob) => ob.slot_id).filter(Boolean)
            : [];
        // 2. Query available slots
        let slotQuery = db_1.supabase
            .from("parking_slots")
            .select("id")
            .neq("status", "MAINTENANCE")
            .limit(1);
        if (occupiedSlotIds.length > 0) {
            slotQuery = slotQuery.not("id", "in", `(${occupiedSlotIds.join(",")})`);
        }
        const { data: availableSlots, error: slotsErr } = await slotQuery;
        if (slotsErr) {
            return res.status(500).json({ success: false, error: `Failed to query slots: ${slotsErr.message}` });
        }
        if (!availableSlots || availableSlots.length === 0) {
            return res.status(400).json({ error: "No available parking slots for the selected period." });
        }
        slotId = availableSlots[0].id;
    }
    catch (err) {
        return res.status(500).json({ success: false, error: `Slot allocation error: ${err.message}` });
    }
    // Map car type from Thai display name to English db value
    const typeMapToEng = {
        "รถเก๋ง (Sedan)": "sedan",
        "รถกระบะ (Pickup)": "pickup",
        "รถกระบะตู้ทึบ (Pickup Camper)": "pickup",
        "รถ SUV": "suv",
        "รถไฟฟ้า (EV)": "ev",
        "รถซุปเปอร์คาร์ (Supercar)": "supercar",
    };
    const mappedCarType = typeMapToEng[b.car_type] || b.car_type || null;
    // Map status to uppercase, handling 'completed' -> 'CONFIRMED'
    let insertStatus = (b.status || "PENDING").toUpperCase();
    if (insertStatus === "COMPLETED") {
        insertStatus = "CONFIRMED";
    }
    const { data, error } = await db_1.supabase
        .from("bookings")
        .insert([{
            user_id: userId,
            slot_id: slotId,
            start_time: startTime,
            end_time: endTime,
            status: insertStatus,
            customer_name: b.name.trim(),
            customer_phone: b.phone.trim(),
            customer_alt_phone: b.phone_alt || null,
            vehicle_plate: b.plate || null,
            vehicle_brand: b.car_brand || null,
            vehicle_model: b.car_model || null,
            vehicle_type: mappedCarType,
            fee: b.total,
            is_walk_in: false,
        }])
        .select()
        .single();
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    res.status(201).json({ success: true, data });
});
// ── PATCH /api/bookings/:id/status ──
router.patch("/:id/status", async (req, res) => {
    const { status } = req.body;
    const allowed = ["pending", "confirmed", "completed", "cancelled"];
    if (!allowed.includes(status))
        return res.status(400).json({ error: "Invalid status" });
    let dbStatus = status.toUpperCase();
    if (dbStatus === "COMPLETED")
        dbStatus = "CONFIRMED";
    const { data, error } = await db_1.supabase
        .from("bookings")
        .update({ status: dbStatus })
        .eq("id", req.params.id)
        .select()
        .single();
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, data });
});
// ── DELETE /api/bookings/:id ──
router.delete("/:id", async (req, res) => {
    const { error } = await db_1.supabase
        .from("bookings")
        .delete()
        .eq("id", req.params.id);
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, message: "Deleted" });
});
exports.default = router;
