import { Request, Response, NextFunction } from "express";

// ── Route guard: block the request unless a customer is logged in ──
// Equivalent role to a NestJS AuthGuard, but as plain Express middleware.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ success: false, error: "Unauthorized" });
}
