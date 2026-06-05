import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
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
  secret: process.env.SESSION_SECRET || 'dev-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Cross-site cookies (SPA on a different origin) require SameSite=None + Secure in prod.
    sameSite: isProd ? 'none' : 'lax',
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

