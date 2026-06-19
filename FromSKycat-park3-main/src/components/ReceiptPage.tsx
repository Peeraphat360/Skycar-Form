import React, { useRef } from "react";
import { Toast } from "./ui/Toast";
import ReceiptCard, { ReceiptData } from "./ReceiptCard";

interface ReceiptPageProps {
  data: ReceiptData;
  notifications: any[];
  onDismiss: (id: number) => void;
  onNewBooking: () => void;
}

// ─── ReceiptPage Component (หน้าจอแสดงผลหลังจองสำเร็จ) ───
export default function ReceiptPage({
  data,
  notifications,
  onDismiss,
  onNewBooking,
}: ReceiptPageProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Prompt:wght@600;700&display=swap');

        .receipt-page-root {
          font-family: 'Sarabun', sans-serif;
        }

        /* ── Header success banner ── */
        .success-banner {
          position: relative;
          overflow: hidden;
        }
        .success-banner::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.10) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.07) 0%, transparent 50%);
          pointer-events: none;
        }
        .success-banner::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0; right: 0;
          height: 18px;
          background: #f8fafc;
          clip-path: ellipse(55% 100% at 50% 100%);
        }

        /* ── Pulse ring on checkmark ── */
        .check-ring {
          animation: ring-pulse 2.4s ease-out infinite;
        }
        @keyframes ring-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.45); }
          60%  { box-shadow: 0 0 0 14px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }

        /* ── Receipt wrapper: card with slight lift ── */
        .receipt-wrapper {
          background: #ffffff;
          border-radius: 20px;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.06),
            0 8px 32px rgba(2,132,199,0.10),
            0 0 0 1px rgba(0,0,0,0.04);
          overflow: hidden;
        }

        /* ── Ticket perforation line ── */
        .perforation {
          display: flex;
          align-items: center;
          gap: 0;
          margin: 0;
        }
        .perf-circle {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #f8fafc;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
        }
        .perf-line {
          flex: 1;
          border-top: 2px dashed #e2e8f0;
        }

        /* ── Bottom action bar ── */
        .action-bar {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.06);
        }

        /* ── Download button ── */
        .btn-download {
          background: linear-gradient(135deg, #0369a1, #0284c7);
          box-shadow: 0 4px 16px rgba(3,105,161,0.30), 0 1px 3px rgba(3,105,161,0.20);
          transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .btn-download:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(3,105,161,0.38), 0 2px 6px rgba(3,105,161,0.22);
        }
        .btn-download:active:not(:disabled) {
          transform: scale(0.97);
          box-shadow: 0 2px 8px rgba(3,105,161,0.20);
        }
        .btn-download:disabled { opacity: 0.65; }

        /* ── New booking button ── */
        .btn-new {
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          transition: all 0.15s ease;
        }
        .btn-new:hover {
          border-color: #bae6fd;
          background: #f0f9ff;
          color: #0369a1;
          transform: translateY(-1px);
        }
        .btn-new:active { transform: scale(0.97); }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* ── Slide-up entrance ── */
        .slide-up {
          animation: slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }
        .slide-up-2 { animation-delay: 0.08s; }
        .slide-up-3 { animation-delay: 0.16s; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="receipt-page-root">
        <Toast notifications={notifications} onDismiss={onDismiss} />

        {/* ── Success Banner ── */}
        <div className="success-banner mx-auto max-w-lg bg-emerald-600/90 pb-10 pt-8 px-4 text-center text-white">
          {/* Check icon with pulse */}
          <div className="check-ring inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/20 mb-4 slide-up">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="slide-up slide-up-2" style={{ fontFamily: "'Prompt', sans-serif", fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: '6px' }}>
            ทำรายการจองเสร็จสิ้น
          </h1>

          <p className="slide-up slide-up-2" style={{ fontSize: '0.85rem', opacity: 0.92, lineHeight: 1.5, marginBottom: '10px', maxWidth: '20rem' }}>
            กรุณารอแอดมินยืนยันการจองของคุณผ่านทาง LINE
          </p>

          <p className="slide-up slide-up-2" style={{ fontSize: '0.8rem', opacity: 0.80, marginBottom: '6px' }}>
            เลขที่การจอง
          </p>

          <span className="slide-up slide-up-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold tracking-wider" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            {data.bookingId}
          </span>
        </div>

        {/* ── Main content ── */}
        <div className="mx-auto max-w-lg px-4 pb-40 -mt-4 space-y-4">

          {/* Receipt card in ticket wrapper */}
          <div className="receipt-wrapper slide-up slide-up-2">
            {/* The actual receipt */}
            <div style={{ padding: '0 0 4px' }}>
              {/* สำคัญ: ถ้าอยากแก้ "หน้าตาของใบเสร็จ หรือข้อความข้างในใบเสร็จ" ให้ไปแก้ที่ไฟล์ ReceiptCard.tsx ครับ */}
              <ReceiptCard ref={receiptRef} data={data} />
            </div>
          </div>
        </div>

        {/* ── Sticky Bottom Action Bar ── */}
        <div className="action-bar fixed bottom-0 left-0 right-0 z-40 safe-area-pb">
          <div className="mx-auto max-w-lg px-4 py-3 space-y-2.5">

            {/* New booking — secondary */}
            <button
              onClick={onNewBooking}
              className="btn-new w-full flex items-center justify-center gap-2 rounded-2xl px-6 font-semibold text-slate-600"
              style={{ height: '46px', fontSize: '0.88rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              จองที่จอดรถใหม่
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}