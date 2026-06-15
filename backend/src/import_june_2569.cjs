/**
 * import_june_2569.cjs — นำเข้าข้อมูลการจองจริง "เดือนมิถุนายน 2569"
 * อ่านจากไฟล์ CSV จริง (export จาก Google Sheet) → data/june_2569.csv
 *
 * Layout CSV (0-based): 0 วันที่บันทึก | 1 วันเข้า | 2 เวลาเข้า | 3 วันออก | 4 เวลาออก
 *   | 5 จำนวนวัน(หรือรหัสช่องจอด) | 6 OT | 7 ชื่อ | 8 ยี่ห้อ/รุ่น | 9 ทะเบียน
 *   | 10 เส้นทาง | 11 ช่องทาง | 12 เบอร์ | 13 หมายเหตุ
 *
 * กติกา:
 *  - ปี พ.ศ.(ย่อ) → ค.ศ.  CE = 1957 + YY  (69 → 2026)
 *  - กรองเฉพาะ "วันเข้า หรือ วันออก" อยู่ในเดือน มิ.ย. 2026
 *  - base_price = DAY_RATES[จำนวนวัน] (ตารางขั้นบันได) · ot_fee = 50 ถ้า OT
 *  - discount = 100 ถ้าหมายเหตุมี "ลูกค้าเก่า 100"/"โปร 100" · total = max(0, base+ot-disc)
 *  - ช่อง "จำนวนวัน" ที่เป็นรหัส (FD2011/VZ104/...) = รหัสช่องจอด → ใช้เป็น slot, days คำนวณจากวันที่
 *  - ลูกค้า: จับคู่ด้วย (ชื่อ+เบอร์) → users.id เดิม (1 ลูกค้าหลายคันได้)
 *  - สร้าง parking_slot ใหม่ทุก booking (zone 'LOG') · status เก็บ 'CONFIRMED' (สถานะจริง derive ตอน render)
 *
 * รัน:  node src/import_june_2569.cjs --dry   |   node src/import_june_2569.cjs
 */
const fs = require('fs');
const path = require('path');
const { makeClient } = require('./_pg.cjs');
const DRY = process.argv.includes('--dry');
const WALKIN_USER_ID = 'fe346324-ff72-4656-9f0a-478da7c91afa';
const CSV_PATH = path.join(__dirname, '..', 'data', 'june_2569.csv');

const DAY_RATES = { 1:150,2:300,3:390,4:520,5:650,6:660,7:770,8:880,9:990,10:1100,11:1100,12:1000,13:1300,14:1400,15:1500,16:1600,17:1700,18:1800,19:1900 };
const DAY_RATES_EXTRA = { 1:225,2:375,3:455,4:585,5:715,6:715,7:825,8:935,9:1045,10:1155,11:1150,12:1050,13:1350,14:1450,15:1550,16:1650,17:1750,18:1850,19:1950 };

const isDate = s => /^\d{1,2}\/\d{1,2}\/\d{2}$/.test((s || '').trim());
const cleanTime = s => {
  const m = (s || '').match(/(\d{1,2})[.:](\d{2})/);
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : '00:00';
};
function thaiToIso(dateStr, timeStr) {
  const m = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  const ce = 1957 + parseInt(m[3], 10);                       // 69 → 2026
  const t = cleanTime(timeStr);
  const iso = `${ce}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}T${t}:00`;
  return { ce, month: parseInt(m[2],10), iso, date: new Date(iso) };
}
const daysBetween = (ci, co) => Math.max(1, Math.ceil((co - ci) / 86400000));
function basePrice(days) {
  const whole = Math.floor(days), half = days - whole >= 0.4;
  if (whole >= 20) return Math.ceil(whole/30)*2000;
  if (half) return DAY_RATES_EXTRA[whole] ?? (DAY_RATES[whole] ?? 150)+75;
  return DAY_RATES[whole] ?? 150;
}
function classify(car) {
  const c = (car||'').toLowerCase();
  if (/tesla|byd|neta|good ?cat|\bev\b|ioniq|sealion|tank ?300|lumi/.test(c)) return /tank/.test(c)?'suv':'ev';
  if (/d.?max|tfr|vigo|revo|hilux|ranger|triton|bt-?50|navara|colorado|v-?cross|commuter|wish/.test(c)) return /commuter|wish/.test(c)?'van':'pickup';
  if (/hrv|hr-v|crv|cr-v|cx-?\d|cx5|fortuner|pajero|mu-?\d|mu-?x|cross|h6|veloz|juke|c-?hr|chr|cooper/.test(c)) return 'suv';
  return 'sedan';
}
const parseProvince = p => { const a=(p||'').trim().split(/\s+/); return a.length>=2?a[a.length-1]:''; };
const splitCar = car => { const [b,...r]=car.trim().split(/\s+/); return { brand:b, model:r.join(' ') }; };

// สถานะ live ตามวัน vs วันนี้ → map เป็น DB status เพื่อ route ไปหน้าที่ถูก:
//  upcoming(ส้ม) → CONFIRMED  (หน้าการจอง/รอเข้าจอด)
//  parking(เขียว)/checkout(แดง) → PARKED  (หน้าช่องจอดรถ — รอแอดมินยืนยันชำระเงิน)
//  completed(เลยวันออก) → COMPLETED  (หน้าประวัติลูกค้า = เสร็จสิ้น)
function liveStatusOf(ci, co, now) {
  const ds = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const t = ds(now), x = ds(ci), y = ds(co);
  if (t < x) return 'upcoming';
  if (t > y) return 'completed';
  if (t === y) return 'checkout';
  return 'parking';
}
const LIVE_TO_DB = { upcoming: 'CONFIRMED', parking: 'PARKED', checkout: 'PARKED', completed: 'COMPLETED' };
const DB_TO_SLOT = { CONFIRMED: 'RESERVED', PARKED: 'OCCUPIED', COMPLETED: 'AVAILABLE' };

// ─── parse CSV ───────────────────────────────────────────────────────────────
function parseCsv() {
  const txt = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, '');
  const lines = txt.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const f = line.split(',').map(s => s.trim());
    const inDate = f[1], inTime = f[2], name = f[7];
    if (!isDate(inDate) || !name) continue;          // ข้าม header/แถวว่าง
    // วันออก: ปกติ col3 เป็นวันที่ ถ้าไม่ใช่ (ในชีตเว้นว่าง) → เวลาออกอยู่ใน col3, ประเมินวันเดียว
    let outDate = f[3], outTime = f[4], outNote = '';
    if (!isDate(outDate)) { outTime = f[3]; outDate = inDate; outNote = ' (วันออกในชีตว่าง—ประเมิน)'; }
    // col5 = จำนวนวัน หรือ รหัสช่องจอด
    const c5 = f[5] || '';
    const daysNum = /^\d+(\.\d+)?$/.test(c5) ? parseFloat(c5) : null;
    const slot = (!daysNum && c5) ? c5 : null;
    rows.push({
      inDate, inTime, outDate, outTime,
      daysNum, slot,
      ot: (f[6] || '').toUpperCase().includes('OT'),
      name, car: f[8] || '-', plate: f[9] || '-',
      route: f[10] || 'มหิดล', channel: f[11] || '', phone: (f[12] || '').replace(/\s/g,''),
      note: (f[13] || '') + outNote,
    });
  }
  return rows;
}

async function run() {
  const c = makeClient();
  await c.connect();
  console.log(`=== IMPORT มิ.ย. 2569 (จาก CSV จริง) ${DRY ? '(DRY RUN)' : ''} ===`);

  // ── parse + filter ──
  const raw = parseCsv();
  const parsed = [];
  let skipped = 0;
  for (const r of raw) {
    const ci = thaiToIso(r.inDate, r.inTime), co = thaiToIso(r.outDate, r.outTime);
    const inJune = p => p.ce === 2026 && p.month === 6;
    if (!(inJune(ci) || inJune(co))) { skipped++; continue; }
    const days = r.daysNum ?? daysBetween(ci.date, co.date);
    const base = basePrice(days);
    const ot = r.ot ? 50 : 0;
    const hasDisc = /ลูกค้าเก่า\s*100|โปร\s*100/.test(r.note);
    const discount = hasDisc ? 100 : 0;
    const total = Math.max(0, base + ot - discount);
    parsed.push({ ...r, ci, co, days, base, ot, discount, discountReason: hasDisc ? r.note.replace(/\s*\(วันออก.*$/,'') : null, total });
  }
  console.log(`อ่าน CSV: ${raw.length} แถว · กรองผ่าน (มิ.ย.69): ${parsed.length} · ข้าม: ${skipped}`);

  console.log('\n--- ตัวอย่าง 3 รายการ ---');
  for (const p of parsed.slice(0, 3)) {
    console.log(`${p.name} · ${p.car} · ${p.plate} · ${p.phone}`);
    console.log(`  เข้า ${p.ci.iso}  ออก ${p.co.iso}  | วัน ${p.days}${p.ot?' · OT':''}${p.slot?' · slot '+p.slot:''}`);
    console.log(`  ราคา base ${p.base} + ot ${p.ot} - ลด ${p.discount} = รวม ${p.total}`);
  }

  const custKey = (n, ph) => `${(n||'').trim()}|${(ph||'').trim()}`;
  if (DRY) {
    const keys = new Set(); let dup = 0;
    for (const p of parsed) { const k = custKey(p.name,p.phone); if (keys.has(k)) dup++; else keys.add(k); }
    console.log(`\n[DRY] ลูกค้าไม่ซ้ำ (ชื่อ+เบอร์): ${keys.size} · แถวคันเพิ่ม/ลูกค้าซ้ำ: ${dup}`);
    console.log(`[DRY] รวม total_price: ฿${parsed.reduce((s,p)=>s+p.total,0).toLocaleString()}`);
    await c.end(); return;
  }

  // ── migration (idempotent) ──
  await c.query(`
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS base_price integer;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ot_fee integer DEFAULT 0;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount integer DEFAULT 0;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_reason text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_price integer;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contact_channel text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS route text;
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source text DEFAULT 'app';
  `);
  console.log('✓ migration applied');

  // ── ลบ logbook เดิม + คืนช่องจอดจริงให้ว่าง + ลบ zone LOG เก่า + ลูกค้า orphan ──
  const oldSlots = await c.query(`SELECT slot_id FROM bookings WHERE source='logbook' AND slot_id IS NOT NULL`);
  const delB = await c.query(`DELETE FROM bookings WHERE source='logbook'`);
  const usedIds = oldSlots.rows.map(r => r.slot_id);
  if (usedIds.length) await c.query(`UPDATE parking_slots SET status='AVAILABLE' WHERE id = ANY($1)`, [usedIds]);
  await c.query(`DELETE FROM parking_slots WHERE zone_id IN (SELECT id FROM parking_zones WHERE name='LOG')`);
  await c.query(`DELETE FROM parking_zones WHERE name='LOG'`);
  const delU = await c.query(
    `DELETE FROM users WHERE role='CUSTOMER' AND phone IS NOT NULL
       AND id NOT IN (SELECT user_id FROM bookings WHERE user_id IS NOT NULL)`);
  console.log(`✓ ลบของเดิม: booking ${delB.rowCount} · คืนช่องจอด ${usedIds.length} · ลูกค้า orphan ${delU.rowCount}`);

  // ── เตรียมคิวช่องจอดจริง (A1/A2/B/C) เพื่อ assign ให้รายการที่ยัง active/upcoming ──
  // → กริดช่องจอด + การ์ดภาพรวม + หน้าช่องจอดรถ จะสัมพันธ์กัน (รถที่จอด = ช่องไม่ว่าง)
  const realSlots = await c.query(
    `SELECT ps.id, z.name AS zone FROM parking_slots ps
       JOIN parking_zones z ON z.id = ps.zone_id
      WHERE z.name IN ('A1','A2','B','C') ORDER BY z.name, ps.number`);
  const slotQ = { A1: [], A2: [], B: [], C: [] };
  for (const s of realSlots.rows) slotQ[s.zone]?.push(s.id);
  const zonePref = {
    supercar: ['A1','A2','B','C'], ev: ['A2','B','C','A1'], sedan: ['A2','B','C','A1'],
    suv: ['C','B','A2','A1'], pickup: ['C','B','A2','A1'], pickup_closed: ['C','B','A2','A1'],
    van: ['C','B','A2','A1'],
  };
  const takeSlot = vtype => {
    for (const z of (zonePref[vtype] || ['B','A2','C','A1'])) if (slotQ[z]?.length) return slotQ[z].shift();
    return null; // ช่องเต็มทุกโซน
  };

  // ── customer dedup ──
  const seen = new Map();
  const ex = await c.query(`SELECT id, name, phone FROM users WHERE phone IS NOT NULL`);
  for (const u of ex.rows) seen.set(custKey(u.name, u.phone), u.id);
  let newCust = 0, matched = 0;
  async function getCustomerId(name, phone) {
    if (!phone) return WALKIN_USER_ID;                // ไม่มีเบอร์ → ลูกค้า walk-in รวม
    const k = custKey(name, phone);
    if (seen.has(k)) { matched++; return seen.get(k); }
    const ins = await c.query(`INSERT INTO users (name, phone, role) VALUES ($1,$2,'CUSTOMER') RETURNING id`, [name, phone]);
    newCust++; seen.set(k, ins.rows[0].id); return ins.rows[0].id;
  }

  const now = new Date();
  const statusCount = { CONFIRMED: 0, PARKED: 0, COMPLETED: 0 };
  let inserted = 0, noSlot = 0;
  for (const p of parsed) {
    const userId = await getCustomerId(p.name, p.phone);
    const dbStatus = LIVE_TO_DB[liveStatusOf(p.ci.date, p.co.date, now)];
    statusCount[dbStatus]++;
    const vtype = classify(p.car);
    // assign ช่องจอดจริงเฉพาะรายการที่ยัง active: PARKED→OCCUPIED, CONFIRMED→RESERVED
    // COMPLETED (รับรถออกแล้ว) → ไม่ยึดช่อง (slot_id = null)
    let slotId = null;
    if (dbStatus === 'PARKED' || dbStatus === 'CONFIRMED') {
      slotId = takeSlot(vtype);
      if (slotId) await c.query(`UPDATE parking_slots SET status=$1 WHERE id=$2`,
        [dbStatus === 'PARKED' ? 'OCCUPIED' : 'RESERVED', slotId]);
      else noSlot++;
    }
    const { brand, model } = splitCar(p.car);
    // remarks เว้นว่าง (NULL) — สงวนไว้ให้ลูกค้าจองออนไลน์ใส่หมายเหตุเองเท่านั้น
    // route/ช่องทาง/เหตุผลส่วนลด เก็บในคอลัมน์ route, contact_channel, discount_reason แยกอยู่แล้ว
    await c.query(
      `INSERT INTO bookings
        (user_id, slot_id, start_time, end_time, status, customer_name, customer_phone,
         vehicle_plate, vehicle_province, vehicle_brand, vehicle_model, vehicle_type,
         fee, is_walk_in, remarks, base_price, ot_fee, discount, discount_reason,
         total_price, contact_channel, route, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,NULL,$14,$15,$16,$17,$18,$19,$20,'logbook')`,
      [userId, slotId, p.ci.iso, p.co.iso, dbStatus, p.name, p.phone || null,
       p.plate, parseProvince(p.plate), brand, model, vtype,
       p.total, p.base, p.ot, p.discount, p.discountReason, p.total, p.channel, p.route]);
    inserted++;
  }

  console.log(`\n✓ insert booking: ${inserted} แถว`);
  console.log(`✓ ลูกค้าใหม่: ${newCust} · จับคู่ลูกค้าเดิม: ${matched} แถว`);
  console.log(`✓ route ตามสถานะ (ณ วันนี้): รอเข้าจอด(CONFIRMED) ${statusCount.CONFIRMED} · กำลังจอด/ออกวันนี้(PARKED) ${statusCount.PARKED} · เสร็จสิ้น(COMPLETED) ${statusCount.COMPLETED}`);
  console.log(`รวม total_price: ฿${parsed.reduce((s,p)=>s+p.total,0).toLocaleString()}`);
  await c.end();
  console.log('=== เสร็จสิ้น ===');
}
run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
