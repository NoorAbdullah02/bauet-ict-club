const express = require('express');
const { fail } = require('../utils/http');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { generateToken, authMiddleware, forgetSession, JWT_SECRET } = require('../middleware/auth');
const totp = require('../utils/totp');
const { passwordProblem } = require('../utils/passwordPolicy');

const rateLimit = require('express-rate-limit');

const router = express.Router();

// brute-force guard 1: 40 wrong attempts per IP per 15 minutes (successful logins do not count). Campus Wi-Fi shares one address between many people, so this is wide; the per-account lock below is the real guard.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 40, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many failed attempts. Try again in 15 minutes.' },
});
// brute-force guard 2 (per account): 5 wrong passwords or codes lock that account for 15 minutes, whatever IP the attempts come from
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
// compared against when the username does not exist, so response time never reveals valid usernames
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);
const tooMany = (res) => res.status(429).json({ error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.` });

async function recordFailure(admin) {
  if (!admin) return;
  const { rows } = await pool.query('UPDATE admins SET failed_logins = failed_logins + 1 WHERE id = $1 RETURNING failed_logins', [admin.id]);
  if ((rows[0]?.failed_logins ?? 0) >= MAX_FAILS) {
    await pool.query('UPDATE admins SET failed_logins = 0, locked_until = $2 WHERE id = $1', [admin.id, new Date(Date.now() + LOCK_MINUTES * 60000)]);
  }
}

/** true when `code` is a valid authenticator code or an unused backup code (which is then used up). */
async function secondStepOk(admin, code) {
  const given = String(code || '').trim();
  if (!given) return false;
  try { if (totp.verify(totp.open(admin.totp_secret, JWT_SECRET), given)) return true; } catch { /* unreadable secret: fall through to backup codes */ }
  let list = [];
  try { list = JSON.parse(admin.backup_codes || '[]'); } catch { /* none */ }
  const h = totp.hashCode(given);
  if (!list.includes(h)) return false;
  await pool.query('UPDATE admins SET backup_codes = $1 WHERE id = $2', [JSON.stringify(list.filter((x) => x !== h)), admin.id]);
  return true;
}

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, code } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || username.length > 100 || password.length > 200) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const result = await pool.query('SELECT * FROM admins WHERE LOWER(username) = LOWER($1) ORDER BY (username = $1) DESC, id LIMIT 1', [username.trim()]);
    const admin = result.rows[0];
    if (admin?.locked_until && new Date(admin.locked_until) > new Date()) { await bcrypt.compare(password, DUMMY_HASH); return tooMany(res); }
    const valid = await bcrypt.compare(password, admin ? admin.password_hash : DUMMY_HASH);
    if (!admin || !valid) { await recordFailure(admin); return res.status(401).json({ error: 'Invalid credentials' }); }
    if (admin.totp_enabled) {
      if (!code) return res.status(401).json({ error: 'Enter the 6-digit code from your authenticator app', twoFactor: true });
      if (!(await secondStepOk(admin, code))) { await recordFailure(admin); return res.status(401).json({ error: 'That code is not right', twoFactor: true }); }
    }
    await pool.query('UPDATE admins SET failed_logins = 0, locked_until = NULL WHERE id = $1', [admin.id]);
    res.json({ token: generateToken(admin), user: { id: admin.id, username: admin.username, role: admin.role, twoFactor: !!admin.totp_enabled } });
  } catch (e) {
    fail(res, e);
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role, totp_enabled AS "twoFactor" FROM admins WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// admin changes own password (needs the current one). Every other sign-in is ended; this device gets a fresh token.
router.post('/change-password', authMiddleware, loginLimiter, async (req, res) => {
  const { current, next } = req.body || {};
  if (typeof current !== 'string' || typeof next !== 'string' || !current || current.length > 200) return res.status(400).json({ error: 'Current and new password required' });
  if (next === current) return res.status(400).json({ error: 'New password must be different' });
  try {
    const admin = (await pool.query('SELECT * FROM admins WHERE id = $1', [req.user.id])).rows[0];
    if (!admin || !(await bcrypt.compare(current, admin.password_hash))) return res.status(401).json({ error: 'Current password is wrong' });
    const weak = passwordProblem(next, admin.username);
    if (weak) return res.status(400).json({ error: weak });
    const { rows } = await pool.query('UPDATE admins SET password_hash = $1, token_version = token_version + 1 WHERE id = $2 RETURNING *', [await bcrypt.hash(next, 12), admin.id]);
    forgetSession(admin.id);
    res.json({ ok: true, token: generateToken(rows[0]) });
  } catch (e) { fail(res, e); }
});

// "Sign out everywhere": ends every other session of this account (stolen or forgotten devices)
router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE admins SET token_version = token_version + 1 WHERE id = $1 RETURNING *', [req.user.id]);
    forgetSession(req.user.id);
    res.json({ ok: true, token: generateToken(rows[0]) });
  } catch (e) { fail(res, e); }
});

// ---------- two-step sign-in (authenticator app) ----------
router.get('/2fa/status', authMiddleware, async (req, res) => {
  try {
    const a = (await pool.query('SELECT totp_enabled, backup_codes FROM admins WHERE id = $1', [req.user.id])).rows[0];
    let left = 0; try { left = JSON.parse(a?.backup_codes || '[]').length; } catch { /* none */ }
    res.json({ enabled: !!a?.totp_enabled, backupCodesLeft: left });
  } catch (e) { fail(res, e); }
});

// step 1: needs the password; makes a secret and a QR picture, nothing is active until step 2 confirms a code
router.post('/2fa/setup', authMiddleware, loginLimiter, async (req, res) => {
  try {
    const a = (await pool.query('SELECT * FROM admins WHERE id = $1', [req.user.id])).rows[0];
    if (!a || typeof req.body?.password !== 'string' || !(await bcrypt.compare(req.body.password, a.password_hash))) return res.status(401).json({ error: 'Password is wrong' });
    if (a.totp_enabled) return res.status(409).json({ error: 'Two-step sign-in is already on' });
    const secret = totp.generateSecret();
    await pool.query('UPDATE admins SET totp_secret = $1 WHERE id = $2', [totp.seal(secret, JWT_SECRET), a.id]);
    const uri = totp.otpauthUrl(secret, a.username);
    res.json({ secret, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 240 }) });
  } catch (e) { fail(res, e); }
});

// step 2: a valid code from the app turns it on and returns 8 one-time backup codes (shown only once)
router.post('/2fa/enable', authMiddleware, loginLimiter, async (req, res) => {
  try {
    const a = (await pool.query('SELECT * FROM admins WHERE id = $1', [req.user.id])).rows[0];
    if (!a?.totp_secret) return res.status(400).json({ error: 'Start the setup first' });
    if (a.totp_enabled) return res.status(409).json({ error: 'Two-step sign-in is already on' });
    let ok = false; try { ok = totp.verify(totp.open(a.totp_secret, JWT_SECRET), req.body?.code); } catch { /* bad secret */ }
    if (!ok) return res.status(401).json({ error: 'That code is not right. Check the time on your phone and try again.' });
    const codes = totp.newBackupCodes(8);
    await pool.query('UPDATE admins SET totp_enabled = TRUE, backup_codes = $1 WHERE id = $2', [JSON.stringify(codes.map(totp.hashCode)), a.id]);
    res.json({ ok: true, backupCodes: codes });
  } catch (e) { fail(res, e); }
});

// turning it off needs the password AND a current code (or backup code)
router.post('/2fa/disable', authMiddleware, loginLimiter, async (req, res) => {
  try {
    const a = (await pool.query('SELECT * FROM admins WHERE id = $1', [req.user.id])).rows[0];
    if (!a || typeof req.body?.password !== 'string' || !(await bcrypt.compare(req.body.password, a.password_hash))) return res.status(401).json({ error: 'Password is wrong' });
    if (!a.totp_enabled) return res.json({ ok: true });
    if (!(await secondStepOk(a, req.body?.code))) return res.status(401).json({ error: 'That code is not right' });
    await pool.query('UPDATE admins SET totp_enabled = FALSE, totp_secret = NULL, backup_codes = NULL WHERE id = $1', [a.id]);
    res.json({ ok: true });
  } catch (e) { fail(res, e); }
});

module.exports = router;
