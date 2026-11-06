const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many searches. Please wait a moment.' } });
const like = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const day = (d) => (d instanceof Date ? d.toISOString() : String(d || '')).slice(0, 10);

/** Public: one search box for the whole site. GET /api/search?q=word  ->  [{ type, id, title, sub, path }] (at most 6 per kind). */
router.get('/', limiter, async (req, res) => {
  const q = clip(req.query.q, 60);
  if (q.length < 2) return res.json([]);
  const p = like(q.toLowerCase());
  const run = async (sql, map) => { try { return (await pool.query(sql, [p])).rows.map(map); } catch { return []; } };
  const today = new Date().toISOString().slice(0, 10);
  const [events, notices, members, projects, faqs, resources] = await Promise.all([
    run("SELECT id, title, date, location FROM events WHERE deleted_at IS NULL AND (publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, FALSE) AND (LOWER(title) LIKE $1 OR LOWER(COALESCE(location, '')) LIKE $1 OR LOWER(COALESCE(description, '')) LIKE $1) ORDER BY date DESC LIMIT 6",
      (r) => ({ type: 'event', id: r.id, title: r.title, sub: [day(r.date), r.location].filter(Boolean).join(' · '), path: `/events/${r.id}` })),
    run("SELECT id, title, date, content, expiry_date FROM notices WHERE deleted_at IS NULL AND (publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, FALSE) AND (LOWER(title) LIKE $1 OR LOWER(COALESCE(content, '')) LIKE $1) ORDER BY date DESC LIMIT 12",
      (r) => ({ type: 'notice', id: r.id, title: r.title, sub: clip(r.content, 90), path: '/notices', expiry: day(r.expiry_date) })),
    run("SELECT id, name, position, committee_session FROM members WHERE deleted_at IS NULL AND (LOWER(name) LIKE $1 OR LOWER(COALESCE(position, '')) LIKE $1 OR LOWER(COALESCE(department, '')) LIKE $1) ORDER BY display_order LIMIT 6",
      (r) => ({ type: 'member', id: r.id, title: r.name, sub: [r.position, r.committee_session].filter(Boolean).join(' · '), path: `/card/${r.id}` })),
    run("SELECT id, title, summary, tech FROM projects WHERE deleted_at IS NULL AND (LOWER(title) LIKE $1 OR LOWER(COALESCE(summary, '')) LIKE $1 OR LOWER(COALESCE(tech, '')) LIKE $1) ORDER BY created_at DESC LIMIT 6",
      (r) => ({ type: 'project', id: r.id, title: r.title, sub: clip(r.summary, 90), path: '/projects' })),
    run("SELECT id, question, answer FROM faqs WHERE deleted_at IS NULL AND (LOWER(question) LIKE $1 OR LOWER(answer) LIKE $1) ORDER BY sort_order LIMIT 6",
      (r) => ({ type: 'faq', id: r.id, title: r.question, sub: clip(r.answer, 90), path: '/faq' })),
    run("SELECT id, title, description, category, kind FROM resources WHERE deleted_at IS NULL AND (LOWER(title) LIKE $1 OR LOWER(COALESCE(description, '')) LIKE $1 OR LOWER(COALESCE(category, '')) LIKE $1) ORDER BY created_at DESC LIMIT 6",
      (r) => ({ type: 'resource', id: r.id, title: r.title, sub: [r.kind, r.category].filter(Boolean).join(' · ') || clip(r.description, 90), path: '/resources' })),
  ]);
  const live = notices.filter((n) => !n.expiry || n.expiry >= today).slice(0, 6).map(({ expiry, ...n }) => n);
  res.set('Cache-Control', 'no-store').json([...events, ...live, ...members, ...projects, ...resources, ...faqs]);
});

module.exports = router;
