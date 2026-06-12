import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import passport, { toAuthUser } from "../config/passport";
import { supabase } from "../db";
import type { AuthUser } from "../types/auth";

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ── One-time login token ──
// บางเบราว์เซอร์/in-app browser ทิ้ง Set-Cookie บนขา redirect ข้ามไซต์ (ขากลับ
// จาก LINE) ทำให้ login สำเร็จฝั่ง server แต่หน้าเว็บมองไม่เห็น session → วนกลับ
// หน้า login ไม่รู้จบ ทางแก้: ส่ง token ใช้ครั้งเดียว (HMAC, อายุ 60 วิ) กลับไป
// กับ URL แล้วให้ SPA เรียก POST /auth/claim แบบ same-origin เพื่อรับ session
// cookie บน response ปกติ ซึ่งเบราว์เซอร์ทุกตัวยอมรับ
const TOKEN_SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL_MS = 60 * 1000;
// best-effort กันใช้ token ซ้ำ (in-memory พอ — TTL สั้นมากและ restart ไม่ทันหน้าต่างนี้)
const usedTokenSigs = new Map<string, number>();

function pruneUsedTokens(): void {
  const now = Date.now();
  for (const [sig, exp] of usedTokenSigs) if (exp < now) usedTokenSigs.delete(sig);
}

function signLoginToken(userId: string): string {
  const payload = `${userId}|${Date.now()}|${crypto.randomBytes(8).toString("base64url")}`;
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyLoginToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString();
  } catch {
    return null;
  }
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const [userId, tsStr] = payload.split("|");
  const ts = Number(tsStr);
  if (!userId || !Number.isFinite(ts) || Date.now() - ts > TOKEN_TTL_MS) return null;
  pruneUsedTokens();
  if (usedTokenSigs.has(sig)) return null; // one-time
  usedTokenSigs.set(sig, ts + TOKEN_TTL_MS);
  return userId;
}

// ── GET /auth/line ── kick off the LINE OAuth redirect
router.get("/line", passport.authenticate("line"));

// ── GET /auth/line/callback ── LINE redirects back here after consent
// Custom callback (instead of the options form) so we can log + surface the
// real failure reason in the redirect (?reason=...) for diagnosis.
router.get("/line/callback", (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("line", (err: any, user: Express.User | false, info: any) => {
    if (err || !user) {
      const reason = err?.message || info?.message || (typeof info === "string" ? info : "unknown");
      console.error("LINE auth callback failed:", reason, err || "");
      return res.redirect(`${CLIENT_URL}/login?error=line&reason=${encodeURIComponent(reason)}`);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error("LINE auth req.logIn failed:", loginErr.message);
        return res.redirect(`${CLIENT_URL}/login?error=line&reason=${encodeURIComponent("login_" + loginErr.message)}`);
      }
      // ส่ง one-time token ไปกับ URL ด้วย — เผื่อเบราว์เซอร์ทิ้ง cookie ขา redirect
      // (SPA จะใช้ token เรียก /auth/claim แล้วลบออกจาก URL ทันที)
      const token = signLoginToken((user as AuthUser).id);
      return res.redirect(`${CLIENT_URL}/?login_token=${encodeURIComponent(token)}`);
    });
  })(req, res, next);
});

// ── POST /auth/claim ── แลก one-time token เป็น session (เรียกโดย SPA แบบ same-origin)
router.post("/claim", (req: Request, res: Response) => {
  const token = req.body?.token;
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ success: false, error: "token required" });
  }
  const userId = verifyLoginToken(token);
  if (!userId) {
    return res.status(401).json({ success: false, error: "invalid or expired token" });
  }
  void (async () => {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (error || !data) {
      return res.status(401).json({ success: false, error: "user not found" });
    }
    const user = toAuthUser(data);
    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, user });
    });
  })();
});

// ── GET /auth/me ── the endpoint the frontend interceptor calls on load
router.get("/me", (req: Request, res: Response) => {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated() && req.user) {
    return res.json({ success: true, user: req.user });
  }
  return res.status(401).json({ success: false, user: null });
});

// ── POST /auth/logout ── clear the passport session + cookie
router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) return next(err);
    if (!req.session) {
      res.clearCookie("skycar.sid");
      return res.json({ success: true });
    }
    req.session.destroy(() => {
      res.clearCookie("skycar.sid");
      res.json({ success: true });
    });
  });
});

export default router;
