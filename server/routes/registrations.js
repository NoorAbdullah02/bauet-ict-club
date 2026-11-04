const express = require('express');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');
const exporters = require('../utils/exporters');
const { storeImage } = require('../utils/images');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const cloudinary = require('../config/cloudinary');
const { authMiddleware } = require('../middleware/auth');

const { positionRank, leadershipConflict } = require('../utils/positions');

const router = express.Router();

const TYPES = ['committee', 'general', 'ambassador'];
const DEPARTMENTS = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'Other'];
const GENDERS = ['Male', 'Female', 'Other', ''];
const STATUSES = ['pending', 'approved', 'rejected'];
const MAX_INTERESTS = 8;

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many submissions from this network. Please try again later.' },
});

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png'].includes(file.mimetype)),
}).single('photo');

// turn multer failures (too large, wrong field) into clean 400s instead of 500s
const upload = { single: () => (req, res, next) => uploader(req, res, (err) => (err
  ? res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be under 3MB' : 'Upload a JPG or PNG photo' })
  : next())) };

const ordinal = (n) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function validate(body) {
  const type = clean(body.type, 20);
  const errors = {};
  if (!TYPES.includes(type)) return { errors: { type: 'Choose a membership type' } };

  const data = {
    type,
    full_name: clean(body.full_name, 100),
    student_id: clean(body.student_id, 30),
    batch: clean(body.batch, 10),
    department: clean(body.department, 30),
    phone: clean(body.phone, 20),
    email: clean(body.email, 100).toLowerCase(),
    gender: clean(body.gender, 10),
    post: clean(body.post, 100),
    interests: [],
    experience: clean(body.experience, 20),
    note: clean(body.note, 600),
    photo_url: clean(body.photo_url, 500),
  };

  if (data.full_name.length < 2 || !/^[\p{L}\p{M}\s.'-]+$/u.test(data.full_name)) errors.full_name = 'Enter your full name';
  if (data.student_id.length < 2) errors.student_id = 'Student ID is required';
  if (!/^\d{1,3}$/.test(data.batch)) errors.batch = 'Select your batch';
  if (!DEPARTMENTS.includes(data.department)) errors.department = 'Select your department';
  if (!/^(\+?88)?01[3-9]\d{8}$/.test(data.phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter a valid Bangladeshi mobile number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email';
  if (!GENDERS.includes(data.gender)) errors.gender = 'Invalid selection';

  if (data.photo_url && !/^(https:\/\/|\/uploads\/[a-f0-9]{24}\.(jpg|png)$)/.test(data.photo_url)) errors.photo_url = 'Invalid photo';

  if (type === 'committee') {
    if (data.post.length < 2) errors.post = 'Select the post you are applying for';
    if (!data.photo_url) errors.photo_url = 'A profile photo is required for committee applications';
  } else if (type === 'ambassador') {
    data.post = 'Department Ambassador';
    if (!data.photo_url) errors.photo_url = 'A profile photo is required for ambassador applications';
    if (data.department === 'Other') errors.department = 'Select your department';
  } else {
    const list = Array.isArray(body.interests) ? body.interests : [];
    data.interests = [...new Set(list.map((i) => clean(i, 40)).filter(Boolean))].slice(0, MAX_INTERESTS);
    if (data.interests.length === 0) errors.interests = 'Pick at least one area of interest';
    data.post = '';
  }
  return { data, errors };
}

function notify(reg) {
  mail.sendMail({ to: reg.email, ...mail.templates.applicationReceived(reg) });
  mail.sendMail({ to: mail.adminAddress(), ...mail.templates.adminNewApplication(reg) });
}

router.post('/photo', submitLimiter, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a JPG or PNG up to 3MB' });
  try {
    res.json({ url: (await storeImage(req.file.buffer, 'applicant')).url });
  } catch (e) {
    console.error('Applicant photo upload failed:', e.message);
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Photo upload failed. Please try again.' });
  }
});

router.post('/', submitLimiter, async (req, res) => {
  const { data, errors } = validate(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });

  try {
    const { rows } = await pool.query(
      `INSERT INTO registrations
        (type, full_name, student_id, batch, department, phone, email, gender, post, interests, experience, note, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, type, full_name, email, post`,
      [data.type, data.full_name, data.student_id, data.batch, data.department, data.phone, data.email,
        data.gender, data.post, data.interests, data.experience, data.note, data.photo_url]
    );
    notify({ ...data, ...rows[0] });
    res.status(201).json({ success: true, registration: rows[0] });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'This email or student ID has already applied for this membership type' });
    }
    console.error('Registration failed:', e.message);
    res.status(500).json({ error: 'Could not save your application. Please try again.' });
  }
});

// Build the PDF/Word file for the applications that match ?format=pdf|docx&type=committee|general|ambassador|all&status=all|pending|approved|rejected&q=
async function buildExport(src) {
  const format = src.format === 'docx' ? 'docx' : 'pdf';
  const type = TYPES.includes(src.type) ? src.type : 'all';
  const status = STATUSES.includes(src.status) ? src.status : 'all';
  const q = String(src.q || '').trim().toLowerCase();
  const ids = new Set((Array.isArray(src.ids) ? src.ids : String(src.ids || '').split(',')).filter((v) => String(v).trim() !== '').map(Number).filter(Number.isInteger));
  let { rows } = await pool.query('SELECT * FROM registrations WHERE deleted_at IS NULL ORDER BY created_at DESC');
  rows = rows.filter((r) => (type === 'all' || r.type === type) && (status === 'all' || r.status === status)
    && (!ids.size || ids.has(r.id))
    && (!q || `${r.full_name} ${r.email} ${r.student_id}`.toLowerCase().includes(q)));
  const buffer = await (format === 'docx' ? exporters.toDocx : exporters.toPdf)(rows, { type, status });
  return {
    buffer, count: rows.length, format,
    filename: `applications-${type}-${new Date().toISOString().slice(0, 10)}.${format}`,
    mime: format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
  };
}

router.get('/export', authMiddleware, async (req, res) => {
  try {
    const f = await buildExport(req.query);
    res.set({ 'Content-Type': f.mime, 'Content-Disposition': `attachment; filename="${f.filename}"`, 'Cache-Control': 'no-store' });
    res.send(f.buffer);
  } catch (e) {
    fail(res, e);
  }
});

// Email the same file to the admin (or to `to`). Body: { format, type, status, q, to? }
router.post('/export/email', authMiddleware, rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), async (req, res) => {
  const to = String(req.body?.to || '').trim() || mail.adminAddress();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (!mail.provider()) return res.status(400).json({ error: 'Email is not configured. Set SMTP_USER and SMTP_PASS in .env.' });
  try {
    const f = await buildExport(req.body || {});
    const label = `${f.count} application${f.count === 1 ? '' : 's'}`;
    await mail.sendNow({
      to, subject: `Applications export (${label})`,
      html: mail.layout({ title: 'Applications export', body: `<p>Your export of <b>${label}</b> is attached as ${f.format.toUpperCase()}.</p>` }),
      text: `Your export of ${label} is attached.`,
      attachments: [{ filename: f.filename, content: f.buffer, contentType: f.mime }],
    });
    res.json({ success: true, to, count: f.count });
  } catch (e) {
    console.warn('Export email failed:', e.message);
    res.status(502).json({ error: `Could not send: ${e.message}` });
  }
});

router.get('/', authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM registrations WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    fail(res, e);
  }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const { rows } = await pool.query('UPDATE registrations SET status = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *', [req.body.status, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    if (req.body.status === 'rejected') mail.sendMail({ to: rows[0].email, ...mail.templates.applicationRejected(rows[0]) });
    res.json(rows[0]);
  } catch (e) {
    fail(res, e);
  }
});

// Promote a committee applicant to the public Team page for a given session
router.post('/:id/select', authMiddleware, async (req, res) => {
  const session = clean(req.body.session, 50);
  const requested = clean(req.body.position, 100);
  if (!session || !requested) return res.status(400).json({ error: 'Session and position are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query("SELECT * FROM registrations WHERE id = $1 AND type IN ('committee', 'ambassador') AND deleted_at IS NULL FOR UPDATE", [req.params.id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Committee or ambassador application not found' }); }
    const r = rows[0];
    const position = r.type === 'ambassador' ? 'Department Ambassador' : requested;
    const conflict = r.type === 'ambassador' ? null : await leadershipConflict(client, session, position);
    if (conflict) { await client.query('ROLLBACK'); return res.status(409).json({ error: conflict }); }
    const order = r.type === 'ambassador' ? 50 : positionRank(position);
    const dup = await client.query('SELECT 1 FROM members WHERE name = $1 AND committee_session = $2 AND position = $3 AND deleted_at IS NULL', [r.full_name, session, position]);
    if (dup.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Already selected for this session and post' }); }
    const member = await client.query(
      `INSERT INTO members (name, position, department, batch, committee_session, image_url, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [r.full_name, position, r.department, r.batch && /^\d+$/.test(r.batch) ? ordinal(Number(r.batch)) : (r.batch || null), session, r.photo_url, order]
    );
    const updated = await client.query("UPDATE registrations SET status = 'approved' WHERE id = $1 RETURNING *", [r.id]);
    await client.query('COMMIT');
    mail.sendMail({ to: r.email, ...mail.templates.applicationSelected(r, position, session) });
    res.json({ registration: updated.rows[0], member: member.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    fail(res, e);
  } finally {
    client.release();
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('UPDATE registrations SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    res.json({ success: true, trashed: true });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
