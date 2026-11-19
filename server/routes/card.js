const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');

const router = express.Router();
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const cardCode = (key) => {
  const h = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(`card:${key}`).digest();
  return `M${key}-${Array.from(h.subarray(0, 6), (b) => B32[b % 32]).join('')}`;
};
const same = (a, b) => { try { return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; } };
const TYPE_LABEL = { general: 'General member', ambassador: 'Department ambassador', committee: 'Committee member' };

async function getMemberStats(email, name) {
  let points = 0;
  let eventsCount = 0;
  let certificates = [];
  let awards = [];
  try {
    let lookupEmail = email;
    if (!lookupEmail && name) {
      const found = (await pool.query("SELECT email FROM registrations WHERE deleted_at IS NULL AND LOWER(full_name) = LOWER($1) AND email IS NOT NULL AND email <> '' LIMIT 1", [name])).rows[0];
      if (found?.email) lookupEmail = found.email;
    }

    const att = (await pool.query(
      `SELECT COUNT(DISTINCT event_id)::int as c FROM event_registrations 
       WHERE deleted_at IS NULL AND checked_in_at IS NOT NULL 
         AND ((LOWER(email) = LOWER($1) AND $1 IS NOT NULL AND $1 <> '') OR (LOWER(full_name) = LOWER($2) AND $2 IS NOT NULL AND $2 <> ''))`,
      [lookupEmail || '', name || '']
    )).rows[0];
    eventsCount = att?.c || 0;

    const aw = (await pool.query(
      `SELECT COALESCE(SUM(points), 0)::int as p FROM point_awards 
       WHERE deleted_at IS NULL AND ((LOWER(email) = LOWER($1) AND $1 IS NOT NULL AND $1 <> '') OR (LOWER(name) = LOWER($2) AND $2 IS NOT NULL AND $2 <> ''))`,
      [lookupEmail || '', name || '']
    )).rows[0];
    points = eventsCount * 10 + (aw?.p || 0);

    const certs = (await pool.query(
      `SELECT er.ticket as code, er.cert_name, er.created_at, e.title as event_title, e.date as event_date
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       WHERE er.deleted_at IS NULL AND er.ticket IS NOT NULL 
         AND (
           (LOWER(er.email) = LOWER($1) AND $1 IS NOT NULL AND $1 <> '')
           OR (LOWER(er.full_name) = LOWER($2) AND $2 IS NOT NULL AND $2 <> '')
           OR (LOWER(er.cert_name) = LOWER($2) AND $2 IS NOT NULL AND $2 <> '')
         )
         AND (er.cert_pick = true OR er.checked_in_at IS NOT NULL OR er.certificate_sent_at IS NOT NULL)
       ORDER BY er.id DESC LIMIT 10`,
      [lookupEmail || '', name || '']
    )).rows;
    certificates = certs.map((c) => ({
      code: c.code,
      event: c.event_title,
      date: c.event_date,
      name: c.cert_name || name,
    }));

    const awardsRows = (await pool.query(
      `SELECT points, reason, created_at FROM point_awards 
       WHERE deleted_at IS NULL AND ((LOWER(email) = LOWER($1) AND $1 IS NOT NULL AND $1 <> '') OR (LOWER(name) = LOWER($2) AND $2 IS NOT NULL AND $2 <> '')) 
       ORDER BY created_at DESC LIMIT 10`,
      [lookupEmail || '', name || '']
    )).rows;
    awards = awardsRows.map((a) => ({
      points: a.points,
      reason: a.reason,
      date: a.created_at,
    }));
  } catch { /* soft fail */ }
  return { points, eventsCount, certificates, awards };
}

const findLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Please wait a while.' } });

const otpStore = new Map();
const maskMail = (em) => {
  const [u, d] = (em || '').split('@');
  if (!d) return em;
  return `${u.slice(0, 2)}***${u.slice(-1)}@${d}`;
};

router.post('/otp/request', findLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 100);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  try {
    let r = (await pool.query("SELECT id, status FROM registrations WHERE LOWER(email) = $1 AND deleted_at IS NULL AND status = 'approved' ORDER BY id DESC LIMIT 1", [email])).rows[0];
    let key = r ? `r${r.id}` : null;
    if (!key) {
      const m = (await pool.query("SELECT id FROM members WHERE deleted_at IS NULL AND (LOWER(name) IN (SELECT LOWER(full_name) FROM registrations WHERE LOWER(email) = $1)) LIMIT 1", [email])).rows[0];
      if (m) key = String(m.id);
    }
    if (!key) return res.status(404).json({ error: 'No approved membership found with this email address.' });

    const prev = otpStore.get(email);
    if (prev && Date.now() - prev.sentAt < 30000) {
      return res.status(429).json({ error: 'Please wait 30 seconds before requesting another code', retryAfter: 30 });
    }

    const code = String(crypto.randomInt(100000, 999999));
    otpStore.set(email, { code, key, sentAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000 });
    mail.deliver({ to: email, ...mail.templates.cardOtp(code, 10) });

    res.json({ success: true, email: maskMail(email), resendIn: 30 });
  } catch (e) { fail(res, e); }
});

router.post('/otp/verify', findLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 100);
  const code = String(req.body?.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Email and verification code are required' });

  const entry = otpStore.get(email);
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(400).json({ error: 'Code has expired or does not exist. Please request a new code.' });
  }
  if (entry.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
  }

  otpStore.delete(email);
  const c = cardCode(entry.key);
  res.set('Cache-Control', 'no-store').json({
    id: entry.key,
    code: c,
    path: `/card/${entry.key}?c=${c}`,
    profilePath: `/member/${entry.key}?c=${c}`,
  });
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
    res.set('Cache-Control', 'no-store').json({ id: key, code, path: `/card/${key}?c=${code}` });
  } catch (e) { fail(res, e); }
});

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
      const stats = await getMemberStats(r.email, r.full_name);
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
        code, verified: true,
      });
    }
    if (/^a\d+$/.test(raw)) {
      const a = (await pool.query('SELECT id, name, designation, rank_title, department, image_url, active FROM advisors WHERE id = $1 AND deleted_at IS NULL', [Number(raw.slice(1))])).rows[0];
      if (!a) return res.status(404).json({ error: 'Member not found' });
      const code = cardCode(raw);
      return res.set('Cache-Control', 'no-store').json({
        member: { id: raw, name: a.name, position: a.designation || 'Advisor', department: a.department, batch: '', session: a.rank_title || 'Club advisor', image_url: a.image_url, current: a.active !== false },
        code, verified: same(given, code),
      });
    }
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Member not found' });
    const m = (await pool.query('SELECT id, name, position, department, batch, committee_session, image_url, social_fb, social_gh, social_li, active, birth_date FROM members WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
    if (!m) return res.status(404).json({ error: 'Member not found' });
    const code = cardCode(String(m.id));
    const stats = await getMemberStats(null, m.name);
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
      code, verified: same(given, code),
    });
  } catch (e) { fail(res, e); }
});

router.patch('/:id/birthdate', async (req, res) => {
  const raw = String(req.params.id);
  const code = String(req.body?.code || req.query.c || '');
  const birthDate = String(req.body?.birth_date || '').trim();
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return res.status(400).json({ error: 'Valid date of birth (YYYY-MM-DD) is required' });
  }
  const expectedCode = cardCode(raw);
  if (!same(code, expectedCode)) {
    return res.status(403).json({ error: 'You are not authorized to update date of birth.' });
  }
  try {
    if (/^r\d+$/.test(raw)) {
      const regId = Number(raw.slice(1));
      const result = await pool.query('UPDATE registrations SET birth_date = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, birth_date', [birthDate, regId]);
      if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
      return res.json({ success: true, birth_date: birthDate });
    }
    const memberId = Number(raw);
    if (Number.isInteger(memberId) && memberId > 0) {
      const result = await pool.query('UPDATE members SET birth_date = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, birth_date', [birthDate, memberId]);
      if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
      return res.json({ success: true, birth_date: birthDate });
    }
    return res.status(400).json({ error: 'Invalid member ID' });
  } catch (e) { fail(res, e); }
});

router.patch('/:id/photo', async (req, res) => {
  const raw = String(req.params.id);
  const code = String(req.body?.code || req.query.c || '');
  const photoUrl = String(req.body?.photo_url || '').trim();

  if (!photoUrl || !/^(https:\/\/res\.cloudinary\.com\/|\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$)/.test(photoUrl)) {
    return res.status(400).json({ error: 'Invalid photo URL' });
  }

  const expectedCode = cardCode(raw);
  if (!same(code, expectedCode)) {
    return res.status(403).json({ error: 'You are not authorized to update this photo.' });
  }

  try {
    if (/^r\d+$/.test(raw)) {
      const regId = Number(raw.slice(1));
      const result = await pool.query(
        "UPDATE registrations SET photo_url = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, photo_url",
        [photoUrl, regId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
      return res.json({ success: true, image_url: result.rows[0].photo_url });
    }

    const memberId = Number(raw);
    if (Number.isInteger(memberId) && memberId > 0) {
      const result = await pool.query(
        "UPDATE members SET image_url = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, image_url",
        [photoUrl, memberId]
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Member not found' });
      return res.json({ success: true, image_url: result.rows[0].image_url });
    }

    return res.status(400).json({ error: 'Invalid member ID' });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
module.exports.cardCode = cardCode;
