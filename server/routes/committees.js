const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { loadDemo, removeDemo, demoCount } = require('../utils/demo');
const { leadershipConflict } = require('../utils/positions');
const { cloneImage } = require('../utils/images');
const { sendZip, safe } = require('../utils/zipper');
const { toCsv } = require('../utils/csv');
const { destroyImage } = require('../utils/cloud');

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

/** All committee sessions: those that have members plus ones launched but still empty. */
async function allSessions() {
  const { rows } = await pool.query('SELECT committee_session AS s, COUNT(*) AS n FROM members WHERE committee_session IS NOT NULL AND deleted_at IS NULL GROUP BY committee_session');
  const counts = Object.fromEntries(rows.map((r) => [r.s, Number(r.n)]));
  const launched = (await siteSettings()).sessions || [];
  return [...new Set([...Object.keys(counts), ...launched])].map((label) => ({ label, members: counts[label] || 0 }));
}

router.get('/', async (_req, res) => {
  try { res.json(await allSessions()); } catch (e) { res.status(500).json({ error: 'Could not load sessions' }); }
});

/**
 * Launch a new committee for a semester.
 * body: { session: "Winter 2027", copyFrom?: "Summer 2026", scope: "none" | "leaders" | "all" }
 */
router.post('/launch', authMiddleware, async (req, res) => {
  const session = clean(req.body.session, 50);
  const copyFrom = clean(req.body.copyFrom, 50);
  const scope = ['none', 'leaders', 'all'].includes(req.body.scope) ? req.body.scope : 'none';
  if (!/^(Summer|Winter|Spring|Autumn|Session)\s+\S+/i.test(session)) return res.status(400).json({ error: 'Use a name like “Winter 2027”' });

  try {
    const existing = await allSessions();
    if (existing.some((s) => s.label.toLowerCase() === session.toLowerCase())) return res.status(409).json({ error: `${session} already exists` });

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
    const cur = await siteSettings();
    const sessions = [...new Set([...(cur.sessions || []), session])];
    await pool.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify({ ...cur, sessions })]);
    res.status(201).json({ session, copied });
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
    const cur = await siteSettings();
    if (!(cur.sessions || []).includes(toSession)) {
      await pool.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify({ ...cur, sessions: [...(cur.sessions || []), toSession] })]);
    }
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

/** Admin: one committee as a ZIP: the list (CSV) and every person's picture in full quality. ?format=original|jpg|png */
router.get('/:session/zip', authMiddleware, async (req, res) => {
  try {
    const session = clean(decodeURIComponent(req.params.session), 50);
    const { rows } = await pool.query('SELECT * FROM members WHERE committee_session = $1 AND deleted_at IS NULL ORDER BY display_order', [session]);
    if (!rows.length) return res.status(404).json({ error: 'No people in this committee' });
    const cols = ['name', 'position', 'department', 'batch', 'committee_session', 'social_fb', 'social_gh', 'social_li'];
    const csv = toCsv(cols, rows.map((r) => cols.map((c) => r[c])));
    const entries = [{ name: 'committee.csv', data: csv }, ...rows.filter((r) => r.image_url && !r.image_url.startsWith('data:')).map((r, i) => ({ name: `photos/${String(i + 1).padStart(2, '0')}-${safe(r.position)}-${safe(r.name, `person-${r.id}`)}`, image: r.image_url }))];
    await sendZip(res, `committee-${safe(session)}`, entries, { format: req.query.format });
  } catch (e) { console.error('Committee zip failed:', e.message); if (!res.headersSent) res.status(500).json({ error: 'Could not build the download' }); else res.end(); }
});

/**
 * Delete a whole committee. Everyone in it goes to the Trash (restorable for 30 days); nothing else is touched.
 * Each committee keeps its own pictures in its own folder, so permanently deleting this one never affects another committee.
 */
router.delete('/:session', authMiddleware, async (req, res) => {
  const session = clean(decodeURIComponent(req.params.session), 50);
  if (!session) return res.status(400).json({ error: 'Choose a committee' });
  try {
    const r = await pool.query('UPDATE members SET deleted_at = NOW() WHERE committee_session = $1 AND deleted_at IS NULL', [session]);
    const cur = await siteSettings();
    await pool.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify({ ...cur, sessions: (cur.sessions || []).filter((s) => s !== session) })]);
    res.json({ session, trashed: r.rowCount || 0 });
  } catch (e) {
    console.error('Delete committee failed:', e.message);
    res.status(500).json({ error: 'Could not delete the committee' });
  }
});

module.exports = router;
