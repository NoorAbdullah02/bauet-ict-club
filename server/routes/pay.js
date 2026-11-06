// Online payment (SSLCommerz): the gateway sends the person back here, and also calls us directly (IPN).
// Nothing is trusted from the browser: every payment is checked with the gateway before the sign-up is confirmed.
const express = require('express');
const pool = require('../config/db');
const ssl = require('../utils/sslcommerz');
const mail = require('../utils/mailer');
const { formalDate } = require('../utils/format');

const router = express.Router();
const TABLES = { event: 'event_registrations', form: 'form_responses' };

/** Public: is paying online available on this server? (the editors only offer the switch when it is) */
router.get('/status', (_req, res) => res.json({ gateway: ssl.configured(), sandbox: ssl.sandbox() }));

async function findByTran(tran) {
  const t = String(tran || '');
  if (!/^bauet-[a-f0-9]{16}$/.test(t)) return null;
  for (const [kind, table] of Object.entries(TABLES)) {
    const r = (await pool.query(`SELECT * FROM ${table} WHERE pay_tran = $1 AND deleted_at IS NULL`, [t])).rows[0];
    if (r) return { kind, table, row: r };
  }
  return null;
}

/** Where the person lands after paying (built from our own records, never from the request). */
async function landing(hit, ok) {
  if (hit.kind === 'event') return ok ? `/ticket/${hit.row.ticket}?paid=1` : `/events/${hit.row.event_id}?pay=failed`;
  const f = (await pool.query('SELECT slug FROM forms WHERE id = $1', [hit.row.form_id])).rows[0];
  return `/f/${f?.slug || ''}${ok ? '?paid=1' : '?pay=failed'}`;
}

/** Marks a pending online payment paid (when the gateway proves it) or failed. Safe to call twice. Returns 'verified' | 'rejected' | 'pending'. */
async function settle(hit, { valId, cancel }) {
  const { table, row, kind } = hit;
  if (row.pay_status !== 'pending') return row.pay_status === 'verified' ? 'verified' : 'rejected';
  const pay = row.payment || {};
  let good = false; let v = null;
  if (!cancel) { v = await ssl.validate(valId); good = ssl.proves(v, pay.tran_id, pay.amount); }
  if (!cancel && !good && v === null) return 'pending'; // the gateway could not be reached: leave it, the gateway calls again (IPN)
  const next = { ...pay, status: good ? 'paid' : cancel ? 'cancelled' : 'failed', ...(good ? { val_id: String(valId), bank_tran_id: v.bank_tran_id || '', via: v.card_type || '' } : {}) };
  const upd = await pool.query(`UPDATE ${table} SET pay_status = $1, payment = $2 WHERE id = $3 AND pay_status = 'pending' RETURNING *`, [good ? 'verified' : 'rejected', JSON.stringify(next), row.id]);
  if (!upd.rows.length) return 'verified';
  const r = upd.rows[0];
  try {
    if (kind === 'event') {
      const ev = (await pool.query('SELECT * FROM events WHERE id = $1', [r.event_id])).rows[0];
      if (!good) require('./eventRegs').promoteWaiting?.(r.event_id)?.catch?.(() => {});
      else if (ev && r.email) mail.sendMail({ to: r.email, ...mail.templates.paymentVerified(r, { ...ev, email_note: ev.reg_form?.email_note, ticket: r.ticket }, formalDate) });
    } else if (good && r.email) {
      const f = (await pool.query('SELECT * FROM forms WHERE id = $1', [r.form_id])).rows[0];
      if (f) mail.sendMail({ to: r.email, ...mail.templates.formReceived({ full_name: r.full_name }, f) });
    }
  } catch (e) { console.warn('Payment follow-up failed:', e.message); }
  return good ? 'verified' : 'rejected';
}

const pick = (req) => ({ ...(req.query || {}), ...(req.body || {}) });
const back = async (res, hit, ok) => res.redirect(303, await landing(hit, ok));

// the browser comes back here after paying (a form post from the gateway)
router.all('/ssl/success', async (req, res) => {
  try {
    const b = pick(req); const hit = await findByTran(b.tran_id);
    if (!hit) return res.redirect(303, '/events');
    const s = await settle(hit, { valId: b.val_id });
    await back(res, hit, s !== 'rejected');
  } catch (e) { console.error('Pay return failed:', e.message); res.redirect(303, '/events'); }
});
router.all(['/ssl/fail', '/ssl/cancel'], async (req, res) => {
  try {
    const hit = await findByTran(pick(req).tran_id);
    if (!hit) return res.redirect(303, '/events');
    await settle(hit, { cancel: true });
    await back(res, hit, false);
  } catch (e) { console.error('Pay cancel failed:', e.message); res.redirect(303, '/events'); }
});
// the gateway tells us directly (works even when the person closes the tab right after paying)
router.post('/ssl/ipn', async (req, res) => {
  try {
    const b = pick(req); const hit = await findByTran(b.tran_id);
    if (hit && ['VALID', 'VALIDATED'].includes(String(b.status))) await settle(hit, { valId: b.val_id });
    else if (hit && ['FAILED', 'CANCELLED'].includes(String(b.status))) await settle(hit, { cancel: true });
    res.json({ ok: true });
  } catch (e) { console.error('IPN failed:', e.message); res.json({ ok: false }); }
});

/** Public: where is this payment? (the app asks while the person is paying in the browser). The transaction id is the secret. */
router.get('/check/:tran', async (req, res) => {
  try {
    const hit = await findByTran(req.params.tran);
    if (!hit) return res.status(404).json({ error: 'Not found' });
    res.set('Cache-Control', 'no-store').json({ status: hit.row.pay_status === 'verified' ? 'paid' : hit.row.pay_status === 'rejected' ? 'failed' : 'waiting', kind: hit.kind, ticket: hit.kind === 'event' ? hit.row.ticket : undefined });
  } catch { res.status(500).json({ error: 'Could not check' }); }
});

/** Online payments nobody finished within 30 minutes are cancelled, so the seat goes to someone else. */
async function expireStale() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  for (const [kind, table] of Object.entries(TABLES)) {
    try {
      const rows = (await pool.query(`SELECT * FROM ${table} WHERE pay_tran IS NOT NULL AND pay_status = 'pending' AND deleted_at IS NULL AND created_at < $1`, [cutoff])).rows;
      for (const r of rows) await settle({ kind, table, row: r }, { cancel: true });
    } catch (e) { console.warn('Online payment cleanup failed:', e.message); }
  }
}

module.exports = router;
module.exports.expireStale = expireStale;
module.exports.settle = settle;
