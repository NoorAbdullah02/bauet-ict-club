const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const mail = require('../utils/mailer');
const forms = require('../utils/forms');
const ssl = require('../utils/sslcommerz');
const { serial } = require('../utils/serial');
const { formalDate } = require('../utils/format');
const { tableToPdf, tableToDocx } = require('../utils/exporters');
const { sendZip, safe } = require('../utils/zipper');
const { toCsv } = require('../utils/csv');

const router = express.Router();
const clean = (v, n) => String(v ?? '').trim().slice(0, n);
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const answersOf = (r) => r.answers || {};
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 400, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many submissions from this network. Please try again later.' } });
/** A form by its link name. An old link name (before it was renamed) still finds the form. */
async function findForm(slug) {
  const f = (await pool.query('SELECT * FROM forms WHERE slug = $1 AND deleted_at IS NULL', [slug])).rows[0];
  if (f) return f;
  return (await pool.query('SELECT f.* FROM form_slug_history h JOIN forms f ON f.id = h.form_id WHERE h.slug = $1 AND f.deleted_at IS NULL', [slug])).rows[0];
}
const STARTER = { title: '', intro: '', confirmation: '', unique: '', fields: [{ id: 'name', key: 'name', type: 'short', label: 'Your name', required: true }, { id: 'email', key: 'email', type: 'email', label: 'Email', required: true }] };
const meta = (f) => ({ id: f.id, title: f.title, path: `/f/${f.slug}`, adminPath: '/admin/forms', date: null, email_note: f.reg_form?.email_note });

/* ---------- public: the form people fill in ---------- */
router.get('/public/:slug', async (req, res) => {
  try {
    const f = await findForm(req.params.slug);
    if (!f) return res.status(404).json({ error: 'This form does not exist.' });
    const n = Number((await pool.query("SELECT COUNT(*) AS n FROM form_responses WHERE form_id = $1 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [f.id])).rows[0].n);
    res.set('Cache-Control', 'no-store');
    res.json({ id: f.id, slug: f.slug, title: f.title, description: f.description, reg_form: f.reg_form, capacity: f.capacity, is_open: f.is_open !== false, count: n });
  } catch (e) { res.status(500).json({ error: 'Could not load the form' }); }
});

router.post('/public/:slug', limiter, (req, res) => serial(`form:${req.params.slug}`, () => respond(req, res)));
async function respond(req, res) {
  if (req.body?._hp) return res.status(201).json({ success: true }); // a bot filled the hidden trap field: pretend it worked, save nothing
  try {
    const f = await findForm(req.params.slug);
    if (!f) return res.status(404).json({ error: 'This form does not exist.' });
    if (f.is_open === false) return res.status(409).json({ error: 'This form is not accepting responses.' });
    if (forms.closedByTime(f.reg_form)) return res.status(409).json({ error: 'This form has closed.' });
    const fields = forms.fieldsOf(f.reg_form?.fields?.length ? f : { reg_form: STARTER });
    const { clean: ans, errors } = forms.validateAnswers(fields, req.body?.answers || req.body);
    const payCfg = f.reg_form?.payment?.enabled ? f.reg_form.payment : null;
    const online = !!payCfg && req.body?.pay_mode === 'online';
    let pay = null;
    if (payCfg && online) {
      if (!payCfg.online || !ssl.configured()) return res.status(409).json({ error: 'Paying online is not available for this form.' });
      pay = { payment: { method: 'Online', online: true, tran_id: ssl.newTranId(), amount: payCfg.amount, status: 'initiated' } };
    } else if (payCfg) {
      if (payCfg.manual === false) return res.status(409).json({ error: 'This form takes online payment only. Choose "Pay online".' });
      pay = forms.validatePayment(payCfg, req.body?.payment);
    }
    if (Object.keys(errors).length || pay?.errors) return res.status(400).json({ error: 'Please check the highlighted questions', fields: errors, payment: pay?.errors || null });

    const existing = (await pool.query("SELECT answers, payment FROM form_responses WHERE form_id = $1 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [f.id])).rows;
    if (f.capacity && existing.length >= f.capacity) return res.status(409).json({ error: 'Sorry, this form has reached its limit.' });
    const u = f.reg_form?.unique;
    if (u && ans[u] !== undefined && existing.some((r) => forms.show(r.answers?.[u]).toLowerCase() === forms.show(ans[u]).toLowerCase())) {
      return res.status(409).json({ error: 'You have already responded.', fields: { [u]: 'Already submitted' } });
    }
    if (pay?.payment?.trx_id && existing.some((r) => r.payment?.trx_id === pay.payment.trx_id)) return res.status(409).json({ error: 'This transaction ID has already been used.', payment: { trx_id: 'Already used' } });

    const col = forms.columnsFrom(fields, ans);
    const to = col.email || forms.show(ans[(fields.find((q) => q.type === 'email') || {}).id]);
    const { rows } = await pool.query('INSERT INTO form_responses (form_id, full_name, email, answers, payment, pay_status, pay_tran) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [f.id, col.full_name, to || null, JSON.stringify(ans), pay?.payment ? JSON.stringify(pay.payment) : null, pay?.payment ? 'pending' : 'none', pay?.payment?.tran_id || null]);
    if (online) {
      const siteUrl = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const g = await ssl.start({ tranId: pay.payment.tran_id, amount: pay.payment.amount, name: col.full_name, email: to, phone: col.phone, product: f.title, siteUrl });
      if (!g.url) { await pool.query('UPDATE form_responses SET deleted_at = NOW() WHERE id = $1', [rows[0].id]); return res.status(502).json({ error: g.error }); }
      return res.status(201).json({ success: true, id: rows[0].id, pending_payment: true, pay_url: g.url, tran_id: pay.payment.tran_id });
    }
    res.status(201).json({ success: true, id: rows[0].id, pending_payment: !!pay?.payment, message: f.reg_form?.confirmation || '' });
    if (to && pay?.payment && (process.env.FORM_CONFIRM_EMAIL || '').toLowerCase() !== 'false') mail.sendMail({ to, ...mail.templates.registrationPending({ full_name: col.full_name }, meta(f), pay.payment, formalDate) });
    if (to && !pay?.payment && (process.env.FORM_CONFIRM_EMAIL || '').toLowerCase() !== 'false') mail.sendMail({ to, ...mail.templates.formReceived({ full_name: col.full_name }, f) });
    if (f.reg_form?.notify_admin) mail.sendMail({ to: mail.adminAddress(), ...mail.templates.adminNewSignup(meta(f), `${col.full_name || to || 'Someone'} responded to “${f.title}”${pay?.payment ? ` and paid ${pay.payment.amount} BDT by ${pay.payment.method} (TrxID ${pay.payment.trx_id})` : ''}.`) });
  } catch (e) {
    console.error('Form response failed:', e.message);
    res.status(500).json({ error: 'Could not save your response. Please try again.' });
  }
}

/* ---------- admin ---------- */
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM forms WHERE deleted_at IS NULL ORDER BY created_at DESC');
    const counts = (await pool.query('SELECT form_id, COUNT(*) AS n FROM form_responses WHERE deleted_at IS NULL GROUP BY form_id')).rows;
    const by = Object.fromEntries(counts.map((c) => [c.form_id, Number(c.n)]));
    res.json(rows.map((f) => ({ ...f, responses: by[f.id] || 0 })));
  } catch (e) { fail(res, e); }
});

router.post('/', async (req, res) => {
  const title = clean(req.body?.title, 200);
  if (title.length < 2) return res.status(400).json({ error: 'Give the form a name' });
  try {
    let slug = slugify(title) || 'form';
    if ((await pool.query('SELECT 1 FROM forms WHERE slug = $1', [slug])).rows.length) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    let start = { ...STARTER, title };
    if (req.body?.reg_form) { // started from a ready-made template: checked like any other form
      const r = forms.sanitizeForm(req.body.reg_form);
      if (r.error) return res.status(400).json({ error: r.error });
      if (r.form) start = { ...r.form, title: r.form.title || title };
    }
    const { rows } = await pool.query('INSERT INTO forms (slug, title, description, reg_form) VALUES ($1,$2,$3,$4) RETURNING *', [slug, title, clean(req.body?.description, 1000) || null, JSON.stringify(start)]);
    res.status(201).json({ ...rows[0], responses: 0 });
  } catch (e) { fail(res, e); }
});

/** A copy of a form (questions and settings, no responses). */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const old = (await pool.query('SELECT * FROM forms WHERE id = $1 AND deleted_at IS NULL', [req.params.id])).rows[0];
    if (!old) return res.status(404).json({ error: 'Form not found' });
    const title = clean(`Copy of ${old.title}`, 200);
    let slug = slugify(title) || 'form';
    if ((await pool.query('SELECT 1 FROM forms WHERE slug = $1', [slug])).rows.length) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    const rf = old.reg_form ? { ...old.reg_form, title: `Copy of ${old.reg_form.title || old.title}`.slice(0, 120) } : null;
    const { rows } = await pool.query('INSERT INTO forms (slug, title, description, reg_form, capacity) VALUES ($1,$2,$3,$4,$5) RETURNING *', [slug, title, old.description, rf ? JSON.stringify(rf) : null, old.capacity || 0]);
    res.status(201).json({ ...rows[0], responses: 0 });
  } catch (e) { fail(res, e); }
});

router.put('/:id', async (req, res) => {
  try {
    const old = (await pool.query('SELECT * FROM forms WHERE id = $1 AND deleted_at IS NULL', [req.params.id])).rows[0];
    if (!old) return res.status(404).json({ error: 'Form not found' });
    const b = req.body || {};
    let regForm = old.reg_form;
    if (b.reg_form !== undefined) { const r = forms.sanitizeForm(b.reg_form); if (r.error) return res.status(400).json({ error: r.error }); regForm = r.form ? JSON.stringify(r.form) : null; }
    else regForm = old.reg_form ? JSON.stringify(old.reg_form) : null;
    let slug = old.slug;
    if (b.slug !== undefined) {
      slug = slugify(b.slug);
      if (slug.length < 2) return res.status(400).json({ error: 'The link name needs at least 2 letters or numbers' });
      if ((await pool.query('SELECT 1 FROM form_slug_history WHERE slug = $1 AND form_id <> $2', [slug, old.id])).rows.length) return res.status(409).json({ error: 'That link name was used before. Choose another.' });
      if ((await pool.query('SELECT 1 FROM forms WHERE slug = $1 AND id <> $2', [slug, old.id])).rows.length) return res.status(409).json({ error: 'That link name is already used' });
    }
    const { rows } = await pool.query('UPDATE forms SET title = $1, description = $2, reg_form = $3, capacity = $4, is_open = $5, slug = $6 WHERE id = $7 RETURNING *', [
      b.title !== undefined ? clean(b.title, 200) || old.title : old.title, b.description !== undefined ? clean(b.description, 1000) || null : old.description, regForm,
      b.capacity !== undefined ? (Number(b.capacity) > 0 ? Math.floor(Number(b.capacity)) : null) : old.capacity, b.is_open !== undefined ? !!b.is_open : old.is_open, slug, old.id]);
    if (slug !== old.slug) { // short links and the old link name keep working after a rename
      await pool.query('UPDATE short_links SET target = $1 WHERE target = $2', [`/f/${slug}`, `/f/${old.slug}`]);
      await pool.query('INSERT INTO form_slug_history (slug, form_id) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET form_id = EXCLUDED.form_id', [old.slug, old.id]);
      await pool.query('DELETE FROM form_slug_history WHERE slug = $1', [slug]);
    }
    res.json(rows[0]);
  } catch (e) { fail(res, e); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('UPDATE forms SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, trashed: true });
  } catch (e) { fail(res, e); }
});

router.get('/:id/responses', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM form_responses WHERE form_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.id])).rows); } catch (e) { fail(res, e); }
});

router.patch('/responses/:rid/answers', (req, res) => serial('form-edit', async () => {
  const change = req.body?.answers;
  if (!change || typeof change !== 'object' || Array.isArray(change)) return res.status(400).json({ error: 'Nothing to change' });
  try {
    const r = (await pool.query('SELECT * FROM form_responses WHERE id = $1 AND deleted_at IS NULL', [req.params.rid])).rows[0];
    if (!r) return res.status(404).json({ error: 'Not found' });
    const f = (await pool.query('SELECT * FROM forms WHERE id = $1', [r.form_id])).rows[0];
    if (!f) return res.status(404).json({ error: 'Form not found' });
    const fields = forms.fieldsOf(f.reg_form?.fields?.length ? f : { reg_form: STARTER });
    const known = new Set(fields.map((q) => q.id));
    const merged = { ...(r.answers || {}) };
    for (const [k, v] of Object.entries(change)) if (known.has(k)) merged[k] = v;
    const { clean, errors } = forms.validateAnswers(fields, merged);
    const bad = Object.keys(errors).filter((k) => k in change);
    if (bad.length) return res.status(400).json({ error: errors[bad[0]], fields: errors });
    const u = f.reg_form?.unique;
    if (u && u in change && clean[u] !== undefined) {
      const mine = forms.show(clean[u]).toLowerCase();
      const others = (await pool.query("SELECT answers FROM form_responses WHERE form_id = $1 AND id <> $2 AND deleted_at IS NULL AND COALESCE(pay_status, 'none') <> 'rejected'", [f.id, r.id])).rows;
      if (others.some((o) => forms.show(o.answers?.[u]).toLowerCase() === mine)) return res.status(409).json({ error: 'Someone else already has this value', fields: { [u]: 'Already used' } });
    }
    const col = forms.columnsFrom(fields, clean);
    const to = col.email || forms.show(clean[(fields.find((q) => q.type === 'email') || {}).id]);
    const { rows } = await pool.query('UPDATE form_responses SET answers = $1, full_name = $2, email = $3 WHERE id = $4 RETURNING *', [JSON.stringify(clean), col.full_name, to || null, r.id]);
    res.json(rows[0]);
  } catch (e) { fail(res, e); }
}));
router.patch('/responses/:rid/payment', async (req, res) => {
  const status = ['verified', 'rejected', 'pending'].includes(req.body?.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Choose verified, rejected or pending' });
  try {
    const { rows } = await pool.query('UPDATE form_responses SET pay_status = $1, admin_note = $2 WHERE id = $3 AND deleted_at IS NULL AND payment IS NOT NULL RETURNING *', [status, clean(req.body?.note, 300) || null, req.params.rid]);
    if (!rows.length) return res.status(404).json({ error: 'No payment to verify on this response' });
    res.json(rows[0]);
    const f = (await pool.query('SELECT * FROM forms WHERE id = $1', [rows[0].form_id])).rows[0];
    if (f && rows[0].email && status !== 'pending') mail.sendMail({ to: rows[0].email, ...(status === 'verified' ? mail.templates.paymentVerified(rows[0], meta(f), formalDate) : mail.templates.paymentRejected(rows[0], meta(f), rows[0].admin_note)) });
  } catch (e) { fail(res, e); }
});

router.delete('/responses/:rid', async (req, res) => {
  try {
    const r = await pool.query('UPDATE form_responses SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [req.params.rid]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

/** Columns and rows of one form's responses, shared by the file downloads. */
async function table(id) {
  const f = (await pool.query('SELECT * FROM forms WHERE id = $1', [id])).rows[0];
  if (!f) return null;
  const rows = (await pool.query('SELECT * FROM form_responses WHERE form_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC', [f.id])).rows;
  const fields = forms.fieldsOf(f.reg_form?.fields?.length ? f : { reg_form: STARTER }).filter((q) => q.type !== 'section');
  const withPay = !!f.reg_form?.payment?.enabled;
  const cols = [
    ...fields.map((q) => [q.label, (r) => forms.show(answersOf(r)[q.id])]),
    ...(withPay ? [['Paid with', (r) => r.payment?.method || ''], ['Paid from', (r) => r.payment?.sender || ''], ['Transaction ID', (r) => r.payment?.trx_id || ''], ['Amount (BDT)', (r) => r.payment?.amount || ''], ['Payment status', (r) => r.pay_status || '']] : []),
    ['Submitted', (r) => formalDate(r.created_at)],
  ];
  const csv = toCsv(cols.map((c) => c[0]), rows.map((r) => cols.map(([, k]) => k(r))));
  return { f, rows, fields, cols, csv, title: `${f.title}: responses`, sub: `${rows.length} ${rows.length === 1 ? 'response' : 'responses'} · exported ${formalDate(new Date())}` };
}

router.get('/:id/export', async (req, res) => {
  try {
    const t = await table(req.params.id);
    if (!t) return res.status(404).json({ error: 'Form not found' });
    const format = ['pdf', 'docx'].includes(req.query.format) ? req.query.format : 'csv';
    const buf = format === 'csv' ? Buffer.from(t.csv) : format === 'pdf' ? await tableToPdf(t.title, t.sub, t.cols, t.rows) : await tableToDocx(t.title, t.sub, t.cols, t.rows);
    const mime = { csv: 'text/csv; charset=utf-8', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }[format];
    res.set({ 'Content-Type': mime, 'Content-Disposition': `attachment; filename="${safe(t.f.title)}-responses.${format}"`, 'Cache-Control': 'no-store' });
    res.send(buf);
  } catch (e) { fail(res, e); }
});

router.get('/:id/zip', async (req, res) => {
  try {
    const t = await table(req.params.id);
    if (!t) return res.status(404).json({ error: 'Form not found' });
    const nameField = t.fields.find((q) => q.key === 'name') || t.fields[0];
    const entries = [{ name: 'responses.csv', data: t.csv }, { name: 'responses.pdf', data: await tableToPdf(t.title, t.sub, t.cols, t.rows) }, { name: 'responses.docx', data: await tableToDocx(t.title, t.sub, t.cols, t.rows) }];
    t.rows.forEach((r, i) => t.fields.filter((q) => q.type === 'photo').forEach((q) => {
      const url = answersOf(r)[q.id];
      if (url) entries.push({ name: `pictures/${String(i + 1).padStart(3, '0')}-${safe(forms.show(answersOf(r)[nameField?.id]) || `response-${r.id}`)}-${safe(q.label)}`, image: url });
    }));
    await sendZip(res, `form-${safe(t.f.title)}`, entries, { format: req.query.format });
  } catch (e) { if (!res.headersSent) fail(res, e); else res.end(); }
});

module.exports = router;
