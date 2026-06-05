import { useState, useRef } from "react";

// ── 1. ตั้งค่าระยะเวลาแจ้งเตือน ──
// ระยะเวลาที่การแจ้งเตือนจะแสดงบนหน้าจอ (หน่วยเป็นมิลลิวินาที 3000 = 3 วินาที)
// แก้ไขตรงจุดนี้: ถ้าอยากให้แจ้งเตือนโชว์นานขึ้น เช่น 5 วินาที ให้แก้เป็น 5000
export const NOTIFICATION_DURATION = 3000;

// ตัว Hook หลักสำหรับระบบแจ้งเตือน
export function useNotification() {
  // notifications: เก็บรายการแจ้งเตือนทั้งหมดที่กำลังแสดงอยู่ (เป็น Array เผื่อมีการแจ้งเตือนเด้งพร้อมกันหลายอัน)
  const [notifications, setNotifications] = useState<any[]>([]);
  // notifCounter: ตัวนับ ID เพื่อให้แจ้งเตือนแต่ละอันมี ID ไม่ซ้ำกัน (ป้องกันบั๊กเวลาซ่อน/ลบ)
  const notifCounter = useRef(0);

  // ── 2. ฟังก์ชันเรียกโชว์แจ้งเตือน ──
  const addNotif = (title: string, message: string, type = "error") => {
    const id = ++notifCounter.current;
    // นำการแจ้งเตือนใหม่ ไปต่อท้ายรายการเดิมที่มีอยู่
    setNotifications((prev) => [...prev, { id, title, message, type }]);
    
    // ตั้งเวลา (setTimeout) ให้ลบการแจ้งเตือนนี้ทิ้ง (ซ่อนอัตโนมัติ) เมื่อเวลาผ่านไปตาม NOTIFICATION_DURATION
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, NOTIFICATION_DURATION);
  };

  // ── 3. ฟังก์ชันปิดแจ้งเตือน (กรณีผู้ใช้กดกากบาทปิดเอง) ──
  const dismissNotif = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return { notifications, addNotif, dismissNotif };
}