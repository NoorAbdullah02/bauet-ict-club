// The app tells the server its phone's notification address (token) so the club can send news to it.
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { fail } = require('../utils/http');
const { authMiddleware } = require('../middleware/auth');
const push = require('../utils/push');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Try again later.' } });
const TOKEN = /^[A-Za-z0-9_:.\-]{20,4096}$/;

router.post('/register', limiter, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!TOKEN.test(token)) return res.status(400).json({ error: 'Invalid token' });
  const platform = ['android', 'ios', 'web'].includes(req.body?.platform) ? req.body.platform : 'android';
  const lang = req.body?.lang === 'bn' ? 'bn' : 'en';
  // topics the person keeps on: a list (even an empty one = nothing but urgent news); no list = everything
  const topics = Array.isArray(req.body?.topics) ? req.body.topics.filter((t) => push.TOPICS.includes(t)).join(',') : null;
  try {
    await pool.query(
      `INSERT INTO push_tokens (token, platform, lang, topics) VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE SET platform = EXCLUDED.platform, lang = EXCLUDED.lang, topics = EXCLUDED.topics, last_seen = NOW()`, [token, platform, lang, topics]);
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

router.post('/unregister', limiter, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!TOKEN.test(token)) return res.status(400).json({ error: 'Invalid token' });
  try { await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]); res.json({ ok: true }); } catch (e) { fail(res, e); }
});

// admins (the main admin and the other admin accounts, not the editors): is it set up, and a test message to every phone that has the app
const requireAdmin = (req, res, next) => (['superadmin', 'admin'].includes(req.user?.role) ? next() : res.status(403).json({ error: 'Only an admin can do this.' }));
router.get('/status', authMiddleware, requireAdmin, async (_req, res) => { try { res.json(await push.status()); } catch (e) { fail(res, e); } });
router.post('/test', authMiddleware, requireAdmin, limiter, async (_req, res) => { try { res.json(await push.test()); } catch (e) { fail(res, e); } });

// an admin writes a message and sends it to every phone (for example "Today's class moved to room 204")
const PAGES = ['/', '/events', '/notices', '/jobs', '/contests', '/projects', '/resources', '/team', '/gallery'];
router.post('/send', authMiddleware, requireAdmin, limiter, async (req, res) => {
  const title = String(req.body?.title || '').trim(); const body = String(req.body?.body || '').trim();
  if (title.length < 3 || title.length > 80) return res.status(400).json({ error: 'The title must be 3 to 80 characters.' });
  if (body.length < 3 || body.length > 160) return res.status(400).json({ error: 'The message must be 3 to 160 characters.' });
  const page = PAGES.includes(req.body?.page) ? req.body.page : '/';
  try {
    if (!push.enabled()) return res.status(409).json({ error: 'Phone notifications are not set up yet (see the status above).' });
    const sent = await push.broadcast({ title, body, path: page, urgent: true }); // written by an admin: reaches everyone
    res.json({ ok: true, sent });
  } catch (e) { fail(res, e); }
});

module.exports = router;
