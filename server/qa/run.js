// `npm run qa` — starts the real server on an in-memory database and checks the important flows end to end. No accounts or internet needed.
const { spawn } = require('child_process');
const path = require('path');
const PORT = process.env.QA_PORT || '5099';
const B = `http://127.0.0.1:${PORT}`;
let pass = 0, failed = 0;
const ok = (c, name, extra) => { if (c) pass++; else { failed++; console.log(`  FAIL  ${name}`, extra === undefined ? '' : JSON.stringify(extra)); } };
const call = async (method, url, body, token, raw) => {
  const r = await fetch(B + url, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { s: r.status, j: json, t: text };
};
const fill = (fields, i) => Object.fromEntries(fields.filter((f) => f.type !== 'section').map((f) => [f.id,
  f.type === 'email' ? `p${i}@example.com` : f.type === 'phone' ? '01712345678' : f.type === 'number' ? 5 : ['dropdown', 'radio'].includes(f.type) ? (f.options || [])[0] : f.type === 'checkbox' ? [(f.options || [])[0]] : f.type === 'yesno' ? 'Yes' : f.type === 'scale' ? 3 : f.type === 'date' ? '2026-01-01' : f.type === 'time' ? '10:00' : `Person ${i}`]));

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, 'harness.js')], { env: { ...process.env, QA_PORT: PORT }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/health`)).ok) break; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 1000)); }

    const h = await call('GET', '/api/health'); ok(h.s === 200 && h.j.db, 'health');
    ok((await call('GET', '/api/bootstrap')).s === 200, 'bootstrap');
    ok((await call('GET', '/api/events')).s === 200, 'events list public');
    ok((await call('POST', '/api/events', { title: 'x' })).s === 401, 'writes need login');
    ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'nope' })).s === 401, 'wrong password rejected');
    ok((await call('POST', '/api/auth/login', undefined, undefined, '{bad json')).s === 400, 'broken JSON gives 400');
    const login = await call('POST', '/api/auth/login', { username: 'admin', password: 'Qa-Pass-12345' });
    const T = login.j?.token; ok(!!T, 'login');
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

    // spreadsheet formula injection
    const f2 = (await call('POST', '/api/forms', { title: 'QA inject' }, T)).j; const p2 = (await call('GET', `/api/forms/public/${f2.slug}`)).j;
    const a = fill(p2.reg_form.fields, 1); const nameId = p2.reg_form.fields.find((x) => x.type === 'short').id; a[nameId] = '=HYPERLINK("http://evil")';
    await call('POST', `/api/forms/public/${f2.slug}`, { answers: a });
    ok(!(await call('GET', `/api/forms/${f2.id}/export`, undefined, T)).t.includes(',=HYPERLINK') && !(await call('GET', `/api/forms/${f2.id}/export`, undefined, T)).t.includes('"=HYPERLINK'), 'CSV formulas neutralised');

    // event registration: capacity, ticket, check-in
    const ev = (await call('POST', '/api/events', { title: 'QA event', date: '2099-01-01', time: '10:00', location: 'Hall', description: 'd', capacity: 3, reg_open: true }, T)).j; ok(ev?.id, 'event create');
    const r2 = await Promise.all(Array.from({ length: 10 }, (_, i) => call('POST', `/api/event-registrations/${ev.id}`, { answers: { name: `Person ${i}`, student_id: `S${i}`, email: `e${i}@example.com` } })));
    const okRegs = r2.filter((r) => r.s === 201);
    ok(okRegs.length === 3 && r2.every((r) => r.s < 500), '10 simultaneous event sign-ups for 3 seats give exactly 3', r2.map((r) => r.s + (r.j?.error ? ':' + r.j.error : '')));
    const evList = (await call('GET', `/api/event-registrations/by-event/${ev.id}`, undefined, T)).j;
    ok((await call('PATCH', `/api/event-registrations/${evList[0].id}/answers`, { answers: { name: 'Edited Person' } }, T)).j?.full_name === 'Edited Person', 'event sign-up edit saved');
    const code = okRegs[0]?.j?.ticket;
    ok(!!code && (await call('GET', `/api/event-registrations/ticket/${code}`)).s === 200, 'ticket page data');
    ok((await call('GET', '/api/event-registrations/verify/ZZZZZZZZ')).j?.valid === false, 'unknown certificate is not valid');
    ok((await call('POST', '/api/event-registrations/checkin', { code }, T)).s === 200, 'check-in');
    ok((await call('POST', '/api/event-registrations/checkin', { code }, T)).j?.already === true || (await call('POST', '/api/event-registrations/checkin', { code }, T)).s === 409, 'second check-in is reported');

    // events that send people to another form (Google Forms ...)
    ok((await call('POST', '/api/events', { title: 'Bad link', date: '2099-01-01', reg_url: 'javascript:alert(1)' }, T)).s === 409, 'javascript: link refused');
    const ext = await call('POST', '/api/events', { title: 'Google form event', date: '2099-02-01', reg_url: ' https://forms.gle/abc123 ' }, T);
    ok(ext.s === 201 && ext.j.reg_url === 'https://forms.gle/abc123', 'web link accepted and trimmed', ext.j);

    // password change
    ok((await call('POST', '/api/auth/change-password', { current: 'wrong-pass', next: 'Another-Pass-99' }, T)).s === 401, 'change password needs current one');
    ok((await call('POST', '/api/auth/change-password', { current: 'Qa-Pass-12345', next: 'short' }, T)).s === 400, 'short new password refused');
    ok((await call('POST', '/api/auth/change-password', { current: 'Qa-Pass-12345', next: 'Another-Pass-99' }, T)).s === 200, 'password changed');
    ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'Another-Pass-99' })).s === 200, 'new password works');
  } catch (e) { failed++; console.log('  CRASH', e); }
  srv.kill();
  console.log(`${failed ? 'FAILED' : 'OK'}: ${pass} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
