const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jkibbcyrohqgbdvnljcx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpraWJiY3lyb2hxZ2Jkdm5samN4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc4MzE5MywiZXhwIjoyMDk1MzU5MTkzfQ.uq1kpLlcmSQDgPpkyN6EBkX8KHgv9YeBLZBItut3IGI';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const CAR_DATA = {
  "รถเก๋ง (Sedan)": {
    type: "sedan",
    brands: ["Toyota","Honda","Mazda","Nissan","Mitsubishi","Isuzu","Ford","Hyundai","Kia","Subaru","BMW","Mercedes-Benz","Audi","Volvo","Lexus","MG","Haval","BYD","Suzuki","Chevrolet"],
    models: {
      Toyota: ["Corolla Cross","Camry","Yaris","Altis","Vios","C-HR","RAV4","Fortuner","Alphard","Hilux"],
      Honda: ["Civic","City","HR-V","CR-V","Accord","BR-V","Jazz","WR-V","Odyssey","Pilot"],
      Mazda: ["Mazda2","Mazda3","CX-3","CX-5","CX-8","CX-9","MX-5","CX-30","CX-60","BT-50"],
      Nissan: ["Almera","Note","Kicks","Navara","Terra","X-Trail","Leaf","March","Sylphy","Murano"],
      Mitsubishi: ["Mirage","Attrage","Xpander","Outlander","Pajero Sport","Eclipse Cross","Triton","Galant","Lancer","Montero"],
      Isuzu: ["D-Max","MU-X","Cameo","Hi-Lander","Rodeo","TFR","M-UX","Spark","KB","NHR"],
      Ford: ["Ranger","Everest","Explorer","Mustang","EcoSport","Territory","Maverick","Bronco","F-150","Focus"],
      Hyundai: ["Accent","Elantra","Tucson","Santa Fe","Ioniq","Creta","Staria","Kona","Sonata","Ioniq 5"],
      Kia: ["Picanto","Soluto","Sportage","Sorento","Stinger","EV6","Carnival","Niro","Sonet","Telluride"],
      Subaru: ["Impreza","Forester","Outback","XV","BRZ","Legacy","Crosstrek","WRX","Ascent","Tribeca"],
      BMW: ["Series 1","Series 2","Series 3","Series 4","Series 5","Series 7","X1","X3","X5","M3"],
      "Mercedes-Benz": ["A-Class","C-Class","E-Class","S-Class","GLA","GLB","GLC","GLE","GLS","AMG GT"],
      Audi: ["A3","A4","A5","A6","A7","A8","Q3","Q5","Q7","Q8"],
      Volvo: ["S60","S90","V60","V90","XC40","XC60","XC90","C40","EC40","EX90"],
      Lexus: ["IS","ES","GS","LS","UX","NX","RX","GX","LX","RC"],
      MG: ["MG3","MG5","MG ZS","MG HS","MG Extender","EP","Marvel R","Cyberster","5","RX5"],
      Haval: ["H6","Jolion","H2","F7","F7x","Big Dog","Dargo","H9","F5","H4"],
      BYD: ["Atto 3","Han","Tang","Sea Lion","Dolphin","Seal","Sealion 6","Shark","F3","Destroyer 05"],
      Suzuki: ["Swift","Ciaz","Vitara","Ertiga","XL7","Fronx","Jimny","Dzire","S-Presso","Celerio"],
      Chevrolet: ["Trailblazer","Colorado","Captiva","Cruze","Sonic","Spark","Trax","Equinox","Traverse","Blazer"],
    }
  },
  "รถกระบะ (Pickup)": {
    type: "pickup",
    brands: ["Toyota","Isuzu","Ford","Nissan","Mitsubishi","Mazda","Chevrolet","MG"],
    models: {
      Toyota: ["Hilux Revo","Hilux Vigo","Hilux CHAMP","Tundra","Tacoma"],
      Isuzu: ["D-Max","TFR","KB","NHR","Rodeo"],
      Ford: ["Ranger","Ranger Raptor","Ranger Wildtrak","Ranger XL","Maverick"],
      Nissan: ["Navara","Frontier","Titan","NP300"],
      Mitsubishi: ["Triton","L200","Strada","Colt"],
      Mazda: ["BT-50","BT-50 Pro"],
      Chevrolet: ["Colorado","S10"],
      MG: ["Extender","Commander"],
    }
  },
  "รถกระบะตู้ทึบ (Pickup Camper)": {
    type: "pickup",
    brands: ["Toyota","Isuzu","Ford","Nissan","Mitsubishi"],
    models: {
      Toyota: ["Hilux Revo แคปทึบ","Hilux Vigo แคปทึบ","Commuter"],
      Isuzu: ["D-Max แคปทึบ","TFR แคปทึบ"],
      Ford: ["Ranger แคปทึบ","Everest"],
      Nissan: ["Navara แคปทึบ","Patrol"],
      Mitsubishi: ["Triton แคปทึบ","Pajero Sport"],
    }
  },
  "รถ SUV": {
    type: "suv",
    brands: ["Toyota","Honda","Mazda","Nissan","Mitsubishi","Ford","Hyundai","Kia","BMW","Mercedes-Benz","Audi","Volvo","Lexus","MG","Haval","Subaru","BYD"],
    models: {
      Toyota: ["Fortuner","RAV4","C-HR","Yaris Cross","Corolla Cross","Prado","Land Cruiser","Highlander"],
      Honda: ["CR-V","HR-V","Pilot","Passport","Ridgeline","WR-V"],
      Mazda: ["CX-3","CX-5","CX-8","CX-9","CX-30","CX-60","CX-90"],
      Nissan: ["Kicks","X-Trail","Murano","Rogue","Pathfinder","Terra","Patrol"],
      Mitsubishi: ["Outlander","Pajero Sport","Eclipse Cross","ASX","Montero"],
      Ford: ["EcoSport","Escape","Territory","Explorer","Everest","Bronco"],
      Hyundai: ["Tucson","Santa Fe","Creta","Venue","Palisade","Ioniq 5"],
      Kia: ["Sportage","Sorento","Telluride","Mohave","EV6","Niro"],
      BMW: ["X1","X2","X3","X4","X5","X6","X7","iX3","iX"],
      "Mercedes-Benz": ["GLA","GLB","GLC","GLE","GLS","EQA","EQB","EQC"],
      Audi: ["Q3","Q5","Q7","Q8","e-tron","SQ5","RS Q8"],
      Volvo: ["XC40","XC60","XC90","EX40","EX90","C40"],
      Lexus: ["UX","NX","RX","GX","LX","RZ"],
      MG: ["ZS","HS","VS","RX5","Marvel R"],
      Haval: ["H6","Jolion","Dargo","H9","Big Dog"],
      Subaru: ["Forester","Outback","XV","Crosstrek","Solterra","Ascent"],
      BYD: ["Atto 3","Tang","Sea Lion","Sealion 6","Song Plus"],
    }
  },
  "รถไฟฟ้า (EV)": {
    type: "ev",
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
    type: "supercar",
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
  }
};

const BOOKINGS_INIT = [
  { name:"สมชาย ใจดี", phone:"081-234-5678", plate:"กข 1234 ชม", brand:"Toyota", type:"รถเก๋ง", slot:"A01", checkin:"2026-05-10", checkout:"2026-05-13", total:390, status:"confirmed" },
  { name:"วราภรณ์ สุขใส", phone:"089-765-4321", plate:"บบ 8888 ชม", brand:"Honda", type:"รถเก๋ง", slot:"A03", checkin:"2026-05-11", checkout:"2026-05-12", total:150, status:"pending" },
  { name:"อนุชา มานะ", phone:"085-111-2222", plate:"คค 5678 ชม", brand:"BMW", type:"รถเก๋ง", slot:"B02", checkin:"2026-05-09", checkout:"2026-05-16", total:770, status:"confirmed" },
  { name:"นิภา รักษ์ดี", phone:"092-333-4444", plate:"งง 2468 ชม", brand:"Mercedes", type:"รถเก๋ง", slot:"A05", checkin:"2026-05-12", checkout:"2026-05-14", total:300, status:"confirmed" },
  { name:"ธนาชัย ฟ้าใส", phone:"094-555-6666", plate:"ขข 1357 ชม", brand:"Ford", type:"รถกระบะ", slot:"B04", checkin:"2026-05-08", checkout:"2026-05-09", total:150, status:"completed" },
  { name:"มาลี ดีใจ", phone:"086-777-8888", plate:"ฉฉ 9876 ชม", brand:"MG", type:"รถ SUV", slot:"A07", checkin:"2026-05-13", checkout:"2026-05-20", total:770, status:"confirmed" },
  { name:"วิชัย ลือเลื่อง", phone:"091-222-3333", plate:"ซซ 1122 ชม", brand:"Isuzu", type:"รถกระบะ", slot:"B06", checkin:"2026-05-05", checkout:"2026-05-07", total:300, status:"cancelled" },
  { name:"ปิยะ สดใส", phone:"083-444-5555", plate:"ญญ 3344 ชม", brand:"Nissan", type:"รถเก๋ง", slot:"A09", checkin:"2026-05-11", checkout:"2026-05-15", total:520, status:"pending" },
];

async function run() {
  console.log("=== START DATABASE SEEDING ===");

  // 1. SEED CAR MODELS
  console.log("\n1. Seeding car_models...");
  const { data: existingCars, error: getCarsErr } = await supabase
    .from('car_models')
    .select('brand, model');

  if (getCarsErr) {
    console.error("Error fetching existing car models:", getCarsErr);
    return;
  }

  const existingSet = new Set(
    existingCars.map(c => `${c.brand.toLowerCase()}_${c.model.toLowerCase()}`)
  );

  const newCarRows = [];
  for (const [key, val] of Object.entries(CAR_DATA)) {
    const type = val.type;
    for (const brand of val.brands) {
      const modelsList = val.models[brand] || [];
      for (const model of modelsList) {
        const checkKey = `${brand.toLowerCase()}_${model.toLowerCase()}`;
        if (!existingSet.has(checkKey)) {
          newCarRows.push({
            brand,
            model,
            type
          });
        }
      }
    }
  }

  console.log(`Found ${newCarRows.length} new car models to insert.`);

  if (newCarRows.length > 0) {
    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < newCarRows.length; i += batchSize) {
      const batch = newCarRows.slice(i, i + batchSize);
      const { error: insertErr } = await supabase
        .from('car_models')
        .insert(batch);

      if (insertErr) {
        console.error(`Error inserting batch starting at index ${i}:`, insertErr);
      } else {
        console.log(`Inserted batch ${i} to ${Math.min(i + batchSize, newCarRows.length)}`);
      }
    }
  } else {
    console.log("No new car models to insert.");
  }

  // 2. SEED BOOKINGS
  console.log("\n2. Seeding bookings...");
  
  // Get parking slots mapping
  const { data: slots, error: slotsErr } = await supabase
    .from('parking_slots')
    .select('id, number');

  if (slotsErr) {
    console.error("Error fetching parking slots:", slotsErr);
    return;
  }

  // Create number -> id map. E.g. "A-001" -> "UUID"
  const slotsMap = {};
  slots.forEach(s => {
    slotsMap[s.number] = s.id;
  });

  // Get Walk-in Customer User ID
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'walkin@skycarpark.com')
    .limit(1);

  if (usersErr) {
    console.error("Error fetching walk-in user:", usersErr);
    return;
  }

  const userId = users.length > 0 ? users[0].id : 'fe346324-ff72-4656-9f0a-478da7c91afa';
  console.log("Using user_id for bookings:", userId);

  // Get existing bookings to avoid duplicates
  const { data: existingBookings, error: getBookingsErr } = await supabase
    .from('bookings')
    .select('customer_name, start_time');

  if (getBookingsErr) {
    console.error("Error fetching existing bookings:", getBookingsErr);
    return;
  }

  const existingBookingSet = new Set(
    existingBookings.map(b => `${b.customer_name}_${b.start_time}`)
  );

  const newBookings = [];
  for (const b of BOOKINGS_INIT) {
    // Map slot name: e.g. "A01" -> "A-001"
    const slotLetter = b.slot.substring(0, 1);
    const slotNumberStr = b.slot.substring(1).padStart(3, '0');
    const slotCode = `${slotLetter}-${slotNumberStr}`;
    const slotId = slotsMap[slotCode];

    if (!slotId) {
      console.warn(`Warning: slot code ${slotCode} not found in database!`);
      continue;
    }

    // Map vehicle type: "รถเก๋ง" -> "sedan", "รถกระบะ" -> "pickup", "รถ SUV" -> "suv"
    let vehicleType = 'sedan';
    if (b.type.includes('กระบะ')) vehicleType = 'pickup';
    else if (b.type.includes('SUV')) vehicleType = 'suv';

    // Dates
    const startTimeStr = `${b.checkin}T09:00:00`;
    const endTimeStr = `${b.checkout}T09:00:00`;

    const checkKey = `${b.name}_${startTimeStr}`;
    if (!existingBookingSet.has(checkKey)) {
      newBookings.push({
        user_id: userId,
        slot_id: slotId,
        start_time: startTimeStr,
        end_time: endTimeStr,
        status: b.status.toUpperCase() === 'COMPLETED' ? 'CONFIRMED' : b.status.toUpperCase(),
        customer_name: b.name,
        customer_phone: b.phone,
        vehicle_plate: b.plate,
        vehicle_brand: b.brand,
        vehicle_model: b.brand === 'Toyota' ? 'Yaris' : b.brand === 'Honda' ? 'Civic' : b.brand === 'Ford' ? 'Ranger' : b.brand === 'BMW' ? 'Series 3' : b.brand === 'Mercedes' ? 'C-Class' : b.brand === 'MG' ? 'ZS' : b.brand === 'Isuzu' ? 'D-Max' : 'Model S',
        vehicle_type: vehicleType,
        fee: b.total,
        is_walk_in: true
      });
    }
  }

  console.log(`Found ${newBookings.length} new bookings to insert.`);

  if (newBookings.length > 0) {
    const { error: insertBookingErr } = await supabase
      .from('bookings')
      .insert(newBookings);

    if (insertBookingErr) {
      console.error("Error inserting bookings:", insertBookingErr);
    } else {
      console.log(`Successfully inserted ${newBookings.length} bookings.`);
    }
  } else {
    console.log("No new bookings to insert.");
  }

  console.log("\n=== DATABASE SEEDING COMPLETED ===");
}

run();
