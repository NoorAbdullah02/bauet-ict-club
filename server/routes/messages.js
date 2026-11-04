const express = require('express');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many messages. Please try again later.' },
});

// Public: visitors send a message from the Contact page
router.post('/', contactLimiter, async (req, res) => {
  const name = clean(req.body.name, 255);
  const email = clean(req.body.email, 255);
  const subject = clean(req.body.subject, 255);
  const message = clean(req.body.message, 4000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Name, a valid email and a message are required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO messages (name, email, subject, message) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email, subject, message]
    );
    const m = { name, email, subject, message };
    mail.sendMail({ to: mail.adminAddress(), ...mail.templates.adminNewMessage(m) });
    mail.sendMail({ to: email, ...mail.templates.contactAck(m) });
    res.status(201).json({ success: true, id: rows[0].id });
  } catch (e) {
    console.error('Message save failed:', e.message);
    res.status(500).json({ error: 'Could not send your message' });
  }
});

// Admin only: inbox
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM messages WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    fail(res, e);
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE messages SET is_read = COALESCE($1, is_read), reply_note = COALESCE($2, reply_note) WHERE id = $3 AND deleted_at IS NULL RETURNING *',
      [typeof req.body.is_read === 'boolean' ? req.body.is_read : null, req.body.reply_note ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE messages SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    res.json({ success: true, trashed: true });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
