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
const { positionRank, isPresident, sessionHasPresident } = require('./utils/positions');
const createCrudRouter = require('./routes/crud');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/email', require('./routes/email'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/settings', require('./routes/settings'));

const COLS = {
  events: ['title', 'date', 'time', 'location', 'description', 'image_url', 'featured', 'category'],
  notices: ['title', 'date', 'content', 'priority', 'pinned', 'expiry_date'],
  members: ['name', 'position', 'department', 'batch', 'committee_session', 'image_url', 'social_fb', 'social_gh', 'social_li', 'display_order', 'active'],
  gallery: ['title', 'image_url', 'category', 'date', 'description'],
  achievements: ['title', 'date', 'description', 'icon'],
  posts: ['title', 'content', 'image_url', 'author'],
};
app.use('/api/events', createCrudRouter('events', { orderBy: 'date', orderDir: 'DESC', columns: COLS.events, imageCols: ['image_url'], auth: authMiddleware }));
app.use('/api/notices', createCrudRouter('notices', { orderBy: 'pinned DESC, created_at', orderDir: 'DESC', columns: COLS.notices, auth: authMiddleware }));
app.use('/api/members', createCrudRouter('members', {
  orderBy: 'display_order', orderDir: 'ASC', columns: COLS.members, imageCols: ['image_url'], auth: authMiddleware,
  // one President per session; everything else can have several people
  validate: async (data, old) => {
    if (data.display_order == null || data.display_order === 99) data.display_order = positionRank(data.position);
    if (isPresident(data.position || '') && data.committee_session && await sessionHasPresident(pool, data.committee_session, old?.id)) {
      return `${data.committee_session} already has a President. Change the existing one first — all other posts can have several people.`;
    }
    return null;
  },
}));
app.use('/api/gallery', createCrudRouter('gallery', { columns: COLS.gallery, imageCols: ['image_url'], auth: authMiddleware }));
app.use('/api/achievements', createCrudRouter('achievements', { orderBy: 'date', orderDir: 'DESC', columns: COLS.achievements, auth: authMiddleware }));
app.use('/api/posts', createCrudRouter('posts', { columns: COLS.posts, imageCols: ['image_url'], auth: authMiddleware }));
const features = require('./features');
features.forEach((f) => {
  app.use(`/api/${f.table}`, createCrudRouter(f.table, { orderBy: f.orderBy, orderDir: f.orderDir, columns: f.columns, imageCols: f.imageCols, validate: f.validate, auth: authMiddleware }));
  if (f.public) PUBLIC_LISTS.push(`/${f.table}`);
});
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
  });
}

start();
