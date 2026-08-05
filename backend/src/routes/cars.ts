import { Router, Request, Response } from "express";
import { supabase } from "../db";

const router = Router();

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface CarModelRow {
  type: string;
  brand: string;
  model: string;
}

export interface GroupedCarData {
  brands: string[];
  models: Record<string, string[]>;
}

interface CarDataCache {
  lastFetched: number;
  allGrouped: Record<string, GroupedCarData>;
  types: string[];
  brandsByType: Record<string, string[]>;
  modelsByTypeAndBrand: Record<string, string[]>;
}

// ─── Constants & Type Mappings ────────────────────────────────────────────────
export const TYPE_MAP_TO_THAI: Record<string, string> = {
  sedan: "รถเก๋ง (Sedan)",
  pickup: "รถกระบะ (Pickup)",
  suv: "รถ SUV",
  ev: "รถไฟฟ้า (EV)",
  supercar: "รถซุปเปอร์คาร์ (Supercar)",
};

export const TYPE_MAP_TO_ENG: Record<string, string> = {
  "รถเก๋ง (Sedan)": "sedan",
  "รถกระบะ (Pickup)": "pickup",
  "รถกระบะตู้ทึบ (Pickup Camper)": "pickup",
  "รถ SUV": "suv",
  "รถไฟฟ้า (EV)": "ev",
  "รถซุปเปอร์คาร์ (Supercar)": "supercar",
};

// ─── In-Memory Cache (TTL: 10 minutes) ─────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000;
let carCache: CarDataCache | null = null;
let fetchPromise: Promise<CarDataCache> | null = null;

/**
 * โหลดและจัดโครงสร้างข้อมูลรถยนต์ทั้งหมดจาก Supabase พร้อมทำ In-Memory Cache
 */
async function loadCarData(): Promise<CarDataCache> {
  const { data, error } = await supabase
    .from("car_models")
    .select("type, brand, model")
    .order("type", { ascending: true })
    .order("brand", { ascending: true })
    .order("model", { ascending: true });

  if (error) {
    throw new Error(`Failed to load car models: ${error.message}`);
  }

  const rows: CarModelRow[] = data || [];

  const allGrouped: Record<string, GroupedCarData> = {};
  const rawTypes = new Set<string>();
  const brandsByType: Record<string, Set<string>> = {};
  const modelsByTypeAndBrand: Record<string, Set<string>> = {};

  for (const row of rows) {
    const rawType = row.type?.trim();
    const brand = row.brand?.trim();
    const model = row.model?.trim();

    if (!rawType || !brand || !model) continue;

    rawTypes.add(rawType);
    const thaiType = TYPE_MAP_TO_THAI[rawType] || rawType;
    const engType = TYPE_MAP_TO_ENG[rawType] || rawType;

    // 1. Grouped hierarchy
    if (!allGrouped[thaiType]) {
      allGrouped[thaiType] = { brands: [], models: {} };
    }
    if (!allGrouped[thaiType].brands.includes(brand)) {
      allGrouped[thaiType].brands.push(brand);
    }
    if (!allGrouped[thaiType].models[brand]) {
      allGrouped[thaiType].models[brand] = [];
    }
    if (!allGrouped[thaiType].models[brand].includes(model)) {
      allGrouped[thaiType].models[brand].push(model);
    }

    // 2. Brands by type (รองรับทั้ง key ไทย และ อังกฤษ)
    for (const tKey of [thaiType, engType, rawType]) {
      if (!brandsByType[tKey]) brandsByType[tKey] = new Set();
      brandsByType[tKey].add(brand);
    }

    // 3. Models by type & brand
    for (const tKey of [thaiType, engType, rawType]) {
      const tbKey = `${tKey}:::${brand}`;
      if (!modelsByTypeAndBrand[tbKey]) modelsByTypeAndBrand[tbKey] = new Set();
      modelsByTypeAndBrand[tbKey].add(model);
    }
  }

  // แปลง Set เป็น Array เพื่อความสะดวกและประหยัด memory
  const finalTypes = Array.from(rawTypes).map(t => TYPE_MAP_TO_THAI[t] || t);
  const finalBrandsByType: Record<string, string[]> = {};
  for (const [k, set] of Object.entries(brandsByType)) {
    finalBrandsByType[k] = Array.from(set);
  }

  const finalModelsByTypeAndBrand: Record<string, string[]> = {};
  for (const [k, set] of Object.entries(modelsByTypeAndBrand)) {
    finalModelsByTypeAndBrand[k] = Array.from(set);
  }

  const newCache: CarDataCache = {
    lastFetched: Date.now(),
    allGrouped,
    types: finalTypes,
    brandsByType: finalBrandsByType,
    modelsByTypeAndBrand: finalModelsByTypeAndBrand,
  };

  carCache = newCache;
  return newCache;
}

/**
 * ดึงข้อมูลรถยนต์จาก Cache หรือคิวรี่ใหม่เมื่อ Cache หมดอายุ
 */
async function getCarData(): Promise<CarDataCache> {
  const now = Date.now();
  if (carCache && now - carCache.lastFetched < CACHE_TTL_MS) {
    return carCache;
  }

  if (!fetchPromise) {
    fetchPromise = loadCarData().finally(() => {
      fetchPromise = null;
    });
  }

  try {
    return await fetchPromise;
  } catch (err) {
    // ถ้าเคยมี cache อยู่แล้ว แม้จะหมดอายุแต่ DB ล่ม ให้ fallback ใช้ cache เก่าไปก่อน
    if (carCache) {
      console.warn("[CarRoute] DB fetch failed, falling back to stale cache:", err);
      return carCache;
    }
    throw err;
  }
}

/**
 * ฟังก์ชันสำหรับเคลียร์ Cache (สามารถเรียกใช้จากภายนอกหรือตอน seed ได้)
 */
export function invalidateCarCache(): void {
  carCache = null;
}

// ─── API Routes ───────────────────────────────────────────────────────────────

/**
 * GET /api/cars
 * ดึงข้อมูลประเภทรถ ยี่ห้อ และรุ่นทั้งหมดในรูปแบบ Grouped Object
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const data = await getCarData();
    res.json({ success: true, data: data.allGrouped });
  } catch (error: any) {
    console.error("[CarRoute] Error GET /:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

/**
 * GET /api/cars/types
 * ดึงรายชื่อประเภทรถทั้งหมด (เช่น รถเก๋ง, รถกระบะ, รถ SUV, ...)
 */
router.get("/types", async (_req: Request, res: Response) => {
  try {
    const data = await getCarData();
    res.json({ success: true, data: data.types });
  } catch (error: any) {
    console.error("[CarRoute] Error GET /types:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

/**
 * GET /api/cars/brands?type=xxx
 * ดึงรายชื่อยี่ห้อรถตามประเภทที่เลือก
 */
router.get("/brands", async (req: Request, res: Response) => {
  const typeQuery = req.query.type;
  if (!typeQuery || typeof typeQuery !== "string") {
    return res.status(400).json({ success: false, error: "Query parameter 'type' is required" });
  }

  const cleanType = typeQuery.trim();
  try {
    const data = await getCarData();
    const brands = data.brandsByType[cleanType] || [];
    res.json({ success: true, data: brands });
  } catch (error: any) {
    console.error("[CarRoute] Error GET /brands:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

/**
 * GET /api/cars/models?type=xxx&brand=yyy
 * ดึงรายชื่อรุ่นรถตามประเภทและยี่ห้อที่เลือก
 */
router.get("/models", async (req: Request, res: Response) => {
  const { type, brand } = req.query;
  if (!type || typeof type !== "string" || !brand || typeof brand !== "string") {
    return res.status(400).json({
      success: false,
      error: "Query parameters 'type' and 'brand' are required",
    });
  }

  const cleanType = type.trim();
  const cleanBrand = brand.trim();
  const cacheKey = `${cleanType}:::${cleanBrand}`;

  try {
    const data = await getCarData();
    const models = data.modelsByTypeAndBrand[cacheKey] || [];
    res.json({ success: true, data: models });
  } catch (error: any) {
    console.error("[CarRoute] Error GET /models:", error);
    res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

export default router;