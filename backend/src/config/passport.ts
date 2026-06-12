import passport from "passport";
import crypto from "crypto";
// passport-line-auth ships no declaration file, and ts-node doesn't always pick up
// the ambient `declare module` in types/globals.d.ts — silence the missing-types error here.
// @ts-ignore
import { Strategy as LineStrategy } from "passport-line-auth";
import { supabase } from "../db";
import type { AuthUser } from "../types/auth";

// ── Stateless OAuth state (HMAC-signed, TTL 10 นาที) ──
// เดิม state เก็บใน session → ถ้าเบราว์เซอร์ไม่เก็บ/ไม่ส่ง cookie ขั้น kickoff
// (เจอจริงบน Edge บางโปรไฟล์ และเสี่ยงกับ in-app browser) callback จะหา state
// ไม่เจอ → "Unable to verify authorization request state" ทั้งที่ผู้ใช้กด login ปกติ
// แบบใหม่: state = ts.nonce.HMAC(ts.nonce) ตรวจด้วยลายเซ็น+อายุ ไม่พึ่ง cookie เลย
// (แลกมากับ state ที่ไม่ผูกกับ browser session — ยอมรับได้สำหรับ login flow
// เพราะยังกัน state ปลอม/หมดอายุด้วย HMAC + TTL)
class SignedStateStore {
  constructor(
    private secret: string,
    private ttlMs: number = 10 * 60 * 1000,
  ) {}

  private sign(payload: string): string {
    return crypto.createHmac("sha256", this.secret).update(payload).digest("base64url");
  }

  // arity 2 → passport-oauth2 เรียกแบบ store(req, callback)
  store(_req: unknown, callback: (err: Error | null, state?: string) => void): void {
    const payload = `${Date.now()}-${crypto.randomBytes(12).toString("base64url")}`;
    callback(null, `${payload}.${this.sign(payload)}`);
  }

  // arity 3 → passport-oauth2 เรียกแบบ verify(req, state, callback)
  verify(
    _req: unknown,
    state: string,
    callback: (err: Error | null, ok?: boolean, info?: unknown) => void,
  ): void {
    const dot = (state || "").lastIndexOf(".");
    if (dot < 0) return callback(null, false, { message: "Malformed state" });
    const payload = state.slice(0, dot);
    const sig = state.slice(dot + 1);
    const expected = this.sign(payload);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return callback(null, false, { message: "Invalid state signature" });
    }
    const ts = Number(payload.split("-")[0]);
    if (!Number.isFinite(ts) || Date.now() - ts > this.ttlMs) {
      return callback(null, false, { message: "State expired" });
    }
    callback(null, true);
  }
}

// ── Map a `users` table row → the session-friendly AuthUser shape ──
// (exported: ใช้ใน /auth/claim ด้วย)
export function toAuthUser(row: any): AuthUser {
  return {
    id: row.id,
    lineUserId: row.line_user_id,
    displayName: row.display_name ?? "",
    pictureUrl: row.picture_url ?? null,
    email: row.email ?? null,
  };
}

// ── Persist (insert or update) the LINE profile into `users`, keyed by line_user_id ──
async function upsertLineUser(profile: {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string | null;
  email?: string | null;
}): Promise<AuthUser> {
  // The `users.name` column is NOT NULL — guarantee a non-empty value even if
  // LINE returns no display name.
  const safeName =
    profile.displayName?.trim() || `LINE User ${profile.lineUserId.slice(0, 6)}`;

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        line_user_id: profile.lineUserId,
        name: safeName,
        display_name: safeName,
        picture_url: profile.pictureUrl ?? null,
        email: profile.email ?? null,
        provider: "line",
      },
      { onConflict: "line_user_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert LINE user: ${error.message}`);
  return toAuthUser(data);
}

// ── Store only the user id in the session cookie ──
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as AuthUser).id);
});

// ── Rehydrate req.user from the id on every authenticated request ──
passport.deserializeUser(async (id: string, done) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return done(null, false);
    done(null, toAuthUser(data));
  } catch (err) {
    done(err as Error);
  }
});

// ── Register the LINE strategy only if credentials are configured ──
// (so the server still boots — and bookings still work — without LINE keys).
const channelID = process.env.LINE_CHANNEL_ID;
const channelSecret = process.env.LINE_CHANNEL_SECRET;

if (channelID && channelSecret) {
  passport.use(
    new LineStrategy(
      {
        channelID,
        channelSecret,
        callbackURL:
          process.env.LINE_CALLBACK_URL ||
          "http://localhost:3001/api/auth/line/callback",
        scope: ["profile", "openid", "email"],
        // "aggressive" = โชว์ตัวเลือก "เพิ่ม OA เป็นเพื่อน" ตั้งแต่หน้า consent และติ๊กไว้ให้
        // (ต้องผูก OA เข้ากับ Login channel ใน LINE Developers Console ด้วย ถึงจะมีผล)
        botPrompt: "aggressive",
        // ใช้ state แบบเซ็นลายเซ็นแทน session store — login ไม่พึ่ง cookie ขั้น kickoff
        store: new SignedStateStore(process.env.SESSION_SECRET || "dev-insecure-secret-change-me"),
      },
      // passport-line-auth's verify signature varies by version; grab the
      // profile + done callback positionally so we work across versions.
      async (...args: any[]) => {
        const done = args[args.length - 1] as (
          err: any,
          user?: Express.User | false
        ) => void;
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
        } catch (err) {
          done(err);
        }
      }
    )
  );
  // eslint-disable-next-line no-console
  console.log("🔐 LINE auth strategy registered");
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️  LINE_CHANNEL_ID / LINE_CHANNEL_SECRET not set — /auth/line is disabled"
  );
}

export default passport;
