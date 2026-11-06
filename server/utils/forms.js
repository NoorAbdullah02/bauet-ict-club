// Event registration forms, built by the admin like a Google Form. A form is stored on the event as
// { title, intro, confirmation, fields: [{ id, type, label, help, required, options, key }] } and every answer set as { fieldId: value }.
const TYPES = ['short', 'long', 'email', 'phone', 'number', 'dropdown', 'radio', 'checkbox', 'date', 'time', 'yesno', 'scale', 'photo', 'section'];
const PAY_METHODS = ['bKash', 'Nagad', 'Rocket'];
const BD_MOBILE = /^(\+?88)?01[3-9]\d{8}$/;
const DEPARTMENTS = ['ICE', 'CSE', 'EEE', 'CE', 'ME', 'BBA', 'LLB', 'ELL', 'Other'];
const BATCHES = Array.from({ length: 19 }, (_, i) => String(12 + i));
// `key` ties a field to a standard column so the list, confirmation email and duplicate check keep working
const KEYS = ['name', 'student_id', 'email', 'phone', 'department', 'batch'];

const DEFAULT_FIELDS = [
  { id: 'name', key: 'name', type: 'short', label: 'Full name', required: true },
  { id: 'student_id', key: 'student_id', type: 'short', label: 'Student ID', required: true },
  { id: 'batch', key: 'batch', type: 'dropdown', label: 'Batch', required: false, options: BATCHES },
  { id: 'department', key: 'department', type: 'dropdown', label: 'Department', required: false, options: DEPARTMENTS },
  { id: 'email', key: 'email', type: 'email', label: 'Email', required: true },
  { id: 'phone', key: 'phone', type: 'phone', label: 'Mobile (optional)', required: false },
];

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const idOf = (v, i) => (String(v || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24) || `f${i + 1}`);

/** Cleans a form sent by the admin. Returns { form } or { error }. null clears the custom form (the default one is used again). */
function sanitizeForm(raw) {
  if (raw === null || raw === undefined || raw === '') return { form: null };
  let f = raw;
  if (typeof f === 'string') { try { f = JSON.parse(f); } catch { return { error: 'The form could not be read' }; } }
  if (!f || typeof f !== 'object' || !Array.isArray(f.fields)) return { error: 'The form could not be read' };
  if (f.fields.length > 40) return { error: 'A form can have at most 40 questions' };
  const seen = new Set();
  const fields = [];
  for (const [i, q] of f.fields.entries()) {
    const type = TYPES.includes(q?.type) ? q.type : 'short';
    let id = idOf(q?.id, i);
    while (seen.has(id)) id = `${id}x`;
    seen.add(id);
    const label = clip(q?.label, 160);
    if (!label) return { error: `Question ${i + 1} needs a title` };
    const out = { id, type, label, required: type === 'section' ? false : !!q?.required };
    if (type === 'scale') out.scale = { max: Number(q?.scale?.max) === 10 ? 10 : 5, low: clip(q?.scale?.low, 40), high: clip(q?.scale?.high, 40) };
    if (clip(q?.help, 200)) out.help = clip(q.help, 200);
    if (type === 'section' && q?.page) out.page = true; // a heading that also starts a new page ("Next" / "Back" buttons on the public form)
    // answer rules, like Google Forms "response validation"
    const num = (x, lo, hi) => (x === '' || x === null || x === undefined || !Number.isFinite(Number(x)) ? undefined : Math.min(hi, Math.max(lo, Number(x))));
    if (type === 'short' || type === 'long') {
      const a = num(q?.minLen, 0, 2000), b = num(q?.maxLen, 1, 2000);
      if (a) out.minLen = Math.floor(a);
      if (b) out.maxLen = Math.floor(b);
      if (type === 'short' && clip(q?.pattern, 80)) {
        try { new RegExp(clip(q.pattern, 80)); } catch { return { error: `“${label}”: the pattern is not valid` }; }
        out.pattern = clip(q.pattern, 80); out.patternMsg = clip(q?.patternMsg, 100) || 'This does not look right';
      }
    }
    if (type === 'number') {
      const a = num(q?.min, -1e9, 1e9), b = num(q?.max, -1e9, 1e9);
      if (a !== undefined) out.min = a;
      if (b !== undefined) out.max = b;
      if (a !== undefined && b !== undefined && a > b) return { error: `“${label}”: the smallest number is bigger than the biggest` };
      if (q?.whole) out.whole = true;
    }
    if (type === 'checkbox') {
      const a = num(q?.minSel, 1, 60), b = num(q?.maxSel, 1, 60);
      if (a) out.minSel = Math.floor(a);
      if (b) out.maxSel = Math.floor(b);
    }
    if (['dropdown', 'radio', 'checkbox'].includes(type) && q?.shuffle) out.shuffle = true;
    if (KEYS.includes(q?.key) && !fields.some((x) => x.key === q.key)) out.key = q.key;
    if (['dropdown', 'radio', 'checkbox'].includes(type) && q?.allowOther) out.allowOther = true; // lets people type their own answer ("Other: ...")
    if (q?.showIf?.field && seen.has(idOf(q.showIf.field, 0)) && idOf(q.showIf.field, 0) !== id) out.showIf = { field: idOf(q.showIf.field, 0), equals: clip(q.showIf.equals, 100) }; // only shown when an EARLIER question has this answer
    if (['dropdown', 'radio', 'checkbox'].includes(type)) {
      out.options = [...new Set((Array.isArray(q?.options) ? q.options : []).map((o) => clip(o, 100)).filter(Boolean))].slice(0, 60);
      if (out.options.length < 2) return { error: `“${label}” needs at least two choices` };
    }
    fields.push(out);
  }
  if (!fields.length) return { form: null };
  const form = { theme: /^#[0-9a-f]{6}$/i.test(String(f.theme || '')) ? String(f.theme).toLowerCase() : '', title: clip(f.title, 120), intro: clip(f.intro, 1000), confirmation: clip(f.confirmation, 500), email_note: clip(f.email_note, 600), unique: seen.has(f.unique) ? f.unique : '', notify_admin: !!f.notify_admin, feedback_form: /^[a-z0-9-]{2,80}$/.test(String(f.feedback_form || '')) ? String(f.feedback_form) : '', fields };
  // certificate for people who were checked in
  if (f.cert?.enabled) form.cert = { enabled: true, title: clip(f.cert.title, 60) || 'Certificate of Participation', signer: clip(f.cert.signer, 60), signer_title: clip(f.cert.signer_title, 80), note: clip(f.cert.note, 160) };
  // registration deadline: "YYYY-MM-DDTHH:mm" (Bangladesh time is entered by the admin; compared as a plain timestamp)
  if (f.closes_at) { if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(f.closes_at))) return { error: 'The closing date is not valid' }; form.closes_at = String(f.closes_at).slice(0, 16); }
  // manual mobile-banking payment: people send money, then give the transaction ID; the admin verifies it
  if (f.payment?.enabled) {
    const amount = Number(f.payment.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return { error: 'Enter the payment amount (1 to 100000 BDT)' };
    const methods = PAY_METHODS.filter((m) => (f.payment.methods || []).includes(m));
    if (!methods.length) return { error: 'Choose at least one payment method' };
    const numbers = {};
    for (const m of methods) {
      const n = clip(f.payment.numbers?.[m], 20);
      if (!BD_MOBILE.test(n.replace(/[\s-]/g, ''))) return { error: `Enter the ${m} number people should send money to` };
      numbers[m] = n;
    }
    form.payment = { enabled: true, amount, methods, numbers, kind: f.payment.kind === 'payment' ? 'payment' : 'send_money', note: clip(f.payment.note, 300) };
  }
  return { form };
}

const fieldsOf = (ev) => (ev?.reg_form?.fields?.length ? ev.reg_form.fields : DEFAULT_FIELDS);
/** Which answer must be different for every person (default: the email field). */
const uniqueId = (ev) => (ev?.reg_form?.fields?.length ? ev.reg_form.unique || '' : 'email');

/** Checks one person's answers against the form. Returns { clean, errors }. */
/** Is this question visible given the answers so far? (conditional questions are hidden until their condition is met) */
function visible(f, a) {
  if (!f.showIf) return true;
  const got = a[f.showIf.field];
  return Array.isArray(got) ? got.includes(f.showIf.equals) : String(got ?? '') === f.showIf.equals;
}
const OTHER = /^Other: .{1,100}$/;
const allowed = (f, x) => f.options.includes(x) || (f.allowOther && OTHER.test(x));

function validateAnswers(fields, answers) {
  const clean = {}; const errors = {};
  const a = answers && typeof answers === 'object' ? answers : {};
  for (const f of fields) {
    if (f.type === 'section') continue;
    if (!visible(f, a)) continue; // hidden by its condition: not asked, not stored
    let v = a[f.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (empty) { if (f.required) errors[f.id] = 'This question is required'; continue; }
    switch (f.type) {
      case 'short': v = clip(v, 200);
        if (f.pattern && !new RegExp(f.pattern).test(v)) errors[f.id] = f.patternMsg || 'This does not look right';
        break;
      case 'long': v = clip(v, 2000); break;
      case 'email': v = clip(v, 100).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) errors[f.id] = 'Enter a valid email'; break;
      case 'phone': v = clip(v, 20); if (!/^(\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ''))) errors[f.id] = 'Enter a valid Bangladeshi mobile number'; break;
      case 'number': {
        const n = Number(v);
        if (!Number.isFinite(n)) errors[f.id] = 'Enter a number';
        else if (f.whole && !Number.isInteger(n)) errors[f.id] = 'Enter a whole number';
        else if (f.min !== undefined && n < f.min) errors[f.id] = `Must be at least ${f.min}`;
        else if (f.max !== undefined && n > f.max) errors[f.id] = `Must be at most ${f.max}`;
        else v = n;
        break;
      }
      case 'dropdown': case 'radio': v = clip(v, 110); if (!allowed(f, v)) errors[f.id] = 'Choose one of the options'; break;
      case 'checkbox': v = (Array.isArray(v) ? v : [v]).map((x) => clip(x, 110)); if (v.some((x) => !allowed(f, x))) errors[f.id] = 'Choose from the options';
        else if (f.minSel && v.length < f.minSel) errors[f.id] = `Choose at least ${f.minSel}`;
        else if (f.maxSel && v.length > f.maxSel) errors[f.id] = `Choose at most ${f.maxSel}`;
        break;
      case 'date': v = clip(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[f.id] = 'Choose a date'; break;
      case 'yesno': v = /^(yes|true|1)$/i.test(String(v)) ? 'Yes' : 'No'; break;
      case 'time': v = clip(v, 5); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) errors[f.id] = 'Choose a time'; break;
      case 'scale': { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > (f.scale?.max || 5)) errors[f.id] = 'Choose a number'; else v = n; break; }
      case 'photo': v = clip(v, 300); if (!/^(https:\/\/res\.cloudinary\.com\/|\/uploads\/[a-f0-9]{24}\.(jpg|png|webp)$)/.test(v)) errors[f.id] = 'Upload the picture again'; break;
      case 'section': continue;
      default: v = clip(v, 200);
    }
    if (['short', 'long'].includes(f.type) && !errors[f.id]) {
      if (f.minLen && String(v).length < f.minLen) errors[f.id] = `Write at least ${f.minLen} characters`;
      else if (f.maxLen && String(v).length > f.maxLen) errors[f.id] = `Write at most ${f.maxLen} characters`;
    }
    clean[f.id] = v;
  }
  return { clean, errors };
}

/** Readable text of one answer (lists are joined). */
const show = (v) => (Array.isArray(v) ? v.join(', ') : v === undefined || v === null ? '' : String(v));

/** Values for the standard columns, taken from the fields that carry a `key`. */
function columnsFrom(fields, clean) {
  const col = {};
  for (const f of fields) if (f.key && clean[f.id] !== undefined) col[f.key] = show(clean[f.id]);
  return { full_name: col.name || null, student_id: col.student_id || null, email: col.email || null, phone: col.phone || null, department: col.department || null, batch: col.batch || null };
}

/** Checks the payment part of a sign-up against the event's payment settings. Returns { payment } or { errors }. */
function validatePayment(setting, body) {
  const errors = {}; const b = body && typeof body === 'object' ? body : {};
  const method = clip(b.method, 20);
  const sender = clip(b.sender, 20);
  const trx = clip(b.trx_id, 30).toUpperCase().replace(/\s+/g, '');
  if (!setting.methods.includes(method)) errors.method = 'Choose how you paid';
  if (!BD_MOBILE.test(sender.replace(/[\s-]/g, ''))) errors.sender = 'Enter the mobile number you paid from';
  if (!/^[A-Z0-9]{6,20}$/.test(trx)) errors.trx_id = 'Enter the transaction ID (6 to 20 letters and numbers)';
  return Object.keys(errors).length ? { errors } : { payment: { method, sender, trx_id: trx, amount: setting.amount } };
}

/** Is registration still open by the form's own closing time? */
const closedByTime = (form) => !!form?.closes_at && (form.closes_at.length === 10 ? `${form.closes_at}T23:59` : form.closes_at) < new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 16); // compared in Bangladesh time (UTC+6)

module.exports = { TYPES, PAY_METHODS, DEFAULT_FIELDS, KEYS, sanitizeForm, fieldsOf, uniqueId, validateAnswers, validatePayment, closedByTime, columnsFrom, show };
