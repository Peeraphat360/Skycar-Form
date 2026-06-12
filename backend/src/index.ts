import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import passport from './config/passport';
import bookingsRouter from './routes/bookings';
import carsRouter from "./routes/cars";
import authRouter from "./routes/auth";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Behind a proxy/HTTPS (prod) the secure cookie needs this.
if (isProd) app.set('trust proxy', 1);

// ── Session store ──
// Persist sessions in Postgres (Supabase) so the LINE OAuth state and the
// logged-in session survive process restarts / Render free-tier sleeps.
// Without this (default MemoryStore) every restart wipes sessions, forcing
// users to click "login with LINE" several times before it sticks.
// Falls back to MemoryStore only when DATABASE_URL is not set (e.g. local dev).
let sessionStore: session.Store | undefined;
if (process.env.DATABASE_URL) {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase requires TLS for external connections.
    ssl: { rejectUnauthorized: false },
  });
  const PgStore = connectPgSimple(session);
  sessionStore = new PgStore({
    pool: pgPool,
    tableName: 'user_sessions',
    createTableIfMissing: true, // auto-create the session table on first boot
  });
  console.log('🗄️  Session store: Postgres (connect-pg-simple)');
} else {
  console.warn('⚠️  DATABASE_URL not set — using in-memory session store (dev only)');
}

// ── CORS config ──
// Comma-separated list of allowed origins; falls back to local dev ports.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV === 'development';

// ── Middleware ──
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (curl, server-to-server, health checks) — no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development only, allow any localhost port (e.g. Vite picking 5175).
    if (isDev && /^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// ── Session + Passport (LINE auth) ──
app.use(session({
  name: 'skycar.sid',
  store: sessionStore, // Postgres-backed in prod; MemoryStore when undefined
  secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // SameSite=Lax: the SPA and /api share one origin (from-skycarpark.onrender.com
    // via the static-site proxy), so the session cookie is first-party. Lax is sent
    // on the top-level GET navigation when LINE redirects back to /callback, and —
    // unlike None — is NOT dropped by browser third-party-cookie/tracking blocking
    // (which was breaking LINE login on Edge/Safari with `?error=line`).
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use("/api/cars", carsRouter);

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚗 SKYcar Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

