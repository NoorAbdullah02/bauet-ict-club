const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { loadDemo, removeDemo, demoCount } = require('../utils/demo');
const { leadershipConflict } = require('../utils/positions');
const { cloneImage } = require('../utils/images');
const { sendZip, safe } = require('../utils/zipper');
const { toCsv } = require('../utils/csv');
const { tableToXlsx } = require('../utils/exporters');
const { destroyImage } = require('../utils/cloud');
const terms = require('../utils/terms');

/**
 * Gives each person their own copy of the picture inside the new committee's Cloudinary folder, a few at a time, after the answer has been sent.
 * Until the copy is ready the old link keeps working. items: [{ id, url, removeOld }]
 */
async function rehome(items, session) {
  const queue = items.filter((i) => i.url);
  const worker = async () => {
    while (queue.length) {
      const it = queue.shift();
      try {
        const next = await cloneImage(it.url, 'committees', session);
        if (next && next !== it.url) {
          await pool.query('UPDATE members SET image_url = $1 WHERE id = $2', [next, it.id]);
          if (it.removeOld) await destroyImage(it.url); // only deleted when no other committee still uses it
        }
      } catch (e) { console.warn('Picture copy failed:', e.message); }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

const router = express.Router();
const clean = (v, n) => String(v ?? '').trim().slice(0, n);

async function siteSettings() {
  return (await pool.query("SELECT value FROM settings WHERE key = 'site'")).rows[0]?.value || {};
}

/** Changes the one 'site' settings row (the session list and the committee terms live there). */
async function saveSite(update) {
  const cur = await siteSettings();
  const next = typeof update === 'function' ? update(cur) : { ...cur, ...update };
  await pool.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify(next)]);
  return next;
}

/** Keeps one committee's dates in the settings, so an extended or moved term stays put. */
async function saveTerm(session, term) {
  const entry = { start: term.start, end: term.end, months: term.months };
  await saveSite((cur) => ({ ...cur, terms: { ...(cur.terms || {}), [session]: entry } }));
  return entry;
}

/** All committee sessions: those that have members plus ones launched but still empty, newest first, each with its six-month term. */
async function allSessions() {
  const { rows } = await pool.query('SELECT committee_session AS s, COUNT(*) AS n FROM members WHERE committee_session IS NOT NULL AND deleted_at IS NULL GROUP BY committee_session');
  const counts = Object.fromEntries(rows.map((r) => [r.s, Number(r.n)]));
  const site = await siteSettings();
  const launched = site.sessions || [];
  const stored = site.terms || {};
  const currentSession = site.current_session || null;
  const list = [...new Set([...Object.keys(counts), ...launched])];
  const autoCurrent = currentOf(list.map((label) => ({ label, members: counts[label] || 0 })));
  const effectiveCurrent = currentSession || (autoCurrent ? autoCurrent.label : null);

  return list
    .map((label) => ({
      label,
      members: counts[label] || 0,
      term: terms.termFor(label, stored[label]),
      is_current: effectiveCurrent ? label.toLowerCase() === effectiveCurrent.toLowerCase() : false,
    }))
    .sort((a, b) => terms.rank(b.label) - terms.rank(a.label));
}

/** The committee that is running now: the one chosen in settings, else newest with people. */
const currentOf = (list, forcedCurrent = null) => {
  if (forcedCurrent) {
    const found = list.find((s) => s.label.toLowerCase() === forcedCurrent.toLowerCase());
    if (found) return found;
  }
  const marked = list.find((s) => s.is_current);
  if (marked) return marked;
  return list.find((s) => s.members > 0) || null;
};
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

/** Why a start/end pair cannot be used, or null when it is fine. */
function dateProblem(start, end) {
  if (start && !isDate(start)) return 'Use a start date like 2027-01-01';
  if (end && !isDate(end)) return 'Use an end date like 2027-06-30';
  if (start && end && String(end) <= String(start)) return 'The last day has to be after the first day.';
  if (start && end && new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`) > 750 * 864e5) return 'A committee term can be at most two years.';
  return null;
}

/**
 * The dates a committee gets: what the admin typed, else what is remembered, else the semester calendar,
 * else today for a name of their own (an "ICT Fest 2027" committee starts the day it is created).
 */
function termFrom(session, body = {}, stored = {}) {
  const start = body.start || stored.start || (terms.named(session) ? undefined : terms.today());
  const months = Math.min(24, Math.max(1, Number(body.months) || stored.months || terms.MONTHS));
  return terms.termFor(session, { start, end: body.end || stored.end, months });
}

router.get('/', async (_req, res) => {
  try { res.json(await allSessions()); } catch (e) { res.status(500).json({ error: 'Could not load sessions' }); }
});

/**
 * Admin: what launching this name would mean, before anything is saved. The client asks this instead of guessing:
 * the dates, whether the name is taken, and whether the running committee makes it an early handover.
 * body: { session, start?, end?, months? }
 */
router.post('/plan', authMiddleware, async (req, res) => {
  const session = clean(req.body?.session, 50);
  if (session.length < 3) return res.status(400).json({ error: 'Give the committee a name of at least 3 letters.' });
  const problem = dateProblem(req.body?.start, req.body?.end);
  if (problem) return res.status(400).json({ error: problem });
  try {
    const list = await allSessions();
    const known = list.find((s) => s.label.toLowerCase() === session.toLowerCase());
    const term = known && !req.body?.start && !req.body?.end ? known.term : termFrom(session, req.body);
    const current = currentOf(list);
    const newer = !!current && terms.rank(session) > terms.rank(current.label);
    res.set('Cache-Control', 'no-store');
    res.json({
      session, term, exists: !!known, newer,
      needs_confirm: !!current && newer && !current.term.expired,
      current: current ? { label: current.label, term: current.term } : null,
    });
  } catch (e) {
    console.error('Committee plan failed:', e.message);
    res.status(500).json({ error: 'Could not work out the dates' });
  }
});

/**
 * Launch a new committee. Any name works: a semester ("Winter 2027") or one of your own ("ICT Fest 2027").
 * body: { session, copyFrom?, scope: "none" | "leaders" | "all", start?, end?, months?, force? }
 */
router.post('/launch', authMiddleware, async (req, res) => {
  const session = clean(req.body.session, 50);
  const copyFrom = clean(req.body.copyFrom, 50);
  const scope = ['none', 'leaders', 'all'].includes(req.body.scope) ? req.body.scope : 'none';
  if (session.length < 3) return res.status(400).json({ error: 'Give the committee a name of at least 3 letters.' });
  const problem = dateProblem(req.body.start, req.body.end);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const existing = await allSessions();
    if (existing.some((s) => s.label.toLowerCase() === session.toLowerCase())) return res.status(409).json({ error: `${session} already exists` });

    // A committee serves six months. Until that term is over, moving FORWARD needs a clear confirmation,
    // so a mistyped click can never cut a running committee short. Adding an older committee (history) is always allowed.
    const current = currentOf(existing);
    const newer = current ? terms.rank(session) > terms.rank(current.label) : false;
    if (newer && !current.term.expired && !req.body.force) {
      return res.status(409).json({
        error: `${current.label} is in term until ${current.term.end} (${current.term.days_left} day${current.term.days_left === 1 ? '' : 's'} left). Confirm to hand over early.`,
        needs_confirm: true, current: { label: current.label, term: current.term },
      });
    }

    let copied = 0;
    const toRehome = [];
    if (scope !== 'none' && copyFrom) {
      const { rows } = await pool.query('SELECT * FROM members WHERE committee_session = $1 AND deleted_at IS NULL ORDER BY display_order', [copyFrom]);
      const take = rows.filter((m) => scope === 'all' || /^((Vice President|VP)\b|President)/i.test(m.position));
      for (const m of take) {
        const ins = await pool.query(
          'INSERT INTO members (name, position, department, batch, committee_session, image_url, social_fb, social_gh, social_li, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          [m.name, m.position, m.department, m.batch, session, m.image_url, m.social_fb, m.social_gh, m.social_li, m.display_order]
        );
        toRehome.push({ id: ins.rows[0].id, url: m.image_url });
        copied += 1;
      }
    }
    // the dates the admin chose, else the semester's own six months (Summer 1 Apr – 30 Sep, Winter 1 Oct – 31 Mar),
    // even when the committee is launched late: the name and the dates always agree
    const term = termFrom(session, req.body);
    await saveSite((cur) => {
      const all = { ...(cur.terms || {}) };
      if (copyFrom && !all[copyFrom]) all[copyFrom] = terms.termFor(copyFrom);
      all[session] = { start: term.start, end: term.end, months: term.months };
      return { ...cur, sessions: [...new Set([...(cur.sessions || []), session])], terms: all };
    });
    res.status(201).json({ session, copied, term });
    rehome(toRehome, session);
  } catch (e) {
    console.error('Launch committee failed:', e.message);
    res.status(500).json({ error: 'Could not launch the committee' });
  }
});

// ---- demo data (admin only) ----
/**
 * Copy or move people from one committee to another (for a new semester, or to fix a mistake).
 * body: { ids: [memberId...], toSession: "Winter 2027", mode: "copy" | "move" }
 * President / Vice President limits are checked for the target session; people already there are skipped.
 */
router.post('/transfer', authMiddleware, async (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger).slice(0, 300);
  const toSession = clean(req.body.toSession, 50);
  const mode = req.body.mode === 'move' ? 'move' : 'copy';
  if (!ids.length) return res.status(400).json({ error: 'Choose at least one person' });
  if (!/^(Summer|Winter|Spring|Autumn|Session)\s+\S+/i.test(toSession)) return res.status(400).json({ error: 'Use a name like “Winter 2027”' });
  try {
    const { rows } = await pool.query(`SELECT * FROM members WHERE id IN (${ids.map((_, i) => `$${i + 1}`).join(',')}) AND deleted_at IS NULL ORDER BY display_order`, ids);
    const done = []; const skipped = []; const toRehome = [];
    for (const m of rows) {
      if (m.committee_session === toSession) { skipped.push({ name: m.name, reason: 'already in this committee' }); continue; }
      const dup = await pool.query('SELECT 1 FROM members WHERE name = $1 AND committee_session = $2 AND position = $3 AND deleted_at IS NULL', [m.name, toSession, m.position]);
      if (dup.rows.length) { skipped.push({ name: m.name, reason: 'already has this post there' }); continue; }
      const conflict = await leadershipConflict(pool, toSession, m.position);
      if (conflict) { skipped.push({ name: m.name, reason: conflict }); continue; }
      if (mode === 'move') { await pool.query('UPDATE members SET committee_session = $1 WHERE id = $2', [toSession, m.id]); toRehome.push({ id: m.id, url: m.image_url, removeOld: true }); }
      else {
        const ins = await pool.query('INSERT INTO members (name, position, department, batch, committee_session, image_url, social_fb, social_gh, social_li, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id', [m.name, m.position, m.department, m.batch, toSession, m.image_url, m.social_fb, m.social_gh, m.social_li, m.display_order]);
        toRehome.push({ id: ins.rows[0].id, url: m.image_url });
      }
      done.push(m.name);
    }
    // make a brand-new semester selectable everywhere
    await saveSite((cur) => ({ ...cur, sessions: [...new Set([...(cur.sessions || []), toSession])] }));
    res.json({ transferred: done.length, mode, toSession, skipped });
    rehome(toRehome, toSession);
  } catch (e) {
    console.error('Transfer failed:', e.message);
    res.status(500).json({ error: 'Could not transfer the people' });
  }
});

router.get('/demo', authMiddleware, async (_req, res) => {
  try { res.json({ count: await demoCount() }); } catch { res.status(500).json({ error: 'Could not read demo status' }); }
});
router.post('/demo', authMiddleware, async (_req, res) => {
  try { res.json(await loadDemo()); } catch (e) { console.error('Demo load failed:', e.message); res.status(500).json({ error: 'Could not load demo data' }); }
});
router.delete('/demo', authMiddleware, async (_req, res) => {
  try { res.json(await removeDemo()); } catch (e) { res.status(500).json({ error: 'Could not remove demo data' }); }
});

/**
 * Admin: move one committee's term. Any of these bodies is fine:
 * { start, end } sets both days by hand, { start } moves the first day and keeps the same length,
 * { end } moves only the last day, and { months: 6 } extends the end by six more months.
 */
router.post('/:session/term', authMiddleware, async (req, res) => {
  const session = clean(decodeURIComponent(req.params.session), 50);
  if (!session) return res.status(400).json({ error: 'Choose a committee' });
  try {
    const stored = ((await siteSettings()).terms || {})[session] || {};
    const now = terms.termFor(session, stored);
    const problem = dateProblem(req.body?.start, req.body?.end);
    if (problem) return res.status(400).json({ error: problem });
    let next;
    if (req.body?.start || req.body?.end) {
      const first = req.body?.start || now.start;
      const last = req.body?.end;
      if (last && String(last) <= String(first)) return res.status(400).json({ error: 'The last day has to be after the first day.' });
      // a moved first day keeps the same length unless a last day comes with it
      const same = terms.termFor(session, { start: first, months: now.months });
      next = terms.termFor(session, { start: same.start, end: last || same.end });
    } else {
      const months = Math.min(24, Math.max(1, Number(req.body?.months) || terms.MONTHS));
      next = terms.termFor(session, { start: now.start, end: terms.extend(now, months) });
    }
    await saveTerm(session, next);
    res.json({ session, term: next });
  } catch (e) {
    console.error('Term change failed:', e.message);
    res.status(500).json({ error: 'Could not change the term' });
  }
});

router.post('/set-current', authMiddleware, async (req, res) => {
  const session = clean(req.body?.session, 50);
  if (!session) return res.status(400).json({ error: 'Choose a committee' });
  await saveSite((cur) => ({ ...cur, current_session: session }));
  const list = await allSessions();
  res.json({ current_session: session, sessions: list });
});

router.post('/:session/set-current', authMiddleware, async (req, res) => {
  const session = clean(decodeURIComponent(req.params.session), 50);
  if (!session) return res.status(400).json({ error: 'Choose a committee' });
  await saveSite((cur) => ({ ...cur, current_session: session }));
  const list = await allSessions();
  res.json({ current_session: session, sessions: list });
});

async function handleCommitteeEdit(req, res) {
  const oldSession = clean(decodeURIComponent(req.params.session), 50);
  if (!oldSession) return res.status(400).json({ error: 'Choose a committee' });

  const newSession = clean(req.body?.session || req.body?.label, 50) || oldSession;
  if (newSession.length < 3) return res.status(400).json({ error: 'Give the committee a name of at least 3 letters.' });

  const existingList = await allSessions();
  if (newSession.toLowerCase() !== oldSession.toLowerCase()) {
    if (existingList.some((s) => s.label.toLowerCase() === newSession.toLowerCase())) {
      return res.status(409).json({ error: `A committee named “${newSession}” already exists` });
    }
  }

  const problem = dateProblem(req.body?.start, req.body?.end);
  if (problem) return res.status(400).json({ error: problem });

  // Update members table if renamed
  if (newSession !== oldSession) {
    await pool.query('UPDATE members SET committee_session = $1 WHERE committee_session = $2', [newSession, oldSession]);
  }

  // Update site settings
  await saveSite((cur) => {
    let sessions = [...(cur.sessions || [])];
    if (newSession !== oldSession) {
      sessions = sessions.map((s) => (s.toLowerCase() === oldSession.toLowerCase() ? newSession : s));
      if (!sessions.some((s) => s.toLowerCase() === newSession.toLowerCase())) {
        sessions.push(newSession);
      }
      sessions = sessions.filter((s) => s.toLowerCase() !== oldSession.toLowerCase() || s === newSession);
    } else {
      if (!sessions.some((s) => s.toLowerCase() === newSession.toLowerCase())) {
        sessions.push(newSession);
      }
    }

    const allTerms = { ...(cur.terms || {}) };
    const prevKey = Object.keys(allTerms).find((k) => k.toLowerCase() === oldSession.toLowerCase());
    const prevTerm = prevKey ? allTerms[prevKey] : {};
    const start = req.body?.start !== undefined ? (req.body.start || null) : prevTerm.start;
    const end = req.body?.end !== undefined ? (req.body.end || null) : prevTerm.end;
    const computedTerm = terms.termFor(newSession, { start: start || undefined, end: end || undefined });

    if (prevKey && newSession !== prevKey) {
      delete allTerms[prevKey];
    }
    allTerms[newSession] = {
      start: start || computedTerm.start,
      end: end || computedTerm.end,
      months: computedTerm.months,
    };

    let currentSession = cur.current_session || null;
    if (req.body?.is_current === true) {
      currentSession = newSession;
    } else if (req.body?.is_current === false && currentSession && (currentSession.toLowerCase() === oldSession.toLowerCase() || currentSession.toLowerCase() === newSession.toLowerCase())) {
      currentSession = null;
    } else if (currentSession && currentSession.toLowerCase() === oldSession.toLowerCase()) {
      currentSession = newSession;
    }

    return {
      ...cur,
      sessions: [...new Set(sessions)],
      terms: allTerms,
      current_session: currentSession,
    };
  });

  const updatedSessions = await allSessions();
  const updated = updatedSessions.find((s) => s.label === newSession);
  res.json({ session: newSession, term: updated?.term, is_current: updated?.is_current, sessions: updatedSessions });
}

router.post('/:session/edit', authMiddleware, handleCommitteeEdit);
router.put('/:session', authMiddleware, handleCommitteeEdit);

const COMMITTEE_COLS = [
  ['Name', 'name'], ['Position', 'position'], ['Department', 'department'], ['Batch', 'batch'],
  ['Session', 'committee_session'], ['Facebook', 'social_fb'], ['GitHub', 'social_gh'], ['LinkedIn', 'social_li'],
];

/** Admin: one committee as a list. ?format=csv|xlsx */
router.get('/:session/export', authMiddleware, async (req, res) => {
  try {
    const session = clean(decodeURIComponent(req.params.session), 50);
    const { rows } = await pool.query('SELECT * FROM members WHERE committee_session = $1 AND deleted_at IS NULL ORDER BY display_order', [session]);
    if (!rows.length) return res.status(404).json({ error: 'No people in this committee' });
    const xlsx = String(req.query.format).toLowerCase() === 'xlsx';
    const base = `committee-${safe(session)}-${new Date().toISOString().slice(0, 10)}`;
    res.set({
      'Content-Type': xlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${base}.${xlsx ? 'xlsx' : 'csv'}"`,
      'Cache-Control': 'no-store',
    });
    res.send(xlsx
      ? await tableToXlsx(`${session} committee`, `${rows.length} people`, COMMITTEE_COLS, rows)
      : toCsv(COMMITTEE_COLS.map((c) => c[0]), rows.map((r) => COMMITTEE_COLS.map(([, k]) => r[k]))));
  } catch (e) { console.error('Committee export failed:', e.message); res.status(500).json({ error: 'Could not build the download' }); }
});

/** Admin: one committee as a ZIP: the list (CSV, Excel) and every person's picture in full quality. ?format=original|jpg|png */
router.get('/:session/zip', authMiddleware, async (req, res) => {
  try {
    const session = clean(decodeURIComponent(req.params.session), 50);
    const { rows } = await pool.query('SELECT * FROM members WHERE committee_session = $1 AND deleted_at IS NULL ORDER BY display_order', [session]);
    if (!rows.length) return res.status(404).json({ error: 'No people in this committee' });
    const csv = toCsv(COMMITTEE_COLS.map((c) => c[0]), rows.map((r) => COMMITTEE_COLS.map(([, k]) => r[k])));
    const entries = [{ name: 'committee.csv', data: csv }, { name: 'committee.xlsx', data: await tableToXlsx(`${session} committee`, `${rows.length} people`, COMMITTEE_COLS, rows) }, ...rows.filter((r) => r.image_url && !r.image_url.startsWith('data:')).map((r, i) => ({ name: `photos/${String(i + 1).padStart(2, '0')}-${safe(r.position)}-${safe(r.name, `person-${r.id}`)}`, image: r.image_url }))];
    await sendZip(res, `committee-${safe(session)}`, entries, { format: req.query.format });
  } catch (e) { console.error('Committee zip failed:', e.message); if (!res.headersSent) res.status(500).json({ error: 'Could not build the download' }); else res.end(); }
});

/**
 * Delete a whole committee. Everyone in it goes to the Trash (restorable for 20 days); nothing else is touched.
 * Each committee keeps its own pictures in its own folder, so permanently deleting this one never affects another committee.
 */
router.delete('/:session', authMiddleware, async (req, res) => {
  const session = clean(decodeURIComponent(req.params.session), 50);
  if (!session) return res.status(400).json({ error: 'Choose a committee' });
  try {
    const r = await pool.query('UPDATE members SET deleted_at = NOW() WHERE committee_session = $1 AND deleted_at IS NULL', [session]);
    await saveSite((cur) => ({
      ...cur,
      sessions: (cur.sessions || []).filter((s) => s !== session),
      terms: Object.fromEntries(Object.entries(cur.terms || {}).filter(([key]) => key !== session)),
      current_session: cur.current_session === session ? null : cur.current_session,
    }));
    res.json({ session, trashed: r.rowCount || 0 });
  } catch (e) {
    console.error('Delete committee failed:', e.message);
    res.status(500).json({ error: 'Could not delete the committee' });
  }
});

module.exports = router;
