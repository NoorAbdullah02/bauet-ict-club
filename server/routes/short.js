// Short links: https://your-site/s/ab3x9k  ->  /f/long-form-name  or  /events/12   (like forms.gle). Clicks are counted.
const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alike characters
const TARGET = /^\/(f\/[a-z0-9-]{1,80}|events\/\d{1,9})$/;
const RESERVED = new Set(['admin', 'api', 'new', 'login', 'null', 'undefined']);
const newCode = () => Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('');

/** Public: GET /s/:code redirects (mounted at /s). */
const redirect = express.Router();
redirect.get('/:code', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(code)) return next();
    const { rows } = await pool.query('UPDATE short_links SET clicks = clicks + 1 WHERE code = $1 RETURNING target', [code]);
    if (!rows.length) return next();
    res.set('Cache-Control', 'no-store').redirect(302, rows[0].target);
  } catch { next(); }
});

/** Admin: make (or fetch) the short link of a page. Body: { path: '/f/slug' | '/events/5', alias? } */
const api = express.Router();
api.use(authMiddleware);
api.post('/', async (req, res) => {
  const path = String(req.body?.path || '');
  if (!TARGET.test(path)) return res.status(400).json({ error: 'This page cannot have a short link' });
  const alias = req.body?.alias === undefined || req.body?.alias === null ? null : String(req.body.alias).trim().toLowerCase();
  try {
    if (alias === null || alias === '') {
      const have = (await pool.query('SELECT code, clicks FROM short_links WHERE target = $1 ORDER BY created_at LIMIT 1', [path])).rows[0];
      if (have) return res.json({ code: have.code, clicks: have.clicks });
      for (let i = 0; i < 6; i++) {
        const code = newCode();
        const r = await pool.query('INSERT INTO short_links (code, target) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING RETURNING code', [code, path]);
        if (r.rows.length) return res.status(201).json({ code, clicks: 0 });
      }
      return res.status(503).json({ error: 'Could not make a short link. Try again.' });
    }
    // a name the admin chose: python-workshop
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(alias) || RESERVED.has(alias)) return res.status(400).json({ error: 'Use 3 to 40 letters, numbers or dashes' });
    const taken = (await pool.query('SELECT target FROM short_links WHERE code = $1', [alias])).rows[0];
    if (taken && taken.target !== path) return res.status(409).json({ error: 'This name is already used' });
    await pool.query('INSERT INTO short_links (code, target) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING', [alias, path]);
    res.json({ code: alias, clicks: 0 });
  } catch (e) { fail(res, e); }
});

module.exports = { redirect, api };
