# ใช้ Image ที่คุณเพิ่ง Pull มา
FROM node:22-slim

# กำหนดโฟลเดอร์ทำงานใน Container
WORKDIR /app

# คัดลอกไฟล์จัดการแพ็กเกจ
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกโค้ดทั้งหมด
COPY . .

# เปิดพอร์ตสำหรับ Vite (ปกติคือ 5173)
EXPOSE 5173

# รันคำสั่ง dev
CMD ["npm", "run", "dev", "--", "--host"]