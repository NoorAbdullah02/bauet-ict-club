// The app tells the server its phone's notification address (token) so the club can send news to it.
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { fail } = require('../utils/http');
const { authMiddleware, requireSuper } = require('../middleware/auth');
const push = require('../utils/push');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Try again later.' } });
const TOKEN = /^[A-Za-z0-9_:.\-]{20,4096}$/;

router.post('/register', limiter, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!TOKEN.test(token)) return res.status(400).json({ error: 'Invalid token' });
  const platform = ['android', 'ios', 'web'].includes(req.body?.platform) ? req.body.platform : 'android';
  const lang = req.body?.lang === 'bn' ? 'bn' : 'en';
  try {
    await pool.query(
      `INSERT INTO push_tokens (token, platform, lang) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET platform = EXCLUDED.platform, lang = EXCLUDED.lang, last_seen = NOW()`, [token, platform, lang]);
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

router.post('/unregister', limiter, async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!TOKEN.test(token)) return res.status(400).json({ error: 'Invalid token' });
  try { await pool.query('DELETE FROM push_tokens WHERE token = $1', [token]); res.json({ ok: true }); } catch (e) { fail(res, e); }
});

// main admin only: is it set up, and a test message to every phone that has the app
router.get('/status', authMiddleware, requireSuper, async (_req, res) => { try { res.json(await push.status()); } catch (e) { fail(res, e); } });
router.post('/test', authMiddleware, requireSuper, limiter, async (_req, res) => { try { res.json(await push.test()); } catch (e) { fail(res, e); } });

module.exports = router;
