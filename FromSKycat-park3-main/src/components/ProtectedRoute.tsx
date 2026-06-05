import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Gate a route behind LINE login. Unauthenticated visitors are redirected to
// /login; the original path is passed in state so we can return after login.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for the initial /auth/me check before deciding — avoids a flash redirect.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-['Sarabun',system-ui,sans-serif]">
        <p className="text-sm text-slate-400">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
