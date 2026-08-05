export interface GroupedCarData {
  brands: string[];
  models: Record<string, string[]>;
}

export const DEFAULT_CAR_MASTER_DATA: Record<string, GroupedCarData> = {
  "รถเก๋ง (Sedan)": {
    brands: [
      "Toyota", "Honda", "Mazda", "Nissan", "Mitsubishi", "Isuzu", "Ford",
      "Hyundai", "Kia", "Subaru", "BMW", "Mercedes-Benz", "Audi", "Volvo",
      "Lexus", "MG", "Haval", "BYD", "Suzuki", "Chevrolet", "อื่นๆ"
    ],
    models: {
      Toyota: ["Corolla Cross", "Camry", "Yaris", "Yaris Ativ", "Altis", "Vios", "C-HR", "RAV4", "Fortuner", "Alphard", "Hilux"],
      Honda: ["Civic", "City", "City Hatchback", "HR-V", "CR-V", "Accord", "BR-V", "Jazz", "WR-V", "Odyssey"],
      Mazda: ["Mazda2", "Mazda3", "CX-3", "CX-5", "CX-8", "CX-9", "MX-5", "CX-30", "CX-60", "BT-50"],
      Nissan: ["Almera", "Note", "Kicks", "Navara", "Terra", "X-Trail", "Leaf", "March", "Sylphy"],
      Mitsubishi: ["Mirage", "Attrage", "Xpander", "Outlander", "Pajero Sport", "Eclipse Cross", "Triton"],
      Isuzu: ["D-Max", "MU-X", "Hi-Lander"],
      Ford: ["Ranger", "Everest", "Explorer", "Mustang", "EcoSport", "Territory", "Focus"],
      Hyundai: ["Accent", "Elantra", "Tucson", "Santa Fe", "Ioniq", "Creta", "Staria", "Kona", "Sonata", "Ioniq 5"],
      Kia: ["Picanto", "Soluto", "Sportage", "Sorento", "Stinger", "EV6", "Carnival", "Niro"],
      Subaru: ["Impreza", "Forester", "Outback", "XV", "BRZ", "Legacy", "Crosstrek", "WRX"],
      BMW: ["Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 7", "X1", "X3", "X5", "M3"],
      "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "CLA", "CLE"],
      Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8"],
      Volvo: ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90", "C40", "EX30"],
      Lexus: ["IS", "ES", "GS", "LS", "UX", "NX", "RX", "GX", "LX", "LM"],
      MG: ["MG3", "MG4", "MG5", "MG ZS", "MG HS", "MG Extender", "EP", "Maxus 9", "Cyberster"],
      Haval: ["H6", "Jolion", "H2", "Dargo", "Tank 300", "Tank 500"],
      BYD: ["Atto 3", "Dolphin", "Seal", "Sealion 6", "M6"],
      Suzuki: ["Swift", "Ciaz", "Ertiga", "XL7", "Jimny", "Celerio"],
      Chevrolet: ["Colorado", "Trailblazer", "Captiva", "Cruze", "Sonic"],
    },
  },
  "รถกระบะ (Pickup)": {
    brands: ["Toyota", "Isuzu", "Ford", "Nissan", "Mitsubishi", "Mazda", "Chevrolet", "MG", "อื่นๆ"],
    models: {
      Toyota: ["Hilux Revo", "Hilux Vigo", "Hilux CHAMP", "Hilux Tiger", "Tacoma"],
      Isuzu: ["D-Max", "D-Max V-Cross", "TFR", "Dragon Power", "Hi-Lander"],
      Ford: ["Ranger", "Ranger Raptor", "Ranger Wildtrak", "Ranger XL", "Ranger XLS"],
      Nissan: ["Navara", "Navara Black Edition", "Frontier", "NP300"],
      Mitsubishi: ["Triton", "Triton Athlete", "Strada"],
      Mazda: ["BT-50", "BT-50 Pro", "Fighter"],
      Chevrolet: ["Colorado", "Colorado High Country"],
      MG: ["Extender"],
    },
  },
  "รถกระบะตู้ทึบ (Pickup Camper)": {
    brands: ["Toyota", "Isuzu", "Ford", "Nissan", "Mitsubishi", "อื่นๆ"],
    models: {
      Toyota: ["Hilux Revo แคปทึบ", "Hilux Vigo แคปทึบ", "Hilux CHAMP แคปทึบ", "Commuter"],
      Isuzu: ["D-Max แคปทึบ", "TFR แคปทึบ"],
      Ford: ["Ranger แคปทึบ"],
      Nissan: ["Navara แคปทึบ"],
      Mitsubishi: ["Triton แคปทึบ"],
    },
  },
  "รถ SUV": {
    brands: [
      "Toyota", "Honda", "Mazda", "Nissan", "Mitsubishi", "Ford", "Hyundai",
      "Kia", "BMW", "Mercedes-Benz", "Audi", "Volvo", "Lexus", "MG", "Haval", "Subaru", "BYD", "อื่นๆ"
    ],
    models: {
      Toyota: ["Fortuner", "Corolla Cross", "Yaris Cross", "C-HR", "RAV4", "Prado", "Land Cruiser"],
      Honda: ["CR-V", "HR-V", "WR-V", "BR-V"],
      Mazda: ["CX-3", "CX-30", "CX-5", "CX-8", "CX-60"],
      Nissan: ["Kicks", "Terra", "X-Trail"],
      Mitsubishi: ["Pajero Sport", "Xpander Cross", "Outlander"],
      Ford: ["Everest", "Explorer", "Territory", "EcoSport"],
      Hyundai: ["Creta", "Santa Fe", "Palisade", "Tucson"],
      Kia: ["Sorento", "Sportage", "Carnival", "EV6"],
      BMW: ["X1", "X3", "X4", "X5", "X6", "X7", "iX3", "iX"],
      "Mercedes-Benz": ["GLA", "GLB", "GLC", "GLE", "GLS", "EQA", "EQB"],
      Audi: ["Q3", "Q5", "Q7", "Q8", "e-tron"],
      Volvo: ["XC40", "XC60", "XC90", "EX30"],
      Lexus: ["UX", "NX", "RX", "GX", "LX"],
      MG: ["ZS", "HS", "VS HEV"],
      Haval: ["H6", "Jolion", "Tank 300", "Tank 500"],
      Subaru: ["Forester", "XV", "Crosstrek", "Outback"],
      BYD: ["Atto 3", "Tang", "Sea Lion 6"],
    },
  },
  "รถไฟฟ้า (EV)": {
    brands: ["BYD", "Tesla", "MG", "GWM ORA", "AION", "Neta", "Changan", "Hyundai", "Kia", "BMW", "Mercedes-Benz", "Volvo", "Toyota", "Honda", "อื่นๆ"],
    models: {
      BYD: ["Atto 3", "Dolphin", "Seal", "Sealion 6", "M6", "Han", "Tang"],
      Tesla: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"],
      MG: ["MG4 Electric", "EP", "MG5 EV", "ZS EV", "Marvel R", "Cyberster", "Maxus 9"],
      "GWM ORA": ["Good Cat", "Good Cat GT", "07"],
      AION: ["Y Plus", "ES", "V Plus", "Hyper HT", "Hyper SSR"],
      Neta: ["Neta V", "Neta V-II", "Neta X", "Neta GT"],
      Changan: ["Deepal L07", "Deepal S07", "Lumin", "Avatr 11"],
      Hyundai: ["Ioniq 5", "Ioniq 6", "Kona Electric"],
      Kia: ["EV6", "EV9", "Niro EV"],
      BMW: ["i4", "i5", "i7", "iX", "iX1", "iX2", "iX3"],
      "Mercedes-Benz": ["EQA", "EQB", "EQE", "EQS"],
      Volvo: ["EX30", "C40 Recharge", "XC40 Recharge", "EX90"],
      Toyota: ["bZ4X"],
      Honda: ["e:N1"],
    },
  },
  "รถซุปเปอร์คาร์ (Supercar)": {
    brands: ["Porsche", "Ferrari", "Lamborghini", "McLaren", "Aston Martin", "Bentley", "Maserati", "Rolls-Royce", "BMW M", "Mercedes-AMG", "อื่นๆ"],
    models: {
      Porsche: ["911 Carrera", "911 GT3", "718 Boxster", "718 Cayman", "Taycan", "Panamera", "Cayenne Coupe"],
      Ferrari: ["296 GTB", "SF90 Stradale", "F8 Tributo", "Roma", "Portofino", "812 Superfast", "488 GTB"],
      Lamborghini: ["Huracán", "Huracán Sterrato", "Revuelto", "Urus", "Aventador"],
      McLaren: ["720S", "750S", "Artura", "GT", "765LT"],
      "Aston Martin": ["Vantage", "DB12", "DBS", "DBX 707"],
      Bentley: ["Continental GT", "Flying Spur", "Bentayga"],
      Maserati: ["MC20", "GranTurismo", "Grecale", "Ghibli"],
      "Rolls-Royce": ["Ghost", "Phantom", "Cullinan", "Spectre"],
      "BMW M": ["M2", "M3", "M4", "M5", "M8", "XM"],
      "Mercedes-AMG": ["AMG GT", "AMG SL", "C 63 AMG", "G 63 AMG"],
    },
  },
};
