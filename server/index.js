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

app.use('/api/events', createCrudRouter('events', { orderBy: 'date', orderDir: 'DESC', auth: authMiddleware }));
app.use('/api/notices', createCrudRouter('notices', { orderBy: 'pinned DESC, created_at', orderDir: 'DESC', auth: authMiddleware }));
app.use('/api/members', createCrudRouter('members', { orderBy: 'display_order', orderDir: 'ASC', auth: authMiddleware }));
app.use('/api/gallery', createCrudRouter('gallery', { auth: authMiddleware }));
app.use('/api/achievements', createCrudRouter('achievements', { orderBy: 'date', orderDir: 'DESC', auth: authMiddleware }));
app.use('/api/posts', createCrudRouter('posts', { auth: authMiddleware }));
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
  } catch (e) {
    console.warn('PostgreSQL not connected:', e.message);
    console.warn('Run: npm run db:init after setting DATABASE_URL in .env');
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
