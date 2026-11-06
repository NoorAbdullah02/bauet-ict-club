const pool = require('../config/db');
const mail = require('./mailer');

const iso = (d) => d.toISOString().slice(0, 10);

/** Old visits are deleted after ANALYTICS_RETENTION_DAYS (default 180) so IP addresses are not kept forever. */
async function purge() {
  const days = Math.max(7, Number(process.env.ANALYTICS_RETENTION_DAYS) || 180);
  try { await pool.query("DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '180 days'"); } catch { /* table may not exist yet */ }
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

/** The day before an event, everyone who is registered (and not rejected) gets a reminder with their ticket link. Sent once per event. */
async function reminders() {
  if (!mail.provider() || (process.env.EVENT_REMINDERS || '').toLowerCase() === 'false') return;
  try {
    const { formalDate, formalTime } = require('./format');
    const tomorrow = iso(new Date(Date.now() + 6 * 3600e3 + 864e5)); // Bangladesh is UTC+6
    const events = (await pool.query('SELECT * FROM events WHERE deleted_at IS NULL AND reminded_at IS NULL AND COALESCE(reg_open, true) = true')).rows
      .filter((e) => String(e.date instanceof Date ? e.date.toISOString() : e.date).slice(0, 10) === tomorrow);
    for (const ev of events) {
      const regs = (await pool.query("SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND email IS NOT NULL AND ticket IS NOT NULL AND COALESCE(pay_status, 'none') NOT IN ('rejected', 'pending') AND NOT COALESCE(waitlisted, FALSE)", [ev.id])).rows;
      regs.forEach((r) => mail.sendMail({ to: r.email, ...mail.templates.eventReminder(r, ev, formalDate, formalTime) }));
      await pool.query('UPDATE events SET reminded_at = NOW() WHERE id = $1', [ev.id]);
    }
  } catch (e) { console.warn('Event reminders failed:', e.message); }
}

/** The day after an event, people who came get the feedback form link (once per event; needs a feedback form chosen on the event). */
async function feedbackRequests() {
  if (!mail.provider()) return;
  try {
    const { sendFeedback } = require('./feedback');
    const today = iso(new Date(Date.now() + 6 * 3600e3)); // Bangladesh is UTC+6
    const events = (await pool.query('SELECT * FROM events WHERE deleted_at IS NULL AND feedback_sent_at IS NULL')).rows
      .filter((e) => e.reg_form?.feedback_form && String(e.date instanceof Date ? e.date.toISOString() : e.date).slice(0, 10) < today);
    for (const ev of events) await sendFeedback(ev);
  } catch (e) { console.warn('Feedback requests failed:', e.message); }
}

function start() {
  const tick = () => { purge(); weeklyDigest(); reminders(); feedbackRequests(); require('../routes/pay').expireStale(); };
  setInterval(() => require('../routes/pay').expireStale(), 10 * 60 * 1000).unref?.(); // unfinished online payments free their seat after 30 minutes
  setTimeout(tick, 60 * 1000).unref?.();
  setInterval(tick, 6 * 60 * 60 * 1000).unref?.();
}

module.exports = { start, purge, weeklyDigest, reminders, feedbackRequests };
