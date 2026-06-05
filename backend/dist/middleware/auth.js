"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
// ── Route guard: block the request unless a customer is logged in ──
// Equivalent role to a NestJS AuthGuard, but as plain Express middleware.
function requireAuth(req, res, next) {
    if (typeof req.isAuthenticated === "function" && req.isAuthenticated() && req.user) {
        return next();
    }
    return res.status(401).json({ success: false, error: "Unauthorized" });
}
// ── Soft guard: never blocks; just makes `req.user` available downstream ──
// (passport.session() already populates req.user; this is a readability helper.)
function optionalAuth(_req, _res, next) {
    return next();
}
