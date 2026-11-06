const pool = require('../config/db');
const mail = require('./mailer');

const siteUrl = () => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * Emails the feedback form link of an event to the people who came (checked in); when nobody was checked in,
 * to everyone with a confirmed place. Sent once per event (feedback_sent_at). Returns { sent, reason? }.
 */
async function sendFeedback(ev) {
  const slug = ev.reg_form?.feedback_form;
  if (!slug) return { sent: 0, reason: 'This event has no feedback form chosen.' };
  if (!mail.provider()) return { sent: 0, reason: 'Email is not set up.' };
  const form = (await pool.query('SELECT title FROM forms WHERE slug = $1 AND deleted_at IS NULL', [slug])).rows[0];
  if (!form) return { sent: 0, reason: 'The chosen feedback form no longer exists.' };
  const all = (await pool.query("SELECT * FROM event_registrations WHERE event_id = $1 AND deleted_at IS NULL AND email IS NOT NULL AND COALESCE(pay_status, 'none') <> 'rejected' AND NOT COALESCE(waitlisted, FALSE)", [ev.id])).rows;
  const came = all.filter((r) => r.checked_in_at);
  const to = came.length ? came : all;
  const url = `${siteUrl()}/f/${slug}`;
  to.forEach((r) => mail.sendMail({ to: r.email, ...mail.templates.eventFeedback(r, ev, url) }));
  await pool.query('UPDATE events SET feedback_sent_at = NOW() WHERE id = $1', [ev.id]);
  return { sent: to.length };
}

module.exports = { sendFeedback };
