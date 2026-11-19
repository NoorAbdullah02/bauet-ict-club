// Email for the club: the Brevo API first (BREVO_API_KEY), SMTP (e.g. a Gmail app password) as the alternative, silently skipped when neither is set up.
// Sending never throws and never blocks a request: mails go through a small in-process queue with one retry.
const crypto = require('crypto');
const { JWT_SECRET } = require('../middleware/auth');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const env = (k) => (process.env[k] || '').trim();

const provider = () => (env('BREVO_API_KEY') ? 'brevo' : env('SMTP_USER') && env('SMTP_PASS') ? 'smtp' : null);
const brevoBase = () => (env('BREVO_API_BASE') || 'https://api.brevo.com').replace(/\/$/, '');
const fromAddress = () => env('MAIL_FROM') || env('SMTP_USER') || 'ictclubbauet@gmail.com';
const adminAddress = () => env('ADMIN_NOTIFY_EMAIL') || env('SMTP_USER') || 'ictclubbauet@gmail.com';
// the public address used in email links: PUBLIC_URL, else the address Render gives the service, else local
const siteUrl = () => (env('PUBLIC_URL') || env('RENDER_EXTERNAL_URL') || 'http://localhost:5173').replace(/\/$/, '');

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
  if (typeof attachments === 'function') attachments = await attachments(); // built now, not when queued
  if (provider() === 'smtp') {
    await smtpTransport().sendMail({ from: `"${name}" <${fromAddress()}>`, to, subject, html, text, replyTo, attachments });
  } else if (provider() === 'brevo') {
    // Brevo transactional API (https://developers.brevo.com/reference/sendtransacemail); the sender must be verified in Brevo
    const body = {
      sender: { email: fromAddress(), name }, to: [{ email: to }], subject, htmlContent: html, textContent: text,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      ...(attachments?.length ? { attachment: attachments.map((a) => ({ name: a.filename, content: Buffer.from(a.content).toString('base64') })) } : {}),
    };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(`${brevoBase()}/v3/smtp/email`, { method: 'POST', headers: { 'api-key': env('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(`Brevo ${res.status}: ${j.message || res.statusText}`);
      }
    } finally { clearTimeout(timer); }
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
  if (/@(example\.(com|org|net)|test\.local|localhost)$/i.test(mail.to)) return false; // reserved sample addresses (demo data) are never mailed
  queue.push({ mail, tries: 0 });
  pump();
  return true;
}

/** Same as sendMail but waits for the result; used by the admin "send test email" button. */
async function sendNow(mail) {
  if (!provider()) throw new Error('Email is not configured. Set BREVO_API_KEY and MAIL_FROM in .env.');
  await deliver(mail);
  state.sent += 1; state.lastSentAt = new Date().toISOString();
}

/** Asks Brevo whether the API key works (cached for a minute). Resolves { ok, email?, error? }. */
let verified = { at: 0, value: null };
async function verify() {
  if (provider() !== 'brevo') return null;
  if (verified.value && Date.now() - verified.at < 60000) return verified.value;
  let value;
  try {
    const res = await fetch(`${brevoBase()}/v3/account`, { headers: { 'api-key': env('BREVO_API_KEY'), accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    const j = await res.json().catch(() => ({}));
    value = res.ok ? { ok: true, account: j.email || j.companyName || 'connected', senderSet: !!env('MAIL_FROM') } : { ok: false, error: `Brevo ${res.status}: ${j.message || 'key rejected'}` };
  } catch (e) { value = { ok: false, error: `Could not reach Brevo: ${e.message}` }; }
  verified = { at: Date.now(), value };
  return value;
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
    <tr><td style="padding:16px 28px;background:#F5F8FF;color:#7B8AAB;font-size:12px;line-height:1.6">${footerNote || 'BAUET ICT Club · Bangladesh Army University of Engineering &amp; Technology, Rajshahi'}<br>ictclubbauet@gmail.com · 01748-269350</td></tr>
  </table></body></html>`;
}

const typeLabel = (r) => (r.type === 'committee' ? `Committee application (${r.post})` : r.type === 'ambassador' ? 'Department Ambassador application' : 'General membership application');

const templates = {
  cardOtp: (code, minutes) => ({
    subject: `Your Member Card Access Code: ${code} | BAUET ICT Club`,
    html: layout({
      title: 'Member Card & Profile Verification',
      body: `<p>Use this 6-digit verification code to access your digital member card and profile:</p><p style="font:700 34px monospace;letter-spacing:8px;margin:18px 0;color:#1F4FD8">${esc(code)}</p><p>This code expires in ${minutes} minutes. Never share this code with anyone.</p>`,
    }),
    text: `Your member card access code is ${code}. It expires in ${minutes} minutes.`,
  }),
  signupCode: (code, minutes) => ({
    subject: `Your sign-up code: ${code} | BAUET ICT Club`,
    html: layout({ title: 'Confirm your e-mail', body: `<p>Type this code in the sign-up form to finish creating your admin account:</p><p style="font:700 34px monospace;letter-spacing:8px;margin:18px 0;color:#1F4FD8">${esc(code)}</p><p>It works for ${minutes} minutes. If you did not ask for it, ignore this e-mail: nothing is created.</p>` }),
    text: `Your sign-up code is ${code}. It works for ${minutes} minutes. If you did not ask for it, ignore this e-mail.`,
  }),
  signupNotice: (username, email, role) => ({
    subject: `New admin account: ${username} | BAUET ICT Club`,
    html: layout({ title: 'A new admin account was created', body: `<p><b>${esc(username)}</b> (${esc(email)}) signed up as <b>${esc(role)}</b>.</p><p>If this was not expected, sign in and remove the account under Team.</p>` }),
    text: `New admin account: ${username} (${email}) as ${role}.`,
  }),
  adminReset: (link, minutes) => ({
    subject: 'Reset the admin password | BAUET ICT Club',
    html: layout({ title: 'Reset the admin password', body: `<p>Someone asked to reset the admin password of the club website. If it was you, press the button below and choose a new password. The link works <b>once</b> and for <b>${minutes} minutes</b>.</p><p>If it was not you, ignore this e-mail: nothing changes and the current password keeps working.</p>`, button: { href: link, label: 'Choose a new password' } }),
    text: `Reset the admin password (works once, ${minutes} minutes): ${link}\nIf it was not you, ignore this e-mail.`,
  }),
  applicationReceived: (r) => ({
    subject: 'We received your application | BAUET ICT Club',
    html: layout({ title: `Thanks, ${r.full_name}!`, body: `<p>We have received your <b>${esc(typeLabel(r))}</b>.</p><p>Our team reviews every application. We will email you here as soon as there is news.</p>`, button: { href: `${siteUrl()}/events`, label: 'See upcoming events' } }),
    text: `Hi ${r.full_name}, we received your ${typeLabel(r)}. We will email you when it is reviewed.`,
  }),
  applicationSelected: (r, position, session) => ({
    subject: `Congratulations! You are selected | BAUET ICT Club`,
    html: layout({ title: 'You are selected 🎉', body: `<p>Dear ${esc(r.full_name)},</p><p>We are happy to tell you that you have been selected as <b>${esc(position)}</b> for the <b>${esc(session)}</b> session.</p>${r.post && r.type === 'committee' && r.post !== position ? `<p>You applied for <b>${esc(r.post)}</b>; after reviewing all applications the committee has placed you as <b>${esc(position)}</b>, where we think you will do great work.</p>` : ''}<p>Your photo and post are now published on our Team page. Welcome to the team!</p>`, button: { href: `${siteUrl()}/team`, label: 'See the team page' } }),
    text: `Congratulations ${r.full_name}! You are selected as ${position} for ${session}.`,
  }),
  // sent the moment someone registers for ONE event: it names that event, its time and place, and carries the organiser's own note
  eventRegistered: (r, ev, fDate, fTime) => ({
    subject: `You are registered: ${ev.title}`,
    html: layout({ title: 'You are registered', body: `<p>Hi ${esc(r.full_name)},</p><p>You are registered for <b>${esc(ev.title)}</b>.</p><p>${esc(fDate(ev.date))}${ev.time ? ` · ${esc(fTime(ev.time))}` : ''}${ev.location ? `<br>${esc(ev.location)}` : ''}</p>${ev.reg_form?.email_note ? `<p style="white-space:pre-line">${esc(ev.reg_form.email_note)}</p>` : '<p>Please bring your student ID. See you there!</p>'}${ev.ticket ? `<p>Your ticket code: <b style="letter-spacing:2px">${esc(ev.ticket.slice(0, 5))}-${esc(ev.ticket.slice(5))}</b><br>Show the QR code on your ticket at the entrance.</p>` : ''}`, button: { href: ev.ticket ? `${siteUrl()}/ticket/${ev.ticket}` : `${siteUrl()}/events/${ev.id}`, label: ev.ticket ? 'Open my ticket' : 'Event details' } }),
    text: `Hi ${r.full_name}, you are registered for ${ev.title} on ${fDate(ev.date)}${ev.time ? ` at ${fTime(ev.time)}` : ''}.${ev.reg_form?.email_note ? `\n${ev.reg_form.email_note}` : ''}\n${siteUrl()}/events/${ev.id}`,
  }),
  // the event is full: they are in line, and get a seat automatically if someone drops out
  waitlistJoined: (r, ev, position) => ({
    subject: `You are on the waiting list: ${ev.title}`,
    html: layout({ title: 'You are on the waiting list', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p><b>${esc(ev.title)}</b> is full right now, so we put you on the waiting list${position ? ` (number ${position})` : ''}.</p><p>If a seat opens up, you get it automatically and we email you at once. You do not need to do anything.</p>`, button: { href: `${siteUrl()}/events/${ev.id}`, label: 'Event details' } }),
    text: `Hi ${r.full_name || 'there'}, ${ev.title} is full, so you are on the waiting list${position ? ` (number ${position})` : ''}. If a seat opens up we will email you.`,
  }),
  waitlistPromoted: (r, ev, fDate, fTime) => ({
    subject: `Good news, you have a seat: ${ev.title}`,
    html: layout({ title: 'You have a seat!', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p>A seat opened up and you are now <b>registered</b> for <b>${esc(ev.title)}</b>.</p><p>${esc(fDate(ev.date))}${ev.time ? ` · ${esc(fTime(ev.time))}` : ''}${ev.location ? `<br>${esc(ev.location)}` : ''}</p>${r.ticket ? `<p>Your ticket code: <b style="letter-spacing:2px">${esc(r.ticket.slice(0, 5))}-${esc(r.ticket.slice(5))}</b><br>Show the QR code on your ticket at the entrance.</p>` : ''}`, button: { href: r.ticket ? `${siteUrl()}/ticket/${r.ticket}` : `${siteUrl()}/events/${ev.id}`, label: r.ticket ? 'Open my ticket' : 'Event details' } }),
    text: `Hi ${r.full_name || 'there'}, a seat opened up: you are now registered for ${ev.title} on ${fDate(ev.date)}. ${r.ticket ? `${siteUrl()}/ticket/${r.ticket}` : ''}`,
  }),
  // paid events: sent at once, the place is confirmed when the admin verifies the payment
  registrationPending: (r, ev, pay, fDate, fTime) => ({
    subject: `We received your registration: ${ev.title}`,
    html: layout({ title: 'Registration received', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p>We received your registration for <b>${esc(ev.title)}</b>${ev.date ? ` (${esc(fDate(ev.date))}${ev.time ? ` · ${esc(fTime(ev.time))}` : ''})` : ''}.</p><p>Your payment of <b>${esc(pay.amount)} BDT</b> by ${esc(pay.method)} (transaction ID <b>${esc(pay.trx_id)}</b>) is being checked. We will email you again as soon as your place is confirmed.</p>`, button: { href: `${siteUrl()}${ev.path || `/events/${ev.id}`}`, label: 'Details' } }),
    text: `We received your registration for ${ev.title}. Your payment (${pay.method}, ${pay.trx_id}) is being checked; we will email you when it is confirmed.`,
  }),
  certificateReady: (r, ev, code) => ({
    subject: `Your certificate: ${ev.title}`,
    html: layout({ title: 'Your certificate is ready', body: `<p>Hi ${esc(r.cert_name || r.full_name || 'there')},</p><p>Thank you for joining <b>${esc(ev.title)}</b>. Your certificate is attached to this email as a PDF.</p><p>You can also open or download it any time with the button below. Anyone can check that it is real by scanning the QR code on it.</p>`, button: { href: `${siteUrl()}/certificate/${code}`, label: 'Open my certificate' } }),
    text: `Hi ${r.cert_name || r.full_name || 'there'}, your certificate for ${ev.title} is attached as a PDF. You can also open it here: ${siteUrl()}/certificate/${code}`,
  }),
  eventFeedback: (r, ev, url) => ({
    subject: `How was ${ev.title}?`,
    html: layout({ title: 'Tell us how it went', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p>Thank you for joining <b>${esc(ev.title)}</b>. It takes one minute to tell us what you liked and what we can do better.</p>`, button: { href: url, label: 'Give feedback' } }),
    text: `Thank you for joining ${ev.title}. Tell us how it went: ${url}`,
  }),
  eventReminder: (r, ev, fDate, fTime) => ({
    subject: `Tomorrow: ${ev.title}`,
    html: layout({ title: 'See you tomorrow', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p><b>${esc(ev.title)}</b> is tomorrow.</p><p>${esc(fDate(ev.date))}${ev.time ? ` · ${esc(fTime(ev.time))}` : ''}${ev.location ? `<br>${esc(ev.location)}` : ''}</p><p>Please bring your ticket (the QR code) and your student ID.</p>`, button: { href: `${siteUrl()}/ticket/${r.ticket}`, label: 'Open my ticket' } }),
    text: `Reminder: ${ev.title} is tomorrow. Your ticket: ${siteUrl()}/ticket/${r.ticket}`,
  }),
  ticketsList: (name, items, fDate) => ({
    subject: 'Your event tickets',
    html: layout({ title: 'Your tickets', body: `<p>Hi ${esc(name || 'there')},</p><p>Here are your tickets. Open one and show its QR code at the entrance.</p><ul style="padding-left:18px">${items.map((i) => `<li style="margin:8px 0"><b>${esc(i.title)}</b>${i.date ? ` (${esc(fDate(i.date))})` : ''}<br><a href="${siteUrl()}/ticket/${esc(i.ticket)}">${esc(i.ticket.slice(0, 5))}-${esc(i.ticket.slice(5))}</a></li>`).join('')}</ul><p style="font-size:12px;color:#64748b">If you did not ask for this, you can ignore this email.</p>`, button: { href: `${siteUrl()}/ticket/${items[0].ticket}`, label: 'Open my ticket' } }),
    text: `Your tickets:\n${items.map((i) => `${i.title}: ${siteUrl()}/ticket/${i.ticket}`).join('\n')}`,
  }),
  paymentVerified: (r, ev, fDate) => ({
    subject: `Payment received: ${ev.title}`,
    html: layout({ title: 'Payment confirmed', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p>We received your payment for <b>${esc(ev.title)}</b>${ev.date ? ` (${esc(fDate(ev.date))})` : ''}. Your place is confirmed.</p>${ev.email_note ? `<p style="white-space:pre-line">${esc(ev.email_note)}</p>` : ''}${ev.ticket ? `<p>Your ticket code: <b style="letter-spacing:2px">${esc(ev.ticket.slice(0, 5))}-${esc(ev.ticket.slice(5))}</b></p>` : ''}`, button: { href: ev.ticket ? `${siteUrl()}/ticket/${ev.ticket}` : `${siteUrl()}${ev.path || `/events/${ev.id}`}`, label: ev.ticket ? 'Open my ticket' : 'Details' } }),
    text: `Your payment for ${ev.title} is confirmed. ${siteUrl()}${ev.path || `/events/${ev.id}`}`,
  }),
  paymentRejected: (r, ev, note) => ({
    subject: `We could not verify your payment: ${ev.title}`,
    html: layout({ title: 'Payment not verified', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p>We could not verify your payment for <b>${esc(ev.title)}</b>.${note ? ` ${esc(note)}` : ''}</p><p>Please check the transaction ID and register again, or write to us.</p>`, button: { href: `${siteUrl()}${ev.path || `/events/${ev.id}`}`, label: 'Open the page' } }),
    text: `We could not verify your payment for ${ev.title}. ${note || ''} ${siteUrl()}${ev.path || `/events/${ev.id}`}`,
  }),
  formReceived: (r, form) => ({
    subject: `We received your response: ${form.title}`,
    html: layout({ title: 'Response received', body: `<p>Hi ${esc(r.full_name || 'there')},</p><p>Thank you. We received your response to <b>${esc(form.title)}</b>.</p>${form.reg_form?.email_note ? `<p style="white-space:pre-line">${esc(form.reg_form.email_note)}</p>` : ''}` }),
    text: `Thank you. We received your response to ${form.title}.`,
  }),
  adminNewSignup: (ev, summary) => ({
    subject: `New registration: ${ev.title}`,
    html: layout({ title: 'New registration', body: `<p>${esc(summary)}</p>`, button: { href: `${siteUrl()}${ev.adminPath || '/admin/events'}`, label: 'Open responses' } }),
    text: `New registration for ${ev.title}: ${summary}`,
  }),
  applicationApproved: (r) => ({
    subject: 'Your application is approved | BAUET ICT Club',
    html: layout({ title: 'Welcome to the club 🎉', body: `<p>Dear ${esc(r.full_name)},</p><p>Great news: your ${esc(typeLabel(r).toLowerCase())} has been <b>approved</b>. Welcome to the BAUET ICT Club family!</p><p>Your digital membership card is ready: open it any time on your phone or print it. You can also find it on our website under <b>My member card</b> with your e-mail and student ID.</p><p>Watch our Events and Notices pages for your first workshop, and keep an eye on your inbox.</p>`, button: { href: r.card_path ? `${siteUrl()}${r.card_path}` : `${siteUrl()}/my-card`, label: 'Open my member card' } }),
    text: `Dear ${r.full_name}, your application has been approved. Welcome to the BAUET ICT Club! Your member card: ${siteUrl()}${r.card_path || '/my-card'}`,
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
  birthdayWish: (member) => ({
    subject: `Happy Birthday, ${member.full_name || member.name}! 🎂 | BAUET ICT Club`,
    html: layout({
      title: 'Happy Birthday! 🎈🎉',
      body: `<p>Dear <b>${esc(member.full_name || member.name)}</b>,</p><p>On behalf of the entire <b>BAUET ICT Club</b> family, we wish you a very <b>Happy Birthday!</b> 🎂✨</p><p>Thank you for being a valued part of our tech community. May your upcoming year be filled with breakthrough innovations, continuous learning, debugging superpowers, and great achievements!</p><p>Keep coding, innovating, and inspiring our campus.</p>`,
      button: { href: member.card_path ? `${siteUrl()}${member.card_path}` : `${siteUrl()}/my-card`, label: 'View my member card' },
      footerNote: 'Warmest wishes from BAUET ICT Club 💙',
    }),
    text: `Happy Birthday ${member.full_name || member.name}! On behalf of the entire BAUET ICT Club, we wish you a very Happy Birthday filled with joy and success!`,
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

module.exports = { siteUrl, sendMail, sendNow, status, verify, templates, adminAddress, esc, unsubscribeUrl, validUnsubscribe, layout, provider };
