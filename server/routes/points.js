const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');

const router = express.Router();

/**
 * Member points and badges. Nobody has to sign up for anything:
 *  - 10 points for every event a person was checked in at (people are told apart by e-mail),
 *  - extra points an admin gives for a reason (volunteering, winning a contest, ...).
 * The public leaderboard shows only a masked name (Rahim K.), never an e-mail.
 */
const PER_EVENT = 10;
const BADGES = [
  { id: 'first', name: 'First step', icon: '🌱', need: (p) => p.events >= 1, hint: 'Come to one event' },
  { id: 'regular', name: 'Regular', icon: '⭐', need: (p) => p.events >= 3, hint: 'Come to 3 events' },
  { id: 'star', name: 'Club star', icon: '🏅', need: (p) => p.events >= 5, hint: 'Come to 5 events' },
  { id: 'legend', name: 'Legend', icon: '🏆', need: (p) => p.events >= 10, hint: 'Come to 10 events' },
  { id: 'helper', name: 'Helper', icon: '🤝', need: (p) => p.bonus > 0, hint: 'Earn bonus points from the team' },
  { id: 'century', name: 'Century', icon: '💯', need: (p) => p.points >= 100, hint: 'Reach 100 points' },
];
const mask = (name) => {
  const parts = String(name || 'Member').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Member';
  const first = parts[0].slice(0, 14);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
};

async function table() {
  const att = (await pool.query("SELECT LOWER(email) AS e, MAX(full_name) AS n, COUNT(DISTINCT event_id)::int AS c FROM event_registrations WHERE deleted_at IS NULL AND checked_in_at IS NOT NULL AND email IS NOT NULL AND email <> '' GROUP BY LOWER(email)")).rows;
  const aw = (await pool.query("SELECT LOWER(email) AS e, MAX(name) AS n, SUM(points)::int AS p FROM point_awards WHERE deleted_at IS NULL GROUP BY LOWER(email)")).rows;
  const by = new Map();
  for (const r of att) by.set(r.e, { email: r.e, name: r.n, events: r.c, bonus: 0 });
  for (const r of aw) { const x = by.get(r.e) || { email: r.e, name: r.n, events: 0, bonus: 0 }; x.bonus = r.p; if (!x.name) x.name = r.n; by.set(r.e, x); }
  const list = [...by.values()].map((x) => ({ ...x, points: x.events * PER_EVENT + x.bonus })).filter((x) => x.points > 0);
  list.sort((a, b) => b.points - a.points || b.events - a.events || String(a.name).localeCompare(String(b.name)));
  let rank = 0, last = null;
  list.forEach((x, i) => { if (x.points !== last) { rank = i + 1; last = x.points; } x.rank = rank; x.badges = BADGES.filter((b) => b.need(x)).map(({ id, name, icon }) => ({ id, name, icon })); });
  return list;
}
const view = (x) => ({ rank: x.rank, name: mask(x.name), points: x.points, events: x.events, badges: x.badges });

/** Public: the top of the leaderboard (masked names). */
router.get('/leaderboard', async (_req, res) => {
  try {
    const list = await table();
    res.set('Cache-Control', 'public, max-age=30').json({ per_event: PER_EVENT, people: list.length, top: list.slice(0, 25).map(view), badges: BADGES.map(({ id, name, icon, hint }) => ({ id, name, icon, hint })) });
  } catch (e) { fail(res, e); }
});

/** Public: points of the person who owns a ticket (the ticket code is the secret). GET /api/points/me?ticket=CODE */
router.get('/me', async (req, res) => {
  try {
    const code = String(req.query.ticket || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (code.length < 8) return res.status(404).json({ error: 'Ticket not found' });
    const r = (await pool.query('SELECT email, full_name FROM event_registrations WHERE UPPER(ticket) = $1 AND deleted_at IS NULL', [code])).rows[0];
    if (!r || !r.email) return res.status(404).json({ error: 'Ticket not found' });
    const list = await table();
    const mine = list.find((x) => x.email === String(r.email).toLowerCase());
    const base = mine || { rank: null, points: 0, events: 0, bonus: 0, badges: [] };
    const next = BADGES.find((b) => !b.need(base));
    res.set('Cache-Control', 'no-store').json({ name: mask(r.full_name), rank: base.rank, points: base.points, events: base.events, badges: base.badges, next: next ? { name: next.name, icon: next.icon, hint: next.hint } : null, per_event: PER_EVENT });
  } catch (e) { fail(res, e); }
});

/** Admin: the whole table with e-mails, to give extra points. */
router.get('/admin', authMiddleware, async (_req, res) => {
  try {
    const list = await table();
    const awards = (await pool.query('SELECT id, email, name, points, reason, created_at FROM point_awards WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100')).rows;
    res.json({ per_event: PER_EVENT, people: list.map((x) => ({ ...view(x), email: x.email, full_name: x.name, bonus: x.bonus })), awards });
  } catch (e) { fail(res, e); }
});

/** Admin: give (or take back, with a negative number) points. Body: { email, name?, points, reason } */
router.post('/award', authMiddleware, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const points = Math.round(Number(req.body?.points));
    const reason = String(req.body?.reason || '').trim().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter the person\'s e-mail address.' });
    if (!Number.isFinite(points) || points === 0 || Math.abs(points) > 1000) return res.status(400).json({ error: 'Points must be a number between -1000 and 1000 (not 0).' });
    if (!reason) return res.status(400).json({ error: 'Write a short reason, so the history makes sense.' });
    const name = String(req.body?.name || '').trim().slice(0, 80) || null;
    const { rows } = await pool.query('INSERT INTO point_awards (email, name, points, reason) VALUES ($1,$2,$3,$4) RETURNING id, email, name, points, reason, created_at', [email, name, points, reason]);
    res.status(201).json(rows[0]);
  } catch (e) { fail(res, e); }
});

/** Admin: undo one award. */
router.delete('/award/:id', authMiddleware, async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE point_awards SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.id) || 0]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

module.exports = router;
