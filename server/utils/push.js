// Phone notifications (push) through Firebase Cloud Messaging (free). No extra package: Node's crypto and fetch only.
// Needs FIREBASE_SERVICE_ACCOUNT in the environment (the service-account .json from Firebase, pasted as it is or as base64).
// Without it everything here quietly does nothing, so the site works the same.
const crypto = require('crypto');
const pool = require('../config/db');

let cached; // undefined = not read yet, null = not configured
let readProblem = '';

let lastParts = null; // which of the three needed parts were found in the pasted text (never the secrets themselves)

/** Pulls the three needed fields out of whatever was pasted: proper JSON, JSON that lost its line breaks, its quote marks or got curly quotes, quoted or base64 text. */
function parseAccount(raw) {
  let text = String(raw || '').trim();
  lastParts = null;
  if (!text) return null;
  if (!text.includes('{') && /^[A-Za-z0-9+/=\s]+$/.test(text)) { try { text = Buffer.from(text.replace(/\s+/g, ''), 'base64').toString('utf8'); } catch { /* not base64 */ } }
  text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/^﻿/, '');
  const tryJson = (t) => { try { let j = JSON.parse(t); if (typeof j === 'string') j = JSON.parse(j); return j && j.private_key && j.client_email && j.project_id ? j : null; } catch { return null; } };
  const direct = tryJson(text);
  if (direct) return direct;
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"') && !text.startsWith('{'))) text = text.slice(1, -1);
  const unquoted = tryJson(text);
  if (unquoted) return unquoted;
  // forgiving reader: find the three parts one by one, with or without quote marks
  const quoted = (name) => { const m = new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's').exec(text); return m ? m[1] : ''; };
  const bare = (name) => { const m = new RegExp(`${name}\\W{1,6}([A-Za-z0-9._@-]+)`).exec(text); return m ? m[1] : ''; };
  const asText = text.replace(/\\n/g, '\n');
  const key = (/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/.exec(asText) || [''])[0];
  const email = quoted('client_email') || (/[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.iam\.gserviceaccount\.com/.exec(text) || [''])[0];
  // the project name is also the middle of the e-mail: name@PROJECT.iam.gserviceaccount.com
  const project = quoted('project_id') || bare('project_id') || ((/@([a-z0-9-]+)\.iam\.gserviceaccount\.com/.exec(email) || [])[1] || '');
  if (key && email && project) return { project_id: project, client_email: email, private_key: key };
  lastParts = { project_id: !!project, client_email: !!email, private_key: !!key };
  return null;
}

/** A private key whose line breaks were turned into spaces, \\n text or nothing at all is rebuilt as a proper PEM block. */
function normalizePem(value) {
  const t = String(value || '').replace(/\\n/g, '\n');
  const m = /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/.exec(t);
  if (!m) return t.trim();
  const body = m[1].replace(/[^A-Za-z0-9+/=]/g, '');
  return `-----BEGIN PRIVATE KEY-----\n${(body.match(/.{1,64}/g) || []).join('\n')}\n-----END PRIVATE KEY-----`;
}

function account() {
  if (cached !== undefined) return cached;
  readProblem = '';
  try {
    let j = parseAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    // the three-variable way is the most paste-proof: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    if (!j && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      j = { project_id: process.env.FIREBASE_PROJECT_ID.trim(), client_email: process.env.FIREBASE_CLIENT_EMAIL.trim(), private_key: process.env.FIREBASE_PRIVATE_KEY };
    }
    if (!j) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const t = String(process.env.FIREBASE_SERVICE_ACCOUNT);
        const yn = (v) => (v ? 'found' : 'MISSING');
        const shape = (x) => String(x).replace(/[^\x20-\x7E]/g, '?');
        readProblem = `FIREBASE_SERVICE_ACCOUNT is set (${t.length} characters; the whole file is about 2400) but it cannot be read: project_id ${yn(lastParts?.project_id)}, client_email ${yn(lastParts?.client_email)}, private_key ${yn(lastParts?.private_key)}. The text starts with "${shape(t.slice(0, 10))}" and ends with "${shape(t.slice(-8))}"; it has ${(t.match(/"/g) || []).length} quote marks (a whole file has about 48) and ${(t.match(/\\n/g) || []).length} backslash-n marks (about 26).`;
      }
      cached = null; return cached;
    }
    j.private_key = normalizePem(j.private_key);
    if (!/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----$/.test(j.private_key)) throw new Error('the private_key is not a complete key (it must start with -----BEGIN PRIVATE KEY----- and end with -----END PRIVATE KEY-----)');
    crypto.createPrivateKey(j.private_key); // throws when the key text was damaged
    cached = j;
  } catch (e) {
    readProblem = `The Firebase key could not be used: ${e.message}`;
    console.warn(`Push notifications are off: ${readProblem}`);
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

let lastProblem = '';
let tok = { v: null, exp: 0 };
async function accessToken() {
  if (tok.v && tok.exp > Date.now() + 60000) return tok.v;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(account()) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google sign-in for push failed (${r.status}${j.error_description ? ': ' + j.error_description : ''})`);
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
  lastProblem = `Firebase answered ${r.status} ${code} ${j?.error?.message || ''}`.trim();
  console.warn(`Push send failed (${lastProblem})`);
  return 'error';
}

const clip = (s, n) => (String(s || '').length > n ? `${String(s).slice(0, n - 1).trim()}…` : String(s || ''));

/** What a person can switch on or off in the app (the notification topics). Urgent notices and messages written by an admin always go to everyone. */
const TOPICS = ['events', 'notices', 'jobs', 'contests', 'projects'];

/**
 * Sends one message to every phone that has the app and allowed notifications. Never throws. Returns how many were sent.
 *  - topic: only phones that kept this topic on (omit it, or use urgent, to reach everyone)
 *  - bn: the same message in Bangla, used for phones whose app language is Bangla
 */
async function broadcast({ title, body, path = '/', topic = null, urgent = false, bn = null }) {
  if (!enabled()) return 0;
  try {
    const sql = (!topic || urgent)
      ? 'SELECT id, token, lang FROM push_tokens'
      : "SELECT id, token, lang FROM push_tokens WHERE topics IS NULL OR (',' || topics || ',') LIKE $1";
    const { rows } = await pool.query(sql, (!topic || urgent) ? [] : [`%,${topic},%`]);
    let sent = 0; const gone = [];
    const en = { title: clip(title, 80), body: clip(body, 160) };
    const bangla = bn ? { title: clip(bn.title, 80), body: clip(bn.body, 160) } : en;
    for (let i = 0; i < rows.length; i += 10) {
      await Promise.all(rows.slice(i, i + 10).map(async (r) => {
        const m = r.lang === 'bn' ? bangla : en;
        try { const s = await sendOne(r.token, { ...m, data: { path: String(path) } }); if (s === 'ok') sent += 1; else if (s === 'gone') gone.push(r.id); } catch (e) { console.warn('Push send failed:', e.message); }
      }));
    }
    if (gone.length) await pool.query('DELETE FROM push_tokens WHERE id = ANY($1::int[])', [gone]);
    if (rows.length) console.log(`Push "${en.title}": ${sent} sent, ${gone.length} removed of ${rows.length}`);
    return sent;
  } catch (e) {
    console.warn('Push broadcast failed:', e.message);
    return 0;
  }
}

/** For the admin page: is the key read, how many phones, and (on request) a test message to all of them. */
async function status() {
  const out = { configured: !!account(), enabled: enabled(), project: account()?.project_id || null, phones: 0, problem: '' };
  try { out.phones = Number((await pool.query('SELECT COUNT(*)::int AS n FROM push_tokens')).rows[0].n) || 0; } catch { /* table may not exist yet */ }
  if (!out.configured) out.problem = readProblem || 'FIREBASE_SERVICE_ACCOUNT is not set in the server environment.';
  else if (!out.enabled) out.problem = 'PUSH_ENABLED=false turns notifications off.';
  return out;
}
async function test() {
  const out = await status();
  if (!out.enabled) return { ...out, sent: 0 };
  lastProblem = '';
  try { await accessToken(); } catch (e) { return { ...out, sent: 0, problem: e.message }; }
  const sent = await broadcast({ title: 'Test from BAUET ICT Club', body: 'If you can read this, phone notifications work.', path: '/' });
  return { ...out, sent, problem: sent === 0 && out.phones > 0 ? (lastProblem || 'No phone accepted the message.') : (out.phones === 0 ? 'No phone has registered yet: open the new app, allow notifications, then try again.' : '') };
}


const EN = { event: 'New event', notice: 'New notice', project: 'New project', job: 'New opening', contest: 'New contest' };
const BN = { event: 'নতুন ইভেন্ট', notice: 'নতুন নোটিশ', project: 'নতুন প্রজেক্ট', job: 'নতুন সুযোগ', contest: 'নতুন প্রতিযোগিতা' };
const TOPIC_OF = { event: 'events', notice: 'notices', project: 'projects', job: 'jobs', contest: 'contests' };

/** Called when the club adds an event, notice, project, job or contest. An urgent notice reaches everyone, even those who switched notices off. */
const announce = (kind, item) => {
  const urgent = kind === 'notice' && String(item.priority || '').toLowerCase() === 'urgent';
  const body = item.when || item.summary || 'Tap to read more.';
  return broadcast({
    title: `${urgent ? 'URGENT: ' : ''}${EN[kind] || 'News from BAUET ICT Club'}: ${item.title || ''}`.trim(), body,
    bn: { title: `${urgent ? 'জরুরি: ' : ''}${BN[kind] || 'ক্লাবের খবর'}: ${item.title || ''}`.trim(), body },
    path: item.path || '/', topic: TOPIC_OF[kind] || null, urgent,
  });
};

// ---------------- reminders (sent once each; they need a visit or the cron call to /api/jobs/run to be noticed) ----------------
const dayStr = (d) => d.toISOString().slice(0, 10);
const bdNow = () => new Date(Date.now() + 6 * 3600e3); // Bangladesh is UTC+6
let lastRemind = 0;

/** Day-before and morning-of reminders for events, and "days left" for contest deadlines. */
async function remindDue() {
  if (!enabled()) return 0;
  let n = 0;
  const once = async (key) => (await pool.query('INSERT INTO push_log (key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING key', [key])).rowCount > 0;
  try {
    const now = bdNow(); const today = dayStr(now); const tomorrow = dayStr(new Date(now.getTime() + 864e5)); const in2 = dayStr(new Date(now.getTime() + 2 * 864e5)); const hour = now.getUTCHours();
    const { formalTime } = require('./format');
    const events = (await pool.query("SELECT id, title, date, time, location FROM events WHERE deleted_at IS NULL AND COALESCE(is_draft, false) = false AND (publish_at IS NULL OR publish_at <= NOW())")).rows;
    for (const e of events) {
      const d = String(e.date instanceof Date ? e.date.toISOString() : e.date).slice(0, 10);
      const where = [e.time ? formalTime(e.time) : '', e.location].filter(Boolean).join(' · ');
      if (d === tomorrow && hour >= 17 && (await once(`ev-eve:${e.id}:${d}`))) { n += await broadcast({ title: `Tomorrow: ${e.title}`, body: where || 'Do not miss it.', bn: { title: `আগামীকাল: ${e.title}`, body: where || 'মিস করবেন না।' }, path: `/events/${e.id}`, topic: 'events' }); }
      if (d === today && hour >= 8 && hour < 20 && (await once(`ev-day:${e.id}:${d}`))) { n += await broadcast({ title: `Today: ${e.title}`, body: where || 'It is today.', bn: { title: `আজ: ${e.title}`, body: where || 'আজই।' }, path: `/events/${e.id}`, topic: 'events' }); }
    }
    const contests = (await pool.query("SELECT id, title, deadline FROM contests WHERE deleted_at IS NULL AND status = 'open' AND deadline IS NOT NULL")).rows;
    for (const c of contests) {
      const d = String(c.deadline instanceof Date ? c.deadline.toISOString() : c.deadline).slice(0, 10);
      if (d === in2 && hour >= 9 && (await once(`co-2:${c.id}:${d}`))) n += await broadcast({ title: `2 days left: ${c.title}`, body: 'Sign up before the deadline.', bn: { title: `আর ২ দিন: ${c.title}`, body: 'শেষ তারিখের আগে আবেদন করুন।' }, path: `/contests/${c.id}`, topic: 'contests' });
      if (d === today && hour >= 9 && hour < 20 && (await once(`co-0:${c.id}:${d}`))) n += await broadcast({ title: `Last day: ${c.title}`, body: 'The deadline is today.', bn: { title: `আজ শেষ দিন: ${c.title}`, body: 'আজই শেষ তারিখ।' }, path: `/contests/${c.id}`, topic: 'contests' });
    }
    await pool.query("DELETE FROM push_log WHERE at < NOW() - INTERVAL '60 days'");
  } catch (e) { console.warn('Push reminders failed:', e.message); }
  return n;
}
/** Cheap to call often (every public request): runs the reminder check at most every 10 minutes. */
function maybeRemind() { if (Date.now() - lastRemind > 10 * 60 * 1000) { lastRemind = Date.now(); remindDue().catch(() => {}); } }

module.exports = { enabled, signJwt, broadcast, announce, status, test, parseAccount, remindDue, maybeRemind, TOPICS };
