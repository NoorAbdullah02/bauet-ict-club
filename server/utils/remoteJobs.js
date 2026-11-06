const pool = require('../config/db');

/**
 * Remote jobs from two free public feeds: Remotive and Remote OK.
 * Their terms: show where a job comes from and link back to THEIR page (a normal link, no nofollow). Remotive asks for at most
 * about 4 requests a day, so the feeds are read every 6 hours and the result is kept in our database.
 * A job that is no longer in its feed disappears from the list after 3 days; edited jobs are updated at the next refresh.
 */
const REFRESH_MS = 6 * 3600e3;
const HIDE_AFTER_MS = 3 * 864e5; // not seen in a feed for this long: leave the list
const FORGET_AFTER_MS = 30 * 864e5;
const UA = 'BAUET-ICT-Club-JobBoard/1.0 (+https://bauet-ict-club.onrender.com)';
const enabled = () => String(process.env.REMOTE_JOBS || 'on').toLowerCase() !== 'off';
const sources = () => ({
  remotive: process.env.REMOTIVE_URL || 'https://remotive.com/api/remote-jobs?limit=150',
  remoteok: process.env.REMOTEOK_URL || 'https://remoteok.com/api',
});

const text = (html, n) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const https = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : null; } catch { return null; } };
const tagsOf = (t) => (Array.isArray(t) ? t : []).map((x) => String(x).toLowerCase().slice(0, 30)).filter(Boolean).slice(0, 8);
const money = (min, max) => { const f = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`); const a = Number(min), b = Number(max); return a > 0 && b > 0 ? `${f(a)} to ${f(b)} a year` : a > 0 ? `from ${f(a)} a year` : null; };

async function getJson(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

function fromRemotive(d) {
  return (Array.isArray(d?.jobs) ? d.jobs : []).map((j) => ({
    source: 'remotive', ext_id: String(j.id), title: text(j.title, 200), company: text(j.company_name, 120), kind: ({ full_time: 'Job', contract: 'Freelance', part_time: 'Part-time', freelance: 'Freelance', internship: 'Internship' })[String(j.job_type || '').toLowerCase()] || 'Job',
    location: text(j.candidate_required_location, 120) || 'Worldwide', salary: text(j.salary, 80) || null, url: https(j.url), logo: https(j.company_logo_url || j.company_logo),
    tags: tagsOf(Array.isArray(j.tags) ? j.tags : [j.category]), summary: text(j.description, 280), published_at: j.publication_date ? new Date(`${String(j.publication_date).replace(/Z?$/, 'Z')}`) : null,
  }));
}
function fromRemoteOk(d) {
  return (Array.isArray(d) ? d : []).filter((j) => j && j.id && j.position).map((j) => ({
    source: 'remoteok', ext_id: String(j.id), title: text(j.position, 200), company: text(j.company, 120), kind: 'Job',
    location: text(j.location, 120) || 'Worldwide', salary: money(j.salary_min, j.salary_max), url: https(j.url || j.apply_url), logo: https(j.logo || j.company_logo),
    tags: tagsOf(j.tags), summary: text(j.description, 280), published_at: j.date ? new Date(j.date) : (j.epoch ? new Date(Number(j.epoch) * 1000) : null),
  }));
}

let last = 0, running = false, lastResult = null, everRead = false;
/** Reads both feeds and updates the table. A feed that fails keeps its old jobs. */
let inflight = null;
function refresh() {
  if (!enabled()) return Promise.resolve(lastResult);
  if (inflight) return inflight; // callers share one read
  inflight = doRefresh().finally(() => { inflight = null; });
  return inflight;
}
async function doRefresh() {
  running = true;
  const result = { at: new Date().toISOString(), remotive: null, remoteok: null };
  try {
    const src = sources();
    for (const [name, conv] of [['remotive', fromRemotive], ['remoteok', fromRemoteOk]]) {
      try {
        const rows = conv(await getJson(src[name])).filter((j) => j.title && j.url && j.ext_id).slice(0, 200);
        for (const j of rows) {
          await pool.query(
            `INSERT INTO remote_jobs (source, ext_id, title, company, kind, location, salary, url, logo, tags, summary, published_at, seen_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())
             ON CONFLICT (source, ext_id) DO UPDATE SET title = EXCLUDED.title, company = EXCLUDED.company, kind = EXCLUDED.kind, location = EXCLUDED.location, salary = EXCLUDED.salary,
               url = EXCLUDED.url, logo = EXCLUDED.logo, tags = EXCLUDED.tags, summary = EXCLUDED.summary, published_at = COALESCE(EXCLUDED.published_at, remote_jobs.published_at), seen_at = NOW()`,
            [j.source, j.ext_id, j.title, j.company, j.kind, j.location, j.salary, j.url, j.logo, JSON.stringify(j.tags), j.summary, j.published_at && !Number.isNaN(j.published_at.getTime()) ? j.published_at : null]);
        }
        result[name] = rows.length;
      } catch (e) { result[name] = `failed: ${e.message}`; console.warn(`remote jobs (${name}) could not be read:`, e.message); }
    }
    await pool.query('DELETE FROM remote_jobs WHERE seen_at < $1', [new Date(Date.now() - FORGET_AFTER_MS)]);
    last = (typeof result.remotive === 'number' || typeof result.remoteok === 'number') ? Date.now() : Date.now() - REFRESH_MS + 30 * 60 * 1000; // both feeds failed: try again in 30 minutes
  } catch (e) { console.warn('remote jobs refresh failed:', e.message); }
  running = false;
  everRead = true;
  lastResult = result;
  return result;
}
/** Public list calls this: refreshes in the background when the data is older than 6 hours. */
function maybeRefresh() { if (enabled() && !running && Date.now() - last > REFRESH_MS) { last = Date.now() - REFRESH_MS + 30 * 60 * 1000; refresh(); } }

async function list({ q = '', tag = '', open = false } = {}) {
  const { rows } = await pool.query(
    "SELECT id, source, title, company, kind, location, salary, url, logo, tags, summary, published_at FROM remote_jobs WHERE seen_at >= $1 ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 400",
    [new Date(Date.now() - HIDE_AFTER_MS)]);
  const needle = String(q).trim().toLowerCase().slice(0, 60);
  const t = String(tag).trim().toLowerCase().slice(0, 30);
  return rows.filter((r) => (!needle || `${r.title} ${r.company} ${r.location} ${(r.tags || []).join(' ')}`.toLowerCase().includes(needle))
    && (!t || (r.tags || []).includes(t))
    && (!open || /worldwide|anywhere|global|asia|bangladesh|apac|any/i.test(r.location || ''))).slice(0, 120);
}

module.exports = { refresh, maybeRefresh, list, enabled, everRead: () => everRead, fromRemotive, fromRemoteOk };
