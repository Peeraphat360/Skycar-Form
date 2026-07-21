import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CustomerLogin from "./components/CustomerLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

// หน้า login คือจุดที่ลูกค้าเข้าจากลิงก์ LINE — เป็น landing ที่ PageSpeed วัด
// ฟอร์มจอง/ใบเสร็จ (PublicApp) หนักกว่าและใช้หลัง login เท่านั้น → lazy-load แยก chunk
// ให้หน้า login โหลด JS น้อยที่สุด
const PublicApp = lazy(() => import("./components/PublicApp"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Sarabun',system-ui,sans-serif]">
    <p className="text-sm text-slate-400">กำลังโหลด...</p>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Customer login (LINE) */}
          <Route path="/login" element={<CustomerLogin />} />
          {/* Receipt route renders PublicApp (booking form) too, so it must be gated
              as well — otherwise it's an unauthenticated backdoor to the booking page. */}
          <Route
            path="/receipt/:bookingId"
            element={
              <ProtectedRoute>
                <PublicApp />
              </ProtectedRoute>
            }
          />
          {/* Booking page — hard-gated behind LINE login */}
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <PublicApp />
              </ProtectedRoute>
            }
          />
          {/* Everything else funnels into the gated booking page */}
          <Route path="/*" element={<Navigate to="/book" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
