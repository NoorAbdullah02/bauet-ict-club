// Public: club numbers for the "Club data" page (web and app). Counts only: no names, phones or emails. Cached for 10 minutes.
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
let cache = { at: 0, body: null };
const num = (v) => Number(v) || 0;
const q = async (sql) => { try { return (await pool.query(sql)).rows; } catch { return []; } };
const live = "deleted_at IS NULL AND NOT COALESCE(is_draft, FALSE) AND (publish_at IS NULL OR publish_at <= NOW())";

router.get('/', limiter, async (_req, res) => {
  if (cache.body && Date.now() - cache.at < 10 * 60 * 1000) return res.set('Cache-Control', 'public, max-age=300').json(cache.body);
  const count = async (table, where = 'deleted_at IS NULL') => num((await q(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`))[0]?.n);
  const [members, events, notices, projects, contests, jobs, gallery, achievements, advisors, byYear, byDept, bySession, regs] = await Promise.all([
    count('members'), count('events', live), count('notices', live), count('projects'), count('contests', live), count('jobs', live), count('gallery'), count('achievements'), count('advisors', 'COALESCE(active, TRUE)'),
    q("SELECT EXTRACT(YEAR FROM date)::int AS k, COUNT(*) AS n FROM events WHERE " + live + " AND date IS NOT NULL GROUP BY 1 ORDER BY 1"),
    q("SELECT COALESCE(NULLIF(TRIM(department), ''), 'Other') AS k, COUNT(*) AS n FROM members WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 12"),
    q("SELECT COALESCE(NULLIF(TRIM(committee_session), ''), 'Other') AS k, COUNT(*) AS n FROM members WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12"),
    q("SELECT COUNT(*) AS n FROM event_registrations WHERE deleted_at IS NULL AND COALESCE(waitlisted, FALSE) = FALSE"),
  ]);
  const rows = (a) => a.map((r) => ({ name: String(r.k), count: num(r.n) }));
  cache = { at: Date.now(), body: {
    updated: new Date().toISOString(),
    totals: { members, events, notices, projects, contests, jobs, gallery, achievements, advisors, registrations: num(regs[0]?.n) },
    eventsByYear: rows(byYear), membersByDepartment: rows(byDept), membersBySession: rows(bySession),
  } };
  res.set('Cache-Control', 'public, max-age=300').json(cache.body);
});
module.exports = router;
