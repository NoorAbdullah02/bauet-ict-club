const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');
const { formalDate, formalTime } = require('../utils/format');
const { tableToPdf, tableToDocx, tableToXlsx } = require('../utils/exporters');
const forms = require('../utils/forms');
const { serial } = require('../utils/serial');
const tickets = require('../utils/tickets');
const { notifyAdmin } = require('../utils/adminAlert');
const ssl = require('../utils/sslcommerz');
const { sendZip, safe } = require('../utils/zipper');
const { toCsv } = require('../utils/csv');
// sign-ups saved before forms existed only have the standard columns
const answersOf = (r) => r.answers || { name: r.full_name, student_id: r.student_id, email: r.email, phone: r.phone, department: r.department, batch: r.batch };

const router = express.Router();
const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const todayStr = () => new Date().toISOString().slice(0, 10);
const day = (d) => (d instanceof Date ? d.toISOString() : String(d || '')).slice(0, 10);

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-ups from this network. Please try again later.' } });

const lostLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many tries. Please wait an hour and try again.' } });
/** Public: "I lost my ticket". Emails the live tickets of that address to that address only. Always answers the same, so nobody can check who signed up. */
router.post('/lost', lostLimiter, async (req, res) => {
  const email = clean(req.body?.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  res.json({ success: true, message: 'If this email has tickets, we just sent them. Check your inbox and spam folder.' });
  try {
    const { rows } = await pool.query(
      `SELECT r.ticket, r.full_name, e.title, e.date FROM event_registrations r JOIN events e ON e.id = r.event_id
       WHERE LOWER(r.email) = $1 AND r.deleted_at IS NULL AND e.deleted_at IS NULL AND r.ticket IS NOT NULL AND COALESCE(r.waitlisted, FALSE) = FALSE
         AND COALESCE(r.pay_status, 'none') NOT IN ('rejected', 'pending') AND (e.date IS NULL OR e.date >= CURRENT_DATE - 30) ORDER BY e.date DESC LIMIT 10`, [email]);
    if (rows.length) mail.sendMail({ to: email, ...mail.templates.ticketsList(rows[0].full_name, rows, formalDate) });
  } catch (e) { console.warn('Lost ticket lookup failed:', e.message); }
});

/** Public: how many people signed up for each event (numbers only), so the pages can show "12 / 40 joined". */
router.get('/counts', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT event_id, COUNT(*) AS n FROM event_registrations WHERE deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected' AND NOT COALESCE(waitlisted, FALSE) GROUP BY event_id");
    res.set('Cache-Control', 'public, max-age=15');
    res.json(Object.fromEntries(rows.map((r) => [r.event_id, Number(r.n)])));
  } catch (e) { res.status(500).json({ error: 'Could not load counts' }); }
});


/* ---------- tickets, check-in and certificates ---------- */
const statusOf = (r) => (r.pay_status === 'rejected' ? 'cancelled' : r.waitlisted ? 'waitlist' : r.pay_status === 'pending' ? 'pending' : 'confirmed');
async function byCode(raw) {
  const code = tickets.normalize(raw);
  if (code.length < 8) return null;
  const r = (await pool.query('SELECT r.*, e.title AS ev_title, e.date AS ev_date, e.time AS ev_time, e.location AS ev_location, e.reg_form AS ev_form FROM event_registrations r JOIN events e ON e.id = r.event_id WHERE r.ticket = $1 AND r.deleted_at IS NULL', [code])).rows[0];
  return r || null;
}
// people may cancel their own free sign-up until they are checked in or the event day has passed (paid ones go through the organisers)
const canCancel = (r) => !r.checked_in_at && !r.payment && statusOf(r) !== 'cancelled' && !(r.ev_date && day(r.ev_date) < todayStr());
/** The name printed on a certificate: the one the admin typed for this person, else the sign-up name. */
const certNameOf = (r) => clean(r.cert_name, 80) || clean(r.full_name, 80) || clean(forms.show(answersOf(r)[forms.fieldsOf({ reg_form: r.ev_form })[0]?.id]), 80) || 'Participant';
/** Defaults for a certificate: the president is Sheikh Noor Abdullah unless the admin types another name. */
async function certDefaults() { return { president: tickets.DEFAULT_PRESIDENT.name }; }
const certPdfFor = async (r, ev, base) => tickets.certificatePdf({ name: certNameOf({ ...r, ev_form: ev.reg_form }), event: { title: ev.title, date: ev.date, location: ev.location }, cert: ev.reg_form?.cert || {}, code: r.ticket, siteUrl: base, issued: r.certificate_sent_at || r.checked_in_at, defaults: await certDefaults() });
const certOn = (r) => !!r.ev_form?.cert?.enabled && !!r.checked_in_at && statusOf(r) !== 'cancelled';
const site = (req) => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

/** Public: one ticket (name and event only; no email or phone). The code is the secret. */
router.get('/ticket/:code', async (req, res) => {
  try {
    const r = await byCode(req.params.code);
    if (!r) return res.status(404).json({ error: 'This ticket was not found.' });
    res.set('Cache-Control', 'no-store');
    res.json({ code: r.ticket, name: r.full_name || forms.show(answersOf(r)[forms.fieldsOf({ reg_form: r.ev_form })[0]?.id]) || 'Guest', status: statusOf(r), checked_in: !!r.checked_in_at,
      event: { id: r.event_id, title: r.ev_title, date: r.ev_date, time: r.ev_time, location: r.ev_location }, certificate: certOn(r), can_cancel: canCancel(r) });
  } catch (e) { fail(res, e); }
});

/** Public: cancel your own sign-up with your ticket code. The seat goes to the next person on the waiting list. */
router.post('/ticket/:code/cancel', limiter, async (req, res) => {
  try {
    const r = await byCode(req.params.code);
    if (!r) return res.status(404).json({ error: 'This ticket was not found.' });
    if (r.checked_in_at) return res.status(409).json({ error: 'You are already checked in, so this cannot be cancelled.' });
    if (r.payment) return res.status(409).json({ error: 'This sign-up has a payment. Please contact the organisers to cancel it.' });
    if (!canCancel(r)) return res.status(409).json({ error: 'This sign-up can no longer be cancelled.' });
    await pool.query('UPDATE event_registrations SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [r.id]);
    res.json({ success: true });
    promoteWaiting(r.event_id).catch((e) => console.error('promote failed:', e.message));
  } catch (e) { fail(res, e); }
});

/** Public: the certificate as a PDF (only for people who were checked in at an event with certificates switched on). */
router.get('/certificate/:code', async (req, res) => {
  try {
    const r = await byCode(req.params.code);
    if (!r || !certOn(r)) return res.status(404).json({ error: 'There is no certificate for this code.' });
    const pdf = await tickets.certificatePdf({ name: certNameOf(r), event: { title: r.ev_title, date: r.ev_date, location: r.ev_location }, cert: r.ev_form.cert, code: r.ticket, siteUrl: site(req), issued: r.certificate_sent_at || r.checked_in_at, defaults: await certDefaults() });
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
    res.json({ valid: true, name: certNameOf(r), event: r.ev_title, date: r.ev_date, issuedBy: 'BAUET ICT Club', code: r.ticket });
  } catch (e) { fail(res, e); }
});

/** Admin: check someone in by their ticket code (typed, or read from the QR code). Body: { code, force? } */
router.post('/checkin', authMiddleware, async (req, res) => {
  try {
    const r = await byCode(req.body?.code);
    if (!r) return res.status(404).json({ error: 'No ticket with this code.' });
    const person = { id: r.id, name: r.full_name || 'Guest', event_id: r.event_id, event: r.ev_title, status: statusOf(r) };
    if (req.body?.event && String(req.body.event) !== String(r.event_id)) return res.status(409).json({ error: `This ticket is for another event: ${r.ev_title}.`, person });
    if (person.status === 'waitlist') return res.status(409).json({ error: 'This person is still on the waiting list, not confirmed.', person });
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
    if (!ev || require('../utils/schedule').isHidden(ev)) return res.status(404).json({ error: 'Event not found' });
    if (ev.reg_open === false) return res.status(409).json({ error: 'Registration for this event is closed.' });
    if (ev.date && day(ev.date) < todayStr()) return res.status(409).json({ error: 'This event has already taken place.' });

    if (forms.closedByTime(ev.reg_form)) return res.status(409).json({ error: 'Registration for this event has closed.' });

    const fields = forms.fieldsOf(ev);
    // older clients sent the answers as a flat body: keep them working
    const { clean, errors } = forms.validateAnswers(fields, req.body?.answers || req.body);
    // how this person pays: by hand (bKash / Nagad / Rocket and a transaction ID that an admin checks) or online through the gateway
    const payCfg = ev.reg_form?.payment?.enabled ? ev.reg_form.payment : null;
    const online = !!payCfg && req.body?.pay_mode === 'online';
    let pay = null;
    if (payCfg && online) {
      if (!payCfg.online || !ssl.configured()) return res.status(409).json({ error: 'Paying online is not available for this event.' });
      pay = { payment: { method: 'Online', online: true, tran_id: ssl.newTranId(), amount: payCfg.amount, status: 'initiated' } };
    } else if (payCfg) {
      if (payCfg.manual === false) return res.status(409).json({ error: 'This event takes online payment only. Choose "Pay online".' });
      pay = forms.validatePayment(payCfg, req.body?.payment);
    }
    const allErrors = { ...errors, ...(pay?.errors ? { payment: pay.errors } : {}) };
    if (Object.keys(allErrors).length) return res.status(400).json({ error: 'Please check the highlighted questions', fields: errors, payment: pay?.errors || null });

    const existing = (await pool.query("SELECT answers, email, student_id, payment, pay_status, waitlisted FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [ev.id])).rows;
    // full: a free event puts people in line (they get a seat automatically when someone drops out); a paid event just says it is full
    const full = !!ev.capacity && existing.filter((r) => !r.waitlisted).length >= ev.capacity;
    if (full && ev.reg_form?.payment?.enabled) return res.status(409).json({ error: 'Sorry, this event is full.' });
    const waitlisted = full;
    const position = waitlisted ? existing.filter((r) => r.waitlisted).length + 1 : 0;
    const u = forms.uniqueId(ev);
    if (u && clean[u] !== undefined) {
      const mine = forms.show(clean[u]).toLowerCase();
      if (existing.some((r) => forms.show(r.answers?.[u]).toLowerCase() === mine || (u === 'email' && r.email === mine))) {
        return res.status(409).json({ error: 'You have already registered for this event.', fields: { [u]: 'Already registered' } });
      }
    }
    // one transaction ID can pay for one sign-up only
    if (pay?.payment?.trx_id && existing.some((r) => r.payment?.trx_id === pay.payment.trx_id)) {
      return res.status(409).json({ error: 'This transaction ID has already been used.', payment: { trx_id: 'Already used' } });
    }
    const col = forms.columnsFrom(fields, clean);
    const ticket = tickets.newCode();
    const { rows } = await pool.query(
      'INSERT INTO event_registrations (event_id, full_name, student_id, email, phone, department, batch, answers, payment, pay_status, ticket, waitlisted, pay_tran) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id',
      [ev.id, col.full_name, col.student_id, col.email, col.phone, col.department, col.batch, JSON.stringify(clean), pay?.payment ? JSON.stringify(pay.payment) : null, pay?.payment ? 'pending' : 'none', ticket, waitlisted, pay?.payment?.tran_id || null]
    );
    if (online) { // send the person to the payment page; the sign-up is confirmed when the gateway proves the payment
      const g = await ssl.start({ tranId: pay.payment.tran_id, amount: pay.payment.amount, name: col.full_name, email: col.email, phone: col.phone, product: ev.title, siteUrl: site(req) });
      if (!g.url) { await pool.query('UPDATE event_registrations SET deleted_at = NOW() WHERE id = $1', [rows[0].id]); return res.status(502).json({ error: g.error }); }
      return res.status(201).json({ success: true, id: rows[0].id, ticket, pending_payment: true, pay_url: g.url, tran_id: pay.payment.tran_id });
    }
    res.status(201).json({ success: true, id: rows[0].id, ticket, waitlisted, position, pending_payment: !!pay?.payment, message: ev.reg_form?.confirmation || '' });
    // a short confirmation to the person (switch off with EVENT_CONFIRM_EMAIL=false); needs an email question in the form
    const to = col.email || forms.show(clean[(fields.find((f) => f.type === 'email') || {}).id]);
    if (to && waitlisted && (process.env.EVENT_CONFIRM_EMAIL || '').toLowerCase() !== 'false') {
      mail.sendMail({ to, ...mail.templates.waitlistJoined({ full_name: col.full_name }, ev, position) });
    } else if (to && !pay?.payment && (process.env.EVENT_CONFIRM_EMAIL || '').toLowerCase() !== 'false') {
      mail.sendMail({ to, ...mail.templates.eventRegistered({ full_name: col.full_name || 'there' }, { ...ev, ticket }, formalDate, formalTime) });
    }
    // with a payment: tell them at once that it is being checked; the place is confirmed when the admin verifies it (PATCH /:id/payment)
    if (to && pay?.payment && (process.env.EVENT_CONFIRM_EMAIL || '').toLowerCase() !== 'false') {
      mail.sendMail({ to, ...mail.templates.registrationPending({ full_name: col.full_name }, ev, pay.payment, formalDate, formalTime) });
    }
    if (ev.reg_form?.notify_admin) {
      const who = col.full_name || to || 'Someone';
      mail.sendMail({ to: mail.adminAddress(), ...mail.templates.adminNewSignup(ev, `${who} registered${waitlisted ? ' and joined the waiting list' : ''}${pay?.payment ? ` and paid ${pay.payment.amount} BDT by ${pay.payment.method} (TrxID ${pay.payment.trx_id})` : ''}.`) });
    }
    notifyAdmin({
      title: `🎟️ New Event Ticket: ${ev.title}`,
      description: `<b>${col.full_name || 'Attendee'}</b> registered${waitlisted ? ' (Waiting List)' : ''}.`,
      path: `/admin/events/${ev.id}/registrations`,
      buttons: [
        ['✉️ Email', col.email ? `mailto:${col.email}` : ''],
      ],
      fields: [
        ['Ticket Code', ticket],
        ['Student ID', col.student_id || '-'],
        ['Email', col.email || '-'],
        ['Payment', pay?.payment ? `${pay.payment.amount} BDT (${pay.payment.method}, TrxID: ${pay.payment.trx_id || pay.payment.tran_id})` : 'Free / None'],
      ],
    });
  } catch (e) {
    console.error('Event registration failed:', e.message);
    res.status(500).json({ error: 'Could not save your registration. Please try again.' });
  }
}

router.use(authMiddleware);

/** Admin: numbers about one event (who signed up, who came, from which department and batch, when, and the money). Editors do not see the money. */
router.get('/analytics/:eventId', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT id, title, date, capacity FROM events WHERE id = $1 AND deleted_at IS NULL', [req.params.eventId])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const rows = (await pool.query('SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL', [ev.id])).rows;
    const live = rows.filter((r) => statusOf(r) !== 'cancelled');
    const tally = (fn, max = 12) => Object.entries(live.reduce((m, r) => { const k = String(fn(r) || '').trim() || 'Not told'; m[k] = (m[k] || 0) + 1; return m; }, {})).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, max);
    const confirmed = rows.filter((r) => statusOf(r) === 'confirmed').length;
    const checked = live.filter((r) => r.checked_in_at).length;
    const days = Object.entries(live.reduce((m, r) => { const d = day(r.created_at); if (d) m[d] = (m[d] || 0) + 1; return m; }, {})).sort((a, b) => a[0].localeCompare(b[0])).slice(-60).map(([d, count]) => ({ day: d, count }));
    const paid = rows.filter((r) => r.pay_status === 'verified' && r.payment);
    const money = req.user?.role === 'editor' ? null : {
      verified: paid.length, online: paid.filter((r) => r.payment.online).length, by_hand: paid.filter((r) => !r.payment.online).length,
      amount: paid.reduce((n, r) => n + (Number(r.payment.amount) || 0), 0), to_check: rows.filter((r) => r.pay_status === 'pending' && r.payment && !r.waitlisted).length,
    };
    res.json({
      event: { id: ev.id, title: ev.title, date: ev.date, capacity: ev.capacity || 0 },
      total: live.length, confirmed, waiting: rows.filter((r) => statusOf(r) === 'waitlist').length, pending_payment: rows.filter((r) => statusOf(r) === 'pending').length, cancelled: rows.length - live.length,
      checked_in: checked, check_in_rate: confirmed + rows.filter((r) => statusOf(r) === 'pending' && r.checked_in_at).length ? Math.round((checked / Math.max(1, confirmed)) * 100) : 0,
      seats_left: ev.capacity ? Math.max(0, ev.capacity - rows.filter((r) => !r.waitlisted && statusOf(r) !== 'cancelled').length) : null,
      by_department: tally((r) => r.department), by_batch: tally((r) => r.batch), by_day: days, money,
    });
  } catch (e) { fail(res, e); }
});

/** Admin: everyone who signed up for one event. */
router.get('/by-event/:eventId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.eventId]);
    res.json(rows);
  } catch (e) { fail(res, e); }
});

/** Admin: download the list. ?event=ID&format=csv|xlsx|pdf|docx */
router.get('/export', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [req.query.event])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const { rows } = await pool.query('SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC', [ev.id]);
    const format = ['pdf', 'docx', 'xlsx'].includes(req.query.format) ? req.query.format : 'csv';
    // one column per question of this event's form, then the date
    const withPay = !!ev.reg_form?.payment?.enabled;
    const cols = [
      ...forms.fieldsOf(ev).filter((f) => f.type !== 'section').map((f) => [f.label, (r) => forms.show(answersOf(r)[f.id])]),
      ...(withPay ? [['Paid with', (r) => r.payment?.method || ''], ['Paid from', (r) => r.payment?.sender || ''], ['Transaction ID', (r) => r.payment?.trx_id || ''], ['Amount (BDT)', (r) => r.payment?.amount || ''], ['Payment status', (r) => r.pay_status || '']] : []),
      ...(rows.some((r) => r.waitlisted) ? [['Seat', (r) => (r.waitlisted ? 'Waiting list' : 'Confirmed')]] : []),
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
    else if (format === 'xlsx') { buf = await tableToXlsx(title, sub, cols, rows); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; }
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
      ...(rows.some((r) => r.waitlisted) ? [['Seat', (r) => (r.waitlisted ? 'Waiting list' : 'Confirmed')]] : []),
      ['Signed up', (r) => formalDate(r.created_at)],
    ];
    const title = `${ev.title}: registrations`;
    const sub = `${rows.length} ${rows.length === 1 ? 'person' : 'people'} · ${formalDate(ev.date)}${ev.time ? ` · ${formalTime(ev.time)}` : ''}${ev.location ? ` · ${ev.location}` : ''}`;
    const csv = toCsv(cols.map((c) => c[0]), rows.map((r) => cols.map(([, k]) => (typeof k === 'function' ? k(r) : r[k]))));
    const entries = [
      { name: 'registrations.csv', data: csv },
      { name: 'registrations.xlsx', data: await tableToXlsx(title, sub, cols, rows) },
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

/** Admin: see exactly the certificate a person will get (the PDF that is attached to the email). Without ?reg= it shows a sample. */
router.get('/event/:eventId/certificates/preview', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [req.params.eventId])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    if (!ev.reg_form?.cert?.enabled) return res.status(409).json({ error: 'Switch certificates on for this event first.' });
    let r = { full_name: 'Participant Name', ticket: 'PREVIEW000' };
    if (req.query.reg) {
      r = (await pool.query('SELECT * FROM event_registrations WHERE id = $1 AND event_id = $2 AND deleted_at IS NULL', [Number(req.query.reg) || 0, ev.id])).rows[0];
      if (!r) return res.status(404).json({ error: 'Sign-up not found' });
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="certificate-preview.pdf"', 'Cache-Control': 'no-store' });
    res.send(await certPdfFor(r, ev, site(req)));
  } catch (e) { fail(res, e); }
});

/** Admin: preview with settings that are NOT saved yet (body: { cert, reg? }). The live preview in the settings page uses this, so every change shows at once. */
router.post('/event/:eventId/certificates/preview-draft', async (req, res) => {
  try {
    const ev = await eventForCerts(req.params.eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const cert = forms.sanitizeCert(req.body?.cert || {});
    let r = { full_name: 'Participant Name', ticket: 'PREVIEW000' };
    if (req.body?.reg) {
      r = (await pool.query('SELECT * FROM event_registrations WHERE id = $1 AND event_id = $2 AND deleted_at IS NULL', [Number(req.body.reg) || 0, ev.id])).rows[0];
      if (!r) return res.status(404).json({ error: 'Sign-up not found' });
    }
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="certificate-preview.pdf"', 'Cache-Control': 'no-store' });
    res.send(await certPdfFor(r, { ...ev, reg_form: { ...(ev.reg_form || {}), cert } }, site(req)));
  } catch (e) { fail(res, e); }
});

/** Admin: change the name printed on one person's certificate (empty = use the sign-up name again). */
router.patch('/:id/cert-name', async (req, res) => {
  try {
    const name = clean(req.body?.name, 80);
    const { rows } = await pool.query('UPDATE event_registrations SET cert_name = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, cert_name', [name || null, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Sign-up not found' });
    res.json(rows[0]);
  } catch (e) { fail(res, e); }
});

/* ---- certificates: choose people -> final check -> publish (email) ---- */
const eventForCerts = async (id) => (await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0];
const stageOf = (ev) => (['review', 'published'].includes(ev.cert_stage) ? ev.cert_stage : 'draft');

/** Admin: tick or untick people for certificates (body: { ids: [..], picked: true|false } or { all: true, picked }). Only checked-in people can be ticked. Going back to editing resets the final check. */
router.patch('/event/:eventId/certificates/pick', async (req, res) => {
  try {
    const ev = await eventForCerts(req.params.eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const picked = req.body?.picked !== false;
    const ids = req.body?.all ? null : [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 2000);
    const base = "UPDATE event_registrations SET cert_pick = $1 WHERE event_id = $2 AND deleted_at IS NULL AND (checked_in_at IS NOT NULL OR $1 = FALSE) AND email IS NOT NULL AND COALESCE(pay_status, 'none') <> 'rejected'";
    const r = ids === null
      ? await pool.query(`${base} AND (certificate_sent_at IS NULL OR $1 = FALSE)`, [picked, ev.id])
      : (ids.length ? await pool.query(`${base} AND id IN (${ids.map((_, i) => '$' + (i + 3)).join(',')})`, [picked, ev.id, ...ids]) : { rowCount: 0 });
    if (stageOf(ev) === 'review') await pool.query("UPDATE events SET cert_stage = 'draft' WHERE id = $1", [ev.id]);
    res.json({ changed: r.rowCount });
  } catch (e) { fail(res, e); }
});

/** Admin: everything for the final check: who gets a certificate, what the settings say, and what is still wrong. */
router.get('/event/:eventId/certificates', async (req, res) => {
  try {
    const ev = await eventForCerts(req.params.eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const cert = ev.reg_form?.cert || {};
    const rows = (await pool.query("SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND cert_pick = TRUE AND checked_in_at IS NOT NULL ORDER BY full_name", [ev.id])).rows;
    const people = rows.map((r) => ({ id: r.id, name: certNameOf({ ...r, ev_form: ev.reg_form }), custom_name: !!r.cert_name, email: r.email || '', sent: !!r.certificate_sent_at && r.cert_status !== 'queued', status: r.cert_status === 'queued' ? 'queued' : r.cert_status === 'failed' ? 'failed' : r.certificate_sent_at ? 'sent' : 'new', error: r.cert_status === 'failed' ? (r.cert_error || 'Could not send') : r.cert_status === 'queued' && r.cert_error ? r.cert_error : '' }));
    const def = await certDefaults();
    const advisor = String(cert.signer || '').trim() || tickets.DEFAULT_ADVISOR.name;
    const advisorTitle = String(cert.signer_title || '').trim() || tickets.DEFAULT_ADVISOR.title;
    const advisorPicture = cert.signature_url ? 'your picture' : advisor === tickets.DEFAULT_ADVISOR.name ? 'the club\'s signature' : 'none';
    const president = cert.second === false ? '' : String(cert.signer2 || '').trim() || def.president;
    const presidentPicture = cert.signature2_url ? 'your picture' : president ? 'a designed signature' : 'none';
    const problems = [];
    if (!cert.enabled) problems.push({ level: 'error', text: 'Certificates are switched off for this event.' });
    if (!people.length) problems.push({ level: 'error', text: 'Nobody is chosen yet. Tick the people on the list first.' });
    if (advisorPicture === 'none') problems.push({ level: 'warn', text: `${advisor} has no signature picture, so only the name is printed. Upload one in the certificate settings.` });
    if (!String(cert.organizer || '').trim()) problems.push({ level: 'warn', text: 'No "organised by" line: it will say the BAUET ICT Club organised it.' });
    people.filter((x) => !x.email).forEach((x) => problems.push({ level: 'error', text: `${x.name} has no email address.` }));
    if (!mail.provider()) problems.push({ level: 'error', text: 'Email is not set up on the server (BREVO_API_KEY and MAIL_FROM).' });
    const waiting = people.filter((x) => x.status === 'new').length;
    const counts = { sent: people.filter((x) => x.status === 'sent').length, queued: people.filter((x) => x.status === 'queued').length, failed: people.filter((x) => x.status === 'failed').length };
    res.json({ stage: stageOf(ev), enabled: !!cert.enabled, cert: { title: cert.title || '', organizer: cert.organizer || '', event_kind: cert.event_kind || '', theme: cert.theme || 'gold', signer: advisor, signer_title: advisorTitle, signature_source: advisorPicture, signer2: president, signer2_title: String(cert.signer2_title || '').trim() || 'President, BAUET ICT Club', signature2_source: presidentPicture, note: cert.note || '' },
      people, waiting, counts, problems, can_publish: !problems.some((p) => p.level === 'error') && people.length > 0 });
  } catch (e) { fail(res, e); }
});

/** Admin: move between "choosing" and "final check" (publishing happens when the emails are sent). */
router.post('/event/:eventId/certificates/stage', async (req, res) => {
  try {
    const ev = await eventForCerts(req.params.eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const to = req.body?.stage === 'review' ? 'review' : 'draft';
    if (to === 'review') {
      if (!ev.reg_form?.cert?.enabled) return res.status(409).json({ error: 'Switch certificates on for this event first.' });
      const n = Number((await pool.query('SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND cert_pick = TRUE AND checked_in_at IS NOT NULL', [ev.id])).rows[0].n);
      if (!n) return res.status(400).json({ error: 'Choose at least one person first.' });
    }
    await pool.query('UPDATE events SET cert_stage = $1 WHERE id = $2', [to, ev.id]);
    res.json({ stage: to });
  } catch (e) { fail(res, e); }
});

/**
 * Admin: publish. Puts the certificate emails (PDF attached) in a queue that lives in the database, so nothing is lost if the server restarts
 * or the mail service is busy. Each person is marked "emailed" only after the mail service really accepted the mail.
 * body: { ids?: [..] }  without ids = everyone chosen who has not got one yet; with ids = exactly those (also people who already got one: a corrected copy).
 */
router.post('/event/:eventId/certificates/send', async (req, res) => {
  try {
    const ev = await eventForCerts(req.params.eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    if (!ev.reg_form?.cert?.enabled) return res.status(409).json({ error: 'Switch certificates on for this event first.' });
    if (stageOf(ev) === 'draft') return res.status(409).json({ error: 'Do the final check first, then publish.' });
    if (!mail.provider()) return res.status(400).json({ error: 'Email is not configured. Set BREVO_API_KEY and MAIL_FROM in .env.' });
    const given = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 2000) : null;
    const rows = (await pool.query(
      `SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND cert_pick = TRUE ${given ? (given.length ? 'AND id IN (' + given.map((_, i) => '$' + (i + 2)).join(',') + ')' : 'AND FALSE') : "AND certificate_sent_at IS NULL AND COALESCE(cert_status, '') NOT IN ('queued')"}`,
      given ? [ev.id, ...given] : [ev.id])).rows;
    if (!rows.length) return res.status(400).json({ error: given ? 'Nobody in that choice is ticked for a certificate.' : 'Everyone chosen already has their certificate (or it is on its way).' });
    const queued = []; const skipped = [];
    for (const r of rows) {
      if (!r.checked_in_at) { skipped.push({ id: r.id, reason: 'not checked in' }); continue; }
      if (!r.email) { skipped.push({ id: r.id, reason: 'no email' }); continue; }
      if (r.pay_status === 'rejected') { skipped.push({ id: r.id, reason: 'payment rejected' }); continue; }
      await pool.query("UPDATE event_registrations SET cert_status = 'queued', cert_tries = 0, cert_error = NULL WHERE id = $1", [r.id]);
      queued.push(r.id);
    }
    await pool.query("UPDATE events SET cert_stage = 'published' WHERE id = $1", [ev.id]);
    processCertQueue().catch((e) => console.warn('Certificate queue:', e.message)); // keeps going in the background
    res.json({ queued: queued.length, sent: 0, skipped, stage: 'published' });
  } catch (e) { fail(res, e); }
});

/** Admin: put the certificates that failed back in the queue (after fixing an address, or when the mail service was down). */
router.post('/event/:eventId/certificates/retry', async (req, res) => {
  try {
    const r = await pool.query("UPDATE event_registrations SET cert_status = 'queued', cert_tries = 0, cert_error = NULL WHERE event_id = $1 AND cert_status = 'failed' AND deleted_at IS NULL", [req.params.eventId]);
    processCertQueue().catch((e) => console.warn('Certificate queue:', e.message));
    res.json({ queued: r.rowCount });
  } catch (e) { fail(res, e); }
});

let certRunning = false;
/**
 * Sends the queued certificate emails one by one (the PDF is drawn just before each mail). A failed mail is tried again later (3 tries, then it is
 * marked "failed" with the reason). When the mail service says its daily limit is reached, the rest simply waits and goes on at the next run
 * (the cron job, or the next start of the server). Safe to call at any time and from anywhere.
 */
async function processCertQueue() {
  if (certRunning) return;
  certRunning = true;
  try {
    for (let guard = 0; guard < 5000; guard++) {
      const r = (await pool.query("SELECT * FROM event_registrations WHERE cert_status = 'queued' AND deleted_at IS NULL ORDER BY cert_tries, id LIMIT 1")).rows[0];
      if (!r) break;
      const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [r.event_id])).rows[0];
      const fail1 = async (msg, final) => pool.query('UPDATE event_registrations SET cert_tries = cert_tries + 1, cert_error = $1, cert_status = $2 WHERE id = $3', [String(msg).slice(0, 200), final || r.cert_tries + 1 >= 3 ? 'failed' : 'queued', r.id]);
      if (!ev || !ev.reg_form?.cert?.enabled) { await fail1('Certificates are switched off for this event', true); continue; }
      if (!r.email) { await fail1('No email address', true); continue; }
      if (!mail.provider()) break; // mail is not set up: leave everything queued
      try {
        const pdf = await certPdfFor(r, ev, mail.siteUrl());
        const clean1 = certNameOf({ ...r, ev_form: ev.reg_form }).replace(/[^\p{L}\p{N} ._-]+/gu, '').trim() || 'Participant';
        await mail.sendNow({ to: r.email, ...mail.templates.certificateReady(r, ev, r.ticket), attachments: [{ filename: `Certificate - ${clean1}.pdf`, content: pdf, contentType: 'application/pdf' }] });
        await pool.query("UPDATE event_registrations SET certificate_sent_at = NOW(), cert_status = 'sent', cert_error = NULL WHERE id = $1", [r.id]);
      } catch (e) {
        if (/429|limit|quota|credit|too many/i.test(e.message)) { await pool.query('UPDATE event_registrations SET cert_error = $1 WHERE id = $2', [`Waiting: ${String(e.message).slice(0, 150)}`, r.id]); break; } // try again at the next run
        await fail1(e.message);
        await new Promise((ok) => setTimeout(ok, 1500));
      }
      await new Promise((ok) => setTimeout(ok, 300)); // gentle on the mail service
    }
  } finally { certRunning = false; }
}
router.processCertQueue = processCertQueue;

/** Admin: email the feedback form link of this event now (people who came, or everyone confirmed). */
router.post('/event/:eventId/feedback/send', async (req, res) => {
  try {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [req.params.eventId])).rows[0];
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const r = await require('../utils/feedback').sendFeedback(ev);
    if (!r.sent && r.reason) return res.status(409).json({ error: r.reason });
    res.json(r);
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
    if (status === 'rejected') promoteWaiting(r.event_id).catch(() => {});
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [r.event_id])).rows[0];
    if (ev && r.email && status !== 'pending') {
      mail.sendMail({ to: r.email, ...(status === 'verified' ? mail.templates.paymentVerified(r, { ...ev, email_note: ev.reg_form?.email_note, ticket: r.ticket }, formalDate) : mail.templates.paymentRejected(r, ev, r.admin_note)) });
    }
  } catch (e) { fail(res, e); }
});

/** Gives free seats to the people waiting, oldest first, and emails them. Returns how many got a seat. */
async function promoteWaiting(eventId) {
  return serial(`event:${eventId}`, async () => {
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [eventId])).rows[0];
    if (!ev) return 0;
    const seated = Number((await pool.query("SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected' AND NOT COALESCE(waitlisted, FALSE)", [eventId])).rows[0].n);
    const free = ev.capacity ? ev.capacity - seated : 1000;
    if (free <= 0) return 0;
    const next = (await pool.query("SELECT id FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND waitlisted = TRUE AND COALESCE(pay_status, 'none') <> 'rejected' ORDER BY created_at ASC, id ASC LIMIT $2", [eventId, free])).rows;
    const rows = [];
    for (const n of next) rows.push(...(await pool.query('UPDATE event_registrations SET waitlisted = FALSE WHERE id = $1 RETURNING *', [n.id])).rows);
    for (const r of rows) if (r.email) mail.sendMail({ to: r.email, ...mail.templates.waitlistPromoted(r, ev, formalDate, formalTime) });
    return rows.length;
  });
}

/** Admin: give one waiting person a seat now (even if the event is over capacity). */
router.patch('/:id/promote', async (req, res) => {
  try {
    const { rows } = await pool.query('UPDATE event_registrations SET waitlisted = FALSE WHERE id = $1 AND deleted_at IS NULL AND waitlisted = TRUE RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'This person is not on the waiting list.' });
    const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [rows[0].event_id])).rows[0];
    if (ev && rows[0].email) mail.sendMail({ to: rows[0].email, ...mail.templates.waitlistPromoted(rows[0], ev, formalDate, formalTime) });
    res.json(rows[0]);
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
    const gone = (await pool.query('SELECT event_id FROM event_registrations WHERE id = $1', [req.params.id])).rows[0];
    if (gone) promoteWaiting(gone.event_id).catch((e) => console.error('promote failed:', e.message));
  } catch (e) { fail(res, e); }
});

module.exports = router;
module.exports.promoteWaiting = promoteWaiting;
