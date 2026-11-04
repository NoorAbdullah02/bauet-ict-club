const pool = require('../config/db');
const mail = require('./mailer');

const iso = (d) => d.toISOString().slice(0, 10);

/** Old visits are deleted after ANALYTICS_RETENTION_DAYS (default 180) so IP addresses are not kept forever. */
async function purge() {
  const days = Math.max(7, Number(process.env.ANALYTICS_RETENTION_DAYS) || 180);
  try { await pool.query('DELETE FROM page_views WHERE day < $1', [iso(new Date(Date.now() - days * 864e5))]); } catch (e) { console.warn('Visit cleanup failed:', e.message); }
}

/** Every Monday the admin gets last week's numbers by email (needs email set up). Sent once per week. */
async function weeklyDigest() {
  if (!mail.provider()) return;
  const now = new Date();
  if (now.getUTCDay() !== 1) return; // Monday
  const key = `digest-${iso(now)}`;
  try {
    const done = await pool.query("SELECT 1 FROM settings WHERE key = 'analytics_digest' AND value->>'last' = $1", [key]);
    if (done.rows.length) return;
    const start = iso(new Date(now.getTime() - 7 * 864e5));
    const end = iso(new Date(now.getTime() - 864e5));
    const { rows } = await pool.query('SELECT ip, path, day FROM page_views WHERE NOT is_bot AND day >= $1 AND day <= $2', [start, end]);
    const ips = new Set(rows.map((r) => r.ip));
    const pages = Object.entries(rows.reduce((m, r) => { m[r.path] = (m[r.path] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const body = `<p>Your website last week (${start} to ${end}):</p><p><b>${ips.size}</b> visitors · <b>${rows.length}</b> page views</p>${pages.length ? `<p>Most viewed:<br>${pages.map(([p, n]) => `${mail.esc(p)} (${n})`).join('<br>')}</p>` : ''}`;
    mail.sendMail({ to: mail.adminAddress(), subject: `Weekly visitors: ${ips.size} visitors, ${rows.length} views`, html: mail.layout({ title: 'Weekly visitor report', body }), text: `Last week: ${ips.size} visitors, ${rows.length} page views.` });
    await pool.query("INSERT INTO settings (key, value) VALUES ('analytics_digest', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify({ last: key })]);
  } catch (e) { console.warn('Weekly digest failed:', e.message); }
}

function start() {
  const tick = () => { purge(); weeklyDigest(); };
  setTimeout(tick, 60 * 1000).unref?.();
  setInterval(tick, 6 * 60 * 60 * 1000).unref?.();
}

module.exports = { start, purge, weeklyDigest };
