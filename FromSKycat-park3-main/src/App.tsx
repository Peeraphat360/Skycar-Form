import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicApp from "./components/PublicApp";
import CustomerLogin from "./components/CustomerLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { BOOKINGS_INIT, OCC_INIT } from "./constants/bookings";
import { Booking } from "./types/index";

export default function App() {
  // จัดการ State กลางของแอปพลิเคชัน
  const [bookings, setBookings] = useState<Booking[]>(() => JSON.parse(localStorage.getItem("bookings") || "null") || BOOKINGS_INIT);
  const [occ, setOcc] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem("OCCUPIED") || "null") || OCC_INIT));

  // บันทึกการเปลี่ยนแปลงลง LocalStorage เสมอ
  useEffect(() => {
    localStorage.setItem("bookings", JSON.stringify(bookings));
    localStorage.setItem("OCCUPIED", JSON.stringify(Array.from(occ)));
  }, [bookings, occ]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Customer login (LINE) */}
          <Route path="/login" element={<CustomerLogin />} />
          {/* Receipt route renders PublicApp (booking form) too, so it must be gated
              as well — otherwise it's an unauthenticated backdoor to the booking page. */}
          <Route
            path="/receipt/:bookingId"
            element={
              <ProtectedRoute>
                <PublicApp bookings={bookings} setBookings={setBookings} occ={occ} setOcc={setOcc} />
              </ProtectedRoute>
            }
          />
          {/* Booking page — hard-gated behind LINE login */}
          <Route
            path="/book"
            element={
              <ProtectedRoute>
                <PublicApp bookings={bookings} setBookings={setBookings} occ={occ} setOcc={setOcc} />
              </ProtectedRoute>
            }
          />
          {/* Everything else funnels into the gated booking page */}
          <Route path="/*" element={<Navigate to="/book" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}