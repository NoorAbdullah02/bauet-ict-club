// Phone notifications (push) through Firebase Cloud Messaging (free). No extra package: Node's crypto and fetch only.
// Needs FIREBASE_SERVICE_ACCOUNT in the environment (the service-account .json from Firebase, pasted as it is or as base64).
// Without it everything here quietly does nothing, so the site works the same.
const crypto = require('crypto');
const pool = require('../config/db');

let cached; // undefined = not read yet, null = not configured
function account() {
  if (cached !== undefined) return cached;
  try {
    const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
    if (!raw) { cached = null; return cached; }
    const j = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    if (!j.private_key || !j.client_email || !j.project_id) throw new Error('missing private_key, client_email or project_id');
    j.private_key = String(j.private_key).replace(/\\n/g, '\n');
    cached = j;
  } catch (e) {
    console.warn('Push notifications are off: FIREBASE_SERVICE_ACCOUNT is not valid (' + e.message + ')');
    cached = null;
  }
  return cached;
}
const enabled = () => !!account() && (process.env.PUSH_ENABLED || '').toLowerCase() !== 'false';

const b64u = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
/** The signed request (JWT) Google wants in exchange for a short-lived access token. */
function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key);
  return `${head}.${claim}.${b64u(sig)}`;
}

let tok = { v: null, exp: 0 };
async function accessToken() {
  if (tok.v && tok.exp > Date.now() + 60000) return tok.v;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(account()) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in for push failed (${r.status})`);
  tok = { v: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3000) * 1000 };
  return tok.v;
}

/** Sends one message. Returns 'ok', 'gone' (this phone no longer has the app: forget its token) or 'error'. */
async function sendOne(token, { title, body, data }) {
  const sa = account();
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title, body }, data, android: { priority: 'HIGH', notification: { channel_id: 'club_news' } } } }),
  });
  if (r.ok) return 'ok';
  const j = await r.json().catch(() => ({}));
  const code = j?.error?.details?.find?.((d) => d.errorCode)?.errorCode || j?.error?.status || '';
  if (r.status === 404 || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') return 'gone';
  console.warn(`Push send failed (${r.status} ${code})`);
  return 'error';
}

const clip = (s, n) => (String(s || '').length > n ? `${String(s).slice(0, n - 1).trim()}…` : String(s || ''));

/** Sends the same message to every phone that has the app and allowed notifications. Never throws. Returns how many were sent. */
async function broadcast({ title, body, path = '/' }) {
  if (!enabled()) return 0;
  try {
    const { rows } = await pool.query('SELECT id, token FROM push_tokens');
    let sent = 0; const gone = [];
    const msg = { title: clip(title, 80), body: clip(body, 160), data: { path: String(path) } };
    for (let i = 0; i < rows.length; i += 10) {
      await Promise.all(rows.slice(i, i + 10).map(async (r) => {
        try { const s = await sendOne(r.token, msg); if (s === 'ok') sent += 1; else if (s === 'gone') gone.push(r.id); } catch (e) { console.warn('Push send failed:', e.message); }
      }));
    }
    if (gone.length) await pool.query('DELETE FROM push_tokens WHERE id = ANY($1::int[])', [gone]);
    if (rows.length) console.log(`Push "${msg.title}": ${sent} sent, ${gone.length} removed of ${rows.length}`);
    return sent;
  } catch (e) {
    console.warn('Push broadcast failed:', e.message);
    return 0;
  }
}

const LABEL = { event: 'New event', notice: 'New notice', project: 'New project' };
/** Called when the club adds an event, notice or project (same moment the newsletter goes out). */
const announce = (kind, item) => broadcast({ title: `${LABEL[kind] || 'News from BAUET ICT Club'}: ${item.title || ''}`.trim(), body: item.when || item.summary || 'Tap to read more.', path: item.path || '/' });

module.exports = { enabled, signJwt, broadcast, announce };
