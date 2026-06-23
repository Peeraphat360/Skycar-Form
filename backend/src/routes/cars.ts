import { Router, Response } from "express";
import { supabase } from "../db";

const router = Router();

const typeMapToThai: Record<string, string> = {
  sedan: "รถเก๋ง (Sedan)",
  pickup: "รถกระบะ (Pickup)",
  suv: "รถ SUV",
  ev: "รถไฟฟ้า (EV)",
  supercar: "รถซุปเปอร์คาร์ (Supercar)",
};

const typeMapToEng: Record<string, string> = {
  "รถเก๋ง (Sedan)": "sedan",
  "รถกระบะ (Pickup)": "pickup",
  "รถกระบะตู้ทึบ (Pickup Camper)": "pickup",
  "รถ SUV": "suv",
  "รถไฟฟ้า (EV)": "ev",
  "รถซุปเปอร์คาร์ (Supercar)": "supercar",
};

// ── GET /api/cars ──
router.get("/", async (_req, res: Response) => {
  const { data, error } = await supabase
    .from("car_models")
    .select("type, brand, model")
    .order("type").order("brand").order("model");

  if (error) return res.status(500).json({ success: false, error: error.message });

  const grouped: Record<string, { brands: string[], models: Record<string, string[]> }> = {};
  for (const row of data) {
    const thaiType = typeMapToThai[row.type] || row.type;
    if (!grouped[thaiType]) grouped[thaiType] = { brands: [], models: {} };
    if (!grouped[thaiType].brands.includes(row.brand)) grouped[thaiType].brands.push(row.brand);
    if (!grouped[thaiType].models[row.brand]) grouped[thaiType].models[row.brand] = [];
    grouped[thaiType].models[row.brand].push(row.model);
  }
  res.json({ success: true, data: grouped });
});

// ── GET /api/cars/types ──
router.get("/types", async (_req, res: Response) => {
  const { data, error } = await supabase
    .from("car_models").select("type").order("type");
  if (error) return res.status(500).json({ success: false, error: error.message });
  const dbTypes = [...new Set(data.map(r => r.type))];
  const types = dbTypes.map(t => typeMapToThai[t] || t);
  res.json({ success: true, data: types });
});

// ── GET /api/cars/brands?type=xxx ──
router.get("/brands", async (req, res: Response) => {
  const { type } = req.query;
  if (!type) return res.status(400).json({ error: "type query required" });
  
  const engType = typeMapToEng[type as string] || (type as string);

  const { data, error } = await supabase
    .from("car_models").select("brand").eq("type", engType).order("brand");
  if (error) return res.status(500).json({ success: false, error: error.message });
  const brands = [...new Set(data.map(r => r.brand))];
  res.json({ success: true, data: brands });
});

// ── GET /api/cars/models?type=xxx&brand=yyy ──
router.get("/models", async (req, res: Response) => {
  const { type, brand } = req.query;
  if (!type || !brand) return res.status(400).json({ error: "type and brand required" });
  
  const engType = typeMapToEng[type as string] || (type as string);

  const { data, error } = await supabase
    .from("car_models").select("model")
    .eq("type", engType).eq("brand", brand as string).order("model");
  if (error) return res.status(500).json({ success: false, error: error.message });
  res.json({ success: true, data: data.map(r => r.model) });
});

// หมายเหตุความปลอดภัย: เดิมมี POST /api/cars/seed ที่เขียน DB ได้โดยไม่ต้อง login
// (ใครยิงก็ upsert ตารางรถได้) — ถอดออกแล้ว. ถ้าต้อง seed ข้อมูลรถ ให้รันสคริปต์
// ฝั่ง server (service_role) แทน ไม่เปิดเป็น public endpoint

export default router;