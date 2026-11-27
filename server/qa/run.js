// `npm run qa` — starts the real server on an in-memory database and checks the important flows end to end. No accounts or internet needed.
const { spawn } = require('child_process');
const path = require('path');
const PORT = process.env.QA_PORT || '5099';
const B = `http://127.0.0.1:${PORT}`;
const feedHits = { remotive: 0, remoteok: 0 };
let pass = 0, failed = 0, XFF = ''; // XFF: pretend to be another visitor so the 8-wrong-attempts-per-IP guard does not block later checks
const ok = (c, name, extra) => { if (c) pass++; else { failed++; console.log(`  FAIL  ${name}`, extra === undefined ? '' : JSON.stringify(extra)); } };
const call = async (method, url, body, token, raw) => {
  const r = await fetch(B + url, { method, headers: { ...(XFF ? { 'x-forwarded-for': XFF } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { s: r.status, j: json, t: text };
};
/** The ready-made forms the website ships, read from the client source so a broken one cannot go unnoticed. */
function readyTemplates() {
  const fs = require('fs');
  const { DEFAULT_FIELDS } = require('../utils/forms');
  const option = (key) => DEFAULT_FIELDS.find((f) => f.key === key).options;
  const src = fs.readFileSync(path.join(__dirname, '../../client/src/lib/formTemplates.js'), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace('export const TEMPLATES', 'const TEMPLATES');
  return new Function('BATCH_LIST', 'DEPT_LIST', `${src}\nreturn { TEMPLATES };`)(option('batch'), option('department')).TEMPLATES;
}
const fill = (fields, i) => Object.fromEntries(fields.filter((f) => f.type !== 'section').map((f) => [f.id,
  f.type === 'email' ? `p${i}@example.com` : f.type === 'phone' ? '01712345678' : f.type === 'number' ? 5 : ['dropdown', 'radio'].includes(f.type) ? (f.options || [])[0] : f.type === 'checkbox' ? [(f.options || [])[0]] : f.type === 'yesno' ? 'Yes' : f.type === 'scale' ? 3 : f.type === 'date' ? '2026-01-01' : f.type === 'time' ? '10:00' : `Person ${i}`]));

(async () => {
  // a pretend payment company: opens sessions, and answers "is this payment real?" from the val_id the test sends ("val-<tran>-<amount>")
  const http = require('http');
  const mails = []; let mailLimit = true;
  const gw = http.createServer((req, res) => {
    let raw = ''; req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const url = new URL(req.url, 'http://x'); res.setHeader('content-type', 'application/json');
      if (req.method === 'POST' && url.pathname === '/gwprocess/v4/api.php') {
        const f = new URLSearchParams(raw);
        if (f.get('store_id') !== 'qa_store' || f.get('store_passwd') !== 'qa_pass' || f.get('currency') !== 'BDT') return res.end(JSON.stringify({ status: 'FAILED', failedreason: 'bad store' }));
        return res.end(JSON.stringify({ status: 'SUCCESS', GatewayPageURL: `http://pay.example/${f.get('tran_id')}`, amount: f.get('total_amount') }));
      }
      if (url.pathname === '/v3/smtp/email' && req.method === 'POST') { // a pretend mail service (Brevo): records every mail, and fails on purpose for some addresses
        let b = {}; try { b = JSON.parse(raw); } catch { /* not json */ }
        const to = b.to?.[0]?.email || '';
        const att = (b.attachment || [])[0];
        mails.push({ to, subject: b.subject, html: b.htmlContent || '', text: b.textContent || '', file: att?.name || '', bytes: att ? Buffer.from(att.content, 'base64').length : 0, pdf: att ? Buffer.from(att.content, 'base64').subarray(0, 5).toString() : '' });
        if (to === 'e1@example.com') { res.statusCode = 400; return res.end(JSON.stringify({ message: 'invalid recipient' })); }
        if (to === 'e2@example.com' && mailLimit) { res.statusCode = 429; return res.end(JSON.stringify({ message: 'Daily sending limit reached' })); }
        res.statusCode = 201; return res.end(JSON.stringify({ messageId: `<${mails.length}@qa>` }));
      }
      if (url.pathname === '/v3/account') return res.end(JSON.stringify({ email: 'qa@brevo.test' }));
      if (url.pathname === '/remotive') {
        feedHits.remotive += 1;
        return res.end(JSON.stringify({ jobs: [
          { id: 9001, url: 'https://remotive.com/remote-jobs/software-dev/qa-quokka-engineer-9001', title: 'QA Quokka Engineer', company_name: 'Quokka <b>Labs</b>', job_type: 'full_time', category: 'Software Development', tags: ['python', 'qa'], publication_date: '2026-11-04T10:00:00', candidate_required_location: 'Worldwide', salary: '$40k', description: '<p>Test <b>things</b></p>' },
          { id: 9002, url: 'https://remotive.com/remote-jobs/x/us-only-9002', title: 'US Only Role', company_name: 'Acme', job_type: 'contract', tags: ['sales'], publication_date: '2026-11-03T10:00:00', candidate_required_location: 'USA Only', description: 'x' },
          { id: 9003, url: 'javascript:alert(1)', title: 'Bad link job', company_name: 'Evil', publication_date: '2026-11-03T10:00:00' },
        ] }));
      }
      if (url.pathname === '/remoteok') {
        feedHits.remoteok += 1;
        return res.end(JSON.stringify([{ legal: 'terms' }, { id: '777', position: 'Remote OK Quokka Designer', company: 'Okapi', tags: ['design'], date: '2026-11-05T00:00:04+00:00', location: 'Anywhere', salary_min: '60000', salary_max: '90000', url: 'https://remoteok.com/remote-jobs/777', description: '<p>Draw</p>' }]));
      }
      if (url.pathname === '/validator/api/validationserverAPI.php') {
        const m = /^val-(bauet-[a-f0-9]{16})-([\d.]+)$/.exec(url.searchParams.get('val_id') || '');
        if (!m || url.searchParams.get('store_id') !== 'qa_store') return res.end(JSON.stringify({ status: 'INVALID_TRANSACTION' }));
        return res.end(JSON.stringify({ status: 'VALID', tran_id: m[1], amount: m[2], currency_type: 'BDT', bank_tran_id: 'BANK123', card_type: 'BKASH-BKash' }));
      }
      res.statusCode = 404; res.end('{}');
    });
  });
  await new Promise((r) => gw.listen(0, '127.0.0.1', r));
  const GW = `http://127.0.0.1:${gw.address().port}`;
  const srv = spawn(process.execPath, [path.join(__dirname, 'harness.js')], { env: { ...process.env, GROQ_API_KEY: '', QA_BREVO_KEY: 'qa-brevo-key', MAIL_FROM: 'club@example.org', ADMIN_NOTIFY_EMAIL: 'owner@qa-club.dev', BREVO_API_BASE: GW, QA_PORT: PORT, SSLCOMMERZ_STORE_ID: 'qa_store', SSLCOMMERZ_STORE_PASSWD: 'qa_pass', SSLCOMMERZ_BASE: GW, REMOTIVE_URL: `${GW}/remotive`, REMOTEOK_URL: `${GW}/remoteok` }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/health`)).ok) break; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 1000)); }

    const h = await call('GET', '/api/health'); ok(h.s === 200 && h.j.db, 'health');
    ok((await call('GET', '/api/bootstrap')).s === 200, 'bootstrap');
    ok((await call('GET', '/api/events')).s === 200, 'events list public');
    ok((await call('POST', '/api/events', { title: 'x' })).s === 401, 'writes need login');
    ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'nope' })).s === 401, 'wrong password rejected');
    ok((await call('POST', '/api/auth/login', undefined, undefined, '{bad json')).s === 400, 'broken JSON gives 400');
    const login = await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345' });
    let T = login.j?.token; ok(!!T, 'login');
    // ---- sign-in security: sessions, two-step sign-in, lockout ----
    {
      XFF = '10.7.7.7'; const crypto = require('crypto'); const totp = require('../utils/totp');
      const me = await call('GET', '/api/auth/me', undefined, T); ok(me.s === 200 && me.j.twoFactor === false, 'me works with a live session');
      ok((await call('POST', '/api/auth/change-password', { current: 'Qa-Pass-12345', next: 'short' }, T)).s === 400, 'weak new password refused');
      // two-step: setup needs the password, enable needs a real code
      ok((await call('POST', '/api/auth/2fa/setup', { password: 'wrong' }, T)).s === 401, '2FA setup needs the password');
      const su = await call('POST', '/api/auth/2fa/setup', { password: 'Qa-Pass-12345' }, T); ok(su.s === 200 && su.j.secret && su.j.qr?.startsWith('data:image'), '2FA setup gives secret and QR');
      ok((await call('POST', '/api/auth/2fa/enable', { code: '000000' }, T)).s === 401, '2FA enable refuses a wrong code');
      const en = await call('POST', '/api/auth/2fa/enable', { code: totp.hotp(su.j.secret, Math.floor(Date.now() / 30000)) }, T);
      ok(en.s === 200 && en.j.backupCodes?.length === 8, '2FA enable with a right code gives 8 backup codes', en.j);
      const need = await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345' }); ok(need.s === 401 && need.j.twoFactor === true && !need.j.token, 'login now asks for the code');
      ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345', code: '123456' })).s === 401, 'a wrong code is refused');
      const withCode = await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345', code: totp.hotp(su.j.secret, Math.floor(Date.now() / 30000)) }); ok(withCode.s === 200 && withCode.j.token, 'login works with the right code');
      const bk = en.j.backupCodes[0];
      const useBk = await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345', code: bk }); ok(useBk.s === 200, 'a backup code logs in once');
      ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345', code: bk })).s === 401, 'the same backup code cannot be used twice');
      // sign out everywhere ends older sessions
      const T2 = withCode.j.token;
      const lo = await call('POST', '/api/auth/logout-all', {}, T2); ok(lo.s === 200 && lo.j.token, 'sign out everywhere');
      ok((await call('GET', '/api/auth/me', undefined, T2)).s === 401, 'old session is dead after sign out everywhere');
      ok((await call('GET', '/api/auth/me', undefined, lo.j.token)).s === 200, 'the fresh token works');
      // turn 2FA back off so the rest of this run can sign in with a password alone
      const off = await call('POST', '/api/auth/2fa/disable', { password: 'Qa-Pass-12345', code: totp.hotp(su.j.secret, Math.floor(Date.now() / 30000)) }, lo.j.token); ok(off.s === 200, '2FA can be turned off with password and code');
      const again = await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345' }); ok(again.s === 200, 'password-only login again'); T = again.j.token; // the earlier session was ended on purpose
      void crypto; XFF = '';
    }
    // ---- a shared card link shows the person's name in the preview (Facebook / WhatsApp do not run JavaScript) ----
    {
      const mem = ((await call('GET', '/api/members')).j || []).find((m) => m.name && /^[A-Za-z. ]+$/.test(m.name));
      if (mem) {
        const page = await call('GET', `/card/${mem.id}`);
        ok(page.s === 200 && page.t.includes(`<meta property="og:title" content="${mem.name}`), 'card link: the preview carries the member name', page.t.slice(0, 0));
      }
      const hidden = await call('GET', '/card/r1');
      ok(hidden.s === 200 && !/Membership card of BAUET/.test(hidden.t.split('og:description')[0] || ''), 'card link: an applicant card without its code shows nothing private');
      ok(!/og:title" content="[^"]*, (General member|Committee member)/.test(hidden.t), 'card link: no name or post for a card without its code');
    }
    {
      const al = await call('GET', '/.well-known/assetlinks.json');
      ok(al.s === 200 && Array.isArray(al.j) && (!al.j.length || al.j[0].target.package_name === 'com.bauet.bauet_ict_club'), 'app links: assetlinks.json is served (empty until ANDROID_CERT_SHA256 is set)');
    }
    {
      const ds = await call('GET', '/api/dataset');
      ok(ds.s === 200 && typeof ds.j?.totals?.members === 'number' && Array.isArray(ds.j.eventsByYear) && !JSON.stringify(ds.j).match(/@|\b01[3-9]\d{8}\b/), 'club data page: counts only, no emails or phone numbers', ds.j);
    }
    {
      const bad = await call('POST', '/api/event-registrations/lost', { email: 'nope' });
      const good = await call('POST', '/api/event-registrations/lost', { email: 'nobody-here@example.com' });
      ok(bad.s === 400 && good.s === 200 && good.j?.success === true, 'lost ticket: bad address refused, any valid address gets the same answer');
    }
    // the assistant sees what the admin just saved (no waiting for the cache), and answers from it without an AI key
    {
      const ask = async (message) => (await call('POST', '/api/chat', { message })).j?.reply || '';
      await ask('hello'); // fills the assistant's memory first, so the next lines prove it is forgotten on save
      await call('POST', '/api/events', { title: 'Zorbaglot Night', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: '10:00', location: 'Hall 7' }, T);
      const adv = await call('POST', '/api/advisors', { name: 'Dr. Quinlan Vexley', designation: 'Professor', department: 'CSE' }, T);
      const jb = await call('POST', '/api/jobs', { title: 'Plumbus Engineer', company: 'Acme QA', kind: 'Job', work_mode: 'Remote', apply_email: 'jobs@example.com' }, T); ok(jb.s === 201 || jb.s === 200, 'job create', jb.j);
      await call('POST', '/api/contests', { title: 'Wumbo Cup', status: 'open', team_min: 1, team_max: 3, prize: 'Gold' }, T);
      ok(adv.s === 201 || adv.s === 200, 'advisor create', adv.j);
      { const r = await ask('upcoming event ki ache?'); ok(/Zorbaglot/.test(r), 'assistant: a new event is known at once', r.slice(0, 160)); }
      ok(/Quinlan/.test(await ask('who are the advisors?')), 'assistant: a new advisor is known at once');
      { const r = await ask('any job or internship?'); ok(/Plumbus/.test(r), 'assistant: a new job is known at once', r.slice(0, 160)); }
      ok(/Wumbo/.test(await ask('which contest is open?')), 'assistant: a new contest is known at once');
      // the newer site sections are wired into the assistant too
      const ses = await call('POST', '/api/weekly_sessions', { title: 'Zorbaglot Study Circle', day: 'Friday', time: '5:00 PM', place: 'Lab 9' }, T);
      ok(ses.s === 201 || ses.s === 200, 'weekly session create', ses.j);
      ok(/Zorbaglot Study Circle/.test(await ask('what weekly sessions do you have?')), 'assistant: a new weekly session is known at once');
      const ach = await call('POST', '/api/achievements', { title: 'Zorbaglot Gold Medal', description: 'First place at the national round' }, T);
      ok(ach.s === 201 || ach.s === 200, 'achievement create', ach.j);
      ok(/Zorbaglot Gold/.test(await ask('what has the club achieved?')), 'assistant: a new achievement is known at once');
      ok(/gallery/i.test(await ask('show me the gallery')), 'assistant: the photo gallery is known');
    }
    {
      const labels = ((await call('GET', '/api/committees')).j || []).map((x) => x.label);
      ok(['Winter 2026', 'Summer 2027', 'Winter 2027', 'Summer 2028', 'Winter 2028', 'Summer 2029', 'Winter 2029', 'Summer 2030', 'Winter 2030'].every((l) => labels.includes(l)), 'committee sessions are ready from Winter 2026 to Winter 2030', labels);
    }
    // ---- phone notifications: the app registers its token; nothing is sent without Firebase set up ----
    {
      const tokenA = `qa-token-${'a'.repeat(40)}:APA91b_x-y`;
      ok((await call('POST', '/api/push/register', { token: 'short' })).s === 400, 'push: a bad token is refused');
      ok((await call('POST', '/api/push/register', { token: tokenA, platform: 'android', lang: 'bn' })).s === 200, 'push: token saved');
      ok((await call('POST', '/api/push/register', { token: tokenA })).s === 200, 'push: saving the same token again is fine');
      ok((await call('POST', '/api/push/unregister', { token: tokenA })).s === 200, 'push: token removed');
      ok((await call('POST', '/api/push/unregister', { token: '!!' })).s === 400, 'push: bad token on unregister refused');
      const st = await call('GET', '/api/push/status', undefined, T);
      ok(st.s === 200 && st.j.configured === false && st.j.phones === 0 && /not set/.test(st.j.problem), 'push: status page tells the key is not set');
      ok((await call('GET', '/api/push/status')).s === 401, 'push: status needs an admin login');
      const tst = await call('POST', '/api/push/test', {}, T);
      ok(tst.s === 200 && tst.j.sent === 0, 'push: the test message sends nothing when the key is not set');
      ok((await call('POST', '/api/push/register', { token: tokenA, platform: 'android', lang: 'bn', topics: ['events', 'jobs', 'nonsense'] })).s === 200, 'push: topics are saved (unknown ones ignored)');
      ok((await call('POST', '/api/push/register', { token: tokenA, topics: [] })).s === 200, 'push: switching every topic off is allowed');
      ok((await call('POST', '/api/push/send', { title: 'Hello', body: 'Test message' })).s === 401, 'push: sending a message needs an admin login');
      ok((await call('POST', '/api/push/send', { title: 'x', body: 'y' }, T)).s === 400, 'push: a too-short message is refused');
      ok((await call('POST', '/api/push/send', { title: 'Class moved', body: 'Room 204 at 3 pm', page: '/events' }, T)).s === 409, 'push: sending says it is not set up when there is no Firebase key');
      const push = require('../utils/push');
      ok(push.enabled() === false, 'push: off when no Firebase key is set');
      ok((await push.remindDue()) === 0, 'push: reminders do nothing without a key');
      ok(Array.isArray(push.TOPICS) && push.TOPICS.includes('jobs') && push.TOPICS.includes('contests'), 'push: the topics exist');

      ok((await push.broadcast({ title: 'x', body: 'y' })) === 0, 'push: broadcast does nothing without a key');
      // the Firebase key may be pasted in many shapes: the reader must cope with them
      {
        const cr = require('crypto'); const kp = cr.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
        const raw = JSON.stringify({ type: 'service_account', project_id: 'demo', private_key: kp.privateKey, client_email: 'sa@demo.iam.gserviceaccount.com' }, null, 2);
        const shapes = { 'as downloaded': raw, 'one line': raw.replace(/\s*\n\s*/g, ' '), 'quoted': JSON.stringify(raw), 'base64': Buffer.from(raw).toString('base64'), 'key lines as spaces': raw.replace(/\\n/g, ' ') };
        for (const [n, v] of Object.entries(shapes)) { const j = push.parseAccount(v); ok(!!j && j.project_id === 'demo' && j.client_email === 'sa@demo.iam.gserviceaccount.com', `push: the Firebase key pasted ${n} is understood`); }
      }
      const crypto = require('crypto');
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
      const jwt = push.signJwt({ client_email: 'svc@example.iam.gserviceaccount.com', private_key: privateKey }, 1700000000);
      const [h, c, s2] = jwt.split('.');
      const pad = (x) => Buffer.from(x.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
      ok(crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, pad(s2)), 'push: the signed request verifies with the public key');
      const claim = JSON.parse(pad(c).toString());
      ok(claim.iss === 'svc@example.iam.gserviceaccount.com' && claim.aud === 'https://oauth2.googleapis.com/token' && claim.exp === 1700003600 && /firebase\.messaging/.test(claim.scope), 'push: the request carries the right sender, audience and scope');
    }
    ok((await call('GET', '/api/jobs/run')).s === 404, 'job trigger hidden without key');
    ok((await call('GET', '/api/jobs/run?key=qa-cron-secret-123456')).s === 200, 'job trigger with key');
    ok((await call('GET', '/api/events/abc')).s < 500, 'bad id is not a 500');

    // stand-alone form: create, limit, duplicate, honeypot
    const f = (await call('POST', '/api/forms', { title: 'QA form' }, T)).j; ok(f?.id, 'form create');
    const pub = (await call('GET', `/api/forms/public/${f.slug}`)).j; const fields = pub.reg_form.fields;
    const rf = { ...pub.reg_form, unique: fields.find((x) => x.type === 'email')?.id || pub.reg_form.unique };
    ok((await call('PUT', `/api/forms/${f.id}`, { reg_form: rf, capacity: 5 }, T)).s === 200, 'form settings saved');
    const res = await Promise.all(Array.from({ length: 20 }, (_, i) => call('POST', `/api/forms/public/${f.slug}`, { answers: fill(fields, i) })));
    ok(res.filter((r) => r.s === 201).length === 5, '20 simultaneous sign-ups for 5 seats give exactly 5', res.map((r) => r.s));
    ok(res.every((r) => r.s < 500), 'no server errors under load');
    ok((await call('POST', `/api/forms/public/${f.slug}`, { answers: fill(fields, 0) })).s === 409, 'duplicate or full is refused');
    ok((await call('POST', `/api/forms/public/${f.slug}`, { _hp: 'bot', answers: {} })).s === 201 && (await call('GET', `/api/forms/${f.id}/responses`, undefined, T)).j.length === 5, 'honeypot saves nothing');
    const csvRaw = await fetch(`${B}/api/forms/${f.id}/export`, { headers: { authorization: `Bearer ${T}` } }); const bytes = new Uint8Array(await csvRaw.arrayBuffer()); ok(csvRaw.status === 200 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF, 'CSV export starts with BOM');
    ok((await call('GET', `/api/forms/${f.id}/export`)).s === 401, 'export needs login');
    ok(new TextDecoder().decode(bytes).includes('\r\n'), 'CSV uses the line endings Excel expects');
    const formXlsx = await fetch(`${B}/api/forms/${f.id}/export?format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
    const formZip = new Uint8Array(await formXlsx.arrayBuffer());
    ok(formXlsx.status === 200 && formZip[0] === 0x50 && formZip[1] === 0x4b && /spreadsheetml/.test(formXlsx.headers.get('content-type') || ''), 'form responses download as a real Excel workbook', formXlsx.status);

    // every question type is stored, returned and exported exactly as it was answered
    {
      const all = await call('POST', '/api/forms', { title: 'QA every type' }, T);
      const everyType = [
        { id: 'name', key: 'name', type: 'short', label: 'Your name', required: true },
        { id: 'email', key: 'email', type: 'email', label: 'Email', required: true },
        { id: 'phone', key: 'phone', type: 'phone', label: 'Mobile' },
        { id: 'story', type: 'long', label: 'Tell us more' },
        { id: 'age', type: 'number', label: 'Age' },
        { id: 'day', type: 'date', label: 'Day' },
        { id: 'at', type: 'time', label: 'Time' },
        { id: 'track', type: 'dropdown', label: 'Track', options: ['Web', 'AI'] },
        { id: 'level', type: 'radio', label: 'Level', options: ['New', 'Pro'] },
        { id: 'picks', type: 'checkbox', label: 'Picks', options: ['a', 'b', 'c'] },
        { id: 'agree', type: 'yesno', label: 'Agree' },
        { id: 'rate', type: 'scale', label: 'Rate', scale: { max: 5 } },
        { id: 'shot', type: 'photo', label: 'Photo' },
        { id: 'more', type: 'section', label: 'A heading' },
      ];
      const put = await call('PUT', `/api/forms/${all.j.id}`, { reg_form: { title: 'All', unique: 'email', fields: everyType } }, T);
      ok(put.s === 200 && put.j.reg_form.fields.length === 14, 'a form with every question type can be saved', put.j?.reg_form?.fields?.length);
      const answers = { name: 'Nusrat জাহান', email: 'all@example.com', phone: '01712345678', story: 'Line one\nLine two', age: 21, day: '2026-12-01', at: '09:30', track: 'AI', level: 'Pro', picks: ['a', 'c'], agree: 'Yes', rate: 4, shot: `/uploads/${'a'.repeat(24)}.jpg` };
      const sub = await call('POST', `/api/forms/public/${all.j.slug}`, { answers });
      ok(sub.s === 201, 'every question type is accepted', sub.j);
      const row = ((await call('GET', `/api/forms/${all.j.id}/responses`, undefined, T)).j || [])[0];
      const same = row && Object.entries(answers).every(([k, v]) => JSON.stringify(row.answers[k]) === JSON.stringify(v));
      ok(same, 'every answer comes back exactly as it was sent', row?.answers);
      const edit = await call('PATCH', `/api/forms/responses/${row?.id}/answers`, { answers: { age: 22 } }, T);
      ok(edit.s === 200 && edit.j?.answers?.age === 22 && edit.j.answers.story === answers.story && edit.j.answers.picks.join(',') === 'a,c', 'a cell edit keeps every other answer', edit.j?.answers);
      const csv = await (await fetch(`${B}/api/forms/${all.j.id}/export`, { headers: { authorization: `Bearer ${T}` } })).text();
      const labels = ['Your name', 'Email', 'Mobile', 'Tell us more', 'Age', 'Day', 'Time', 'Track', 'Level', 'Picks', 'Agree', 'Rate', 'Photo'];
      ok(labels.every((l) => csv.includes(l)) && csv.includes('Nusrat') && csv.includes('Line one'), 'the spreadsheet download has every question and every answer', csv.slice(0, 160));
      await call('DELETE', `/api/forms/${all.j.id}`, undefined, T);
    }

    // editing answers like a spreadsheet cell
    const resp = (await call('GET', `/api/forms/${f.id}/responses`, undefined, T)).j; const emailId = fields.find((x) => x.type === 'email').id; const nameId0 = fields.find((x) => x.type === 'short').id;
    const ed = await call('PATCH', `/api/forms/responses/${resp[0].id}/answers`, { answers: { [nameId0]: 'Corrected Name' } }, T);
    ok(ed.s === 200 && ed.j.answers[nameId0] === 'Corrected Name' && ed.j.full_name === 'Corrected Name', 'response cell edit saved');
    ok((await call('PATCH', `/api/forms/responses/${resp[0].id}/answers`, { answers: { [emailId]: 'not-an-email' } }, T)).s === 400, 'bad edit refused');
    ok((await call('PATCH', `/api/forms/responses/${resp[0].id}/answers`, { answers: { [emailId]: resp[1].answers[emailId] } }, T)).s === 409, 'edit cannot copy another persons unique value');
    ok((await call('PATCH', `/api/forms/responses/${resp[0].id}/answers`, { answers: { [nameId0]: 'x' } })).s === 401, 'edit needs login');
    ok((await call('PATCH', '/api/forms/responses/999999/answers', { answers: { a: 1 } }, T)).s === 404, 'edit of missing response is 404');

    // answer rules, pages, theme
    const f3 = (await call('POST', '/api/forms', { title: 'QA rules' }, T)).j;
    const rules = { title: 'Rules', fields: [
      { id: 'sid', type: 'short', label: 'ID', required: true, pattern: '^[0-9]{6}$', patternMsg: 'Six digits', minLen: 2 },
      { id: 'age', type: 'number', label: 'Age', min: 10, max: 30, whole: true },
      { id: 'pg', type: 'section', label: 'Page two', page: true },
      { id: 'pick', type: 'checkbox', label: 'Pick two', options: ['a', 'b', 'c'], minSel: 2, maxSel: 2, shuffle: true },
    ], theme: '#7C3AED' };
    const put = await call('PUT', `/api/forms/${f3.id}`, { reg_form: rules }, T);
    ok(put.s === 200 && put.j.reg_form.theme === '#7c3aed' && put.j.reg_form.fields[2].page === true, 'rules, page and colour are saved');
    ok((await call('PUT', `/api/forms/${f3.id}`, { reg_form: { fields: [{ id: 'x', type: 'short', label: 'x', pattern: '([' }] } }, T)).s === 400, 'broken pattern refused');
    const bad = await call('POST', `/api/forms/public/${f3.slug}`, { answers: { sid: '12', age: 5.5, pick: ['a'] } });
    ok(bad.s === 400 && bad.j.fields.sid === 'Six digits' && /whole/.test(bad.j.fields.age) && /at least 2/.test(bad.j.fields.pick), 'answer rules are enforced', bad.j);
    ok((await call('POST', `/api/forms/public/${f3.slug}`, { answers: { sid: '123456', age: 20, pick: ['a', 'c'] } })).s === 201, 'valid answers accepted');

    // templates and copies
    const tpl = await call('POST', '/api/forms', { title: 'From template', reg_form: { title: 'T', unique: 'email', fields: [{ id: 'name', key: 'name', type: 'short', label: 'Name', required: true }, { id: 'email', key: 'email', type: 'email', label: 'Email', required: true }] } }, T);
    ok(tpl.s === 201 && tpl.j.reg_form.fields.length === 2 && tpl.j.reg_form.unique === 'email', 'form from a template');
    ok((await call('POST', '/api/forms', { title: 'Bad template', reg_form: { fields: [{ id: 'a', type: 'dropdown', label: 'x', options: ['one'] }] } }, T)).s === 400, 'broken template refused');
    const cp = await call('POST', `/api/forms/${tpl.j.id}/duplicate`, undefined, T);
    ok(cp.s === 201 && cp.j.title === 'Copy of From template' && cp.j.slug !== tpl.j.slug && cp.j.reg_form.fields.length === 2, 'form copied');
    ok((await call('DELETE', `/api/forms/${cp.j.id}`, undefined, T)).s === 200 && (await call('GET', `/api/forms/public/${cp.j.slug}`)).s === 404, 'deleted form link stops working');

    // ZIP download (list + pictures) is a real zip file
    const zr = await fetch(`${B}/api/forms/${f.id}/zip`, { headers: { authorization: `Bearer ${T}` } }); const zb = new Uint8Array(await zr.arrayBuffer());
    ok(zr.status === 200 && zb[0] === 0x50 && zb[1] === 0x4B && zb.length > 100, 'ZIP download works', zr.status);
    // spreadsheet formula injection
    const f2 = (await call('POST', '/api/forms', { title: 'QA inject' }, T)).j; const p2 = (await call('GET', `/api/forms/public/${f2.slug}`)).j;
    const a = fill(p2.reg_form.fields, 1); const nameId = p2.reg_form.fields.find((x) => x.type === 'short').id; a[nameId] = '=HYPERLINK("http://evil")';
    await call('POST', `/api/forms/public/${f2.slug}`, { answers: a });
    ok(!(await call('GET', `/api/forms/${f2.id}/export`, undefined, T)).t.includes(',=HYPERLINK') && !(await call('GET', `/api/forms/${f2.id}/export`, undefined, T)).t.includes('"=HYPERLINK'), 'CSV formulas neutralised');

    // event registration: capacity, ticket, check-in
    const ev = (await call('POST', '/api/events', { title: 'QA event', date: '2099-01-01', time: '10:00', location: 'Hall', description: 'd', capacity: 3, reg_open: true }, T)).j; ok(ev?.id, 'event create');
    const r2 = await Promise.all(Array.from({ length: 10 }, (_, i) => call('POST', `/api/event-registrations/${ev.id}`, { answers: { name: `Person ${i}`, student_id: `S${i}`, email: `e${i}@example.com` } })));
    const okRegs = r2.filter((r) => r.s === 201 && !r.j.waitlisted);
    ok(okRegs.length === 3 && r2.every((r) => r.s === 201), '10 simultaneous event sign-ups for 3 seats give exactly 3 seats, the rest wait in line', r2.map((r) => r.s + (r.j?.error ? ':' + r.j.error : '')));
    ok(r2.filter((r) => r.j.waitlisted).length === 7, 'the other 7 are on the waiting list');
    ok((await call('GET', '/api/event-registrations/counts')).j[ev.id] === 3, 'public count shows only confirmed seats');
    const evList = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j;
    ok((await call('PATCH', `/api/event-registrations/${evList[0].id}/answers`, { answers: { name: 'Edited Person' } }, T)).j?.full_name === 'Edited Person', 'event sign-up edit saved');
    const evXlsx = await fetch(`${B}/api/event-registrations/export?event=${ev.id}&format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
    const evZip = new Uint8Array(await evXlsx.arrayBuffer());
    ok(evXlsx.status === 200 && evZip[0] === 0x50 && evZip[1] === 0x4b && /spreadsheetml/.test(evXlsx.headers.get('content-type') || ''), 'the event list downloads as a real Excel workbook', evXlsx.status);
    const code = okRegs[0]?.j?.ticket;
    ok(!!code && (await call('GET', `/api/event-registrations/ticket/${code}`)).s === 200, 'ticket page data');
    ok((await call('GET', '/api/event-registrations/verify/ZZZZZZZZ')).j?.valid === false, 'unknown certificate is not valid');
    ok((await call('POST', '/api/event-registrations/checkin', { code }, T)).s === 200, 'check-in');
    ok((await call('POST', '/api/event-registrations/checkin', { code }, T)).j?.already === true || (await call('POST', '/api/event-registrations/checkin', { code }, T)).s === 409, 'second check-in is reported');

    // certificates: a real PDF for a checked-in person, nobody gets an email unless the admin picks them, signature pictures only from our host
    {
      const reg_form = { fields: [{ id: 'name', type: 'short', label: 'Name', required: true }], cert: { enabled: true, title: 'Certificate of Participation', organizer: 'Department of ICE, BAUET', signer: 'Advisor Name', signature_url: 'https://evil.example/sig.png' } };
      const up = await call('PUT', `/api/events/${ev.id}`, { reg_form }, T);
      const got = (await call('GET', `/api/events/${ev.id}`)).j?.reg_form?.cert;
      ok(up.s === 200 && got?.enabled && got.organizer === 'Department of ICE, BAUET' && got.signature_url === '', 'certificate settings saved; a signature picture from another host is dropped', got);
      const pdf = await fetch(`${B}/api/event-registrations/certificate/${code}`); const head = Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString();
      ok(pdf.status === 200 && head === '%PDF-' && /pdf/.test(pdf.headers.get('content-type')), 'a checked-in person gets the certificate as a PDF');
      const pv = await fetch(`${B}/api/event-registrations/event/${ev.id}/certificates/preview`, { headers: { authorization: `Bearer ${T}` } });
      ok(pv.status === 200 && Buffer.from(await pv.arrayBuffer()).subarray(0, 5).toString() === '%PDF-', 'the admin can preview the certificate (a sample PDF)');
      ok((await fetch(`${B}/api/event-registrations/event/${ev.id}/certificates/preview`)).status === 401, 'the certificate preview needs an admin login');
      const reg0 = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j.find((x) => x.ticket === code);
      const pvr = await fetch(`${B}/api/event-registrations/event/${ev.id}/certificates/preview?reg=${reg0.id}`, { headers: { authorization: `Bearer ${T}` } });
      ok(pvr.status === 200, 'the admin can preview one person\'s certificate');
      ok((await call('PATCH', `/api/event-registrations/${reg0.id}/cert-name`, { name: 'Dr. Corrected Name' }, T)).j?.cert_name === 'Dr. Corrected Name' && (await call('GET', `/api/event-registrations/verify/${code}`)).j?.name === 'Dr. Corrected Name', 'the name on one person\'s certificate can be corrected');
      ok((await call('PATCH', `/api/event-registrations/${reg0.id}/cert-name`, { name: 'x' })).s === 401, 'only an admin corrects a certificate name');
      const draft = await fetch(`${B}/api/event-registrations/event/${ev.id}/certificates/preview-draft`, { method: 'POST', headers: { authorization: `Bearer ${T}`, 'content-type': 'application/json' }, body: JSON.stringify({ cert: { theme: 'royal', ribbon: 'Awarded to', body: 'for **great work** at {event} on {date}, {location}.', show_seal: false, signer: 'Prof. Dr. A Very Long Named Advisor Of The University', theme_bad: 1 }, reg: reg0.id }) });
      ok(draft.status === 200 && Buffer.from(await draft.arrayBuffer()).subarray(0, 5).toString() === '%PDF-', 'the live preview draws a certificate from settings that are not saved yet');
      ok((await fetch(`${B}/api/event-registrations/event/${ev.id}/certificates/preview-draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401, 'the live preview needs an admin login');

      const certUrl = (x) => `/api/event-registrations/event/${ev.id}/certificates${x}`;
      let rev = (await call('GET', certUrl(''), undefined, T)).j;
      ok(rev.stage === 'draft' && rev.people.length === 0 && !rev.can_publish, 'certificates start as a draft with nobody chosen', rev);
      ok((await call('POST', certUrl('/stage'), { stage: 'review' }, T)).s === 400, 'the final check needs at least one chosen person');
      ok((await call('POST', certUrl('/send'), {}, T)).s === 409, 'nothing is emailed before the final check');
      { const pk = await call('PATCH', certUrl('/pick'), { ids: [reg0.id] }, T); ok(pk.j?.changed === 1, 'the admin ticks a checked-in person', { pk: pk.j, reg: { email: reg0.email, in: reg0.checked_in_at, pay: reg0.pay_status } }); }
      rev = (await call('GET', certUrl(''), undefined, T)).j;
      ok(rev.people.length === 1 && rev.people[0].email === 'e0@example.com' && rev.problems.some((x) => /signature picture/.test(x.text)), 'the final check lists the chosen person and what is missing', rev.problems);
      ok(rev.cert.signer2 === 'Sheikh Noor Abdullah' && rev.cert.signature2_source === 'a designed signature' && rev.cert.theme === 'gold', 'the final check shows the president default and the colour theme', rev.cert);
      ok((await call('POST', certUrl('/stage'), { stage: 'review' }, T)).j?.stage === 'review', 'the admin moves to the final check');
      await call('PATCH', certUrl('/pick'), { ids: [reg0.id], picked: false }, T);
      ok((await call('GET', certUrl(''), undefined, T)).j.stage === 'draft', 'changing the choice sends the admin back to editing');
      // publish for real against the pretend mail service: one mail goes through, one address is refused, one hits the daily limit
      const all = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j;
      const byMail = (m) => all.find((x) => x.email === m);
      for (const m of ['e1@example.com', 'e2@example.com']) await call('POST', '/api/event-registrations/checkin', { code: byMail(m).ticket }, T);
      ok((await call('PATCH', certUrl('/pick'), { all: true }, T)).j?.changed === 3, 'tick everyone who is checked in');
      ok((await call('POST', certUrl('/stage'), { stage: 'review' }, T)).j?.stage === 'review', 'final check again');
      const pub = await call('POST', certUrl('/send'), {}, T);
      ok(pub.s === 200 && pub.j.queued === 3 && pub.j.stage === 'published', 'publishing puts the certificates in the queue', pub.j);
      const waitFor = async (fn, ms = 30000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 400)); } return v; };
      // the first run sends one, then the mail service says "daily limit": the run stops and the rest waits
      const settled = await waitFor(async () => { const j = (await call('GET', certUrl(''), undefined, T)).j; return j.counts.sent === 1 && j.people.find((x) => x.email === 'e2@example.com')?.error ? j : null; });
      const nowRev = (await call('GET', certUrl(''), undefined, T)).j;
      ok(!!settled && settled.counts.queued === 2, 'at the daily limit the sending stops and the rest waits in the queue', { counts: nowRev.counts, people: nowRev.people, mails });
      ok(/Waiting: .*limit/i.test(settled?.people.find((x) => x.email === 'e2@example.com')?.error || ''), 'the waiting person shows why', settled?.people);
      const m0 = mails.find((x) => x.to === 'e0@example.com');
      ok(m0 && m0.pdf === '%PDF-' && m0.bytes > 20000 && /^Certificate - .+\.pdf$/.test(m0.file), 'the mail carries the certificate as a PDF', m0);
      mailLimit = false; // the daily limit is over: the next run of the cron job goes on
      ok((await fetch(`${B}/api/jobs/run?key=qa-cron-secret-123456`)).status === 200, 'the cron job runs');
      const done = await waitFor(async () => { const j = (await call('GET', certUrl(''), undefined, T)).j; return j.counts.queued === 0 ? j : null; });
      ok(done?.counts.sent === 2 && done.counts.failed === 1, 'the waiting certificate goes out at the next run; the refused address ends as failed', done?.counts);
      const pe = (m) => done?.people.find((x) => x.email === m);
      ok(pe('e1@example.com')?.status === 'failed' && /invalid recipient/.test(pe('e1@example.com')?.error || '') && pe('e2@example.com')?.status === 'sent', 'each person shows the right status and the reason when it failed', done?.people);
      ok(mails.filter((x) => x.to === 'e1@example.com').length === 3, 'a failing mail is tried 3 times, then marked failed');
      ok(!(await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j.find((x) => x.email === 'e1@example.com').certificate_sent_at, 'a person whose mail failed is not marked as emailed');
      ok((await call('POST', certUrl('/retry'), {}, T)).j?.queued === 1, 'failed certificates can be tried again');
      ok((await call('GET', certUrl(''))).s === 401, 'the certificate review needs an admin login');
    }

    // a form the admin built by hand (questions without a key): the name and the e-mail are still found, so tickets and certificates reach the person
    {
      const ce = (await call('POST', '/api/events', { title: 'Hand-made form event', date: '2099-03-03', reg_open: true, reg_form: { fields: [{ id: 'q1', type: 'short', label: 'Your full name', required: true }, { id: 'q2', type: 'email', label: 'Mail address', required: true }, { id: 'q3', type: 'phone', label: 'Mobile' }, { id: 'q4', type: 'short', label: 'Student ID' }] } }, T)).j;
      const cr = await call('POST', `/api/event-registrations/${ce.id}`, { answers: { q1: 'Hand Made', q2: 'Hand.Made@Example.com', q3: '01712345678', q4: 'S-77' } });
      const row = (await call('GET', `/api/event-registrations/by-event/${ce.id}`, undefined, T)).j[0];
      ok(cr.s === 201 && row.full_name === 'Hand Made' && row.email === 'hand.made@example.com' && row.phone && row.student_id === 'S-77', 'a hand-made form still fills the name, e-mail, phone and student ID', { s: cr.s, row: row && { n: row.full_name, e: row.email, p: row.phone, i: row.student_id } });
    }

    // points, badges and the leaderboard
    {
      const me = await call('GET', `/api/points/me?ticket=${code}`);
      ok(me.s === 200 && me.j.points === 10 && me.j.events === 1 && me.j.badges.some((b) => b.id === 'first') && me.j.rank === 1, 'a checked-in person has 10 points, the First step badge and rank 1', me.j);
      ok(/^\S+( \S\.)?$/.test(me.j.name) && !JSON.stringify(me.j).includes('@'), 'the person is shown with a masked name and no e-mail');
      ok((await call('GET', '/api/points/me?ticket=ZZZZZZZZ')).s === 404, 'an unknown ticket has no points');
      ok((await call('POST', '/api/points/award', { email: 'e0@example.com', points: 5, reason: 'x' })).s === 401, 'only an admin gives points');
      ok((await call('POST', '/api/points/award', { email: 'not-an-email', points: 5, reason: 'x' }, T)).s === 400 && (await call('POST', '/api/points/award', { email: 'a@b.co', points: 0, reason: 'x' }, T)).s === 400 && (await call('POST', '/api/points/award', { email: 'a@b.co', points: 5, reason: '' }, T)).s === 400, 'a bad award is refused');
      const aw = await call('POST', '/api/points/award', { email: 'volunteer@example.com', name: 'Zara Volunteer', points: 120, reason: 'Ran the registration desk' }, T);
      ok(aw.s === 201, 'an admin can give bonus points', aw.j);
      const lb = (await call('GET', '/api/points/leaderboard')).j;
      ok(lb.top[0]?.name === 'Zara V.' && lb.top[0].points === 120 && lb.top[0].badges.some((b) => b.id === 'century') && lb.top[0].badges.some((b) => b.id === 'helper'), 'the leaderboard ranks by points and masks names', lb.top);
      ok(!JSON.stringify(lb).includes('@'), 'the public leaderboard never shows an e-mail');
      const adm = (await call('GET', '/api/points/admin', undefined, T)).j;
      ok(adm.people.some((x) => x.email === 'volunteer@example.com') && adm.awards.length === 1, 'the admin sees e-mails and the award history');
      ok((await call('GET', '/api/points/admin')).s === 401, 'the admin table needs a login');
      const upd = await call('PUT', `/api/points/award/${aw.j.id}`, { points: 40, reason: 'Ran the desk (corrected)' }, T);
      ok(upd.s === 200 && upd.j.points === 40 && (await call('GET', '/api/points/leaderboard')).j.top[0].points === 40, 'an award can be corrected', upd.j);
      ok((await call('PUT', `/api/points/award/${aw.j.id}`, { points: 0 }, T)).s === 400 && (await call('PUT', `/api/points/award/${aw.j.id}`, { points: 5 })).s === 401, 'a bad correction is refused and needs a login');
      ok((await call('DELETE', `/api/points/award/${aw.j.id}`, undefined, T)).s === 200 && ((await call('GET', '/api/points/leaderboard')).j.top[0]?.points || 0) === 10, 'an award can be undone');
    }

    // waiting list: a seat freed up gives the place to the oldest person waiting
    const all = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j;
    const waiting = all.filter((x) => x.waitlisted).sort((a, b) => a.id - b.id);
    const wcode = waiting[0]?.ticket;
    ok(waiting.length === 7 && (await call('POST', '/api/event-registrations/checkin', { code: wcode }, T)).s === 409, 'a waiting person cannot be checked in');
    ok((await call('GET', `/api/event-registrations/ticket/${wcode}`)).j?.status === 'waitlist', 'ticket says waiting list');
    const gone = all.find((x) => !x.waitlisted);
    ok((await call('DELETE', `/api/event-registrations/${gone.id}`, undefined, T)).s === 200, 'a confirmed person removed');
    await new Promise((r) => setTimeout(r, 400));
    const after = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j;
    ok(after.filter((x) => !x.waitlisted).length === 3 && after.filter((x) => x.waitlisted).length === 6, 'one waiting person got the free seat');
    ok(!after.find((x) => x.id === waiting[0].id).waitlisted, 'the person who waited longest got it first');
    const prom = await call('PATCH', `/api/event-registrations/${waiting[1].id}/promote`, {}, T);
    ok(prom.s === 200 && prom.j.waitlisted === false, 'admin can give a waiting person a seat by hand', prom);
    ok((await call('PATCH', `/api/event-registrations/${waiting[1].id}/promote`, {}, T)).s === 404, 'promote only works for people waiting');

    // people cancel their own sign-up: the seat goes to the next in line
    const cur = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j;
    const mines = cur.filter((x) => !x.waitlisted && !x.checked_in_at);
    const mineC = mines[0];
    const waitC = cur.filter((x) => x.waitlisted).sort((a, b) => a.id - b.id)[0];
    ok((await call('GET', `/api/event-registrations/ticket/${mineC.ticket}`)).j?.can_cancel === true, 'ticket says it can be cancelled');
    ok((await call('POST', `/api/event-registrations/ticket/${code}/cancel`)).s === 409, 'a checked-in person cannot cancel');
    ok((await call('POST', '/api/event-registrations/ticket/ZZZZZZZZZZ/cancel')).s === 404, 'unknown ticket cannot cancel');
    ok((await call('POST', `/api/event-registrations/ticket/${mineC.ticket}/cancel`)).s === 200, 'person cancels their own sign-up');
    await new Promise((r) => setTimeout(r, 400));
    ok((await call('GET', `/api/event-registrations/ticket/${mineC.ticket}`)).s === 404, 'cancelled ticket stops working');
    // the hand-given seat made the event 4 of 3, so one more cancel is needed before a seat is really free
    ok((await call('POST', `/api/event-registrations/ticket/${mines[1].ticket}/cancel`)).s === 200, 'a second person cancels');
    await new Promise((r) => setTimeout(r, 400));
    ok((await call('GET', `/api/event-registrations/ticket/${waitC.ticket}`)).j?.status === 'confirmed', 'the next person in line got the seat');

    // events that send people to another form (Google Forms ...)
    ok((await call('POST', '/api/events', { title: 'Bad link', date: '2099-01-01', reg_url: 'javascript:alert(1)' }, T)).s === 409, 'javascript: link refused');
    const ext = await call('POST', '/api/events', { title: 'Google form event', date: '2099-02-01', reg_url: ' https://forms.gle/abc123 ' }, T);
    ok(ext.s === 201 && ext.j.reg_url === 'https://forms.gle/abc123', 'web link accepted and trimmed', ext.j);

    // short links
    const sl = await call('POST', '/api/short', { path: `/f/${f.slug}` }, T);
    ok(sl.s === 201 && /^[a-z0-9]{6}$/.test(sl.j.code), 'short link made');
    ok((await call('POST', '/api/short', { path: `/f/${f.slug}` }, T)).j.code === sl.j.code, 'same page gets the same short link');
    const go = await fetch(`${B}/s/${sl.j.code}`, { redirect: 'manual' });
    ok(go.status === 302 && go.headers.get('location') === `/f/${f.slug}`, 'short link redirects');
    ok((await fetch(`${B}/s/zzzzzz`, { redirect: 'manual' })).status !== 302, 'unknown short link does not redirect');
    ok((await call('POST', '/api/short', { path: 'https://evil.example' }, T)).s === 400, 'short link only for our own pages');
    ok((await call('POST', '/api/short', { path: `/f/${f.slug}` })).s === 401, 'short link needs login');
    ok((await call('POST', '/api/short', { path: `/f/${f.slug}`, alias: 'qa-survey' }, T)).j.code === 'qa-survey' && (await call('POST', '/api/short', { path: '/events/1', alias: 'qa-survey' }, T)).s === 409, 'custom name works and cannot be stolen');

    // renaming a form's link name: the old link, the short link and the new link all keep working
    const rn = (await call('POST', '/api/forms', { title: 'Rename me' }, T)).j;
    const rnShort = (await call('POST', '/api/short', { path: `/f/${rn.slug}` }, T)).j.code;
    ok((await call('PUT', `/api/forms/${rn.id}`, { slug: 'renamed-form' }, T)).j?.slug === 'renamed-form', 'link name changed');
    ok((await call('GET', '/api/forms/public/renamed-form')).s === 200 && (await call('GET', `/api/forms/public/${rn.slug}`)).s === 200, 'new and old link names both open the form');
    ok((await fetch(`${B}/s/${rnShort}`, { redirect: 'manual' })).headers.get('location') === '/f/renamed-form', 'short link follows the rename');

    // activity log, editor login, backup
    const mk = await call('POST', '/api/team', { username: 'editor1', password: 'Editor-Pass-123' }, T);
    ok(mk.s === 201 && mk.j.role === 'editor', 'editor login created');
    const et = (await call('POST', '/api/auth/login', { username: 'editor1', password: 'Editor-Pass-123' })).j?.token;
    ok(!!et && (await call('GET', '/api/events')).s === 200, 'editor can sign in');
    ok((await call('POST', '/api/forms', { title: 'Editor made this' }, et)).s === 201, 'editor can create forms');
    ok((await call('DELETE', `/api/forms/${rn.id}`, undefined, et)).s === 403, 'editor cannot delete');
    ok((await call('GET', '/api/backup', undefined, et)).s === 403 && (await call('GET', '/api/team', undefined, et)).s === 403 && (await call('GET', '/api/audit', undefined, et)).s === 403, 'editor cannot reach backup, team or activity');
    const bk = await fetch(`${B}/api/backup`, { headers: { authorization: `Bearer ${T}` } }); const bb = new Uint8Array(await bk.arrayBuffer());
    ok(bk.status === 200 && bb[0] === 0x50 && bb[1] === 0x4B, 'main admin can download a backup');
    { const txt = Buffer.from(bb).toString('latin1'); ok(txt.includes('jobs.json') && txt.includes('advisors.json') && txt.includes('README.txt') && !txt.includes('push_tokens.json'), 'the backup holds every table (jobs, advisors...) and no phone tokens'); }
    await new Promise((r) => setTimeout(r, 300));
    const log = (await call('GET', '/api/audit', undefined, T)).j || [];
    ok(log.some((x) => x.username === 'editor1' && x.method === 'POST' && x.path === '/api/forms'), 'activity log shows who created a form', log.slice(0, 3));
    ok((await call('DELETE', `/api/team/${mk.j.id}`, undefined, T)).s === 200, 'editor login removed');

    // site search, member card, feedback form link, event structured data
    const se = await call('POST', '/api/events', { title: 'Zebra Python Workshop', date: '2099-05-05', time: '03:30 PM', location: 'Lab 9', description: 'learn zebras', reg_form: { fields: [{ id: 'name', type: 'short', label: 'Name', required: true }, { id: 'email', type: 'email', label: 'Email', required: true }], feedback_form: 'qa-feedback' } }, T);
    ok(se.s === 201, 'event with a feedback form chosen can be saved', se.j);
    const seId = se.j?.id;
    ok((await call('GET', `/api/events/${seId}`)).j?.reg_form?.feedback_form === 'qa-feedback', 'the chosen feedback form is kept');
    const srch = (await call('GET', '/api/search?q=zebra')).j || [];
    ok(srch.some((r) => r.type === 'event' && r.id === seId && r.path === `/events/${seId}`), 'search finds an event by a word', srch);
    ok(((await call('GET', '/api/search?q=a')).j || []).length === 0, 'a one-letter search returns nothing');
    ok((await call('GET', '/api/search?q=%25%25')).s === 200, 'percent signs in a search do not break it');
    const mem = ((await call('GET', '/api/members')).j || [])[0];
    const card = (await call('GET', `/api/card/${mem.id}`)).j;
    ok(!!card?.code && /^M\d+-[A-Z2-9]{6}$/.test(card.code) && card.verified === false && card.member?.name === mem.name, 'member card has a signed code', card);
    ok((await call('GET', `/api/card/${mem.id}?c=${card.code}`)).j?.verified === true, 'the real card code is verified');
    ok((await call('GET', `/api/card/${mem.id}?c=M${mem.id}-AAAAAA`)).j?.verified === false, 'a made-up card code is not verified');
    ok((await call('GET', '/api/card/99999999')).s === 404, 'card of an unknown member is 404');
    // changing a card needs proof: its public code must never rewrite someone's photo or birth date
    ok((await call('PATCH', `/api/card/${mem.id}/birthdate`, { birth_date: '2000-01-02' })).s === 403, 'a birth date cannot be changed without proof');
    const withPublicCode = await call('PATCH', `/api/card/${mem.id}/birthdate`, { code: card.code, birth_date: '2000-01-02' });
    ok(withPublicCode.s === 403 && withPublicCode.j?.needs_otp === true, 'the public card code alone cannot change a birth date', withPublicCode.j);
    ok((await call('PATCH', `/api/card/${mem.id}/birthdate`, { proof: 'made.up', birth_date: '2000-01-02' })).s === 403, 'a made-up proof is refused');
    ok((await call('PATCH', `/api/card/${mem.id}/photo`, { photo_url: 'https://res.cloudinary.com/someone-else/image/upload/a.jpg' })).s === 400, 'a photo from another Cloudinary account is refused');
    ok((await call('PATCH', `/api/card/${mem.id}/birthdate`, { birth_date: '2000-01-02' }, T)).s === 200, 'an admin may still correct a birth date');
    // the card e-mail code: a stranger gets the same answer as a member, and a wrong code changes nothing
    const stranger = await call('POST', '/api/card/otp/request', { email: 'definitely-not-a-member@example.com' });
    ok(stranger.s === 200 && !stranger.j?.error, 'asking for a card code for a stranger looks like asking for a member', stranger.j);
    ok((await call('POST', '/api/card/otp/verify', { email: 'definitely-not-a-member@example.com', code: '123456' })).s === 400, 'a wrong card code is refused');

    // admin downloads: every list as CSV or JSON, admins only
    ok((await call('GET', '/api/downloads')).s === 401, 'downloading the lists needs a login');
    const dl = await call('GET', '/api/downloads', undefined, T);
    ok(dl.s === 200 && Array.isArray(dl.j) && dl.j.some((x) => x.key === 'applications' && typeof x.count === 'number'), 'the download page lists the datasets', dl.j && dl.j.length);
    const csv = await call('GET', '/api/downloads/members?format=csv', undefined, T);
    ok(csv.s === 200 && /name/.test(csv.t.split('\n')[0]) && !csv.t.startsWith('<'), 'a list downloads as CSV with a header row', csv.t.slice(0, 120));
    const dlJson = await call('GET', '/api/downloads/members?format=json', undefined, T);
    ok(dlJson.s === 200 && Array.isArray(dlJson.j?.data), 'a list downloads as JSON');
    const ranged = await call('GET', '/api/downloads/applications?format=csv&from=2020-01-01&to=2099-12-31', undefined, T);
    ok(ranged.s === 200, 'a date range does not break the download', ranged.t.slice(0, 120));
    ok((await call('GET', '/api/downloads/not-a-list', undefined, T)).s === 404, 'an unknown list is 404');
    ok((await call('POST', `/api/event-registrations/event/${seId}/feedback/send`, {}, T)).s === 409, 'feedback link cannot be sent when email is not set up');
    ok((await call('POST', `/api/event-registrations/event/${seId}/feedback/send`, {})).s === 401, 'sending feedback needs an admin login');
    const html = await (await fetch(`${B}/events/${seId}`)).text();
    ok(html.includes('application/ld+json') && html.includes('"@type":"Event"') && html.includes('2099-05-05T15:30:00+06:00'), 'event page carries structured data for Google', html.slice(0, 200));

    // online payment through the gateway (a pretend one), next to paying by hand
    {
      ok((await call('GET', '/api/pay/status')).j?.gateway === true, 'the server says online payment is available');
      const fields = [{ id: 'name', key: 'name', type: 'short', label: 'Name', required: true }, { id: 'email', key: 'email', type: 'email', label: 'Email', required: true }];
      const mkEv = (title, payment, capacity) => call('POST', '/api/events', { title, date: '2099-06-06', time: '10:00', location: 'Lab', description: 'pay', capacity, reg_form: { fields, payment } }, T);
      const both = await mkEv('Pay both ways', { enabled: true, amount: 200, manual: true, online: true, methods: ['bKash'], numbers: { bKash: '01711111111' } });
      ok(both.s === 201 && both.j.reg_form.payment.online === true && both.j.reg_form.payment.manual === true, 'an event can allow both ways to pay', both.j);
      ok((await mkEv('Pay nothing', { enabled: true, amount: 200, manual: false, online: false })).s >= 400, 'at least one way to pay is required');
      ok((await mkEv('Manual needs a number', { enabled: true, amount: 200, manual: true, online: false, methods: ['bKash'], numbers: {} })).s >= 400, 'paying by hand still needs a number to send money to');
      const only = await mkEv('Online only', { enabled: true, amount: 200, manual: false, online: true });
      ok(only.s === 201 && only.j.reg_form.payment.manual === false && only.j.reg_form.payment.methods.length === 0, 'an online-only event needs no mobile numbers', only.j);
      const reg = (id, body) => call('POST', `/api/event-registrations/${id}`, { answers: { name: 'Pay Tester', email: `pt${Math.random().toString(36).slice(2, 8)}@example.com` }, ...body });
      const old = await call('POST', `/api/event-registrations/${only.j.id}`, { answers: { name: 'Hand', email: 'hand@example.com' }, payment: { method: 'bKash', sender: '01712345678', trx_id: 'ABC123XYZ9' } });
      ok(old.s === 409, 'paying by hand is refused on an online-only event', old.j);
      const o1 = await reg(only.j.id, { pay_mode: 'online' });
      ok(o1.s === 201 && /^http:\/\/pay\.example\/bauet-[a-f0-9]{16}$/.test(o1.j.pay_url) && o1.j.pending_payment, 'online sign-up gives the payment page address', o1.j);
      const tk = (code) => call('GET', `/api/event-registrations/ticket/${code}`);
      ok((await tk(o1.j.ticket)).j.status === 'pending', 'before paying the place is pending');
      ok((await call('GET', `/api/pay/check/${o1.j.tran_id}`)).j.status === 'waiting', 'the payment check says waiting');
      const form = (o) => ({ method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });
      const bad = await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: o1.j.tran_id, val_id: 'val-nonsense' }));
      ok(bad.status === 303 && bad.headers.get('location').startsWith(`/events/${only.j.id}?pay=failed`), 'a payment the gateway cannot prove is refused', bad.headers.get('location'));
      ok((await tk(o1.j.ticket)).j.status === 'cancelled', 'an unproven payment frees the place');
      const o2 = await reg(only.j.id, { pay_mode: 'online' });
      const cheap = await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: o2.j.tran_id, val_id: `val-${o2.j.tran_id}-50` }));
      ok(cheap.status === 303 && cheap.headers.get('location').includes('pay=failed'), 'a payment of less than the price is refused');
      const o3 = await reg(only.j.id, { pay_mode: 'online' });
      const good = await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: o3.j.tran_id, val_id: `val-${o3.j.tran_id}-200` }));
      ok(good.status === 303 && good.headers.get('location') === `/ticket/${o3.j.ticket}?paid=1`, 'a proven payment sends the person to their ticket', good.headers.get('location'));
      ok((await tk(o3.j.ticket)).j.status === 'confirmed', 'a proven payment confirms the place with no admin work');
      ok((await call('GET', `/api/pay/check/${o3.j.tran_id}`)).j.status === 'paid', 'the payment check says paid');
      const again = await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: o3.j.tran_id, val_id: `val-${o3.j.tran_id}-200` }));
      ok(again.status === 303 && (await tk(o3.j.ticket)).j.status === 'confirmed', 'coming back twice changes nothing');
      const swap = await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: o3.j.tran_id, val_id: `val-${o2.j.tran_id}-200` }));
      ok(swap.status === 303 && (await tk(o3.j.ticket)).j.status === 'confirmed', 'a paid sign-up cannot be undone by another payment');
      const o4 = await reg(only.j.id, { pay_mode: 'online' });
      const can = await fetch(`${B}/api/pay/ssl/cancel`, form({ tran_id: o4.j.tran_id }));
      ok(can.status === 303 && (await tk(o4.j.ticket)).j.status === 'cancelled', 'cancelling at the payment page frees the place');
      const o5 = await reg(only.j.id, { pay_mode: 'online' });
      ok((await fetch(`${B}/api/pay/ssl/ipn`, form({ tran_id: o5.j.tran_id, val_id: `val-${o5.j.tran_id}-200`, status: 'VALID' }))).status === 200 && (await tk(o5.j.ticket)).j.status === 'confirmed', 'the gateway can confirm directly (IPN) even if the person never comes back');
      ok((await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: 'bauet-0000000000000000', val_id: 'x' }))).status === 303, 'an unknown transaction does not crash');
      // a seat is held while someone is paying
      const small = await mkEv('One seat', { enabled: true, amount: 100, manual: false, online: true }, 1);
      const s1 = await reg(small.j.id, { pay_mode: 'online' }); const s2 = await reg(small.j.id, { pay_mode: 'online' });
      ok(s1.s === 201 && s2.s === 409, 'the last seat is held while someone is on the payment page', s2.j);
      // both ways on one event: the manual way still works
      const hand = await reg(both.j.id, { payment: { method: 'bKash', sender: '01712345678', trx_id: 'HAND123456' } });
      ok(hand.s === 201 && (await tk(hand.j.ticket)).j.status === 'pending', 'paying by hand still waits for an admin');
      const bothOnline = await reg(both.j.id, { pay_mode: 'online' });
      ok(bothOnline.s === 201 && !!bothOnline.j.pay_url, 'the same event also takes online payment');
      // stand-alone forms
      const fm = (await call('POST', '/api/forms', { title: 'Paid form' }, T)).j;
      const up = await call('PUT', `/api/forms/${fm.id}`, { reg_form: { fields: [{ id: 'name', key: 'name', type: 'short', label: 'Name', required: true }, { id: 'email', key: 'email', type: 'email', label: 'Email', required: true }], payment: { enabled: true, amount: 150, manual: false, online: true } } }, T);
      ok(up.s === 200, 'a form can take online payment', up.j);
      const fr = await call('POST', `/api/forms/public/${fm.slug}`, { answers: { name: 'F Tester', email: 'ft@example.com' }, pay_mode: 'online' });
      ok(fr.s === 201 && !!fr.j.pay_url, 'a form sign-up gives the payment page address', fr.j);
      const fgood = await fetch(`${B}/api/pay/ssl/success`, form({ tran_id: fr.j.tran_id, val_id: `val-${fr.j.tran_id}-150` }));
      ok(fgood.status === 303 && fgood.headers.get('location') === `/f/${fm.slug}?paid=1`, 'a paid form returns to the form page', fgood.headers.get('location'));
      const resp = (await call('GET', `/api/forms/${fm.id}/responses`, undefined, T)).j || [];
      ok(resp.length === 1 && resp[0].pay_status === 'verified' && resp[0].payment?.status === 'paid', 'the form response is marked paid', resp[0]);
      // numbers about an event
      const an = await call('GET', `/api/event-registrations/analytics/${only.j.id}`, undefined, T);
      ok(an.s === 200 && an.j.total === 2 && an.j.confirmed === 2 && an.j.cancelled === 3, 'event analytics count sign-ups and cancelled ones', an.j);
      ok(an.j.money?.online === 2 && an.j.money?.verified === 2 && an.j.money?.amount === 400 && an.j.money?.by_hand === 0, 'event analytics add up the money paid online', an.j.money);
      ok(Array.isArray(an.j.by_day) && an.j.by_day.reduce((n, d) => n + d.count, 0) === 2 && Array.isArray(an.j.by_department), 'event analytics group sign-ups by day and department');
      ok((await call('GET', `/api/event-registrations/analytics/${only.j.id}`)).s === 401, 'event analytics need an admin login');
      ok((await call('GET', '/api/event-registrations/analytics/99999999', undefined, T)).s === 404, 'analytics of an unknown event is 404');
    }

    // contests and hackathons
    {
      const soon = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
      const gone = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10);
      ok((await call('POST', '/api/contests', { title: 'No login' })).s === 401, 'only an admin creates a contest');
      ok((await call('POST', '/api/contests', { title: 'Bad sizes', team_min: 5, team_max: 2 }, T)).s === 409, 'a contest with min bigger than max is refused');
      const ct = await call('POST', '/api/contests', { title: 'CodeFest QA', description: 'd', team_min: 2, team_max: 3, deadline: soon, status: 'open', prize: 'Trophy' }, T);
      ok(ct.s === 201, 'an admin can create a contest', ct.j);
      const old = await call('POST', '/api/contests', { title: 'Old QA contest', deadline: gone, status: 'open' }, T);
      const shut = await call('POST', '/api/contests', { title: 'Shut QA contest', status: 'closed' }, T);
      ok(((await call('GET', '/api/contests')).j || []).some((x) => x.title === 'CodeFest QA'), 'contests are public to read');
      const reg = (id, body) => call('POST', `/api/contest-teams/${id}`, body);
      const leader = { team_name: 'Byte Me', leader_name: 'Rafi Hasan', email: 'rafi@example.com', phone: '01711111111' };
      ok((await reg(ct.j.id, leader)).s === 400, 'a team smaller than the minimum is refused');
      ok((await reg(ct.j.id, { ...leader, email: 'bad' })).s === 400, 'a team leader needs a valid e-mail');
      ok((await reg(ct.j.id, { ...leader, members: [{ name: 'A', email: 'a@e.com' }, { name: 'B' }, { name: 'C' }] })).s === 400, 'a team bigger than the maximum is refused');
      ok((await reg(ct.j.id, { ...leader, members: [{ name: 'Same', email: 'rafi@example.com' }] })).s === 400, 'the same e-mail twice in a team is refused');
      const t1 = await reg(ct.j.id, { ...leader, members: [{ name: 'Mim Akter', email: 'mim@example.com', student_id: '2101' }] });
      ok(t1.s === 201 && t1.j.size === 2, 'a team can sign up', t1.j);
      ok((await reg(ct.j.id, { ...leader, email: 'other@example.com', members: [{ name: 'X', email: 'x@example.com' }] })).s === 409, 'a team name can only be used once');
      ok((await reg(ct.j.id, { team_name: 'Second', leader_name: 'Mim', email: 'MIM@example.com', members: [{ name: 'Y' }] })).s === 409, 'a person cannot join two teams');
      const t2 = await reg(ct.j.id, { team_name: 'Null Pointers', leader_name: 'Nila Roy', email: 'nila@example.com', members: [{ name: 'Sami', email: 'sami@example.com' }] });
      ok(t2.s === 201, 'a second team can sign up');
      ok((await reg(old.j.id, { ...leader, team_name: 'Late', members: [{ name: 'Z' }] })).s === 409, 'nobody can sign up after the deadline');
      ok((await reg(shut.j.id, { ...leader, team_name: 'Shut', members: [{ name: 'Z' }] })).s === 409, 'nobody can sign up for a closed contest');
      ok((await reg(999999, leader)).s === 404, 'an unknown contest is 404');
      const pub = (await call('GET', `/api/contest-teams/public/${ct.j.id}`)).j;
      ok(pub.teams === 2 && pub.open === true && pub.results === null && !JSON.stringify(pub).includes('@'), 'the public sees the team count only', pub);
      ok((await call('GET', `/api/contest-teams/admin/${ct.j.id}`)).s === 401, 'the team list needs a login');
      const adm = (await call('GET', `/api/contest-teams/admin/${ct.j.id}`, undefined, T)).j;
      ok(adm.teams.length === 2 && adm.teams[0].email, 'the admin sees every team with contact details');
      const idOf = (n) => adm.teams.find((x) => x.team_name === n).id;
      ok((await call('POST', `/api/contest-teams/admin/${ct.j.id}/publish`, undefined, T)).s === 400, 'results need at least one place first');
      ok((await call('PATCH', `/api/contest-teams/admin/team/${idOf('Byte Me')}`, { rank: 'first' }, T)).s === 400, 'a place must be a number');
      ok((await call('PATCH', `/api/contest-teams/admin/team/${idOf('Byte Me')}`, { rank: 1, prize_note: 'Trophy and 5000 BDT', score: 92.5 }, T)).s === 200, 'the admin gives a place');
      ok((await call('PATCH', `/api/contest-teams/admin/team/${idOf('Null Pointers')}`, { rank: 2 }, T)).s === 200, 'and a second place');
      const csvR = await call('GET', `/api/contest-teams/admin/${ct.j.id}/export`, undefined, T);
      ok(csvR.s === 200 && csvR.t.includes('Byte Me') && csvR.t.includes('Mim Akter'), 'the teams export as a spreadsheet');
      const teamsXlsx = await fetch(`${B}/api/contest-teams/admin/${ct.j.id}/export?format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
      const teamsZip = new Uint8Array(await teamsXlsx.arrayBuffer());
      ok(teamsXlsx.status === 200 && teamsZip[0] === 0x50 && /spreadsheetml/.test(teamsXlsx.headers.get('content-type') || ''), 'the teams also download as a real Excel workbook', teamsXlsx.status);
      const p1 = await call('POST', `/api/contest-teams/admin/${ct.j.id}/publish`, undefined, T);
      ok(p1.s === 200 && p1.j.awards_given === 4, 'publishing the results gives points to every team member', p1.j);
      const p2 = await call('POST', `/api/contest-teams/admin/${ct.j.id}/publish`, undefined, T);
      ok(p2.s === 200 && p2.j.awards_given === 0, 'pressing publish again does not give the points twice', p2.j);
      const res2 = (await call('GET', `/api/contest-teams/public/${ct.j.id}`)).j;
      ok(res2.results?.[0]?.team_name === 'Byte Me' && res2.results[0].rank === 1 && res2.results[1].team_name === 'Null Pointers' && !JSON.stringify(res2).includes('@'), 'the public sees the results without e-mails', res2);
      ok((await call('GET', `/api/contests`)).j.find((x) => x.id === ct.j.id)?.status === 'finished', 'a published contest becomes finished');
      const lb = (await call('GET', '/api/points/leaderboard')).j.top.map((x) => `${x.name}:${x.points}`);
      ok(lb.includes('Rafi H.:50') && lb.includes('Mim A.:50') && lb.includes('Nila R.:30') && lb.includes('Sami:30'), 'the winners got 50 and 30 points', lb);
      const npId = idOf('Null Pointers');
      const ed = await call('PATCH', `/api/contest-teams/admin/team/${npId}`, { team_name: 'Null Pointers 2', leader_name: 'Nila R. Roy', phone: '01800000000', members: [{ name: 'Sami Khan', email: 'sami@example.com', student_id: '77' }, { name: 'Tuli' }] }, T);
      ok(ed.s === 200 && ed.j.team_name === 'Null Pointers 2' && ed.j.members.length === 2, 'the admin can correct a team details and members', ed.j);
      ok((await call('PATCH', `/api/contest-teams/admin/team/${npId}`, { team_name: 'byte me' }, T)).s === 409, 'a corrected name cannot clash with another team');
      ok((await call('PATCH', `/api/contest-teams/admin/team/${npId}`, { email: 'bad' }, T)).s === 400, 'a corrected e-mail must be valid');
      ok((await call('DELETE', `/api/contest-teams/admin/team/${npId}`, undefined, T)).s === 200 && (await call('GET', `/api/contest-teams/admin/${ct.j.id}`, undefined, T)).j.teams.length === 1, 'a team can be removed');
    }

    // remote jobs from Remotive and Remote OK
    {
      const first = await call('GET', '/api/remote-jobs');
      ok(first.s === 200 && first.j.enabled === true && Array.isArray(first.j.sources) && first.j.sources.length === 2, 'the remote jobs list answers');
      await new Promise((r) => setTimeout(r, 1500)); // the first visit starts reading the feeds in the background
      const lst = (await call('GET', '/api/remote-jobs')).j;
      const titles = lst.jobs.map((x) => x.title);
      ok(titles.includes('QA Quokka Engineer') && titles.includes('Remote OK Quokka Designer'), 'jobs from both feeds are listed', titles);
      ok(!titles.includes('Bad link job'), 'a job without a real web link is dropped');
      const q1 = lst.jobs.find((x) => x.title === 'QA Quokka Engineer');
      ok(q1.company === 'Quokka Labs' && q1.source === 'remotive' && q1.url.startsWith('https://remotive.com/') && !/[<>]/.test(q1.summary), 'text is cleaned and the source link is kept', q1);
      ok(lst.jobs.find((x) => x.title === 'Remote OK Quokka Designer').salary === '$60k to $90k a year', 'a RemoteOK salary range is shown');
      const open = (await call('GET', '/api/remote-jobs?open=1')).j.jobs.map((x) => x.title);
      ok(open.includes('QA Quokka Engineer') && !open.includes('US Only Role'), 'the "open to Bangladesh" filter hides US-only jobs', open);
      ok((await call('GET', '/api/remote-jobs?tag=design')).j.jobs.length === 1 && (await call('GET', '/api/remote-jobs?q=zzzznothing')).j.jobs.length === 0, 'search and tag filters work');
      const hits = feedHits.remotive;
      await call('GET', '/api/remote-jobs'); await call('GET', '/api/remote-jobs');
      ok(feedHits.remotive === hits, 'visitors do not make the server read the feeds again (at most 4 reads a day)');
      ok((await call('POST', '/api/remote-jobs/refresh')).s === 401, 'only an admin refreshes by hand');
      const rf = await call('POST', '/api/remote-jobs/refresh', undefined, T);
      ok(rf.s === 200 && feedHits.remotive === hits + 1, 'an admin can refresh now', rf.j);
    }

    // job and internship board
    {
      const soon = new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10);
      const gone = new Date(Date.now() - 9 * 864e5).toISOString().slice(0, 10);
      ok((await call('POST', '/api/jobs', { title: 'No login' })).s === 401, 'only an admin posts a job');
      ok((await call('POST', '/api/jobs', { title: 'No way to apply', company: 'Acme' }, T)).s === 409, 'a job needs an apply link or e-mail');
      ok((await call('POST', '/api/jobs', { title: 'Bad link', apply_url: 'javascript:alert(1)' }, T)).s === 409, 'an apply link must be http or https');
      ok((await call('POST', '/api/jobs', { title: 'Bad kind', apply_email: 'hr@acme.com', kind: 'Spy' }, T)).s === 409, 'an unknown kind is refused');
      const j1 = await call('POST', '/api/jobs', { title: 'Junior Quokka Developer', company: 'Acme Quokka Ltd', kind: 'Internship', work_mode: 'Remote', apply_email: 'hr@acme.com', deadline: soon, description: 'Learn React' }, T);
      ok(j1.s === 201, 'an admin can post a job', j1.j);
      const j2 = await call('POST', '/api/jobs', { title: 'Hidden Quokka Draft Job', apply_url: 'https://acme.com/jobs', is_draft: true }, T);
      ok(j2.s === 201, 'a draft job can be saved');
      const pubJobs = ((await call('GET', '/api/jobs')).j || []).map((x) => x.title);
      ok(pubJobs.includes('Junior Quokka Developer') && !pubJobs.includes('Hidden Quokka Draft Job'), 'the public sees live jobs only', pubJobs);
      ok(((await call('GET', '/api/jobs', undefined, T)).j || []).some((x) => x.title === 'Hidden Quokka Draft Job'), 'an admin sees drafts');
      ok(((await call('GET', '/api/search?q=quokka%20ltd')).j || []).some((x) => x.type === 'job'), 'search finds a job');
      ok(!((await call('GET', '/api/bootstrap')).j.jobs || []).some((x) => /Hidden/.test(x.title)), 'bootstrap hides draft jobs');
      ok((await call('PUT', `/api/jobs/${j1.j.id}`, { salary: '15,000 BDT' }, T)).s === 200 && (await call('GET', `/api/jobs/${j1.j.id}`)).j.salary === '15,000 BDT', 'a job can be edited');
      ok((await call('DELETE', `/api/jobs/${j1.j.id}`, undefined, T)).s === 200 && !((await call('GET', '/api/jobs')).j || []).some((x) => x.id === j1.j.id), 'a job can be deleted');
      void gone;
    }

    // drafts and scheduled posts
    {
      const future = new Date(Date.now() + 3 * 864e5).toISOString();
      const past = new Date(Date.now() - 3600e3).toISOString();
      const draft = await call('POST', '/api/notices', { title: 'Hidden Quokka Draft', content: 'x', is_draft: true }, T);
      const later = await call('POST', '/api/notices', { title: 'Later Quokka Notice', content: 'x', publish_at: future }, T);
      const due = await call('POST', '/api/notices', { title: 'Due Quokka Notice', content: 'x', publish_at: past }, T);
      ok(draft.s === 201 && later.s === 201 && due.s === 201, 'drafts and scheduled notices can be saved', draft.j);
      const pub = ((await call('GET', '/api/notices')).j || []).map((x) => x.title);
      ok(!pub.includes('Hidden Quokka Draft') && !pub.includes('Later Quokka Notice') && pub.includes('Due Quokka Notice'), 'the public sees only posts that are live', pub);
      const adm = ((await call('GET', '/api/notices', undefined, T)).j || []).map((x) => x.title);
      ok(adm.includes('Hidden Quokka Draft') && adm.includes('Later Quokka Notice'), 'an admin sees drafts and scheduled posts');
      ok((await call('GET', `/api/notices/${draft.j.id}`)).s === 404 && (await call('GET', `/api/notices/${draft.j.id}`, undefined, T)).s === 200, 'a draft is a 404 for the public and open for admins');
      const boot = (await call('GET', '/api/bootstrap')).j;
      ok(!(boot.notices || []).some((x) => /Quokka/.test(x.title) && !/Due/.test(x.title)), 'bootstrap hides drafts from the public');
      ok(!((await call('GET', '/api/search?q=quokka')).j || []).some((x) => /Hidden|Later/.test(x.title || '')), 'search does not find hidden posts');
      ok((await call('PUT', `/api/notices/${later.j.id}`, { publish_at: 'not a date' }, T)).s === 409, 'a bad publish date is refused');
      const pubNow = await call('PUT', `/api/notices/${draft.j.id}`, { is_draft: false, publish_at: '' }, T);
      ok(pubNow.s === 200 && ((await call('GET', '/api/notices')).j || []).some((x) => x.title === 'Hidden Quokka Draft'), 'publishing a draft makes it public');
      const evDraft = await call('POST', '/api/events', { title: 'Quokka Draft Event', date: '2099-09-09', is_draft: true, reg_form: { fields: [{ id: 'name', type: 'text', label: 'Name', required: true }] } }, T);
      ok(evDraft.s === 201, 'a draft event can be saved', evDraft.j);
      ok((await call('POST', `/api/event-registrations/${evDraft.j.id}`, { answers: { name: 'Zed' } })).s === 404, 'nobody can sign up for a draft event');
    }

    // resource library
    {
      ok((await call('POST', '/api/resources', { title: 'No login' })).s === 401, 'resources need an admin login to add');
      ok((await call('POST', '/api/resources', { title: 'Bad link', url: 'javascript:alert(1)' }, T)).s === 409, 'a resource link must be http or https');
      const rs = await call('POST', '/api/resources', { title: 'Python Zebra Slides', description: 'week one', category: 'Python', kind: 'Slides', url: 'https://example.com/slides.pdf' }, T);
      ok(rs.s === 201 && rs.j.kind === 'Slides', 'an admin can add a resource', rs.j);
      ok(((await call('GET', '/api/resources')).j || []).some((x) => x.title === 'Python Zebra Slides'), 'resources are public to read');
      const hit = ((await call('GET', '/api/search?q=zebra%20slides')).j || []).find((x) => x.type === 'resource');
      ok(hit?.path === '/resources', 'search finds a resource', hit);
      ok((await call('DELETE', `/api/resources/${rs.j.id}`, undefined, T)).s === 200 && !((await call('GET', '/api/resources')).j || []).some((x) => x.id === rs.j.id), 'a deleted resource leaves the list (Trash)');
    }

    // member cards for approved applicants
    {
      const apply = await call('POST', '/api/registrations', { type: 'general', full_name: 'Card Quokka', student_id: 'CQ2301', batch: '23', department: 'CSE', phone: '01712345678', email: 'cardquokka@example.com', interests: ['Web Development'], experience: 'Beginner' });
      ok(apply.s === 201, 'a general application can be sent', apply.j);
      const rid = apply.j.registration.id;
      ok((await call('POST', '/api/card/find', { email: 'cardquokka@example.com', student_id: 'CQ2301' })).s === 409, 'a pending applicant has no card yet');
      ok((await call('POST', '/api/card/find', { email: 'nobody@example.com', student_id: 'X' })).s === 404 && (await call('POST', '/api/card/find', { email: 'cardquokka@example.com' })).s === 400, 'wrong or missing details find no card');
      ok((await call('GET', `/api/card/r${rid}`)).s === 404, 'an applicant card cannot be opened without its code');
      ok((await call('PATCH', `/api/registrations/${rid}/status`, { status: 'approved' }, T)).s === 200, 'an admin approves the application');
      const f = await call('POST', '/api/card/find', { email: ' CardQuokka@Example.com ', student_id: 'cq2301' });
      ok(f.s === 200 && f.j.id === `r${rid}` && f.j.code.startsWith(`Mr${rid}-`), 'the approved member finds the card (case and spaces do not matter)', f.j);
      const card = await call('GET', `/api/card/${f.j.id}?c=${f.j.code}`);
      ok(card.s === 200 && card.j.verified === true && card.j.member.name === 'Card Quokka' && card.j.member.position === 'General member' && !JSON.stringify(card.j).includes('@') && !JSON.stringify(card.j).includes('01712345678'), 'the card shows name, type and batch, with no e-mail or phone', card.j);
      ok((await call('GET', `/api/card/${f.j.id}?c=Mr${rid}-AAAAAA`)).s === 404, 'a wrong code shows nothing');
      ok((await call('PATCH', `/api/registrations/${rid}/status`, { status: 'rejected' }, T)).s === 200 && (await call('GET', `/api/card/${f.j.id}?c=${f.j.code}`)).s === 404, 'a card stops working when the approval is withdrawn');
    }

    // six-month committee terms: a committee serves half a year, then the handover opens
    {
      const list = (await call('GET', '/api/committees')).j || [];
      const shaped = list.length > 0 && list.every((s) => s.term && s.term.months === 6 && /^\d{4}-\d{2}-\d{2}$/.test(s.term.start) && /^\d{4}-\d{2}-\d{2}$/.test(s.term.end) && typeof s.term.days_left === 'number');
      ok(shaped, 'every committee carries a six-month term', list[0]);
      const winter = list.find((s) => s.label === 'Winter 2026');
      ok(winter?.term.start === '2026-10-01' && winter?.term.end === '2027-03-31', 'Winter 2026 runs 1 Oct 2026 – 31 Mar 2027', winter?.term);
      const summer = list.find((s) => s.label === 'Summer 2027');
      ok(summer?.term.start === '2027-04-01' && summer?.term.end === '2027-09-30', 'Summer 2027 runs 1 Apr 2027 – 30 Sep 2027', summer?.term);
      const cur = list.find((s) => s.members > 0);
      // the plan endpoint is the single source of truth: the dates a launch would get, and the handover rule
      {
        const p = await call('POST', '/api/committees/plan', { session: 'Winter 2027' }, T);
        ok(p.s === 200 && p.j?.term?.start === '2027-10-01' && p.j?.term?.end === '2028-03-31' && p.j?.exists === true, 'the plan endpoint gives a semester its own six months', p.j);
        const newer = await call('POST', '/api/committees/plan', { session: 'Session 2099' }, T);
        ok(newer.s === 200 && newer.j?.newer === true && newer.j?.needs_confirm === !!(cur && !cur.term.expired), 'the plan endpoint decides whether a handover needs confirming', newer.j);
        const back = await call('POST', '/api/committees/plan', { session: 'Spring 2019' }, T);
        ok(back.s === 200 && back.j?.newer === false && back.j?.needs_confirm === false && back.j?.term?.start === '2019-01-01', 'an older session never needs a confirmation', back.j);
        const own = await call('POST', '/api/committees/plan', { session: 'ICT Fest Committee', start: '2027-02-01', end: '2027-07-31' }, T);
        ok(own.s === 200 && own.j?.term?.start === '2027-02-01' && own.j?.term?.end === '2027-07-31' && own.j?.term?.months === 6, 'a name of your own takes the dates the admin picked', own.j);
        ok((await call('POST', '/api/committees/plan', { session: 'X' }, T)).s === 400, 'a plan needs a real name');
        ok((await call('POST', '/api/committees/plan', { session: 'New Name', start: '2027-06-01', end: '2027-01-01' }, T)).s === 400, 'a last day before the first day has no plan');
        ok((await call('POST', '/api/committees/plan', { session: 'Winter 2027' })).s === 401, 'the plan needs an admin login');
      }
      // a committee of your own: any name, any dates
      {
        const own = await call('POST', '/api/committees/launch', { session: 'ICT Fest Committee', scope: 'none', start: '2027-02-01', end: '2027-07-31' }, T);
        ok(own.s === 201 && own.j?.term?.start === '2027-02-01' && own.j?.term?.end === '2027-07-31', 'a committee can be launched with a new name and its own dates', own.j);
        await call('DELETE', '/api/committees/ICT%20Fest%20Committee', undefined, T);
      }
      if (cur && !cur.term.expired) {
        // moving forward is the handover: it needs one confirmation
        const forward = await call('POST', '/api/committees/launch', { session: 'Session 2099', scope: 'none' }, T);
        ok(forward.s === 409 && forward.j?.needs_confirm === true && forward.j?.current?.label === cur.label, 'a newer committee waits while the running term still has time left', forward.j);
        // an older committee is history, so it is added without any confirmation
        const older = await call('POST', '/api/committees/launch', { session: 'Spring 2019', scope: 'none' }, T);
        ok(older.s === 201 && older.j?.term?.start === '2019-01-01' && older.j?.term?.end === '2019-06-30', 'an older committee can be added while the term runs, with its own semester dates', older.j);
        await call('DELETE', '/api/committees/Spring%202019', undefined, T);
        // a late launch keeps the semester's dates instead of starting today
        const forced = await call('POST', '/api/committees/launch', { session: 'Session 2099', scope: 'none', force: true }, T);
        const today = new Date().toISOString().slice(0, 10);
        ok(forced.s === 201 && forced.j?.term?.start === '2099-01-01' && forced.j?.term?.months === 6 && forced.j?.term?.start !== today, 'a committee launched late still takes its semester dates, not today', forced.j);
        await call('DELETE', '/api/committees/Session%202099', undefined, T);
      }
      if (cur) {
        const cm = await fetch(`${B}/api/committees/${encodeURIComponent(cur.label)}/export?format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
        const cmZip = new Uint8Array(await cm.arrayBuffer());
        ok(cm.status === 200 && cmZip[0] === 0x50 && /spreadsheetml/.test(cm.headers.get('content-type') || ''), 'a committee downloads as a real Excel workbook', cm.status);
        const ext = await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/term`, { months: 6 }, T);
        ok(ext.s === 200 && ext.j?.term?.end > cur.term.end && ext.j?.term?.months === 12, 'a term can be extended by six months', ext.j);
        const back = await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/term`, { end: cur.term.end }, T);
        ok(back.s === 200 && back.j?.term?.end === cur.term.end && back.j?.term?.months === 6, 'the last day can be set by hand (and the length follows it)', back.j);
        const both = await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/term`, { start: cur.term.start, end: cur.term.end }, T);
        ok(both.s === 200 && both.j?.term?.start === cur.term.start && both.j?.term?.end === cur.term.end, 'both days can be set by hand', both.j);
        const moved = await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/term`, { start: '2019-03-01' }, T);
        ok(moved.s === 200 && moved.j?.term?.start === '2019-03-01' && moved.j?.term?.months === cur.term.months, 'moving the first day keeps the same length', moved.j);
        await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/term`, { start: cur.term.start, end: cur.term.end }, T);
        ok((await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/term`, { end: '1999-01-01' }, T)).s === 400, 'a last day before the first day is refused');

        // set-current and edit endpoints
        const setCur = await call('POST', '/api/committees/set-current', { session: cur.label }, T);
        ok(setCur.s === 200 && setCur.j?.current_session === cur.label, 'admin can set the current committee explicitly', setCur.j);
        const edited = await call('POST', `/api/committees/${encodeURIComponent(cur.label)}/edit`, { is_current: true }, T);
        ok(edited.s === 200 && edited.j?.is_current === true, 'admin can edit committee and maintain current status', edited.j);
      }
      ok((await call('POST', '/api/committees/set-current', { session: 'Winter 2026' })).s === 401, 'only admin can set current committee');
      ok((await call('POST', '/api/committees/launch', { session: 'Session 2098', scope: 'none' })).s === 401, 'only an admin can launch a committee');
    }

    // ---- ready-made form templates ----
    {
      const templates = readyTemplates();
      const keys = new Set(templates.map((t) => t.key));
      const asked = (t) => t.form.fields.filter((f) => f.type !== 'section').length;
      let problem = '';
      for (const t of templates) {
        const r = await call('POST', '/api/forms', { title: t.name, reg_form: { ...t.form, title: t.name } }, T);
        if (r.s !== 201) { problem = `${t.key}: HTTP ${r.s} ${r.j?.error || ''}`; break; }
        const row = r.j.reg_form?.fields ? r.j : (await call('GET', `/api/forms/${r.j.id}`, undefined, T)).j;
        const got = row.reg_form?.fields?.filter((f) => f.type !== 'section').length;
        if (got !== asked(t)) { problem = `${t.key}: ${asked(t)} questions saved as ${got}`; break; }
        await call('DELETE', `/api/forms/${r.j.id}`, undefined, T);
      }
      const photos = templates.filter((t) => t.form.fields.some((f) => f.type === 'photo')).length;
      ok(templates.length >= 25 && keys.size === templates.length, 'ready-made templates ship once each', `${templates.length} templates, ${keys.size} keys`);
      ok(!problem, 'every ready-made template saves with all of its questions', problem);
      ok(photos >= 4, 'several templates ask for a photo upload', photos);
    }

    // ---- Excel downloads ----
    {
      const view = await fetch(`${B}/api/exports/table`, {
        method: 'POST', headers: { authorization: `Bearer ${T}`, 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Event sign-ups', subtitle: '2 rows', columns: ['Name', 'Ticket'], rows: [['Nusrat Jahan', 'ABCDE12345'], ['Rafiul Islam', 'QW7RT9YH2K']] }),
      });
      const viewZip = new Uint8Array(await view.arrayBuffer());
      ok(view.status === 200 && viewZip[0] === 0x50 && viewZip[1] === 0x4b && /spreadsheetml/.test(view.headers.get('content-type') || '') && viewZip.length > 1000, 'the rows a table is showing download as a real Excel workbook', view.status);
      ok((await fetch(`${B}/api/exports/table`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status === 401, 'that workbook needs an admin login');
      ok((await call('POST', '/api/exports/table', { rows: [['x']] }, T)).s === 400, 'a workbook without columns is refused');
      const apps = await fetch(`${B}/api/registrations/export?type=all&format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
      const appsZip = new Uint8Array(await apps.arrayBuffer());
      ok(apps.status === 200 && appsZip[0] === 0x50 && appsZip[1] === 0x4b, 'applications download as a real Excel workbook', apps.status);
      const visits = await fetch(`${B}/api/analytics/export?days=30&format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
      const visitsZip = new Uint8Array(await visits.arrayBuffer());
      ok(visits.status === 200 && visitsZip[0] === 0x50 && /spreadsheetml/.test(visits.headers.get('content-type') || ''), 'the visitors list downloads as a real Excel workbook', visits.status);
      const lists = (await call('GET', '/api/downloads', undefined, T)).j;
      ok(Array.isArray(lists) && lists.length > 0 && lists.every((s) => s.formats.includes('xlsx')), 'every list on the Downloads page offers Excel');
      const key = lists.find((s) => s.count > 0 && !s.event && !s.form)?.key;
      if (key) {
        const one = await fetch(`${B}/api/downloads/${key}?format=xlsx`, { headers: { authorization: `Bearer ${T}` } });
        const oneZip = new Uint8Array(await one.arrayBuffer());
        ok(one.status === 200 && oneZip[0] === 0x50 && /spreadsheetml/.test(one.headers.get('content-type') || ''), 'a list downloads as Excel from the Downloads page', one.status);
      }
    }

    // password change
    ok((await call('POST', '/api/auth/login', { username: '  Admin ', password: 'Qa-Pass-12345' })).s === 200, 'the username can be typed with a capital letter or spaces (phone keyboards do that)');
    ok((await call('POST', '/api/auth/change-password', { current: 'wrong-pass', next: 'Another-Pass-99' }, T)).s === 401, 'change password needs current one');
    ok((await call('POST', '/api/auth/change-password', { current: 'Qa-Pass-12345', next: 'short' }, T)).s === 400, 'short new password refused');
    ok((await call('POST', '/api/auth/change-password', { current: 'Qa-Pass-12345', next: 'Another-Pass-99' }, T)).s === 200, 'password changed');
    ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'Another-Pass-99' })).s === 200, 'new password works');

    // ---- forgotten password: the link that is actually e-mailed resets the password ----
    {
      XFF = '10.9.9.9';
      const resetMails = () => mails.filter((m) => m.to === 'owner@qa-club.dev' && /Reset the admin password/.test(m.subject));
      const before = resetMails().length;
      const f = await call('POST', '/api/auth/forgot', { username: '  Owner@QA-Club.DEV ' });
      ok(f.s === 200, 'forgot accepts the e-mail address of the account', f.j);
      let mail;
      for (let i = 0; i < 25 && !mail; i++) { mail = resetMails()[before]; if (!mail) await new Promise((r) => setTimeout(r, 100)); }
      ok(!!mail && !!mail.html, 'the reset link is e-mailed to the address on the account', mail?.to);
      // browsers decode HTML entities in an href, so the test does the same
      const link = (/href="([^"]+)"/.exec(mail?.html || '')?.[1] || '').replace(/&amp;/g, '&');
      const url = (() => { try { return new URL(link); } catch { return null; } })();
      const token = url?.searchParams.get('reset') || '';
      ok(url?.pathname === '/admin' && url?.searchParams.get('u') === 'admin' && token.length > 20, 'the link opens the admin page with the real user name in it', link.replace(token, '<token>'));
      ok((await call('POST', '/api/auth/reset', { token: 'not-the-token', username: 'admin', password: 'Reset-Pass-2026' })).s === 400, 'a wrong reset token is refused');
      ok((await call('POST', '/api/auth/reset', { token, username: 'admin', password: 'short' })).s === 400, 'the reset form refuses a weak password');
      ok((await call('POST', '/api/auth/reset', { token, username: 'admin', password: 'Reset-Pass-2026' })).s === 200, 'the e-mailed link sets a new password');
      ok((await call('GET', '/api/auth/me', undefined, T)).s === 401, 'resetting ends the old sessions');
      ok((await call('POST', '/api/auth/reset', { token, username: 'admin', password: 'Other-Pass-2026' })).s === 400, 'the same reset link cannot be used twice');
      const nl = await call('POST', '/api/auth/login', { username: 'admin', password: 'Reset-Pass-2026' });
      ok(nl.s === 200 && !!nl.j?.token, 'the new password works');
      T = nl.j?.token;
      const n0 = resetMails().length;
      const unknown = await call('POST', '/api/auth/forgot', { username: 'nobody@qa-club.dev' });
      await new Promise((r) => setTimeout(r, 300));
      ok(unknown.s === 200 && resetMails().length === n0, 'an unknown account gets the same answer and no mail');
      XFF = '';
    }
  } catch (e) { failed++; console.log('  CRASH', e); }
  srv.kill();
  gw.close();
  console.log(`${failed ? 'FAILED' : 'OK'}: ${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
