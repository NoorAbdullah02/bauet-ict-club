const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');
const { formalDate, formalTime } = require('../utils/format');
const { tableToPdf, tableToDocx } = require('../utils/exporters');
const forms = require('../utils/forms');
const { serial } = require('../utils/serial');
const tickets = require('../utils/tickets');
const { sendZip, safe } = require('../utils/zipper');
const { toCsv } = require('../utils/csv');
// sign-ups saved before forms existed only have the standard columns
const answersOf = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email, phone: r.phone, department: r.department, batch: r.batch };

const router = express.Router();
const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const todayStr = () => new Date().toISOString().slice(0, 10);
const day = (d) => (d instanceof Date ? d.toISOString() : String(d || '')).slice(0, 10);

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-ups from this network. Please try again later.' } });

/** Public: how many people signed up for each event (numbers only), so the pages can show "12 / 40 joined". */
router.get('/counts', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT event_id, COUNT(*) AS n FROM event_registrations WHERE deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected' GROUP BY event_id");
    res.set('Cache-Control', 'public, max-age=15');
    res.json(Object.fromEntries(rows.map((r) => [r.event_id, Number(r.n)])));
  } catch (e) { res.status(500).json({ error: 'Could not load counts' }); }
});


/* ---------- tickets, check-in and certificates ---------- */
const statusOf = (r) => (r.pay_status === 'rejected' ? 'cancelled' : r.pay_status === 'pending' ? 'pending' : 'confirmed');
async function byCode(raw) {
  const code = tickets.normalize(raw);
  if (code.length < 8) return null;
  const r = (await pool.query('SELECT r.*, e.title AS ev_title, e.date AS ev_date, e.time AS ev_time, e.location AS ev_location, e.reg_form AS ev_form FROM event_registrations r JOIN events e ON e.id = r.event_id WHERE r.ticket = $1 AND r.deleted_at IS NULL', [code])).rows[0];
  return r || null;
}
const certOn = (r) => !!r.ev_form?.cert?.enabled && !!r.checked_in_at && statusOf(r) !== 'cancelled';
const site = (req) => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

/** Public: one ticket (name and event only; no email or phone). The code is the secret. */
router.get('/ticket/:code', async (req, res) => {
  try {
    const r = await byCode(req.params.code);
    if (!r) return res.status(404).json({ error: 'This ticket was not found.' });
    res.set('Cache-Control', 'no-store');
    res.json({ code: r.ticket, name: r.full_name || forms.show(answersOf(r)[forms.fieldsOf({ reg_form: r.ev_form })[0]?.id]) || 'Guest', status: statusOf(r), checked_in: !!r.checked_in_at,
      event: { id: r.event_id, title: r.ev_title, date: r.ev_date, time: r.ev_time, location: r.ev_location }, certificate: certOn(r) });
  } catch (e) { fail(res, e); }
});

/** Public: the certificate as a PDF (only for people who were checked in at an event with certificates switched on). */
router.get('/certificate/:code', async (req, res) => {
  try {
    const r = await byCode(req.params.code);
    if (!r || !certOn(r)) return res.status(404).json({ error: 'There is no certificate for this code.' });
    const pdf = await tickets.certificatePdf({ name: r.full_name || 'Participant', event: { title: r.ev_title, date: r.ev_date, location: r.ev_location }, cert: r.ev_form.cert, code: r.ticket, siteUrl: site(req) });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="certificate-${r.ticket}.pdf"`, 'Cache-Control': 'no-store' });
    res.send(pdf);
  } catch (e) { fail(res, e); }
});

/** Public: is this certificate real? (the QR code on every certificate opens this) */
router.get('/verify/:code', async (req, res) => {
  try {
    const r = await byCode(req.params.code);
    if (!r || !certOn(r)) return res.json({ valid: false });
    res.set('Cache-Control', 'no-store');
    res.json({ valid: true, name: r.full_name, event: r.ev_title, date: r.ev_date, issuedBy: 'BAUET ICT Club', code: r.ticket });
  } catch (e) { fail(res, e); }
});

/** Admin: check someone in by their ticket code (typed, or read from the QR code). Body: { code, force? } */
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const r = await byCode(req.body?.code);
    if (!r) return res.status(404).json({ error: 'No ticket with this code.' });
    const person = { id: r.id, name: r.full_name || 'Guest', event_id: r.event_id, event: r.ev_title, status: statusOf(r) };
    if (req.body?.event && String(req.body.event) !== String(r.event_id)) return res.status(409).json({ error: `This ticket is for another event: ${r.ev_title}.`, person });
    if (person.status === 'cancelled') return res.status(409).json({ error: 'This registration was cancelled (payment rejected).', person });
    if (r.checked_in_at) return res.json({ already: true, at: r.checked_in_at, person });
    if (person.status === 'pending' && !req.body?.force) return res.status(409).json({ error: 'The payment is not verified yet.', needs_confirm: true, person });
    await pool.query('UPDATE event_registrations SET checked_in_at = NOW() WHERE id = $1', [r.id]);
    res.json({ ok: true, person });
  } catch (e) { fail(res, e); }
});

/** Public: sign up for one event. Body: { answers: { fieldId: value } } following the event's form (or the default form). */
router.post('/:eventId', limiter, (req, res) => serial(`event:${req.params.eventId}`, () => register(req, res)));
async function register(req, res) {
  if (req.body?._hp) return res.status(201).json({ success: true }); // a bot filled the hidden trap field: pretend it worked, save nothing
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [req.params.eventId])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    if (ev.reg_open === false) return res.status(409).json({ error: 'Registration for this event is closed.' });
    if (ev.date && day(ev.date) < todayStr()) return res.status(409).json({ error: 'This event has already taken place.' });

    if (forms.closedByTime(ev.reg_form)) return res.status(409).json({ error: 'Registration for this event has closed.' });

    const fields = forms.fieldsOf(ev);
    // older clients sent the answers as a flat body: keep them working
    const { clean, errors } = forms.validateAnswers(fields, req.body?.answers || req.body);
    const pay = ev.reg_form?.payment?.enabled ? forms.validatePayment(ev.reg_form.payment, req.body?.payment) : null;
    const allErrors = { ...errors, ...(pay?.errors ? { payment: pay.errors } : {}) };
    if (Object.keys(allErrors).length) return res.status(400).json({ error: 'Please check the highlighted questions', fields: errors, payment: pay?.errors || null });

    const existing = (await pool.query("SELECT answers, email, student_id, payment, pay_status FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [ev.id])).rows;
    if (ev.capacity && existing.length >= ev.capacity) return res.status(409).json({ error: 'Sorry, this event is full.' });
    const u = forms.uniqueId(ev);
    if (u && clean[u] !== undefined) {
      const mine = forms.show(clean[u]).toLowerCase();
      if (existing.some((r) => forms.show(r.answers?.[u]).toLowerCase() === mine || (u === 'email' && r.email === mine))) {
        return res.status(409).json({ error: 'You have already registered for this event.', fields: { [u]: 'Already registered' } });
      }
    }
    // one transaction ID can pay for one sign-up only
    if (pay?.payment && existing.some((r) => r.payment?.trx_id === pay.payment.trx_id)) {
      return res.status(409).json({ error: 'This transaction ID has already been used.', payment: { trx_id: 'Already used' } });
    }
    const col = forms.columnsFrom(fields, clean);
    const ticket = tickets.newCode();
    const { rows } = await pool.query(
      'INSERT INTO event_registrations (event_id, full_name, student_id, email, phone, department, batch, answers, payment, pay_status, ticket) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [ev.id, col.full_name, col.student_id, col.email, col.phone, col.department, col.batch, JSON.stringify(clean), pay?.payment ? JSON.stringify(pay.payment) : null, pay?.payment ? 'pending' : 'none', ticket]
    );
    res.status(201).json({ success: true, id: rows[0].id, ticket, pending_payment: !!pay?.payment, message: ev.reg_form?.confirmation || '' });
    // a short confirmation to the person (switch off with EVENT_CONFIRM_EMAIL=false); needs an email question in the form
    const to = col.email || forms.show(clean[(fields.find((f) => f.type === 'email') || {}).id]);
    if (to && !pay?.payment && (process.env.EVENT_CONFIRM_EMAIL || '').toLowerCase() !== 'false') {
      mail.sendMail({ to, ...mail.templates.eventRegistered({ full_name: col.full_name || 'there' }, { ...ev, ticket }, formalDate, formalTime) });
    }
    // with a payment: tell them at once that it is being checked; the place is confirmed when the admin verifies it (PATCH /:id/payment)
    if (to && pay?.payment && (process.env.EVENT_CONFIRM_EMAIL || '').toLowerCase() !== 'false') {
      mail.sendMail({ to, ...mail.templates.registrationPending({ full_name: col.full_name }, ev, pay.payment, formalDate, formalTime) });
    }
    if (ev.reg_form?.notify_admin) {
      const who = col.full_name || to || 'Someone';
      mail.sendMail({ to: mail.adminAddress(), ...mail.templates.adminNewSignup(ev, `${who} registered${pay?.payment ? ` and paid ${pay.payment.amount} BDT by ${pay.payment.method} (TrxID ${pay.payment.trx_id})` : ''}.`) });
    }
  } catch (e) {
    console.error('Event registration failed:', e.message);
    res.status(500).json({ error: 'Could not save your registration. Please try again.' });
  }
}

router.use(authMiddleware);

/** Admin: everyone who signed up for one event. */
router.get('/by-event/:eventId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.eventId]);
    res.json(rows);
  } catch (e) { fail(res, e); }
});

/** Admin: download the list. ?event=ID&format=csv|pdf|docx */
router.get('/export', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [req.query.event])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const { rows } = await pool.query('SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC', [ev.id]);
    const format = ['pdf', 'docx'].includes(req.query.format) ? req.query.format : 'csv';
    // one column per question of this event's form, then the date
    const withPay = !!ev.reg_form?.payment?.enabled;
    const cols = [
      ...forms.fieldsOf(ev).filter((f) => f.type !== 'section').map((f) => [f.label, (r) => forms.show(answersOf(r)[f.id])]),
      ...(withPay ? [['Paid with', (r) => r.payment?.method || ''], ['Paid from', (r) => r.payment?.sender || ''], ['Transaction ID', (r) => r.payment?.trx_id || ''], ['Amount (BDT)', (r) => r.payment?.amount || ''], ['Payment status', (r) => r.pay_status || '']] : []),
      ['Signed up', (r) => formalDate(r.created_at)],
    ];
    const title = `${ev.title}: registrations`;
    const sub = `${rows.length} ${rows.length === 1 ? 'person' : 'people'} · ${formalDate(ev.date)}${ev.time ? ` · ${formalTime(ev.time)}` : ''}${ev.location ? ` · ${ev.location}` : ''}`;
    const name = `event-${ev.id}-registrations-${todayStr()}.${format}`;
    let buf; let mime;
    if (format === 'csv') {
      buf = Buffer.from(toCsv(cols.map((c) => c[0]), rows.map((r) => cols.map(([, k]) => (typeof k === 'function' ? k(r) : r[k])))));
      mime = 'text/csv; charset=utf-8';
    } else if (format === 'pdf') { buf = await tableToPdf(title, sub, cols, rows); mime = 'application/pdf'; }
    else { buf = await tableToDocx(title, sub, cols, rows); mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; }
    res.set({ 'Content-Type': mime, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
    res.send(buf);
  } catch (e) { fail(res, e); }
});

/** Admin: ONE download with everything about an event: the list as CSV, PDF and Word, the event picture and every picture people uploaded, all in full quality. ?event=ID&format=original|jpg|png */
router.get('/zip', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [req.query.event])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const { rows } = await pool.query('SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC', [ev.id]);
    const fields = forms.fieldsOf(ev).filter((f) => f.type !== 'section');
    const withPay = !!ev.reg_form?.payment?.enabled;
    const cols = [
      ...fields.map((f) => [f.label, (r) => forms.show(answersOf(r)[f.id])]),
      ...(withPay ? [['Paid with', (r) => r.payment?.method || ''], ['Paid from', (r) => r.payment?.sender || ''], ['Transaction ID', (r) => r.payment?.trx_id || ''], ['Amount (BDT)', (r) => r.payment?.amount || ''], ['Payment status', (r) => r.pay_status || '']] : []),
      ['Signed up', (r) => formalDate(r.created_at)],
    ];
    const title = `${ev.title}: registrations`;
    const sub = `${rows.length} ${rows.length === 1 ? 'person' : 'people'} · ${formalDate(ev.date)}${ev.time ? ` · ${formalTime(ev.time)}` : ''}${ev.location ? ` · ${ev.location}` : ''}`;
    const csv = toCsv(cols.map((c) => c[0]), rows.map((r) => cols.map(([, k]) => (typeof k === 'function' ? k(r) : r[k]))));
    const entries = [
      { name: 'registrations.csv', data: csv },
      { name: 'registrations.pdf', data: await tableToPdf(title, sub, cols, rows) },
      { name: 'registrations.docx', data: await tableToDocx(title, sub, cols, rows) },
    ];
    if (ev.image_url) entries.push({ name: `event-picture-${safe(ev.title)}`, image: ev.image_url });
    const nameField = fields.find((f) => f.key === 'name') || fields[0];
    rows.forEach((r, i) => fields.filter((f) => f.type === 'photo').forEach((f) => {
      const url = answersOf(r)[f.id];
      if (url) entries.push({ name: `pictures/${String(i + 1).padStart(3, '0')}-${safe(forms.show(answersOf(r)[nameField?.id]) || `person-${r.id}`)}-${safe(f.label)}`, image: url });
    }));
    await sendZip(res, `event-${ev.id}-${safe(ev.title)}`, entries, { format: req.query.format });
  } catch (e) { if (!res.headersSent) fail(res, e); else res.end(); }
});

/** Admin: check a person in by hand, or undo it. Body: { checked: true|false } */
router.patch('/:id/checkin', async (req, res) => {
  try {
    const { rows } = await pool.query(req.body?.checked ? 'UPDATE event_registrations SET checked_in_at = COALESCE(checked_in_at, NOW()) WHERE id = $1 AND deleted_at IS NULL RETURNING *' : 'UPDATE event_registrations SET checked_in_at = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { fail(res, e); }
});

/** Admin: email every checked-in person their certificate link (once each). */
router.post('/event/:eventId/certificates/send', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [req.params.eventId])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    if (!ev.reg_form?.cert?.enabled) return res.status(409).json({ error: 'Switch certificates on for this event first.' });
    if (!mail.provider()) return res.status(400).json({ error: 'Email is not configured. Set BREVO_API_KEY and MAIL_FROM in .env.' });
    const rows = (await pool.query("SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND checked_in_at IS NOT NULL AND certificate_sent_at IS NULL AND email IS NOT NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [ev.id])).rows;
    for (const r of rows) { mail.sendMail({ to: r.email, ...mail.templates.certificateReady(r, ev, r.ticket) }); await pool.query('UPDATE event_registrations SET certificate_sent_at = NOW() WHERE id = $1', [r.id]); }
    const total = Number((await pool.query('SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND checked_in_at IS NOT NULL', [ev.id])).rows[0].n);
    res.json({ sent: rows.length, checked_in: total });
  } catch (e) { fail(res, e); }
});

/** Admin: mark a payment verified / rejected / pending (the person gets an email for verified and rejected). Body: { status, note? } */
router.patch('/:id/payment', async (req, res) => {
  const status = ['verified', 'rejected', 'pending'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Choose verified, rejected or pending' });
  try {
    const { rows } = await pool.query("UPDATE event_registrations SET pay_status = $1, admin_note = $2 WHERE id = $3 AND deleted_at IS NULL AND payment IS NOT NULL RETURNING *", [status, clean(req.body?.note, 300) || null, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'No payment to verify on this sign-up' });
    res.json(rows[0]);
    const r = rows[0];
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [r.event_id])).rows[0];
    if (ev && r.email && status !== 'pending') {
      mail.sendMail({ to: r.email, ...(status === 'verified' ? mail.templates.paymentVerified(r, { ...ev, email_note: ev.reg_form?.email_note, ticket: r.ticket }, formalDate) : mail.templates.paymentRejected(r, ev, r.admin_note)) });
    }
  } catch (e) { fail(res, e); }
});

/** Admin: correct what someone answered (like editing a cell in a spreadsheet). Body: { answers: { fieldId: value } } */
router.patch('/:id/answers', (req, res) => serial('event-edit', async () => {
  const change = req.body?.answers;
  if (!change || typeof change !== 'object' || Array.isArray(change)) return res.status(400).json({ error: 'Nothing to change' });
  try {
    const r = (await pool.query('SELECT * FROM event_registrations WHERE id = $1 AND deleted_at IS NULL', [req.params.id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Not found' });
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [r.event_id])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const fields = forms.fieldsOf(ev);
    const known = new Set(fields.map((f) => f.id));
    const merged = { ...(r.answers || {}) };
    for (const [k, v] of Object.entries(change)) if (known.has(k)) merged[k] = v;
    const { clean, errors } = forms.validateAnswers(fields, merged);
    const bad = Object.keys(errors).filter((k) => k in change);
    if (bad.length) return res.status(400).json({ error: errors[bad[0]], fields: errors });
    const u = forms.uniqueId(ev);
    if (u && u in change && clean[u] !== undefined) {
      const mine = forms.show(clean[u]).toLowerCase();
      const others = (await pool.query("SELECT answers, email FROM event_registrations WHERE event_id = $1 AND id <> $2 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [ev.id, r.id])).rows;
      if (others.some((o) => forms.show(o.answers?.[u]).toLowerCase() === mine || (u === 'email' && o.email === mine))) return res.status(409).json({ error: 'Someone else already has this value', fields: { [u]: 'Already used' } });
    }
    const col = forms.columnsFrom(fields, clean);
    const { rows } = await pool.query('UPDATE event_registrations SET answers = $1, full_name = $2, student_id = $3, email = $4, phone = $5, department = $6, batch = $7 WHERE id = $8 RETURNING *',
      [JSON.stringify(clean), col.full_name, col.student_id, col.email, col.phone, col.department, col.batch, r.id]);
    res.json(rows[0]);
  } catch (e) { fail(res, e); }
}));

/** Admin: remove one sign-up (goes to the Trash). */
router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE event_registrations SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, trashed: true });
  } catch (e) { fail(res, e); }
});

module.exports = router;
