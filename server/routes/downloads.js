// Admin downloads: one place to get every list the club keeps — as CSV (opens in Excel / Google Sheets) or JSON.
// Only the main admin and admins may download: editors can run events but must not walk away with applicant phone numbers.
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const { toCsv } = require('../utils/csv');
const { tableToXlsx } = require('../utils/exporters');

const router = express.Router();

router.use(authMiddleware);
router.use((req, res, next) => (
  req.user?.role === 'editor'
    ? res.status(403).json({ error: 'Your login can edit but cannot download personal data. Ask the main admin.' })
    : next()
));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many downloads. Please wait a few minutes.' } });

/**
 * Every downloadable list. `where` is fixed SQL (never user input); `dated` adds an optional from/to filter on created_at;
 * `event` / `form` allow narrowing one event's sign-ups or one form's responses.
 */
const SECTIONS = [
  { key: 'applications', label: 'Membership applications', group: 'People', table: 'registrations', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'members', label: 'Committee members', group: 'People', table: 'members', where: 'deleted_at IS NULL', order: 'display_order ASC' },
  { key: 'advisors', label: 'Advisors', group: 'People', table: 'advisors', where: 'deleted_at IS NULL', order: 'sort_order ASC' },
  { key: 'subscribers', label: 'Newsletter subscribers', group: 'People', table: 'subscribers', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'messages', label: 'Contact messages', group: 'People', table: 'messages', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'point-awards', label: 'Points and bonus awards', group: 'People', table: 'point_awards', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'event-signups', label: 'Event sign-ups (all events)', group: 'Events', table: 'event_registrations', where: 'er.deleted_at IS NULL', order: 'er.created_at DESC', dated: true, event: true, select: 'er.*, e.title AS event_title, e.date AS event_date' },
  { key: 'events', label: 'Events', group: 'Events', table: 'events', where: 'deleted_at IS NULL', order: 'date DESC', dated: true },
  { key: 'notices', label: 'Notices', group: 'Events', table: 'notices', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'contests', label: 'Contests and hackathons', group: 'Events', table: 'contests', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'contest-teams', label: 'Contest teams', group: 'Events', table: 'contest_teams', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'forms', label: 'Forms', group: 'Forms', table: 'forms', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'form-responses', label: 'Form responses', group: 'Forms', table: 'form_responses', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true, form: true },
  { key: 'gallery', label: 'Gallery', group: 'Content', table: 'gallery', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'achievements', label: 'Achievements', group: 'Content', table: 'achievements', where: 'deleted_at IS NULL', order: 'date DESC' },
  { key: 'posts', label: 'Posts and news', group: 'Content', table: 'posts', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'projects', label: 'Projects', group: 'Content', table: 'projects', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'resources', label: 'Resource library', group: 'Content', table: 'resources', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'faqs', label: 'FAQ', group: 'Content', table: 'faqs', where: 'deleted_at IS NULL', order: 'sort_order ASC' },
  { key: 'sponsors', label: 'Sponsors', group: 'Content', table: 'sponsors', where: 'deleted_at IS NULL', order: 'sort_order ASC' },
  { key: 'jobs', label: 'Club jobs and internships', group: 'Content', table: 'jobs', where: 'deleted_at IS NULL', order: 'created_at DESC', dated: true },
  { key: 'audit-log', label: 'Activity log (who changed what)', group: 'System', table: 'audit_log', where: 'TRUE', order: 'created_at DESC', dated: true },
  { key: 'short-links', label: 'Short links and clicks', group: 'System', table: 'short_links', where: 'TRUE', order: 'created_at DESC', dated: true },
  { key: 'page-views', label: 'Visitor log (includes IP addresses)', group: 'System', table: 'page_views', where: 'TRUE', order: 'created_at DESC', dated: true, note: 'Personal data: visitor IP addresses. Delete the file when you are done.' },
];

const byKey = new Map(SECTIONS.map((s) => [s.key, s]));
const MAX_ROWS = 100000;

const day = (v) => {
  const t = String(v || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : '';
};
/** The day after a YYYY-MM-DD value, so "to" includes everything that happened on that day. */
const nextDay = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

/** Builds the WHERE clause and its parameters for one section. SQL text is fixed; only values are bound. */
function filterOf(section, query) {
  const bits = [section.where];
  const values = [];
  if (section.event) {
    const id = Number(query.event);
    if (Number.isInteger(id) && id > 0) { values.push(id); bits.push(`${section.table === 'event_registrations' ? 'er' : section.table}.event_id = $${values.length}`); }
  }
  if (section.form) {
    const id = Number(query.form);
    if (Number.isInteger(id) && id > 0) { values.push(id); bits.push(`form_id = $${values.length}`); }
  }
  if (section.dated) {
    const from = day(query.from);
    const to = day(query.to);
    if (from) { values.push(from); bits.push(`created_at >= $${values.length}`); }
    if (to) { values.push(nextDay(to)); bits.push(`created_at < $${values.length}`); } // up to and including the chosen day
  }
  return { where: bits.length ? `WHERE ${bits.join(' AND ')}` : '', values };
}

const fromOf = (section) => (section.table === 'event_registrations'
  ? `event_registrations er LEFT JOIN events e ON e.id = er.event_id`
  : section.table);

/** Nested JSON (answers, payment, interests...) becomes readable text in CSV; JSON downloads keep the real shape. */
const flatten = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (v instanceof Date) return v.toISOString();
  return v;
};

function toCsvText(rows) {
  if (!rows.length) return toCsv(['(no rows)'], []);
  const head = Object.keys(rows[0]);
  return toCsv(head, rows.map((r) => head.map((h) => flatten(r[h]))));
}

/** GET /api/downloads → what can be downloaded, with the number of rows in each list. */
router.get('/', limiter, async (_req, res) => {
  try {
    const out = await Promise.all(SECTIONS.map(async (s) => {
      let count = 0;
      try {
        const q = await pool.query(`SELECT COUNT(*)::int AS n FROM ${fromOf(s)} ${s.where ? `WHERE ${s.where}` : ''}`);
        count = Number(q.rows[0]?.n) || 0;
      } catch { count = null; } // an optional table that this database does not have yet
      return { key: s.key, label: s.label, group: s.group, count, formats: ['csv', 'xlsx', 'json'], note: s.note || '', event: !!s.event, form: !!s.form, dated: !!s.dated };
    }));
    res.set('Cache-Control', 'no-store').json(out);
  } catch (e) { fail(res, e); }
});

/** GET /api/downloads/:key?format=csv|xlsx|json&from=&to=&event=&form= */
router.get('/:key', limiter, async (req, res) => {
  const section = byKey.get(String(req.params.key || ''));
  if (!section) return res.status(404).json({ error: 'There is no such list.' });
  const asked = String(req.query.format || 'csv').toLowerCase();
  const format = ['json', 'xlsx'].includes(asked) ? asked : 'csv';
  try {
    const { where, values } = filterOf(section, req.query);
    const select = section.select || '*';
    const { rows } = await pool.query(
      `SELECT ${select} FROM ${fromOf(section)} ${where} ORDER BY ${section.order} LIMIT ${MAX_ROWS}`,
      values
    );
    if (format === 'json') {
      res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="bauet-ict-${section.key}-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      });
      return res.send(JSON.stringify({ list: section.label, exported_at: new Date().toISOString(), rows: rows.length, data: rows }, null, 1));
    }
    const day = new Date().toISOString().slice(0, 10);
    if (format === 'xlsx') {
      const head = rows.length ? Object.keys(rows[0]) : ['(no rows)'];
      const cols = head.map((h, i) => [h.replace(/_/g, ' '), (r) => r[i]]);
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bauet-ict-${section.key}-${day}.xlsx"`,
        'Cache-Control': 'no-store',
      });
      return res.send(await tableToXlsx(section.label, `${rows.length} rows`, cols, rows.map((r) => head.map((h) => flatten(r[h])))));
    }
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bauet-ict-${section.key}-${day}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.send(toCsvText(rows));
  } catch (e) { fail(res, e); }
});

module.exports = router;
module.exports.SECTIONS = SECTIONS;
