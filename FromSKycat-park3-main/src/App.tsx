import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicApp from "./components/PublicApp";
import CustomerLogin from "./components/CustomerLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
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
      </AuthProvider>
    </BrowserRouter>
  );
}
