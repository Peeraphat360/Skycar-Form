"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const router = (0, express_1.Router)();
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
// ── GET /auth/line ── kick off the LINE OAuth redirect
router.get("/line", passport_1.default.authenticate("line"));
// ── GET /auth/line/callback ── LINE redirects back here after consent
router.get("/line/callback", passport_1.default.authenticate("line", {
    failureRedirect: `${CLIENT_URL}/login?error=line`,
}), (_req, res) => {
    // Session cookie is set; bounce the browser back to the SPA.
    res.redirect(`${CLIENT_URL}/`);
});
// ── GET /auth/me ── the endpoint the frontend interceptor calls on load
router.get("/me", (req, res) => {
    if (typeof req.isAuthenticated === "function" && req.isAuthenticated() && req.user) {
        return res.json({ success: true, user: req.user });
    }
    return res.status(401).json({ success: false, user: null });
});
// ── POST /auth/logout ── clear the passport session + cookie
router.post("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err)
            return next(err);
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
exports.default = router;
