const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const { fail } = require('../utils/http');

const router = express.Router();
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters

/** The signed code on a membership card, like M12-AB34CD. Nobody can make a valid one without the server secret. */
const cardCode = (id) => {
  const h = crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(`card:${id}`).digest();
  return `M${id}-${Array.from(h.subarray(0, 6), (b) => B32[b % 32]).join('')}`;
};

/** Public: the data on one member's card. GET /api/card/:id?c=CODE  ->  { member, code, verified } (verified = the QR code is genuine). */
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: 'Member not found' });
  try {
    const m = (await pool.query('SELECT id, name, position, department, batch, committee_session, image_url, active FROM members WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
    if (!m) return res.status(404).json({ error: 'Member not found' });
    const code = cardCode(m.id);
    const given = String(req.query.c || '');
    let verified = false;
    try { verified = given.length === code.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(code)); } catch { verified = false; }
    res.set('Cache-Control', 'no-store').json({
      member: { id: m.id, name: m.name, position: m.position, department: m.department, batch: m.batch, session: m.committee_session, image_url: m.image_url, current: m.active !== false },
      code, verified,
    });
  } catch (e) { fail(res, e); }
});

module.exports = router;
module.exports.cardCode = cardCode;
