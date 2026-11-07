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

// brute-force guard 1: 40 wrong attempts per IP per 5 minutes (successful logins do not count). Campus Wi-Fi shares one address between many people, so this is wide; the per-account lock below is the real guard.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 40, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many failed attempts. Try again in 5 minutes.' },
});
// brute-force guard 2 (per account): 5 wrong passwords or codes lock that account for 5 minutes, whatever IP the attempts come from
const MAX_FAILS = 5;
const LOCK_MINUTES = 5;
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
    if (!admin || !valid) { console.warn(`Sign-in refused: ${admin ? 'wrong password' : 'no such user'} (typed user "${username.trim().slice(0, 40)}", password length ${password.length})`); await recordFailure(admin); return res.status(401).json({ error: 'Invalid credentials' }); }
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

// ---------- forgotten password: a one-time link is e-mailed to ADMIN_NOTIFY_EMAIL ----------
// The link holds a random 256-bit token. Only its keyed hash (HMAC-SHA256 with JWT_SECRET) is stored, so the database alone cannot be used to reset anything.
// It works once, for 30 minutes. The answer is always the same whether the account exists or not.
const crypto = require('crypto');
const RESET_MINUTES = 30;
const resetHash = (t) => crypto.createHmac('sha256', JWT_SECRET).update(`admin-reset:${t}`).digest('hex');
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Try again in a few minutes.' } });
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

router.post('/forgot', forgotLimiter, async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().slice(0, 100) : '';
  const same = { ok: true, message: 'If this account exists, a reset link was sent to the club e-mail address. It works once, for 30 minutes.' };
  try {
    if (!username) return res.json(same);
    const { rows } = await pool.query('SELECT id, reset_expires FROM admins WHERE LOWER(username) = LOWER($1) LIMIT 1', [username]);
    const admin = rows[0];
    // one e-mail per account every 2 minutes, so nobody can fill the inbox
    const recent = admin?.reset_expires && new Date(admin.reset_expires).getTime() - RESET_MINUTES * 60000 > Date.now() - 2 * 60000;
    if (admin && !recent) {
      const token = crypto.randomBytes(32).toString('base64url');
      await pool.query('UPDATE admins SET reset_hash = $1, reset_expires = $2 WHERE id = $3', [resetHash(token), new Date(Date.now() + RESET_MINUTES * 60000), admin.id]);
      const mailer = require('../utils/mailer');
      const link = `${mailer.siteUrl()}/admin?reset=${encodeURIComponent(token)}&u=${encodeURIComponent(username)}`;
      const t = mailer.templates.adminReset(link, RESET_MINUTES);
      mailer.sendMail({ to: mailer.adminAddress(), subject: t.subject, html: t.html, text: t.text });
    }
    res.json(same);
  } catch (e) { fail(res, e); }
});

router.post('/reset', resetLimiter, async (req, res) => {
  const { token, username, password } = req.body || {};
  if (typeof token !== 'string' || typeof username !== 'string' || typeof password !== 'string' || !token || token.length > 200) return res.status(400).json({ error: 'This reset link is not valid.' });
  const bad = { error: 'This reset link is not valid or has expired. Ask for a new one.' };
  try {
    const { rows } = await pool.query('SELECT id, username, reset_hash, reset_expires FROM admins WHERE LOWER(username) = LOWER($1) LIMIT 1', [username.trim()]);
    const admin = rows[0];
    let ok = false;
    if (admin?.reset_hash && admin.reset_expires && new Date(admin.reset_expires) > new Date()) {
      const a = Buffer.from(resetHash(token)); const b = Buffer.from(admin.reset_hash);
      ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    }
    if (!ok) return res.status(400).json(bad);
    const problem = passwordProblem(password, admin.username);
    if (problem) return res.status(400).json({ error: problem });
    const hash = await bcrypt.hash(password, 10);
    // the link is used up, the lock is cleared and every old session ends
    await pool.query('UPDATE admins SET password_hash = $1, reset_hash = NULL, reset_expires = NULL, failed_logins = 0, locked_until = NULL, token_version = COALESCE(token_version, 0) + 1 WHERE id = $2', [hash, admin.id]);
    res.json({ ok: true, message: 'Password changed. You can sign in now.' });
  } catch (e) { fail(res, e); }
});

// ---------- sign-up: at most 3 admin accounts, each proved by a code sent to the person's own e-mail ----------
// No ready-made user name or password exists. The first people sign up themselves: user name, e-mail, password, then the 6-digit code from the e-mail.
// Once 3 accounts exist the sign-up closes by itself. The first account is the main admin (superadmin); the others are admins.
const MAX_ADMINS = 3;
const SIGNUP_MINUTES = 15;
const dns = require('dns').promises;
const codeHash = (email, code) => crypto.createHmac('sha256', JWT_SECRET).update(`signup:${email}:${code}`).digest('hex');
const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-up attempts. Try again in a few minutes.' } });
const adminCount = async () => Number((await pool.query("SELECT COUNT(*)::int AS n FROM admins WHERE role IN ('superadmin','admin')")).rows[0].n);
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable|throwawaymail|maildrop)\./i;

// does the e-mail address look right, and does its domain really receive mail?
async function emailProblem(email) {
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return 'Type a valid e-mail address.';
  if (DISPOSABLE.test(email)) return 'Use your own permanent e-mail address, not a temporary one.';
  try {
    const mx = await dns.resolveMx(email.split('@')[1]);
    if (!mx.length) return 'This e-mail domain cannot receive mail. Check the spelling.';
  } catch (e) {
    if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') return 'This e-mail domain cannot receive mail. Check the spelling.';
    // the lookup itself failed (no network): the code sent to the address is the real proof, so carry on
  }
  return '';
}

router.get('/signup/status', async (req, res) => {
  try { const n = await adminCount(); res.json({ open: n < MAX_ADMINS, left: Math.max(0, MAX_ADMINS - n), max: MAX_ADMINS }); } catch (e) { fail(res, e); }
});

router.post('/signup/start', signupLimiter, async (req, res) => {
  const b = req.body || {};
  const username = typeof b.username === 'string' ? b.username.trim() : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const password = typeof b.password === 'string' ? b.password : '';
  try {
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) return res.status(400).json({ error: 'The user name needs 3 to 30 letters, numbers, dot, dash or underscore.' });
    const bad = await emailProblem(email);
    if (bad) return res.status(400).json({ error: bad });
    const pw = passwordProblem(password, username);
    if (pw) return res.status(400).json({ error: pw });
    if ((await adminCount()) >= MAX_ADMINS) return res.status(403).json({ error: 'Sign-up is closed: the 3 admin accounts already exist.' });
    if ((await pool.query('SELECT 1 FROM admins WHERE LOWER(username) = LOWER($1) OR LOWER(email) = $2', [username, email])).rows.length) return res.status(409).json({ error: 'This user name or e-mail is already used.' });
    // another person waiting with the same user name (other e-mail) blocks it only while their code is still valid
    const wait = await pool.query('SELECT email FROM admin_signups WHERE LOWER(username) = LOWER($1) AND email <> $2 AND expires_at > NOW()', [username, email]);
    if (wait.rows.length) return res.status(409).json({ error: 'This user name is being used by someone else right now. Choose another.' });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await pool.query(`INSERT INTO admin_signups (email, username, password_hash, code_hash, expires_at, attempts) VALUES ($1,$2,$3,$4,$5,0)
      ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
    [email, username, await bcrypt.hash(password, 10), codeHash(email, code), new Date(Date.now() + SIGNUP_MINUTES * 60000)]);
    const mailer = require('../utils/mailer');
    const t = mailer.templates.signupCode(code, SIGNUP_MINUTES);
    if (!mailer.sendMail({ to: email, subject: t.subject, html: t.html, text: t.text })) return res.status(503).json({ error: 'E-mail sending is not set up on the server yet, so the code cannot be sent.' });
    res.json({ ok: true, message: `We sent a 6-digit code to ${email}. It works for ${SIGNUP_MINUTES} minutes.` });
  } catch (e) { fail(res, e); }
});

router.post('/signup/verify', signupLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
  const bad = { error: 'That code is not right, or it expired. Check the e-mail, or start again.' };
  try {
    const { rows } = await pool.query('SELECT * FROM admin_signups WHERE email = $1', [email]);
    const su = rows[0];
    if (!su || new Date(su.expires_at) < new Date() || su.attempts >= 5 || !/^\d{6}$/.test(code)) {
      if (su) await pool.query('UPDATE admin_signups SET attempts = attempts + 1 WHERE email = $1', [email]);
      return res.status(400).json(bad);
    }
    const a = Buffer.from(codeHash(email, code)); const b = Buffer.from(su.code_hash);
    if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) { await pool.query('UPDATE admin_signups SET attempts = attempts + 1 WHERE email = $1', [email]); return res.status(400).json(bad); }
    // the account is added, then the count is checked: if two people finished at the same moment and there are now too many, the new row is removed again
    const role = (await pool.query("SELECT 1 FROM admins WHERE role = 'superadmin' LIMIT 1")).rows.length ? 'admin' : 'superadmin';
    const dupe = (await pool.query('SELECT 1 FROM admins WHERE LOWER(username) = LOWER($1)', [su.username])).rows.length;
    const made = dupe ? { rows: [] } : await pool.query('INSERT INTO admins (username, password_hash, role, email) VALUES ($1,$2,$3,$4) RETURNING id, username, role', [su.username, su.password_hash, role, email]);
    if (made.rows.length && (await adminCount()) > MAX_ADMINS) { await pool.query('DELETE FROM admins WHERE id = $1', [made.rows[0].id]); made.rows.length = 0; }
    await pool.query('DELETE FROM admin_signups WHERE email = $1', [email]);
    if (!made.rows.length) return res.status(409).json({ error: 'The account could not be created: sign-up is closed or the user name was taken meanwhile.' });
    const mailer = require('../utils/mailer');
    const note = mailer.templates.signupNotice(su.username, email, role);
    mailer.sendMail({ to: mailer.adminAddress(), subject: note.subject, html: note.html, text: note.text });
    res.json({ ok: true, username: made.rows[0].username, message: 'Account created. You can sign in now.' });
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
