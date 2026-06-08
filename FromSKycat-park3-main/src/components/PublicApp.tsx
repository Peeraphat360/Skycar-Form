import React from "react";
import { useBookingForm } from "../hooks/useBookingForm";
import { useNotification } from "../hooks/useNotification";
import AppHeader from "./AppHeader";
import BookingForm from "./BookingForm";
import ReceiptPage from "./ReceiptPage";
import { Toast } from "./ui/Toast"; // เปลี่ยนให้ตรงกับชื่อไฟล์ที่คุณแยกใน /components/ui

// ─── Main Component ───
export default function PublicApp(props: any) {
  const { notifications, addNotif, dismissNotif } = useNotification();
  const booking = useBookingForm(addNotif);

  if (booking.submitted) {
    return (
      <ReceiptPage
        data={booking.receiptData}
        notifications={notifications}
        onDismiss={dismissNotif}
        onNewBooking={booking.resetForm}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Sarabun',system-ui,sans-serif]">
      <Toast notifications={notifications} onDismiss={dismissNotif} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%2394a3b8'%3E%3Cpath d='M4.5 6L8 9.5 11.5 6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 36px !important; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
        /* ซ่อนไอคอนปฏิทินของ browser (Chrome/Edge) — เหลือไอคอนที่เราวางเอง
           แต่ทำให้พื้นที่ทั้งช่องยังกดเปิดปฏิทินได้ (indicator โปร่งใสคลุมเต็มช่อง) */
        input[type=date] { position: relative; }
        input[type=date]::-webkit-calendar-picker-indicator {
          position: absolute; inset: 0; width: 100%; height: 100%;
          margin: 0; padding: 0; opacity: 0; cursor: pointer;
        }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>

      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <BookingForm booking={booking} addNotif={addNotif} />
      </main>
    </div>
  );
}