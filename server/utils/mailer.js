// Email for the club: SMTP (e.g. a Gmail app password) first, Brevo API as an alternative, silently skipped when neither is set up.
// Sending never throws and never blocks a request: mails go through a small in-process queue with one retry.
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/auth');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const env = (k) => (process.env[k] || '').trim();

const provider = () => (env('SMTP_USER') && env('SMTP_PASS') ? 'smtp' : env('BREVO_API_KEY') ? 'brevo' : null);
const fromAddress = () => env('MAIL_FROM') || env('SMTP_USER') || 'ictclubbauet@gmail.com';
const adminAddress = () => env('ADMIN_NOTIFY_EMAIL') || env('SMTP_USER') || 'ictclubbauet@gmail.com';
const siteUrl = () => (env('PUBLIC_URL') || 'http://localhost:5173').replace(/\/$/, '');

let smtp = null;
function smtpTransport() {
  if (smtp) return smtp;
  const nodemailer = require('nodemailer');
  const port = Number(env('SMTP_PORT')) || 465;
  smtp = nodemailer.createTransport({
    host: env('SMTP_HOST') || 'smtp.gmail.com', port, secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
    pool: true, maxConnections: 2, connectionTimeout: 15000, socketTimeout: 20000,
  });
  return smtp;
}

const state = { sent: 0, failed: 0, lastError: null, lastSentAt: null };

async function deliver({ to, subject, html, text, replyTo, attachments }) {
  const name = 'BAUET ICT Club';
  if (provider() === 'smtp') {
    await smtpTransport().sendMail({ from: `"${name}" <${fromAddress()}>`, to, subject, html, text, replyTo, attachments });
  } else if (provider() === 'brevo') {
    const brevo = require('@getbrevo/brevo');
    const api = new brevo.TransactionalEmailsApi();
    api.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, env('BREVO_API_KEY'));
    await api.sendTransacEmail({ to: [{ email: to }], sender: { email: fromAddress(), name }, subject, htmlContent: html, textContent: text, ...(attachments?.length ? { attachment: attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') })) } : {}), ...(replyTo ? { replyTo: { email: replyTo } } : {}) });
  }
}

// sequential queue: gentle on Gmail limits, and one slow mail never delays an API response
const queue = [];
let running = false;
async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await deliver(job.mail);
      state.sent += 1; state.lastSentAt = new Date().toISOString();
    } catch (e) {
      if (job.tries < 1) { job.tries += 1; queue.push(job); await new Promise((r) => setTimeout(r, 3000)); }
      else { state.failed += 1; state.lastError = e.message; console.warn(`Email to ${job.mail.to} failed:`, e.message); }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  running = false;
}

/** Queue a mail. Returns false (and does nothing) when email is not configured or the address looks wrong. */
function sendMail(mail) {
  if (!provider() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.to || '')) return false;
  queue.push({ mail, tries: 0 });
  pump();
  return true;
}

/** Same as sendMail but waits for the result; used by the admin "send test email" button. */
async function sendNow(mail) {
  if (!provider()) throw new Error('Email is not configured. Set SMTP_USER and SMTP_PASS in .env.');
  await deliver(mail);
  state.sent += 1; state.lastSentAt = new Date().toISOString();
}

const status = () => ({ configured: !!provider(), provider: provider(), from: provider() ? fromAddress() : null, adminNotify: provider() ? adminAddress() : null, queued: queue.length, ...state });

// ---------- unsubscribe links (signed, no database lookup needed) ----------
const sign = (email) => crypto.createHmac('sha256', JWT_SECRET).update(`unsub:${email}`).digest('hex').slice(0, 32);
const unsubscribeUrl = (email) => `${siteUrl()}/api/subscribers/unsubscribe?e=${encodeURIComponent(email)}&t=${sign(email)}`;
const validUnsubscribe = (email, token) => { try { return crypto.timingSafeEqual(Buffer.from(sign(email)), Buffer.from(String(token))); } catch { return false; } };

// ---------- branded layout ----------
function layout({ title, body, button, footerNote }) {
  return `<!doctype html><html><body style="margin:0;background:#EEF3FF;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif;color:#0A1A3F">
  <table role="presentation" width="100%" style="max-width:560px;margin:auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #D5E1F5">
    <tr><td style="background:linear-gradient(120deg,#0A1A4A,#1F4FD8);padding:22px 28px;color:#fff">
      <div style="font:600 12px monospace;letter-spacing:2px;opacity:.75">// BAUET ICT CLUB</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">${esc(title)}</div></td></tr>
    <tr><td style="padding:26px 28px;font-size:15px;line-height:1.7">${body}
      ${button ? `<p style="margin:26px 0 4px"><a href="${esc(button.href)}" style="background:#1F4FD8;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:600;display:inline-block">${esc(button.label)}</a></p>` : ''}</td></tr>
    <tr><td style="padding:16px 28px;background:#F5F8FF;color:#7B8AAB;font-size:12px;line-height:1.6">${footerNote || 'BAUET ICT Club · Bangladesh Army University of Engineering &amp; Technology, Rajshahi'}<br>ictclubbauet@gmail.com · 01707-533471</td></tr>
  </table></body></html>`;
}

const typeLabel = (r) => (r.type === 'committee' ? `Committee application (${r.post})` : r.type === 'ambassador' ? 'Department Ambassador application' : 'General membership application');

const templates = {
  applicationReceived: (r) => ({
    subject: 'We received your application | BAUET ICT Club',
    html: layout({ title: `Thanks, ${r.full_name}!`, body: `<p>We have received your <b>${esc(typeLabel(r))}</b>.</p><p>Our team reviews every application. We will email you here as soon as there is news.</p>`, button: { href: `${siteUrl()}/events`, label: 'See upcoming events' } }),
    text: `Hi ${r.full_name}, we received your ${typeLabel(r)}. We will email you when it is reviewed.`,
  }),
  applicationSelected: (r, position, session) => ({
    subject: `Congratulations! You are selected | BAUET ICT Club`,
    html: layout({ title: 'You are selected 🎉', body: `<p>Dear ${esc(r.full_name)},</p><p>We are happy to tell you that you have been selected as <b>${esc(position)}</b> for the <b>${esc(session)}</b> session.</p><p>Your photo and post are now published on our Team page. Welcome to the team!</p>`, button: { href: `${siteUrl()}/team`, label: 'See the team page' } }),
    text: `Congratulations ${r.full_name}! You are selected as ${position} for ${session}.`,
  }),
  applicationRejected: (r) => ({
    subject: 'About your application | BAUET ICT Club',
    html: layout({ title: 'Thank you for applying', body: `<p>Dear ${esc(r.full_name)},</p><p>Thank you for your interest in the club. We could not offer you a place this time, but we would love to see you at our events and to hear from you again next session.</p>`, button: { href: `${siteUrl()}/events`, label: 'Join our next event' } }),
    text: `Dear ${r.full_name}, thank you for applying. We could not offer a place this time, please try again next session.`,
  }),
  contactAck: (m) => ({
    subject: 'We got your message | BAUET ICT Club',
    html: layout({ title: 'Message received', body: `<p>Hi ${esc(m.name)}, thanks for writing to us. We will reply to this email address soon.</p><p style="color:#41527A;border-left:3px solid #1F4FD8;padding-left:12px">${esc(m.message).slice(0, 400)}</p>` }),
    text: `Hi ${m.name}, thanks for your message. We will reply soon.`,
  }),
  adminNewApplication: (r) => ({
    subject: `New application: ${r.full_name} (${typeLabel(r)})`,
    html: layout({ title: 'New application', body: `<p><b>${esc(r.full_name)}</b> applied.</p><p>${esc(typeLabel(r))}<br>Student ID: ${esc(r.student_id)} · Batch ${esc(r.batch)} · ${esc(r.department)}<br>${esc(r.email)} · ${esc(r.phone)}</p>`, button: { href: `${siteUrl()}/admin/applications`, label: 'Review in admin' } }),
    text: `New application from ${r.full_name} (${typeLabel(r)}). Review: ${siteUrl()}/admin/applications`,
  }),
  adminNewMessage: (m) => ({
    subject: `Contact form: ${m.subject || m.name}`,
    html: layout({ title: 'New contact message', body: `<p><b>${esc(m.name)}</b> &lt;${esc(m.email)}&gt;</p><p><b>${esc(m.subject || 'No subject')}</b></p><p>${esc(m.message).replace(/\n/g, '<br>')}</p>`, button: { href: `${siteUrl()}/admin/messages`, label: 'Open inbox' } }),
    text: `${m.name} <${m.email}>: ${m.message}`,
    replyTo: m.email,
  }),
  subscribeWelcome: (email) => ({
    subject: 'Welcome to BAUET ICT Club news',
    html: layout({ title: 'You are subscribed', body: '<p>Thanks for subscribing. You will hear about workshops, hackathons, contests and notices.</p>', button: { href: `${siteUrl()}/events`, label: 'See upcoming events' }, footerNote: `Not you? <a href="${esc(unsubscribeUrl(email))}" style="color:#1F4FD8">Unsubscribe</a>` }),
    text: `You are subscribed to BAUET ICT Club news. Unsubscribe: ${unsubscribeUrl(email)}`,
  }),
  announcement: (email, kind, item) => ({
    subject: `New ${kind}: ${item.title}`,
    html: layout({
      title: item.title,
      body: `<p style="color:#5B6B8C;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 8px">New ${esc(kind)}</p>${item.when ? `<p><b>${esc(item.when)}</b></p>` : ''}${item.summary ? `<p>${esc(item.summary).replace(/\n/g, '<br>')}</p>` : ''}`,
      button: { href: `${siteUrl()}${item.path || '/'}`, label: 'Open on the website' },
      footerNote: `You get this because you subscribed on our website. <a href="${esc(unsubscribeUrl(email))}" style="color:#1F4FD8">Unsubscribe</a>`,
    }),
    text: `New ${kind}: ${item.title}\n${item.when || ''}\n${item.summary || ''}\n${siteUrl()}${item.path || '/'}\n\nUnsubscribe: ${unsubscribeUrl(email)}`,
  }),
  newsletter: (email, subject, message) => ({
    subject,
    html: layout({ title: subject, body: esc(message).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''), footerNote: `You get this because you subscribed on our website. <a href="${esc(unsubscribeUrl(email))}" style="color:#1F4FD8">Unsubscribe</a>` }),
    text: `${message}\n\nUnsubscribe: ${unsubscribeUrl(email)}`,
  }),
};

module.exports = { sendMail, sendNow, status, templates, adminAddress, esc, unsubscribeUrl, validUnsubscribe, layout, provider };
