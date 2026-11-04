const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('./config/db');
const { UPLOAD_DIR } = require('./utils/saveImage');
const initDb = require('./config/initDb');
const { positionRank, leadershipConflict } = require('./utils/positions');
const mail = require('./utils/mailer');
const createCrudRouter = require('./routes/crud');
const { notifySubscribers } = require('./utils/notify');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

const isProd = process.env.NODE_ENV === 'production';
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY); // behind Render/Railway/Nginx: real client IP for rate limits

// the SPA is served by this server in production, so a strict CSP applies to it
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // uploaded photos are embedded by the site/app
  contentSecurityPolicy: !isProd ? false : {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'connect-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
    },
  },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(compression());

// browsers only: the site and the admin panel call this API from their own origin. Add other origins (e.g. the mobile web build) via CORS_ORIGINS.
const allowed = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // mobile apps, curl and same-origin requests send no Origin header
    if (allowed.includes(origin) || (!isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) return cb(null, true);
    return cb(null, false);
  },
  maxAge: 600,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', apiLimiter);

// short browser/CDN cache for public read-only lists (admin routes stay uncached)
const PUBLIC_LISTS = ['/events', '/notices', '/members', '/gallery', '/achievements', '/settings'];
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD'].includes(req.method) && PUBLIC_LISTS.some((p) => req.path === p)) res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  else res.set('Cache-Control', 'no-store');
  next();
});

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', authMiddleware, require('./routes/upload'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/email', require('./routes/email'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/settings', require('./routes/settings'));

const COLS = {
  events: ['title', 'date', 'time', 'location', 'description', 'image_url', 'featured', 'category'],
  notices: ['title', 'date', 'content', 'priority', 'pinned', 'expiry_date', 'image_url'],
  members: ['name', 'position', 'department', 'batch', 'committee_session', 'image_url', 'social_fb', 'social_gh', 'social_li', 'display_order', 'active'],
  gallery: ['title', 'image_url', 'category', 'date', 'description'],
  achievements: ['title', 'date', 'description', 'icon', 'image_url'],
  posts: ['title', 'content', 'image_url', 'author'],
};
app.use('/api/events', createCrudRouter('events', { orderBy: 'date', orderDir: 'DESC', columns: COLS.events, imageCols: ['image_url'], auth: authMiddleware,
  onCreate: (r) => notifySubscribers('event', { title: r.title, when: [String(r.date || '').slice(0, 10), r.time, r.location].filter(Boolean).join(' · '), summary: r.description, path: '/events' }) }));
app.use('/api/notices', createCrudRouter('notices', { orderBy: 'pinned DESC, created_at', orderDir: 'DESC', columns: COLS.notices, imageCols: ['image_url'], auth: authMiddleware,
  onCreate: (r) => { if (!r.expiry_date || String(r.expiry_date).slice(0, 10) >= new Date().toISOString().slice(0, 10)) notifySubscribers('notice', { title: r.title, summary: r.content, path: '/notices' }); } }));
app.use('/api/members', createCrudRouter('members', {
  orderBy: 'display_order', orderDir: 'ASC', columns: COLS.members, imageCols: ['image_url'], auth: authMiddleware,
  // one President and two Vice Presidents per session; everything else can have several people
  validate: async (data, old) => {
    if (data.display_order == null || data.display_order === 99) data.display_order = positionRank(data.position);
    const position = data.position ?? old?.position;
    const session = data.committee_session ?? old?.committee_session;
    if (old && position === old.position && session === old.committee_session) return null; // unrelated edit of an existing row
    return leadershipConflict(pool, session, position, old?.id);
  },
}));
app.use('/api/gallery', createCrudRouter('gallery', { columns: COLS.gallery, imageCols: ['image_url'], auth: authMiddleware }));
app.use('/api/achievements', createCrudRouter('achievements', { orderBy: 'date', orderDir: 'DESC', columns: COLS.achievements, imageCols: ['image_url'], auth: authMiddleware }));
app.use('/api/posts', createCrudRouter('posts', { columns: COLS.posts, imageCols: ['image_url'], auth: authMiddleware }));
const features = require('./features');

// newsletter signup is public (rate limited, one row per email); reading or deleting subscribers needs an admin login
const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again later.' } });
app.post('/api/subscribers', subscribeLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  try {
    const dup = await pool.query('SELECT 1 FROM subscribers WHERE email = $1 AND deleted_at IS NULL', [email]);
    if (!dup.rows.length) {
      await pool.query('INSERT INTO subscribers (email) VALUES ($1)', [email]);
      mail.sendMail({ to: email, ...mail.templates.subscribeWelcome(email) });
    }
    res.status(201).json({ success: true }); // same answer for new and existing emails
  } catch (e) { console.error('subscribe failed:', e.message); res.status(500).json({ error: 'Could not subscribe right now' }); }
});

// one-click unsubscribe from the link inside every newsletter (signed, so nobody can unsubscribe others)
app.get('/api/subscribers/unsubscribe', async (req, res) => {
  const email = String(req.query.e || '').toLowerCase();
  const page = (msg) => res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:system-ui;background:#F5F8FF;display:grid;place-items:center;min-height:100vh;margin:0"><div style="background:#fff;padding:32px;border-radius:20px;border:1px solid #D5E1F5;max-width:380px;text-align:center"><h2 style="margin:0 0 8px;color:#0A1A3F">BAUET ICT Club</h2><p style="color:#41527A">${msg}</p><a href="/" style="color:#1F4FD8">Back to the website</a></div>`);
  if (!email || !mail.validUnsubscribe(email, req.query.t)) return page('This unsubscribe link is not valid.');
  try { await pool.query('UPDATE subscribers SET deleted_at = NOW() WHERE email = $1 AND deleted_at IS NULL', [email]); } catch (e) { console.warn('unsubscribe failed:', e.message); }
  return page('You have been unsubscribed. You will not get our emails any more.');
});

features.forEach((f) => {
  app.use(`/api/${f.table}`, createCrudRouter(f.table, { orderBy: f.orderBy, orderDir: f.orderDir, columns: f.columns, imageCols: f.imageCols, validate: f.validate, readAuth: f.readAuth, auth: authMiddleware, onCreate: f.notify ? (r) => notifySubscribers(f.notify.kind, f.notify.item(r)) : undefined }));
  if (f.public) PUBLIC_LISTS.push(`/${f.table}`);
});
const SITE_PATHS = ['/', '/about', '/events', '/notices', '/projects', '/team', '/ambassadors', '/gallery', '/achievements', '/faq', '/contact', '/join', '/join/committee', '/join/general', '/join/ambassador'];
const origin = (req) => process.env.PUBLIC_URL?.replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
app.get('/sitemap.xml', (req, res) => {
  const base = origin(req);
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITE_PATHS.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
});
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${origin(req)}/sitemap.xml\n`));
app.use('/api/trash', require('./routes/trash'));
app.use('/api/committees', require('./routes/committees'));
app.use('/api/messages', require('./routes/messages'));

if (process.env.NODE_ENV === 'production') {
  app.use('/assets', express.static(path.join(__dirname, '..', 'client', 'dist', 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist'), { maxAge: '5m' }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.use((err, req, res, _next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
    if (!require('./utils/saveImage').cloudinaryReady()) console.warn('⚠  Cloudinary not configured: photos will be stored in server/uploads. Add CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET to .env.');
    await initDb(); // creates missing tables, seeds committee data and the admin account (safe to repeat)
    require('./routes/trash').purgeExpired().catch((e) => console.warn('Trash purge failed:', e.message));
  } catch (e) {
    // network failures arrive as an AggregateError with an empty message, so show the real codes
    const why = e.message || [...new Set((e.errors || []).map((x) => x.code || x.message))].join(', ') || e.code || 'unknown error';
    console.warn(`PostgreSQL not connected: ${why}`);
    console.warn('Check DATABASE_URL in .env (Neon: copy the connection string again, make sure the project is not paused) and your internet connection.');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    require('./utils/analyticsJobs').start();
  });
}

start();
