const pool = require('../config/db');
const mail = require('./mailer');

/**
 * Tell every newsletter subscriber about something new (an event, notice, project...).
 * Fire-and-forget: it never blocks or fails the request that created the item.
 * Turn it off with NOTIFY_SUBSCRIBERS=false in .env.
 */
async function notifySubscribers(kind, item) {
  require('./push').announce(kind, item).catch(() => {}); // phone notifications (only when Firebase is set up); independent of e-mail
  if ((process.env.NOTIFY_SUBSCRIBERS || '').toLowerCase() === 'false' || !mail.provider()) return 0;
  try {
    if (item.summary && item.summary.length > 400) item = { ...item, summary: `${item.summary.slice(0, 400).trim()}…` };
    const { rows } = await pool.query('SELECT email FROM subscribers WHERE deleted_at IS NULL AND COALESCE(is_demo, false) = false');
    rows.forEach((r) => mail.sendMail({ to: r.email, ...mail.templates.announcement(r.email, kind, item) }));
    return rows.length;
  } catch (e) {
    console.warn('Subscriber notification failed:', e.message);
    return 0;
  }
}

module.exports = { notifySubscribers };
