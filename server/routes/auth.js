const express = require('express');
const { fail } = require('../utils/http');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// brute-force guard: 8 wrong attempts per IP per 15 minutes (successful logins do not count)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 8, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many failed attempts. Try again in 15 minutes.' },
});
// compared against when the username does not exist, so response time never reveals valid usernames
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || username.length > 100 || password.length > 200) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username.trim()]);
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
    if (!admin || !valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(admin);
    res.json({ token, user: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (e) {
    fail(res, e);
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM admins WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// admin changes own password (needs the current one)
router.post('/change-password', authMiddleware, loginLimiter, async (req, res) => {
  const { current, next } = req.body || {};
  if (typeof current !== 'string' || typeof next !== 'string' || !current || current.length > 200) return res.status(400).json({ error: 'Current and new password required' });
  if (next.length < 10 || next.length > 200) return res.status(400).json({ error: 'New password must be at least 10 characters' });
  if (next === current) return res.status(400).json({ error: 'New password must be different' });
  try {
    const admin = (await pool.query('SELECT * FROM admins WHERE id = $1', [req.user.id])).rows[0];
    if (!admin || !(await bcrypt.compare(current, admin.password_hash))) return res.status(401).json({ error: 'Current password is wrong' });
    await pool.query('UPDATE admins SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(next, 12), admin.id]);
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

module.exports = router;
