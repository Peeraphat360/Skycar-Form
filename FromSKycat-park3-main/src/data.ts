import { CheckCircle2, Clock, XCircle } from "lucide-react";



export interface Booking {
  id: string;
  name: string;
  phone: string;
  plate: string;
  brand: string;
  type: string;
  slot: string;
  checkin: string;
  checkout: string;
  checkoutTime?: string;
  time?: string;
  days: number;
  total: number;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  period?: "day" | "month" | "hour";
  extraHours?: number;
  discount?: number;
  note?: string;
}

export const SLOTS = ["A01","A02","A03","A04","A05","A06","A07","A08","A09","A10", "B01","B02","B03","B04","B05","B06","B07","B08","B09","B10"];

export const CAR_BRANDS = [
  "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "BYD", "Changan", "Chevrolet",
  "Chrysler", "Citroen", "Deepal", "Ferrari", "Fiat", "Ford", "Geely", "GWM (Haval/Ora)",
  "Honda", "Hyundai", "Isuzu", "Jaguar", "Jeep", "Kia", "Lamborghini", "Land Rover",
  "Lexus", "Lotus", "Maserati", "Mazda", "McLaren", "Mercedes-Benz", "MG", "Mini",
  "Mitsubishi", "Neta", "Nissan", "OMODA", "Peugeot", "Porsche", "Rolls-Royce", "Subaru",
  "Suzuki", "Tesla", "Toyota", "Volkswagen", "Volvo", "Wuling",
];

export const CAR_MODELS: Record<string, string[]> = {
  "Toyota": ["Yaris", "Yaris Ativ", "Vios", "Corolla Altis", "Camry", "C-HR", "Corolla Cross", "Fortuner", "Hilux Revo", "Innova", "Alphard", "Veloz", "Majesty"],
  "Honda": ["Brio", "City", "Civic", "Accord", "HR-V", "BR-V", "CR-V", "Jazz", "Mobilio"],
  "Isuzu": ["D-Max", "MU-X", "V-Cross"],
  "Mitsubishi": ["Mirage", "Attrage", "Xpander", "Xpander Cross", "Triton", "Pajero Sport"],
  "Nissan": ["March", "Almera", "Note", "Sylphy", "Kicks", "Navara", "Terra", "Leaf"],
  "Mazda": ["2", "3", "CX-3", "CX-30", "CX-5", "CX-8", "BT-50"],
  "Ford": ["Ranger", "Ranger Raptor", "Everest", "Mustang"],
  "MG": ["MG3", "MG5", "MG EP", "MG ZS", "MG HS", "MG VS", "MG V80", "MG Maxus 9", "MG4"],
  "Suzuki": ["Swift", "Celerio", "Ciaz", "Ertiga", "XL7", "Jimny"],
  "BYD": ["Atto 3", "Dolphin", "Seal", "Seal U", "Seagull"],
  "GWM (Haval/Ora)": ["Haval H6", "Haval Jolion", "Ora Good Cat", "Ora 07", "Tank 300", "Tank 500"],
  "Neta": ["Neta V", "Neta V-II", "Neta U"],
  "Tesla": ["Model 3", "Model Y", "Model S", "Model X"],
  "BMW": ["2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "X1", "X3", "X4", "X5", "X7", "iX3", "iX"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS"],
  "Audi": ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "Q8", "TT", "e-tron"],
  "Porsche": ["Macan", "Cayenne", "Panamera", "Taycan", "911", "718"],
  "Volvo": ["XC40", "XC60", "XC90", "S60", "S90", "V60", "C40", "EX30"],
  "Hyundai": ["H-1", "Staria", "Creta", "Ioniq 5", "Ioniq 6"],
  "Kia": ["Carnival", "Sorento", "EV6", "EV9"],
  "Changan": ["Deepal L07", "Deepal S07", "Lumin"],
  "Wuling": ["Air EV", "Binguo EV"]
};

export const BOOKINGS_INIT = [
  { id:"PKG-001", name:"สมชาย ใจดี", phone:"081-234-5678", plate:"กข 1234 ชม", brand:"Toyota", type:"รถเก๋ง", slot:"A01", checkin:"2026-05-10", checkout:"2026-05-13", days:3, total:390, status:"confirmed" },
  { id:"PKG-002", name:"วราภรณ์ สุขใส", phone:"089-765-4321", plate:"บบ 8888 ชม", brand:"Honda", type:"รถเก๋ง", slot:"A03", checkin:"2026-05-11", checkout:"2026-05-12", days:1, total:150, status:"pending" },
  { id:"PKG-003", name:"อนุชา มานะ", phone:"085-111-2222", plate:"คค 5678 ชม", brand:"BMW", type:"รถเก๋ง", slot:"B02", checkin:"2026-05-09", checkout:"2026-05-16", days:7, total:770, status:"confirmed" },
  { id:"PKG-004", name:"นิภา รักษ์ดี", phone:"092-333-4444", plate:"งง 2468 ชม", brand:"Mercedes", type:"รถเก๋ง", slot:"A05", checkin:"2026-05-12", checkout:"2026-05-14", days:2, total:300, status:"confirmed" },
  { id:"PKG-005", name:"ธนาชัย ฟ้าใส", phone:"094-555-6666", plate:"ขข 1357 ชม", brand:"Ford", type:"รถกระบะ", slot:"B04", checkin:"2026-05-08", checkout:"2026-05-09", days:1, total:150, status:"completed" },
  { id:"PKG-006", name:"มาลี ดีใจ", phone:"086-777-8888", plate:"ฉฉ 9876 ชม", brand:"MG", type:"รถ SUV", slot:"A07", checkin:"2026-05-13", checkout:"2026-05-20", days:7, total:770, status:"confirmed" },
  { id:"PKG-007", name:"วิชัย ลือเลื่อง", phone:"091-222-3333", plate:"ซซ 1122 ชม", brand:"Isuzu", type:"รถกระบะ", slot:"B06", checkin:"2026-05-05", checkout:"2026-05-07", days:2, total:300, status:"cancelled" },
  { id:"PKG-008", name:"ปิยะ สดใส", phone:"083-444-5555", plate:"ญญ 3344 ชม", brand:"Nissan", type:"รถเก๋ง", slot:"A09", checkin:"2026-05-11", checkout:"2026-05-15", days:4, total:520, status:"pending" },
];

export const OCC_INIT = ["A01","A03","A05","A07","A09","B02","B04","B06"];

export const WEEKLY = [
  { day:"จ", rev:1200, bookings:8 }, { day:"อ", rev:950, bookings:6 },
  { day:"พ", rev:1500, bookings:10}, { day:"พฤ",rev:800, bookings:5 },
  { day:"ศ", rev:1800, bookings:12}, { day:"ส", rev:2200, bookings:15},
  { day:"อา",rev:1650, bookings:11},
];

export const STATUS_CFG = {
  confirmed: { label:"ยืนยันแล้ว", color:"text-sky-700 bg-sky-50 border-sky-200", dot:"bg-sky-500", icon:CheckCircle2 },
  pending:   { label:"รอดำเนินการ",color:"text-amber-700 bg-amber-50 border-amber-200", dot:"bg-amber-400", icon:Clock },
  completed: { label:"เสร็จสิ้น",  color:"text-violet-700 bg-violet-50 border-violet-200",dot:"bg-violet-400",icon:CheckCircle2 },
  cancelled: { label:"ยกเลิก",     color:"text-red-700 bg-red-50 border-red-200", dot:"bg-red-400", icon:XCircle },
};

export const INIT_FORM = { 
  name:"", phone:"", plate:"", brand:"", model:"", type:"รถเก๋ง", note:"", 
  period:"day", checkin: new Date().toISOString().split("T")[0], time:"09:00", 
  duration:1, extraHours:0, slot:null 
};

export const fmt = (n: number) => n.toLocaleString("th-TH");
export const fmtDate = (d: string | number | Date) => {
  const date = new Date(d);
  return date.toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"2-digit" });
};