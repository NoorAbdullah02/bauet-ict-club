const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');
const { formalDate, formalTime } = require('../utils/format');
const { tableToPdf, tableToDocx } = require('../utils/exporters');
const forms = require('../utils/forms');
const { sendZip, safe } = require('../utils/zipper');
// sign-ups saved before forms existed only have the standard columns
const answersOf = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email, phone: r.phone, department: r.department, batch: r.batch };

const router = express.Router();
const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const DEPARTMENTS = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'BBA', 'LLB', 'ELL', 'Other'];
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

/** Public: sign up for one event. Body: { answers: { fieldId: value } } following the event's form (or the default form). */
router.post('/:eventId', limiter, async (req, res) => {
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
    const { rows } = await pool.query(
      'INSERT INTO event_registrations (event_id, full_name, student_id, email, phone, department, batch, answers, payment, pay_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
      [ev.id, col.full_name, col.student_id, col.email, col.phone, col.department, col.batch, JSON.stringify(clean), pay?.payment ? JSON.stringify(pay.payment) : null, pay?.payment ? 'pending' : 'none']
    );
    res.status(201).json({ success: true, id: rows[0].id, pending_payment: !!pay?.payment, message: ev.reg_form?.confirmation || '' });
    // a short confirmation to the person (switch off with EVENT_CONFIRM_EMAIL=false); needs an email question in the form
    const to = col.email || forms.show(clean[(fields.find((f) => f.type === 'email') || {}).id]);
    if (to && !pay?.payment && (process.env.EVENT_CONFIRM_EMAIL || '').toLowerCase() !== 'false') {
      mail.sendMail({ to, ...mail.templates.eventRegistered({ full_name: col.full_name || 'there' }, ev, formalDate, formalTime) });
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
});

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
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      buf = Buffer.from(`﻿${[cols.map((c) => c[0]).join(','), ...rows.map((r) => cols.map(([, k]) => cell(typeof k === 'function' ? k(r) : r[k])).join(','))].join('\n')}`);
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
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = `\uFEFF${[cols.map((c) => c[0]).join(','), ...rows.map((r) => cols.map(([, k]) => cell(typeof k === 'function' ? k(r) : r[k])).join(','))].join('\n')}`;
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
      mail.sendMail({ to: r.email, ...(status === 'verified' ? mail.templates.paymentVerified(r, { ...ev, email_note: ev.reg_form?.email_note }, formalDate) : mail.templates.paymentRejected(r, ev, r.admin_note)) });
    }
  } catch (e) { fail(res, e); }
});

/** Admin: remove one sign-up (goes to the Trash). */
router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE event_registrations SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, trashed: true });
  } catch (e) { fail(res, e); }
});

module.exports = router;
