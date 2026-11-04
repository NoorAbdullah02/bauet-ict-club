const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');

const router = express.Router();

// Kept so older clients (the first app builds) keep working. /api/messages now saves the message AND emails the club.
router.post('/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), (_req, res) => res.json({ success: true }));

router.use(authMiddleware);

// Is email set up? (shown on the admin Settings page)
router.get('/status', (_req, res) => res.json(mail.status()));

// Send a test mail so the admin can confirm the SMTP login works
router.post('/test', rateLimit({ windowMs: 10 * 60 * 1000, max: 5 }), async (req, res) => {
  const to = String(req.body?.to || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return res.status(400).json({ error: 'Enter a valid email address' });
  try {
    await mail.sendNow({ to, subject: 'Test email | BAUET ICT Club', html: mail.layout({ title: 'Email works', body: '<p>Your BAUET ICT Club website can send email.</p>' }), text: 'Your BAUET ICT Club website can send email.' });
    res.json({ success: true });
  } catch (e) {
    console.warn('Test email failed:', e.message);
    res.status(502).json({ error: `Could not send: ${e.message}` });
  }
});

// Newsletter to every subscriber (each mail has its own unsubscribe link). { subject, message, testTo? }
router.post('/newsletter', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), async (req, res) => {
  const subject = String(req.body?.subject || '').trim().slice(0, 150);
  const message = String(req.body?.message || '').trim().slice(0, 8000);
  if (subject.length < 3 || message.length < 10) return res.status(400).json({ error: 'Write a subject and a message' });
  if (!mail.provider()) return res.status(400).json({ error: 'Email is not configured. Set SMTP_USER and SMTP_PASS in .env.' });
  try {
    const testTo = String(req.body?.testTo || '').trim();
    const recipients = testTo ? [testTo] : (await pool.query('SELECT email FROM subscribers WHERE deleted_at IS NULL')).rows.map((r) => r.email);
    recipients.forEach((to) => mail.sendMail({ to, ...mail.templates.newsletter(to, subject, message) }));
    res.json({ success: true, queued: recipients.length, test: !!testTo });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
