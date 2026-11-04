const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { loadDemo, removeDemo, demoCount } = require('../utils/demo');

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
    if (scope !== 'none' && copyFrom) {
      const { rows } = await pool.query('SELECT * FROM members WHERE committee_session = $1 AND deleted_at IS NULL ORDER BY display_order', [copyFrom]);
      const take = rows.filter((m) => scope === 'all' || /^((Vice President|VP)\b|President)/i.test(m.position));
      for (const m of take) {
        await pool.query(
          'INSERT INTO members (name, position, department, batch, committee_session, image_url, social_fb, social_gh, social_li, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [m.name, m.position, m.department, m.batch, session, m.image_url, m.social_fb, m.social_gh, m.social_li, m.display_order]
        );
        copied += 1;
      }
    }
    const cur = await siteSettings();
    const sessions = [...new Set([...(cur.sessions || []), session])];
    await pool.query("INSERT INTO settings (key, value) VALUES ('site', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()", [JSON.stringify({ ...cur, sessions })]);
    res.status(201).json({ session, copied });
  } catch (e) {
    console.error('Launch committee failed:', e.message);
    res.status(500).json({ error: 'Could not launch the committee' });
  }
});

// ---- demo data (admin only) ----
router.get('/demo', authMiddleware, async (_req, res) => {
  try { res.json({ count: await demoCount() }); } catch { res.status(500).json({ error: 'Could not read demo status' }); }
});
router.post('/demo', authMiddleware, async (_req, res) => {
  try { res.json(await loadDemo()); } catch (e) { console.error('Demo load failed:', e.message); res.status(500).json({ error: 'Could not load demo data' }); }
});
router.delete('/demo', authMiddleware, async (_req, res) => {
  try { res.json(await removeDemo()); } catch (e) { res.status(500).json({ error: 'Could not remove demo data' }); }
});

module.exports = router;
