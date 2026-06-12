import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

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
      // Session cookie is set; bounce the browser back to the SPA.
      return res.redirect(`${CLIENT_URL}/`);
    });
  })(req, res, next);
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
