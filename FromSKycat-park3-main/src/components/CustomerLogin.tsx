import { useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import lineIcon from "../assets/LINE_Brand_icon.png";

// Customer login page (route: /login). Single-tap LINE login.
export default function CustomerLogin() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const hasError = params.get("error") === "line";
  // Where to return after login — the page the guard bounced us from, else /book.
  const from = (location.state as { from?: string } | null)?.from || "/book";

  // Already logged in → send them back to where they were headed.
  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-['Sarabun',system-ui,sans-serif]">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Sky Car Park" className="h-20 w-20 object-contain" />
          <h1 className="mt-4 text-lg font-bold text-slate-900">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-slate-500">
            เข้าสู่ระบบด้วย LINE เพื่อจองที่จอดรถ
          </p>
        </div>

        {hasError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
            เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
          </p>
        )}

        <button
          type="button"
          onClick={login}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          <img src={lineIcon} alt="" className="h-6 w-6 object-contain" />
          {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบด้วย LINE"}
        </button>
      </div>
    </div>
  );
}
