"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const typeMapToThai = {
    sedan: "รถเก๋ง (Sedan)",
    pickup: "รถกระบะ (Pickup)",
    suv: "รถ SUV",
    ev: "รถไฟฟ้า (EV)",
    supercar: "รถซุปเปอร์คาร์ (Supercar)",
};
const typeMapToEng = {
    "รถเก๋ง (Sedan)": "sedan",
    "รถกระบะ (Pickup)": "pickup",
    "รถกระบะตู้ทึบ (Pickup Camper)": "pickup",
    "รถ SUV": "suv",
    "รถไฟฟ้า (EV)": "ev",
    "รถซุปเปอร์คาร์ (Supercar)": "supercar",
};
// ── GET /api/cars ──
router.get("/", async (_req, res) => {
    const { data, error } = await db_1.supabase
        .from("car_models")
        .select("type, brand, model")
        .order("type").order("brand").order("model");
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    const grouped = {};
    for (const row of data) {
        const thaiType = typeMapToThai[row.type] || row.type;
        if (!grouped[thaiType])
            grouped[thaiType] = { brands: [], models: {} };
        if (!grouped[thaiType].brands.includes(row.brand))
            grouped[thaiType].brands.push(row.brand);
        if (!grouped[thaiType].models[row.brand])
            grouped[thaiType].models[row.brand] = [];
        grouped[thaiType].models[row.brand].push(row.model);
    }
    res.json({ success: true, data: grouped });
});
// ── GET /api/cars/types ──
router.get("/types", async (_req, res) => {
    const { data, error } = await db_1.supabase
        .from("car_models").select("type").order("type");
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    const dbTypes = [...new Set(data.map(r => r.type))];
    const types = dbTypes.map(t => typeMapToThai[t] || t);
    res.json({ success: true, data: types });
});
// ── GET /api/cars/brands?type=xxx ──
router.get("/brands", async (req, res) => {
    const { type } = req.query;
    if (!type)
        return res.status(400).json({ error: "type query required" });
    const engType = typeMapToEng[type] || type;
    const { data, error } = await db_1.supabase
        .from("car_models").select("brand").eq("type", engType).order("brand");
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    const brands = [...new Set(data.map(r => r.brand))];
    res.json({ success: true, data: brands });
});
// ── GET /api/cars/models?type=xxx&brand=yyy ──
router.get("/models", async (req, res) => {
    const { type, brand } = req.query;
    if (!type || !brand)
        return res.status(400).json({ error: "type and brand required" });
    const engType = typeMapToEng[type] || type;
    const { data, error } = await db_1.supabase
        .from("car_models").select("model")
        .eq("type", engType).eq("brand", brand).order("model");
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, data: data.map(r => r.model) });
});
// ── POST /api/cars/seed ──
router.post("/seed", async (_req, res) => {
    const CAR_DATA = {
        "รถเก๋ง (Sedan)": {
            brands: ["Toyota", "Honda", "Mazda", "Nissan", "Mitsubishi", "Isuzu", "Ford", "Hyundai", "Kia", "Subaru", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Lexus", "MG", "Haval", "BYD", "Suzuki", "Chevrolet"],
            models: {
                Toyota: ["Corolla Cross", "Camry", "Yaris", "Altis", "Vios", "C-HR", "RAV4", "Fortuner", "Alphard", "Hilux"],
                Honda: ["Civic", "City", "HR-V", "CR-V", "Accord", "BR-V", "Jazz", "WR-V", "Odyssey", "Pilot"],
                Mazda: ["Mazda2", "Mazda3", "CX-3", "CX-5", "CX-8", "CX-9", "MX-5", "CX-30", "CX-60", "BT-50"],
                Nissan: ["Almera", "Note", "Kicks", "Navara", "Terra", "X-Trail", "Leaf", "March", "Sylphy", "Murano"],
                Mitsubishi: ["Mirage", "Attrage", "Xpander", "Outlander", "Pajero Sport", "Eclipse Cross", "Triton", "Galant", "Lancer", "Montero"],
                Isuzu: ["D-Max", "MU-X", "Cameo", "Hi-Lander", "Rodeo", "TFR", "M-UX", "Spark", "KB", "NHR"],
                Ford: ["Ranger", "Everest", "Explorer", "Mustang", "EcoSport", "Territory", "Maverick", "Bronco", "F-150", "Focus"],
                Hyundai: ["Accent", "Elantra", "Tucson", "Santa Fe", "Ioniq", "Creta", "Staria", "Kona", "Sonata", "Ioniq 5"],
                Kia: ["Picanto", "Soluto", "Sportage", "Sorento", "Stinger", "EV6", "Carnival", "Niro", "Sonet", "Telluride"],
                Subaru: ["Impreza", "Forester", "Outback", "XV", "BRZ", "Legacy", "Crosstrek", "WRX", "Ascent", "Tribeca"],
                BMW: ["Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 7", "X1", "X3", "X5", "M3"],
                "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "AMG GT"],
                Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8"],
                Volvo: ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90", "C40", "EC40", "EX90"],
                Lexus: ["IS", "ES", "GS", "LS", "UX", "NX", "RX", "GX", "LX", "RC"],
                MG: ["MG3", "MG5", "MG ZS", "MG HS", "MG Extender", "EP", "Marvel R", "Cyberster", "5", "RX5"],
                Haval: ["H6", "Jolion", "H2", "F7", "F7x", "Big Dog", "Dargo", "H9", "F5", "H4"],
                BYD: ["Atto 3", "Han", "Tang", "Sea Lion", "Dolphin", "Seal", "Sealion 6", "Shark", "F3", "Destroyer 05"],
                Suzuki: ["Swift", "Ciaz", "Vitara", "Ertiga", "XL7", "Fronx", "Jimny", "Dzire", "S-Presso", "Celerio"],
                Chevrolet: ["Trailblazer", "Colorado", "Captiva", "Cruze", "Sonic", "Spark", "Trax", "Equinox", "Traverse", "Blazer"],
            }
        },
        "รถกระบะ (Pickup)": {
            brands: ["Toyota", "Isuzu", "Ford", "Nissan", "Mitsubishi", "Mazda", "Chevrolet", "MG"],
            models: {
                Toyota: ["Hilux Revo", "Hilux Vigo", "Hilux CHAMP", "Tundra", "Tacoma"],
                Isuzu: ["D-Max", "TFR", "KB", "NHR", "Rodeo"],
                Ford: ["Ranger", "Ranger Raptor", "Ranger Wildtrak", "Ranger XL", "Maverick"],
                Nissan: ["Navara", "Frontier", "Titan", "NP300"],
                Mitsubishi: ["Triton", "L200", "Strada", "Colt"],
                Mazda: ["BT-50", "BT-50 Pro"],
                Chevrolet: ["Colorado", "S10"],
                MG: ["Extender", "Commander"],
            }
        },
        "รถกระบะตู้ทึบ (Pickup Camper)": {
            brands: ["Toyota", "Isuzu", "Ford", "Nissan", "Mitsubishi"],
            models: {
                Toyota: ["Hilux Revo แคปทึบ", "Hilux Vigo แคปทึบ", "Commuter"],
                Isuzu: ["D-Max แคปทึบ", "TFR แคปทึบ"],
                Ford: ["Ranger แคปทึบ", "Everest"],
                Nissan: ["Navara แคปทึบ", "Patrol"],
                Mitsubishi: ["Triton แคปทึบ", "Pajero Sport"],
            }
        },
        "รถ SUV": {
            brands: ["Toyota", "Honda", "Mazda", "Nissan", "Mitsubishi", "Ford", "Hyundai", "Kia", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Lexus", "MG", "Haval", "Subaru", "BYD"],
            models: {
                Toyota: ["Fortuner", "RAV4", "C-HR", "Yaris Cross", "Corolla Cross", "Prado", "Land Cruiser", "Highlander"],
                Honda: ["CR-V", "HR-V", "Pilot", "Passport", "Ridgeline", "WR-V"],
                Mazda: ["CX-3", "CX-5", "CX-8", "CX-9", "CX-30", "CX-60", "CX-90"],
                Nissan: ["Kicks", "X-Trail", "Murano", "Rogue", "Pathfinder", "Terra", "Patrol"],
                Mitsubishi: ["Outlander", "Pajero Sport", "Eclipse Cross", "ASX", "Montero"],
                Ford: ["EcoSport", "Escape", "Territory", "Explorer", "Everest", "Bronco"],
                Hyundai: ["Tucson", "Santa Fe", "Creta", "Venue", "Palisade", "Ioniq 5"],
                Kia: ["Sportage", "Sorento", "Telluride", "Mohave", "EV6", "Niro"],
                BMW: ["X1", "X2", "X3", "X4", "X5", "X6", "X7", "iX3", "iX"],
                "Mercedes-Benz": ["GLA", "GLB", "GLC", "GLE", "GLS", "EQA", "EQB", "EQC"],
                Audi: ["Q3", "Q5", "Q7", "Q8", "e-tron", "SQ5", "RS Q8"],
                Volvo: ["XC40", "XC60", "XC90", "EX40", "EX90", "C40"],
                Lexus: ["UX", "NX", "RX", "GX", "LX", "RZ"],
                MG: ["ZS", "HS", "VS", "RX5", "Marvel R"],
                Haval: ["H6", "Jolion", "Dargo", "H9", "Big Dog"],
                Subaru: ["Forester", "Outback", "XV", "Crosstrek", "Solterra", "Ascent"],
                BYD: ["Atto 3", "Tang", "Sea Lion", "Sealion 6", "Song Plus"],
            }
        },
        "รถไฟฟ้า (EV)": {
            brands: ["BYD", "Tesla", "MG", "Hyundai", "Kia", "BMW", "Mercedes-Benz", "Volvo", "Audi", "Toyota", "Nissan", "Honda"],
            models: {
                BYD: ["Atto 3", "Han", "Tang", "Seal", "Dolphin", "Destroyer 05", "Sea Lion", "Sealion 6", "Shark"],
                Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
                MG: ["EP", "Marvel R", "MG5 EV", "Cyberster"],
                Hyundai: ["Ioniq 5", "Ioniq 6", "Kona Electric"],
                Kia: ["EV6", "Niro EV", "EV9"],
                BMW: ["i4", "i5", "i7", "iX", "iX1", "iX3"],
                "Mercedes-Benz": ["EQA", "EQB", "EQC", "EQE", "EQS"],
                Volvo: ["C40 Recharge", "XC40 Recharge", "EX90"],
                Audi: ["e-tron", "e-tron GT", "Q8 e-tron"],
                Toyota: ["bZ4X", "bZ3", "BZ Compact"],
                Nissan: ["Leaf", "Ariya"],
                Honda: ["e:Ny1", "e:N1"],
            }
        },
        "รถซุปเปอร์คาร์ (Supercar)": {
            brands: ["Ferrari", "Lamborghini", "Porsche", "McLaren", "Bugatti", "Aston Martin", "Bentley", "Maserati", "Rolls-Royce", "BMW M"],
            models: {
                Ferrari: ["Ferrari 488", "Ferrari F8", "Roma", "SF90", "812 Superfast", "296 GTB", "Portofino"],
                Lamborghini: ["Urus", "Huracán", "Aventador", "Sterrato", "Revuelto"],
                Porsche: ["911", "Cayenne", "Macan", "Panamera", "718 Boxster", "Taycan"],
                McLaren: ["720S", "765LT", "GT", "Artura", "570S"],
                Bugatti: ["Chiron", "Veyron", "Divo", "Bolide"],
                "Aston Martin": ["DB11", "Vantage", "DBS", "DBX", "Valkyrie"],
                Bentley: ["Continental GT", "Bentayga", "Flying Spur", "Mulsanne"],
                Maserati: ["GranTurismo", "Ghibli", "Quattroporte", "Levante", "Grecale"],
                "Rolls-Royce": ["Ghost", "Phantom", "Wraith", "Dawn", "Cullinan", "Spectre"],
                "BMW M": ["M2", "M3", "M4", "M5", "M8", "X5M", "X6M"],
            }
        },
    };
    const rows = [];
    for (const [type, val] of Object.entries(CAR_DATA)) {
        for (const brand of val.brands) {
            for (const model of val.models[brand] || []) {
                rows.push({ type, brand, model });
            }
        }
    }
    const { error } = await db_1.supabase
        .from("car_types")
        .upsert(rows, { onConflict: "type,brand,model" });
    if (error)
        return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, message: `Seeded ${rows.length} car records` });
});
exports.default = router;
