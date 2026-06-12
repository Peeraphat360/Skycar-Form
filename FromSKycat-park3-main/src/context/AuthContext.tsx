import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getMe, logout as apiLogout, lineLoginUrl, claimLogin, AuthUser } from "../api/auth";
import { UNAUTHORIZED_EVENT } from "../api/client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;       // true until the initial /auth/me check resolves
  login: () => void;      // redirect to LINE OAuth
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ask the backend who we are. Runs on mount and after returning from LINE.
  const refresh = useCallback(async () => {
    setLoading(true);
    const me = await getMe();
    setUser(me);
    setLoading(false);
  }, []);

  useEffect(() => {
    // กลับจาก LINE จะมี ?login_token=... ติดมา — แลกเป็น session ก่อน (ทางสำรอง
    // สำหรับเบราว์เซอร์ที่ทิ้ง session cookie บนขา redirect ข้ามไซต์) แล้วลบออก
    // จาก URL ทันที กันหลุดไปกับ history/ลิงก์แชร์
    const params = new URLSearchParams(window.location.search);
    const token = params.get("login_token");
    if (token) {
      params.delete("login_token");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
      (async () => {
        setLoading(true);
        const claimed = await claimLogin(token);
        if (claimed) {
          setUser(claimed);
          setLoading(false);
        } else {
          await refresh(); // token หมดอายุ/ใช้แล้ว → เช็ค session ปกติ
        }
      })();
      return;
    }
    refresh();
  }, [refresh]);

  // If any API call hits 401, drop the local session immediately.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(() => {
    window.location.href = lineLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
