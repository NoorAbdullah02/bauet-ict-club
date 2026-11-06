// Online payment through SSLCommerz (bKash, Nagad, Rocket, cards and banks on one page). Needs a merchant account:
// SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWD. Free test ("sandbox") accounts work the same way.
// SSLCOMMERZ_SANDBOX=false switches to the live gateway (default: sandbox outside production). SSLCOMMERZ_BASE overrides the address (tests).
const crypto = require('crypto');

const env = (k) => String(process.env[k] || '').trim();
const configured = () => !!(env('SSLCOMMERZ_STORE_ID') && env('SSLCOMMERZ_STORE_PASSWD'));
const sandbox = () => (env('SSLCOMMERZ_SANDBOX') ? env('SSLCOMMERZ_SANDBOX').toLowerCase() !== 'false' : process.env.NODE_ENV !== 'production');
const base = () => (env('SSLCOMMERZ_BASE') || (sandbox() ? 'https://sandbox.sslcommerz.com' : 'https://securepay.sslcommerz.com')).replace(/\/$/, '');

/** A fresh transaction id nobody can guess (it is also the secret that lets the return page find the sign-up). */
const newTranId = () => `bauet-${crypto.randomBytes(8).toString('hex')}`;

/** Opens a payment session. Returns { url } to send the person to, or { error }. */
async function start({ tranId, amount, name, email, phone, product, siteUrl }) {
  if (!configured()) return { error: 'Online payment is not set up.' };
  const body = new URLSearchParams({
    store_id: env('SSLCOMMERZ_STORE_ID'), store_passwd: env('SSLCOMMERZ_STORE_PASSWD'),
    total_amount: String(amount), currency: 'BDT', tran_id: tranId,
    success_url: `${siteUrl}/api/pay/ssl/success`, fail_url: `${siteUrl}/api/pay/ssl/fail`, cancel_url: `${siteUrl}/api/pay/ssl/cancel`, ipn_url: `${siteUrl}/api/pay/ssl/ipn`,
    cus_name: String(name || 'Guest').slice(0, 50), cus_email: String(email || 'noreply@example.com').slice(0, 50), cus_add1: 'BAUET, Natore', cus_city: 'Natore', cus_country: 'Bangladesh', cus_phone: String(phone || '01700000000').slice(0, 20),
    shipping_method: 'NO', product_name: String(product || 'BAUET ICT Club').slice(0, 100), product_category: 'event', product_profile: 'non-physical-goods',
  });
  try {
    const r = await fetch(`${base()}/gwprocess/v4/api.php`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    if (j?.status === 'SUCCESS' && j.GatewayPageURL) return { url: j.GatewayPageURL };
    return { error: j?.failedreason || 'The payment page could not be opened.' };
  } catch (e) { return { error: 'Could not reach the payment company. Please try again.' }; }
}

/** Asks the gateway whether a payment really happened (the browser's word is never enough). Returns the gateway's answer or null. */
async function validate(valId) {
  if (!configured() || !valId) return null;
  const q = new URLSearchParams({ val_id: String(valId), store_id: env('SSLCOMMERZ_STORE_ID'), store_passwd: env('SSLCOMMERZ_STORE_PASSWD'), format: 'json' });
  try {
    const r = await fetch(`${base()}/validator/api/validationserverAPI.php?${q}`, { signal: AbortSignal.timeout(15000) });
    return await r.json();
  } catch { return null; }
}

/** True when the gateway's answer proves this exact payment: paid, same transaction, full amount, in taka. */
const proves = (v, tranId, amount) => !!v && ['VALID', 'VALIDATED'].includes(String(v.status)) && String(v.tran_id) === String(tranId)
  && Number(v.amount) + 0.009 >= Number(amount) && String(v.currency_type || v.currency || 'BDT').toUpperCase() === 'BDT';

module.exports = { configured, sandbox, start, validate, proves, newTranId };
