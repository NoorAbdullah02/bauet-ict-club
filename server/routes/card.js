const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { fail } = require('../utils/http');
const { isAdminRequest } = require('../middleware/auth');
const mail = require('../utils/mailer');

const router = express.Router();
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// In production JWT_SECRET is required (middleware/auth.js refuses to start without one).
const SECRET = () => process.env.JWT_SECRET || 'dev-secret';

/** The code printed on a card (and inside its QR). It only proves "the club issued this card for this id". */
const cardCode = (key) => {
  const h = crypto.createHmac('sha256', SECRET()).update(`card:${key}`).digest();
  return `M${key}-${Array.from(h.subarray(0, 6), (b) => B32[b % 32]).join('')}`;
};
const same = (a, b) => { try { return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; } };
const TYPE_LABEL = { general: 'General member', ambassador: 'Department ambassador', committee: 'Committee member' };

/* ---------- changing a photo or a date of birth needs proof that it is really you ----------
 * A committee member's card code is public on purpose (the Team page shows the same person), so the code alone
 * must never allow a change: someone could otherwise rewrite another member's photo and birth date.
 * Proof is either (a) a short-lived edit token from the e-mail OTP flow, (b) the secret card code of an approved
 * applicant (only that person received it), or (c) an admin login. */
const EDIT_MINUTES = 30;
const editSecret = (key) => crypto.createHmac('sha256', SECRET()).update(`card-edit:${key}`).digest();
const editToken = (key) => {
  const body = `${key}.${Date.now() + EDIT_MINUTES * 60000}`;
  return `${Buffer.from(body).toString('base64url')}.${crypto.createHmac('sha256', editSecret(key)).update(body).digest('base64url')}`;
};
const editTokenOk = (token, key) => {
  try {
    const [raw, sig] = String(token || '').split('.');
    if (!raw || !sig) return false;
    const body = Buffer.from(raw, 'base64url').toString();
    const cut = body.lastIndexOf('.');
    const k = body.slice(0, cut);
    const exp = Number(body.slice(cut + 1));
    if (k !== String(key) || !Number.isFinite(exp) || exp < Date.now()) return false;
    return same(sig, crypto.createHmac('sha256', editSecret(key)).update(body).digest('base64url'));
  } catch { return false; }
};
const mayEdit = async (req, raw) => {
  if (editTokenOk(req.body?.proof || req.query?.proof, raw)) return true;
  if (/^r\d+$/.test(raw) && same(String(req.body?.code || req.query?.c || ''), cardCode(raw))) return true;
  return isAdminRequest(req);
};

/* ---------- pictures must come from this club's own storage ---------- */
const CLOUD = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LOCAL_UPLOAD = /^\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$/;
const photoOk = (u) => {
  const url = String(u || '').trim();
  if (!url) return false;
  if (LOCAL_UPLOAD.test(url)) return true;
  if (!CLOUD) return false; // no Cloudinary here: only this server's own uploads are accepted
  return new RegExp(`^https://res\\.cloudinary\\.com/${CLOUD}/`).test(url);
};

/* ---------- one identity per person: never match points or certificates by name ----------
 * Two members can be called "Nusrat Jahan". Matching by name used to hand one person's certificates
 * (and their ticket codes) to the other. Every lookup now goes through an e-mail address or a student ID. */
async function identityOf(key) {
  const raw = String(key);
  if (/^r\d+$/.test(raw)) {
    const r = (await pool.query('SELECT email, student_id FROM registrations WHERE id = $1 AND deleted_at IS NULL', [Number(raw.slice(1))])).rows[0];
    return r ? { email: r.email || '', studentId: r.student_id || '' } : null;
  }
  if (/^a\d+$/.test(raw)) return { email: '', studentId: '' }; // advisors have no attendance record of their own
  const m = (await pool.query('SELECT registration_id, student_id FROM members WHERE id = $1 AND deleted_at IS NULL', [Number(raw)])).rows[0];
  if (!m) return null;
  let email = '';
  if (m.registration_id) {
    const r = (await pool.query('SELECT email FROM registrations WHERE id = $1 AND deleted_at IS NULL', [m.registration_id])).rows[0];
    email = r?.email || '';
  }
  return { email, studentId: m.student_id || '' };
}

async function getMemberStats(key) {
  const empty = { points: 0, eventsCount: 0, certificates: [], awards: [] };
  const who = await identityOf(key);
  if (!who) return empty;
  const email = String(who.email || '').trim().toLowerCase();
  const sid = String(who.studentId || '').trim().toLowerCase();
  if (!email && !sid) return empty; // no identity on file: show zeros rather than guess by name
  try {
    const by = '((LOWER(email) = $1 AND $1 <> \'\') OR (LOWER(student_id) = $2 AND $2 <> \'\'))';
    const att = (await pool.query(
      `SELECT COUNT(DISTINCT event_id)::int AS c FROM event_registrations
       WHERE deleted_at IS NULL AND checked_in_at IS NOT NULL AND ${by}`, [email, sid]
    )).rows[0];
    const eventsCount = att?.c || 0;

    const aw = (await pool.query(
      `SELECT COALESCE(SUM(points), 0)::int AS p FROM point_awards
       WHERE deleted_at IS NULL AND LOWER(email) = $1 AND $1 <> ''`, [email]
    )).rows[0];
    const points = eventsCount * 10 + (aw?.p || 0);

    const certs = (await pool.query(
      `SELECT er.ticket AS code, er.cert_name, er.created_at, e.title AS event_title, e.date AS event_date
       FROM event_registrations er JOIN events e ON er.event_id = e.id
       WHERE er.deleted_at IS NULL AND er.ticket IS NOT NULL AND ${by}
         AND (er.cert_pick = TRUE OR er.checked_in_at IS NOT NULL OR er.certificate_sent_at IS NOT NULL)
       ORDER BY er.id DESC LIMIT 10`, [email, sid]
    )).rows;
    const certificates = certs.map((c) => ({ code: c.code, event: c.event_title, date: c.event_date, name: c.cert_name || null }));

    const awards = (await pool.query(
      `SELECT points, reason, created_at FROM point_awards
       WHERE deleted_at IS NULL AND LOWER(email) = $1 AND $1 <> '' ORDER BY created_at DESC LIMIT 10`, [email]
    )).rows.map((a) => ({ points: a.points, reason: a.reason, date: a.created_at }));

    return { points, eventsCount, certificates, awards };
  } catch { return empty; }
}

/* ---------- e-mail OTP for the card (and for the right to change a photo / birth date) ---------- */
const findLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Please wait a while.' } });
const patchLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many changes from this network. Please try again later.' } });
const OTP_MINUTES = 10;
const OTP_TRIES = 5;
const RESEND_SECONDS = 30;
const codeHash = (email, code) => crypto.createHmac('sha256', SECRET()).update(`card-otp:${email}:${code}`).digest('hex');

const maskMail = (em) => {
  const [u, d] = (em || '').split('@');
  if (!d) return em;
  return `${u.slice(0, 2)}***${u.slice(-1)}@${d}`;
};

/** Which card belongs to this e-mail? Only used to address the code to that same e-mail, which is the proof. */
async function keyForEmail(email, memberId = null) {
  if (memberId) {
    const mem = (await pool.query('SELECT id, registration_id, name FROM members WHERE id = $1 AND deleted_at IS NULL', [memberId])).rows[0];
    if (mem) {
      if (mem.registration_id) {
        const reg = (await pool.query('SELECT id FROM registrations WHERE id = $1 AND LOWER(email) = $2 AND deleted_at IS NULL', [mem.registration_id, email])).rows[0];
        if (reg) return String(mem.id);
      }
      const reg = (await pool.query('SELECT id FROM registrations WHERE LOWER(email) = $1 AND deleted_at IS NULL LIMIT 1', [email])).rows[0];
      if (reg) return String(mem.id);
    }
  }

  const app = (await pool.query("SELECT id FROM registrations WHERE LOWER(email) = $1 AND deleted_at IS NULL ORDER BY (status = 'approved') DESC, id DESC LIMIT 1", [email])).rows[0];
  if (app) return `r${app.id}`;
  const linked = (await pool.query(
    'SELECT m.id FROM members m JOIN registrations r ON r.id = m.registration_id WHERE m.deleted_at IS NULL AND LOWER(r.email) = $1 ORDER BY m.id DESC LIMIT 1', [email]
  )).rows[0];
  if (linked) return String(linked.id);
  const byName = (await pool.query(
    'SELECT m.id FROM members m WHERE m.deleted_at IS NULL AND LOWER(m.name) IN (SELECT LOWER(full_name) FROM registrations WHERE LOWER(email) = $1) LIMIT 2', [email]
  )).rows;
  return byName.length >= 1 ? String(byName[0].id) : null;
}

router.post('/otp/request', findLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 100);
  const memberId = Number(req.body?.memberId) || null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  // the same answer for members and strangers, so nobody can use this page to check who is in the club
  const generic = {
    success: true,
    email: maskMail(email),
    resendIn: RESEND_SECONDS,
    message: 'If this e-mail belongs to an approved member, a 6-digit code is on its way.',
  };
  try {
    const prev = (await pool.query('SELECT sent_at FROM card_otps WHERE email = $1', [email])).rows[0];
    if (prev && Date.now() - new Date(prev.sent_at).getTime() < RESEND_SECONDS * 1000) {
      return res.status(429).json({ error: `Please wait ${RESEND_SECONDS} seconds before asking for another code`, retryAfter: RESEND_SECONDS });
    }
    const key = await keyForEmail(email, memberId);
    if (!key) return res.json(generic);
    const code = String(crypto.randomInt(100000, 1000000));
    await pool.query(
      `INSERT INTO card_otps (email, code_hash, member_key, attempts, sent_at, expires_at) VALUES ($1,$2,$3,0,NOW(),$4)
       ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, member_key = EXCLUDED.member_key, attempts = 0, sent_at = NOW(), expires_at = EXCLUDED.expires_at`,
      [email, codeHash(email, code), key, new Date(Date.now() + OTP_MINUTES * 60000)]
    );
    mail.deliver({ to: email, ...mail.templates.cardOtp(code, OTP_MINUTES) });

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (token && chatId) {
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔐 <b>BAUET ICT Club Verification Code</b>\n\nCode: <code>${code}</code>\n\nRequested for: <code>${email}</code>\nValid for ${OTP_MINUTES} minutes.`,
          parse_mode: 'HTML',
        }),
      }).catch(() => {});
    }

    res.json(generic);
  } catch (e) { fail(res, e); }
});

router.post('/otp/verify', findLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 100);
  const code = String(req.body?.code || '').replace(/\D/g, '').slice(0, 6);
  const bad = { error: 'That code is not right, or it has expired. Ask for a new one.' };
  if (!email || !code) return res.status(400).json({ error: 'E-mail and the 6-digit code are required' });
  try {
    const row = (await pool.query('SELECT * FROM card_otps WHERE email = $1', [email])).rows[0];
    if (!row || new Date(row.expires_at) < new Date() || row.attempts >= OTP_TRIES || code.length !== 6) {
      if (row && row.attempts >= OTP_TRIES) await pool.query('DELETE FROM card_otps WHERE email = $1', [email]);
      return res.status(400).json(bad);
    }
    if (!same(codeHash(email, code), row.code_hash)) {
      await pool.query('UPDATE card_otps SET attempts = attempts + 1 WHERE email = $1', [email]);
      return res.status(400).json(bad);
    }
    await pool.query('DELETE FROM card_otps WHERE email = $1', [email]); // a code works once
    const key = String(row.member_key);
    const c = cardCode(key);
    res.set('Cache-Control', 'no-store').json({
      id: key,
      code: c,
      edit: editToken(key), // lets this person change their own photo / date of birth for 30 minutes
      path: `/card/${key}?c=${c}`,
      profilePath: `/member/${key}?c=${c}`,
    });
  } catch (e) { fail(res, e); }
});

router.post('/find', findLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 100);
    const sid = String(req.body?.student_id || '').trim().toLowerCase().slice(0, 30);
    if (!email || !sid) return res.status(400).json({ error: 'Enter your e-mail and your student ID.' });
    const r = (await pool.query("SELECT id, status FROM registrations WHERE LOWER(email) = $1 AND LOWER(student_id) = $2 AND deleted_at IS NULL ORDER BY (status = 'approved') DESC, id DESC LIMIT 1", [email, sid])).rows[0];
    if (!r) return res.status(404).json({ error: 'We could not find an application with this e-mail and student ID.' });
    if (r.status !== 'approved') return res.status(409).json({ error: r.status === 'pending' ? 'Your application is still waiting for approval. Your card appears here as soon as an admin approves it.' : 'This application was not approved, so there is no card.' });
    const key = `r${r.id}`;
    const code = cardCode(key);
    res.set('Cache-Control', 'no-store').json({ id: key, code, edit: editToken(key), path: `/card/${key}?c=${code}` });
  } catch (e) { fail(res, e); }
});

/* ---------- reading a card ---------- */
router.get('/:id', async (req, res) => {
  const raw = String(req.params.id);
  const given = String(req.query.c || '');
  try {
    if (/^r\d+$/.test(raw)) {
      const id = Number(raw.slice(1));
      const code = cardCode(raw);
      if (!same(given, code)) return res.status(404).json({ error: 'Member not found' });
      const r = (await pool.query("SELECT id, type, full_name, email, student_id, department, batch, post, photo_url, interests, experience, note, birth_date, created_at FROM registrations WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL", [id])).rows[0];
      if (!r) return res.status(404).json({ error: 'Member not found' });
      const stats = await getMemberStats(raw);
      return res.set('Cache-Control', 'no-store').json({
        member: {
          id: raw,
          name: r.full_name,
          position: r.type === 'committee' && r.post ? r.post : (TYPE_LABEL[r.type] || 'Member'),
          department: r.department,
          batch: r.batch,
          session: `Member since ${new Date(r.created_at).getFullYear()}`,
          image_url: r.photo_url || null,
          birth_date: r.birth_date ? new Date(r.birth_date).toISOString().slice(0, 10) : null,
          current: true,
          bio: r.note || '',
          interests: r.interests || [],
        },
        stats,
        code, // the caller already proved they know it
        edit: same(given, code) ? editToken(raw) : null,
        verified: true,
      });
    }
    if (/^a\d+$/.test(raw)) {
      const a = (await pool.query('SELECT id, name, designation, rank_title, department, image_url, active FROM advisors WHERE id = $1 AND deleted_at IS NULL', [Number(raw.slice(1))])).rows[0];
      if (!a) return res.status(404).json({ error: 'Member not found' });
      const code = cardCode(raw);
      return res.set('Cache-Control', 'no-store').json({
        member: { id: raw, name: a.name, position: a.designation || 'Advisor', department: a.department, batch: '', session: a.rank_title || 'Club advisor', image_url: a.image_url, current: a.active !== false },
        code,
        verified: same(given, code),
      });
    }
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Member not found' });
    const m = (await pool.query('SELECT id, name, position, department, batch, committee_session, image_url, social_fb, social_gh, social_li, active, birth_date FROM members WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
    if (!m) return res.status(404).json({ error: 'Member not found' });
    const code = cardCode(String(m.id));
    const stats = await getMemberStats(String(m.id));
    res.set('Cache-Control', 'no-store').json({
      member: {
        id: m.id,
        name: m.name,
        position: m.position,
        department: m.department,
        batch: m.batch,
        session: m.committee_session,
        image_url: m.image_url,
        social_fb: m.social_fb,
        social_gh: m.social_gh,
        social_li: m.social_li,
        birth_date: m.birth_date ? new Date(m.birth_date).toISOString().slice(0, 10) : null,
        current: m.active !== false,
      },
      stats,
      // the Team page links here with no code and still needs the QR picture, so the public card code is returned.
      // It is a "this card was issued by the club" mark, not a password: changing anything needs the OTP token below.
      code,
      edit: null,
      verified: same(given, code),
    });
  } catch (e) { fail(res, e); }
});

router.patch('/:id/birthdate', patchLimiter, async (req, res) => {
  const raw = String(req.params.id);
  const birthDate = String(req.body?.birth_date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(new Date(`${birthDate}T00:00:00Z`).getTime()) || new Date(`${birthDate}T00:00:00Z`).getFullYear() < 1900) {
    return res.status(400).json({ error: 'Enter a real date of birth (YYYY-MM-DD).' });
  }
  if (!(await mayEdit(req, raw))) {
    return res.status(403).json({ error: 'Please prove it is you first: open "My member card", enter your e-mail and confirm the 6-digit code, then try again.', needs_otp: true });
  }
  try {
    if (/^r\d+$/.test(raw)) {
      const result = await pool.query('UPDATE registrations SET birth_date = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, birth_date', [birthDate, Number(raw.slice(1))]);
      if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
      return res.json({ success: true, birth_date: birthDate });
    }
    const memberId = Number(raw);
    if (!Number.isInteger(memberId) || memberId < 1) return res.status(400).json({ error: 'Invalid member ID' });
    const result = await pool.query('UPDATE members SET birth_date = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, birth_date', [birthDate, memberId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
    return res.json({ success: true, birth_date: birthDate });
  } catch (e) { fail(res, e); }
});

router.patch('/:id/photo', patchLimiter, async (req, res) => {
  const raw = String(req.params.id);
  const photoUrl = String(req.body?.photo_url || '').trim();
  if (!photoOk(photoUrl)) {
    return res.status(400).json({ error: 'That photo link is not from the club storage. Upload the picture again.' });
  }
  if (!(await mayEdit(req, raw))) {
    return res.status(403).json({ error: 'Please prove it is you first: open "My member card", enter your e-mail and confirm the 6-digit code, then try again.', needs_otp: true });
  }
  try {
    if (/^r\d+$/.test(raw)) {
      const result = await pool.query('UPDATE registrations SET photo_url = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, photo_url', [photoUrl, Number(raw.slice(1))]);
      if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
      return res.json({ success: true, image_url: result.rows[0].photo_url });
    }
    const memberId = Number(raw);
    if (!Number.isInteger(memberId) || memberId < 1) return res.status(400).json({ error: 'Invalid member ID' });
    const result = await pool.query('UPDATE members SET image_url = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, image_url', [photoUrl, memberId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
    return res.json({ success: true, image_url: result.rows[0].image_url });
  } catch (e) { fail(res, e); }
});

module.exports = router;
module.exports.cardCode = cardCode;
