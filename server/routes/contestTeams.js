const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const { toCsv } = require('../utils/csv');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many team sign-ups from this network. Please try again later.' } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const today = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10); // Bangladesh date
const day = (d) => (d instanceof Date ? new Date(d.getTime() + 6 * 3600e3).toISOString() : String(d || '')).slice(0, 10);
/** points for the top places when the results are published */
const PRIZE_POINTS = { 1: 50, 2: 30, 3: 20 };
const PARTICIPATION_POINTS = 5;

const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
const publicTeam = (t) => ({ id: t.id, team_name: t.team_name, rank: t.rank, prize_note: t.prize_note, size: 1 + (Array.isArray(t.members) ? t.members.length : 0) });

/** Public: how many teams joined, and (once published) the results. No e-mails or phone numbers. */
router.get('/public/:contestId', async (req, res) => {
  try {
    const c = (await pool.query('SELECT id, title, status, results_published, team_min, team_max, deadline FROM contests WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.contestId) || 0])).rows[0];
    if (!c) return res.status(404).json({ error: 'Contest not found' });
    const teams = (await pool.query("SELECT * FROM contest_teams WHERE contest_id = $1 AND deleted_at IS NULL AND status <> 'withdrawn' ORDER BY team_name", [c.id])).rows;
    const live = teams.filter((t) => t.status === 'registered');
    const out = { teams: live.length, open: c.status === 'open' && (!c.deadline || day(c.deadline) >= today()), team_min: c.team_min, team_max: c.team_max, results: null };
    if (c.results_published) out.results = live.filter((t) => t.rank).sort((a, b) => a.rank - b.rank).map(publicTeam);
    res.set('Cache-Control', 'no-cache').json(out);
  } catch (e) { fail(res, e); }
});

/** Public: a team signs up. Body: { team_name, leader_name, email, phone, members: [{ name, email, student_id }] } */
router.post('/:contestId', limiter, async (req, res) => {
  if (req.body?._hp) return res.status(201).json({ success: true }); // a bot filled the hidden trap field
  try {
    const c = (await pool.query('SELECT * FROM contests WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.contestId) || 0])).rows[0];
    if (!c) return res.status(404).json({ error: 'Contest not found' });
    if (c.status !== 'open') return res.status(409).json({ error: 'Sign-up for this contest is closed.' });
    if (c.deadline && day(c.deadline) < today()) return res.status(409).json({ error: 'The sign-up deadline has passed.' });
    const team_name = clean(req.body?.team_name, 80);
    const leader_name = clean(req.body?.leader_name, 120);
    const email = clean(req.body?.email, 160).toLowerCase();
    const phone = clean(req.body?.phone, 40);
    if (!team_name) return res.status(400).json({ error: 'Give your team a name.' });
    if (!leader_name) return res.status(400).json({ error: 'Write the team leader\'s name.' });
    if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid e-mail address for the team leader.' });
    const rawMembers = Array.isArray(req.body?.members) ? req.body.members.slice(0, 20) : [];
    const members = [];
    for (const m of rawMembers) {
      const name = clean(m?.name, 120); const e = clean(m?.email, 160).toLowerCase(); const sid = clean(m?.student_id, 40);
      if (!name && !e && !sid) continue; // an empty row
      if (!name) return res.status(400).json({ error: 'Every team member needs a name.' });
      if (e && !EMAIL.test(e)) return res.status(400).json({ error: `"${e}" is not a valid e-mail address.` });
      members.push({ name, email: e || null, student_id: sid || null });
    }
    const size = 1 + members.length;
    if (size < (c.team_min || 1)) return res.status(400).json({ error: `A team needs at least ${c.team_min} ${c.team_min === 1 ? 'person' : 'people'} (you listed ${size}).` });
    if (size > (c.team_max || 4)) return res.status(400).json({ error: `A team can have at most ${c.team_max} people (you listed ${size}).` });
    const mails = [email, ...members.map((m) => m.email).filter(Boolean)];
    if (new Set(mails).size !== mails.length) return res.status(400).json({ error: 'The same e-mail address appears twice in your team.' });
    const existing = (await pool.query("SELECT team_name, email, members FROM contest_teams WHERE contest_id = $1 AND deleted_at IS NULL AND status <> 'withdrawn'", [c.id])).rows;
    if (existing.some((t) => t.team_name.toLowerCase() === team_name.toLowerCase())) return res.status(409).json({ error: 'Another team already uses this name. Pick a different one.' });
    const taken = new Set(existing.flatMap((t) => [t.email, ...(Array.isArray(t.members) ? t.members.map((m) => m.email) : [])]).filter(Boolean).map((x) => String(x).toLowerCase()));
    const dup = mails.find((m) => taken.has(m));
    if (dup) return res.status(409).json({ error: `${dup} is already in another team for this contest.` });
    const { rows } = await pool.query('INSERT INTO contest_teams (contest_id, team_name, leader_name, email, phone, members) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [c.id, team_name, leader_name, email, phone || null, JSON.stringify(members)]);
    res.status(201).json({ success: true, id: rows[0].id, team_name, size });
  } catch (e) { fail(res, e); }
});

/** Admin: every team of a contest, with contact details. */
router.get('/admin/:contestId', authMiddleware, async (req, res) => {
  try {
    const c = (await pool.query('SELECT id, title, results_published, status FROM contests WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.contestId) || 0])).rows[0];
    if (!c) return res.status(404).json({ error: 'Contest not found' });
    const teams = (await pool.query('SELECT * FROM contest_teams WHERE contest_id = $1 AND deleted_at IS NULL ORDER BY rank NULLS LAST, created_at', [c.id])).rows;
    res.set('Cache-Control', 'no-store').json({ contest: c, teams, prize_points: PRIZE_POINTS, participation_points: PARTICIPATION_POINTS });
  } catch (e) { fail(res, e); }
});

/** Admin: set a team's place, score, status or note. */
router.patch('/admin/team/:id', authMiddleware, async (req, res) => {
  try {
    const sets = []; const vals = [];
    const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
    if (req.body?.rank !== undefined) {
      const r = req.body.rank === null || req.body.rank === '' ? null : Number(req.body.rank);
      if (r !== null && (!Number.isInteger(r) || r < 1 || r > 999)) return res.status(400).json({ error: 'The place must be a whole number such as 1, 2 or 3.' });
      add('rank', r);
    }
    if (req.body?.score !== undefined) {
      const sc = req.body.score === null || req.body.score === '' ? null : Number(req.body.score);
      if (sc !== null && !Number.isFinite(sc)) return res.status(400).json({ error: 'The score must be a number.' });
      add('score', sc);
    }
    if (req.body?.status !== undefined) {
      if (!['registered', 'disqualified', 'withdrawn'].includes(req.body.status)) return res.status(400).json({ error: 'Status must be registered, disqualified or withdrawn.' });
      add('status', req.body.status);
    }
    if (req.body?.prize_note !== undefined) add('prize_note', clean(req.body.prize_note, 160) || null);
    // the team's own details can be corrected too
    const cur = (await pool.query('SELECT * FROM contest_teams WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.id) || 0])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Team not found' });
    if (req.body?.team_name !== undefined) {
      const n = clean(req.body.team_name, 80);
      if (!n) return res.status(400).json({ error: 'The team needs a name.' });
      const same = await pool.query("SELECT 1 FROM contest_teams WHERE contest_id = $1 AND LOWER(team_name) = LOWER($2) AND id <> $3 AND deleted_at IS NULL AND status <> 'withdrawn'", [cur.contest_id, n, cur.id]);
      if (same.rowCount) return res.status(409).json({ error: 'Another team already uses this name.' });
      add('team_name', n);
    }
    if (req.body?.leader_name !== undefined) { const n = clean(req.body.leader_name, 120); if (!n) return res.status(400).json({ error: 'The leader needs a name.' }); add('leader_name', n); }
    if (req.body?.email !== undefined) { const e = clean(req.body.email, 160).toLowerCase(); if (!EMAIL.test(e)) return res.status(400).json({ error: 'Enter a valid e-mail address.' }); add('email', e); }
    if (req.body?.phone !== undefined) add('phone', clean(req.body.phone, 40) || null);
    if (req.body?.members !== undefined) {
      if (!Array.isArray(req.body.members) || req.body.members.length > 20) return res.status(400).json({ error: 'The members must be a list of at most 20 people.' });
      const ms = [];
      for (const m of req.body.members) {
        const name = clean(m?.name, 120); const e = clean(m?.email, 160).toLowerCase(); const sid = clean(m?.student_id, 40);
        if (!name && !e && !sid) continue;
        if (!name) return res.status(400).json({ error: 'Every member needs a name.' });
        if (e && !EMAIL.test(e)) return res.status(400).json({ error: `"${e}" is not a valid e-mail address.` });
        ms.push({ name, email: e || null, student_id: sid || null });
      }
      add('members', JSON.stringify(ms));
    }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to save' });
    vals.push(Number(req.params.id) || 0);
    const { rows } = await pool.query(`UPDATE contest_teams SET ${sets.join(', ')} WHERE id = $${vals.length} AND deleted_at IS NULL RETURNING *`, vals);
    if (!rows.length) return res.status(404).json({ error: 'Team not found' });
    res.json(rows[0]);
  } catch (e) { fail(res, e); }
});

router.delete('/admin/team/:id', authMiddleware, async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE contest_teams SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.id) || 0]);
    if (!rowCount) return res.status(404).json({ error: 'Team not found' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

/** Admin: show the results on the website and give points (1st 50, 2nd 30, 3rd 20, everyone else who took part 5). Safe to press again. */
router.post('/admin/:contestId/publish', authMiddleware, async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM contests WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.contestId) || 0])).rows[0];
    if (!c) return res.status(404).json({ error: 'Contest not found' });
    const teams = (await pool.query("SELECT * FROM contest_teams WHERE contest_id = $1 AND deleted_at IS NULL AND status = 'registered'", [c.id])).rows;
    if (!teams.some((t) => t.rank)) return res.status(400).json({ error: 'Give at least one team a place (1, 2, 3 ...) first.' });
    let given = 0;
    for (const t of teams) {
      const pts = t.rank && PRIZE_POINTS[t.rank] ? PRIZE_POINTS[t.rank] : PARTICIPATION_POINTS;
      const reason = `${c.title}: ${t.rank && PRIZE_POINTS[t.rank] ? `${ordinal(t.rank)} place` : 'took part'}`.slice(0, 120);
      const people = [{ name: t.leader_name, email: t.email }, ...(Array.isArray(t.members) ? t.members : [])].filter((p) => p.email);
      for (const p of people) {
        const have = await pool.query('SELECT 1 FROM point_awards WHERE LOWER(email) = $1 AND reason = $2 AND deleted_at IS NULL', [String(p.email).toLowerCase(), reason]);
        if (have.rowCount) continue;
        await pool.query('INSERT INTO point_awards (email, name, points, reason) VALUES ($1,$2,$3,$4)', [String(p.email).toLowerCase(), p.name || null, pts, reason]);
        given += 1;
      }
    }
    await pool.query("UPDATE contests SET results_published = TRUE, status = 'finished' WHERE id = $1", [c.id]);
    res.json({ success: true, awards_given: given });
  } catch (e) { fail(res, e); }
});

/** Admin: hide the results again (points already given stay; remove them on the Points page). */
router.post('/admin/:contestId/unpublish', authMiddleware, async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE contests SET results_published = FALSE WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.contestId) || 0]);
    if (!rowCount) return res.status(404).json({ error: 'Contest not found' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

/** Admin: the teams as a spreadsheet. */
router.get('/admin/:contestId/export', authMiddleware, async (req, res) => {
  try {
    const c = (await pool.query('SELECT title FROM contests WHERE id = $1 AND deleted_at IS NULL', [Number(req.params.contestId) || 0])).rows[0];
    if (!c) return res.status(404).json({ error: 'Contest not found' });
    const teams = (await pool.query('SELECT * FROM contest_teams WHERE contest_id = $1 AND deleted_at IS NULL ORDER BY rank NULLS LAST, created_at', [Number(req.params.contestId)])).rows;
    const csv = toCsv(['Team', 'Leader', 'E-mail', 'Phone', 'Members', 'Status', 'Place', 'Score', 'Note'],
      teams.map((t) => [t.team_name, t.leader_name, t.email, t.phone, (t.members || []).map((m) => [m.name, m.email, m.student_id].filter(Boolean).join(' / ')), t.status, t.rank, t.score, t.prize_note]));
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="contest-${Number(req.params.contestId)}-teams.csv"` }).send(csv);
  } catch (e) { fail(res, e); }
});

module.exports = router;
