
import { useAuth } from "../context/AuthContext";
import lineIcon from "../assets/LINE_Brand_icon.png";

export default function AppHeader() {
  const { user, loading, login, logout } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 md:px-6">

        {/* ─── ซ้าย: โลโก้ + ชื่อแบรนด์ ─── */}
        <div className="flex items-center">
          <img src="/logo.png" alt="Sky Car Park Logo" className="h-14 w-14 object-contain" />
          <div className="ml-2.5">
            <p className="text-sm font-bold text-slate-900 leading-tight">Sky Car Park</p>
            <p className="text-xs text-slate-500">ที่จอดรถใกล้สนามบิน</p>
          </div>
        </div>

        {/* ─── ขวา: สถานะ LINE ─── */}
        <div className="flex items-center">
          {loading ? (
            /* skeleton ขณะโหลด */
            <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" />
          ) : user ? (
            /* ─── เข้าสู่ระบบแล้ว ─── */
            <div className="flex flex-col items-end leading-tight">
              <span className="max-w-[140px] truncate text-xs font-semibold text-slate-800">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
              >
                ออกจากระบบ
              </button>
            </div>
          ) : (
            /* ─── ยังไม่ได้เข้าสู่ระบบ ─── */
            <button
              type="button"
              onClick={login}
              className="flex items-center gap-1.5 rounded-xl bg-[#06C755] px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-[#06C755]/30 transition-all hover:opacity-90 active:scale-95"
            >
              <img src={lineIcon} alt="" className="h-5 w-5 object-contain" />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}