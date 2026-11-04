const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const TEXT_KEYS = ['heroTitle', 'heroSub', 'aboutText', 'mission', 'vision', 'goal'];
const SOCIAL_KEYS = ['fb', 'email', 'phone', 'website'];
const clip = (v, n) => String(v ?? '').slice(0, n);

// Public: the site-wide content block (stored as one JSONB row, key = 'site')
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'site'");
    res.json(rows[0]?.value || {});
  } catch (e) {
    console.error('Settings read failed:', e.message);
    res.status(500).json({ error: 'Could not load settings' });
  }
});

// Admin only: merge whitelisted fields into the stored block
router.put('/', authMiddleware, async (req, res) => {
  try {
    const patch = {};
    TEXT_KEYS.forEach((k) => { if (typeof req.body[k] === 'string') patch[k] = clip(req.body[k], 2000); });
    if (req.body.socialLinks && typeof req.body.socialLinks === 'object') {
      patch.socialLinks = {};
      SOCIAL_KEYS.forEach((k) => { if (req.body.socialLinks[k] !== undefined) patch.socialLinks[k] = clip(req.body.socialLinks[k], 300); });
    }
    const current = (await pool.query("SELECT value FROM settings WHERE key = 'site'")).rows[0]?.value || {};
    const merged = { ...current, ...patch, socialLinks: { ...current.socialLinks, ...patch.socialLinks } };
    const { rows } = await pool.query(
      `INSERT INTO settings (key, value) VALUES ('site', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING value`,
      [JSON.stringify(merged)]
    );
    res.json(rows[0].value);
  } catch (e) {
    console.error('Settings update failed:', e.message);
    res.status(500).json({ error: 'Could not save settings' });
  }
});

module.exports = router;
