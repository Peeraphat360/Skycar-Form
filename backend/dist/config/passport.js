"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
// passport-line-auth ships no declaration file, and ts-node doesn't always pick up
// the ambient `declare module` in types/globals.d.ts — silence the missing-types error here.
// @ts-ignore
const passport_line_auth_1 = require("passport-line-auth");
const db_1 = require("../db");
// ── Map a `users` table row → the session-friendly AuthUser shape ──
function toAuthUser(row) {
    return {
        id: row.id,
        lineUserId: row.line_user_id,
        displayName: row.display_name ?? "",
        pictureUrl: row.picture_url ?? null,
        email: row.email ?? null,
    };
}
// ── Persist (insert or update) the LINE profile into `users`, keyed by line_user_id ──
async function upsertLineUser(profile) {
    // The `users.name` column is NOT NULL — guarantee a non-empty value even if
    // LINE returns no display name.
    const safeName = profile.displayName?.trim() || `LINE User ${profile.lineUserId.slice(0, 6)}`;
    const { data, error } = await db_1.supabase
        .from("users")
        .upsert({
        line_user_id: profile.lineUserId,
        name: safeName,
        display_name: safeName,
        picture_url: profile.pictureUrl ?? null,
        email: profile.email ?? null,
        provider: "line",
    }, { onConflict: "line_user_id" })
        .select()
        .single();
    if (error)
        throw new Error(`Failed to upsert LINE user: ${error.message}`);
    return toAuthUser(data);
}
// ── Store only the user id in the session cookie ──
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
// ── Rehydrate req.user from the id on every authenticated request ──
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const { data, error } = await db_1.supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .single();
        if (error || !data)
            return done(null, false);
        done(null, toAuthUser(data));
    }
    catch (err) {
        done(err);
    }
});
// ── Register the LINE strategy only if credentials are configured ──
// (so the server still boots — and bookings still work — without LINE keys).
const channelID = process.env.LINE_CHANNEL_ID;
const channelSecret = process.env.LINE_CHANNEL_SECRET;
if (channelID && channelSecret) {
    passport_1.default.use(new passport_line_auth_1.Strategy({
        channelID,
        channelSecret,
        callbackURL: process.env.LINE_CALLBACK_URL ||
            "http://localhost:3001/api/auth/line/callback",
        scope: ["profile", "openid", "email"],
        botPrompt: "normal",
    }, 
    // passport-line-auth's verify signature varies by version; grab the
    // profile + done callback positionally so we work across versions.
    async (...args) => {
        const done = args[args.length - 1];
        const profile = args[args.length - 2] ?? {};
        try {
            const json = profile._json ?? {};
            const user = await upsertLineUser({
                lineUserId: profile.id ?? json.userId ?? json.sub,
                displayName: profile.displayName ?? json.displayName ?? json.name ?? "",
                pictureUrl: profile.pictureURL ?? json.pictureUrl ?? json.picture ?? null,
                email: profile.email ?? json.email ?? null,
            });
            done(null, user);
        }
        catch (err) {
            done(err);
        }
    }));
    // eslint-disable-next-line no-console
    console.log("🔐 LINE auth strategy registered");
}
else {
    // eslint-disable-next-line no-console
    console.warn("⚠️  LINE_CHANNEL_ID / LINE_CHANNEL_SECRET not set — /auth/line is disabled");
}
exports.default = passport_1.default;
