const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');

const router = express.Router();

const BOT = /bot|crawl|spider|slurp|preview|curl|wget|python|monitor|headless|lighthouse|facebookexternalhit|embedly|pingdom|uptime/i;
const device = (ua = '') => (/ipad|tablet/i.test(ua) ? 'Tablet' : /mobi|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop');
const cleanIp = (ip = '') => String(ip).replace(/^::ffff:/, '').slice(0, 64) || 'unknown';
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 864e5));

// Monday of the week a date falls in (weeks run Monday to Sunday)
const weekStart = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
};

/** Public: the website calls this on every page it shows. Never fails the visitor; ignores the admin area. */
router.post('/hit', rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }), async (req, res) => {
  res.status(204).end();
  try {
    const path = String(req.body?.path || '/').split('?')[0].slice(0, 200);
    if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return;
    const ua = String(req.get('user-agent') || '').slice(0, 300);
    const ip = cleanIp(req.ip);
    // the same visitor refreshing the same page within half a minute counts once
    const recent = await pool.query("SELECT 1 FROM page_views WHERE ip = $1 AND path = $2 AND created_at > NOW() - INTERVAL '30 seconds' LIMIT 1", [ip, path]);
    if (recent.rows.length) return;
    let referrer = String(req.body?.referrer || '').slice(0, 200);
    try { const u = new URL(referrer); referrer = u.host === req.get('host') ? '' : u.host; } catch { referrer = ''; }
    await pool.query('INSERT INTO page_views (ip, path, referrer, user_agent, device, is_bot, day) VALUES ($1,$2,$3,$4,$5,$6,$7)', [ip, path, referrer || null, ua, device(ua), BOT.test(ua), iso(new Date())]);
  } catch (e) {
    console.warn('Visit not recorded:', e.message);
  }
});

router.use(authMiddleware);

const REAL = 'NOT is_bot';

/** Everything the admin Visitors page needs in one call. ?weeks=8 */
router.get('/summary', async (req, res) => {
  try {
    const weeks = Math.min(26, Math.max(1, Number(req.query.weeks) || 8));
    const from = daysAgo(weeks * 7 + 7);
    const { rows } = await pool.query(`SELECT day, ip, path, referrer, device FROM page_views WHERE ${REAL} AND day >= $1`, [from]);
    const dayKey = (r) => (r.day instanceof Date ? iso(r.day) : String(r.day).slice(0, 10)); // real Postgres returns 'YYYY-MM-DD', test databases a Date

    const byDay = {};
    rows.forEach((r) => {
      const k = dayKey(r);
      const d = (byDay[k] ||= { views: 0, ips: new Set() });
      d.views += 1; d.ips.add(r.ip);
    });
    const days = Array.from({ length: 14 }, (_, i) => { const k = daysAgo(13 - i); return { day: k, views: byDay[k]?.views || 0, visitors: byDay[k]?.ips.size || 0 }; });

    const byWeek = {};
    rows.forEach((r) => {
      const w = (byWeek[weekStart(dayKey(r))] ||= { views: 0, ips: new Set() });
      w.views += 1; w.ips.add(r.ip);
    });
    const thisWeek = weekStart(iso(new Date()));
    const weekly = Array.from({ length: weeks }, (_, i) => {
      const d = new Date(`${thisWeek}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 7 * (weeks - 1 - i));
      const k = iso(d);
      return { weekStart: k, views: byWeek[k]?.views || 0, visitors: byWeek[k]?.ips.size || 0 };
    });

    const tally = (key, n = 8) => Object.entries(rows.reduce((m, r) => { const v = r[key] || (key === 'referrer' ? 'Direct' : ''); if (v) m[v] = (m[v] || 0) + 1; return m; }, {}))
      .sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, views]) => ({ name, views }));

    const today = days[days.length - 1];
    const total = await pool.query(`SELECT COUNT(*) AS c FROM page_views WHERE ${REAL}`);
    res.json({
      today, yesterday: days[days.length - 2],
      thisWeek: weekly[weekly.length - 1], lastWeek: weekly[weekly.length - 2] || { views: 0, visitors: 0 },
      allTimeViews: Number(total.rows[0].c), days, weekly,
      topPages: tally('path'), devices: tally('device', 3), referrers: tally('referrer'),
    });
  } catch (e) { fail(res, e); }
});

/** Every visitor IP with how often they came. ?days=7 (1 to 180) &q=ip-or-page */
router.get('/visitors', async (req, res) => {
  try {
    const days = Math.min(180, Math.max(1, Number(req.query.days) || 7));
    const q = String(req.query.q || '').trim().toLowerCase();
    const { rows } = await pool.query(`SELECT ip, path, device, referrer, created_at FROM page_views WHERE ${REAL} AND day >= $1 ORDER BY created_at DESC LIMIT 20000`, [daysAgo(days - 1)]);
    const map = new Map();
    rows.forEach((r) => {
      const v = map.get(r.ip) || { ip: r.ip, views: 0, device: r.device, lastSeen: r.created_at, firstSeen: r.created_at, pages: {}, referrer: r.referrer || '' };
      v.views += 1; v.firstSeen = r.created_at; v.pages[r.path] = (v.pages[r.path] || 0) + 1;
      map.set(r.ip, v);
    });
    let list = [...map.values()].map((v) => ({ ip: v.ip, views: v.views, device: v.device, firstSeen: v.firstSeen, lastSeen: v.lastSeen, referrer: v.referrer, topPage: Object.entries(v.pages).sort((a, b) => b[1] - a[1])[0][0] }));
    if (q) list = list.filter((v) => v.ip.toLowerCase().includes(q) || v.topPage.toLowerCase().includes(q));
    list.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    res.json({ days, count: list.length, visitors: list.slice(0, 500) });
  } catch (e) { fail(res, e); }
});

/** All raw visits as CSV (admin only). ?days=30 */
router.get('/export.csv', async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const { rows } = await pool.query(`SELECT created_at, ip, path, device, referrer FROM page_views WHERE ${REAL} AND day >= $1 ORDER BY created_at DESC LIMIT 50000`, [daysAgo(days - 1)]);
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="visitors-${iso(new Date())}.csv"`, 'Cache-Control': 'no-store' });
    res.send(['time,ip,page,device,referrer', ...rows.map((r) => [new Date(r.created_at).toISOString(), r.ip, r.path, r.device, r.referrer].map(cell).join(','))].join('\n'));
  } catch (e) { fail(res, e); }
});

module.exports = router;
