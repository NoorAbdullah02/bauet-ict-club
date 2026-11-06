const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { fail } = require('../utils/http');

const router = express.Router();
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters

/**
 * The signed code on a membership card, like M12-AB34CD (committee member 12) or Mr5-AB34CD (approved applicant 5).
 * Nobody can make a valid one without the server secret.
 */
const cardCode = (key) => {
  const h = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(`card:${key}`).digest();
  return `M${key}-${Array.from(h.subarray(0, 6), (b) => B32[b % 32]).join('')}`;
};
const same = (a, b) => { try { return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); } catch { return false; } };
const TYPE_LABEL = { general: 'General member', ambassador: 'Department ambassador', committee: 'Committee member' };

/**
 * Public: a member who joined through the application form (approved by an admin) finds their own card.
 * POST /api/card/find { email, student_id } -> { id: 'r5', code, path }. Both must match an approved application.
 */
const findLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Please wait a while.' } });
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

/**
 * Public: the data on one card. GET /api/card/:id?c=CODE
 *  - a committee member (numeric id, shown on the Team page anyway) -> { member, code, verified }
 *  - an approved applicant (r + number): shown only with the right code (the code is the secret), otherwise 404.
 */
router.get('/:id', async (req, res) => {
  const raw = String(req.params.id);
  const given = String(req.query.c || '');
  try {
    if (/^r\d+$/.test(raw)) {
      const id = Number(raw.slice(1));
      const code = cardCode(raw);
      if (!same(given, code)) return res.status(404).json({ error: 'Member not found' });
      const r = (await pool.query("SELECT id, type, full_name, department, batch, post, photo_url, created_at FROM registrations WHERE id = $1 AND status = 'approved' AND deleted_at IS NULL", [id])).rows[0];
      if (!r) return res.status(404).json({ error: 'Member not found' });
      return res.set('Cache-Control', 'no-store').json({
        member: { id: raw, name: r.full_name, position: r.type === 'committee' && r.post ? r.post : (TYPE_LABEL[r.type] || 'Member'), department: r.department, batch: r.batch, session: `Member since ${new Date(r.created_at).getFullYear()}`, image_url: r.photo_url || null, current: true },
        code, verified: true,
      });
    }
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Member not found' });
    const m = (await pool.query('SELECT id, name, position, department, batch, committee_session, image_url, active FROM members WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
    if (!m) return res.status(404).json({ error: 'Member not found' });
    const code = cardCode(String(m.id));
    res.set('Cache-Control', 'no-store').json({
      member: { id: m.id, name: m.name, position: m.position, department: m.department, batch: m.batch, session: m.committee_session, image_url: m.image_url, current: m.active !== false },
      code, verified: same(given, code),
    });
  } catch (e) { fail(res, e); }
});

module.exports = router;
module.exports.cardCode = cardCode;
