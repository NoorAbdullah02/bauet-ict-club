// Read-only database tools for the club assistant.
// The model may ask for a search or a count the snapshot does not already contain ("how many events were in
// December?", "who is in CSE?", "which photos are from the workshop?"). Only public tables and columns are
// reachable, every value is a bound parameter, every query has a hard row limit, and nothing can write.
const pool = require('../config/db');
const shortName = require('./knowledge').shortName;

const MAX_ROWS = 8;
const text = (v, n = 60) => String(v ?? '').trim().slice(0, n);
// ILIKE pattern with the wildcards escaped, so a visitor cannot turn a search into a scan-all pattern
const like = (v) => `%${text(v).replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
const rows = async (sql, params = []) => { try { return (await pool.query(sql, params)).rows; } catch { return []; } };
const limit = (v) => Math.min(Math.max(Number(v) || 6, 1), MAX_ROWS);

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_events',
      description: 'Search every public event (past or upcoming) by words, month or year. Use this when the visitor asks about a specific event, a date range, or how many events happened.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Words from the title, place or category' },
          from: { type: 'string', description: 'Earliest date, YYYY-MM-DD' },
          to: { type: 'string', description: 'Latest date, YYYY-MM-DD' },
          limit: { type: 'integer', description: 'How many results, 1 to 8' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_notices',
      description: 'Search club notices by words (title or text), newest first.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_committee',
      description: 'Find committee members by name or department, with their position and session. Use for questions like "who is in CSE?" or "who is the treasurer?".',
      parameters: { type: 'object', properties: { name: { type: 'string' }, department: { type: 'string' }, limit: { type: 'integer' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_gallery',
      description: 'Search photo-gallery entries by words in the title or category.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_sessions',
      description: 'List the weekly club sessions, optionally only one weekday.',
      parameters: { type: 'object', properties: { day: { type: 'string', description: 'For example Wednesday' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_jobs',
      description: 'Search open jobs and internships by words, kind or work mode.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'club_counts',
      description: 'Count public records: members, events, notices, projects, contests, jobs, gallery photos, resources, weekly sessions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'top_members',
      description: 'The public leaderboard: members with the most points (names are shortened).',
      parameters: { type: 'object', properties: { limit: { type: 'integer' } } },
    },
  },
];

async function searchEvents(a) {
  const where = ["deleted_at IS NULL", '(publish_at IS NULL OR publish_at <= NOW())', 'NOT COALESCE(is_draft, FALSE)'];
  const params = [];
  if (text(a.query)) {
    params.push(like(a.query));
    where.push(`(title ILIKE $${params.length} OR COALESCE(location,'') ILIKE $${params.length} OR COALESCE(category,'') ILIKE $${params.length})`);
  }
  if (text(a.from)) { params.push(text(a.from, 10)); where.push(`date >= $${params.length}::date`); }
  if (text(a.to)) { params.push(text(a.to, 10)); where.push(`date <= $${params.length}::date`); }
  params.push(limit(a.limit));
  return rows(`SELECT title, date, time, location, category, description FROM events WHERE ${where.join(' AND ')} ORDER BY date DESC LIMIT $${params.length}`, params)
    .then((r) => r.map((e) => ({ title: e.title, date: e.date, time: e.time, place: e.location, category: e.category, about: text(e.description, 160) })));
}

const searchNotices = async (a) => rows(
  `SELECT title, date, content FROM notices WHERE deleted_at IS NULL ${text(a.query) ? 'AND (title ILIKE $1 OR content ILIKE $1)' : ''} ORDER BY date DESC LIMIT $${text(a.query) ? 2 : 1}`,
  text(a.query) ? [like(a.query), limit(a.limit)] : [limit(a.limit)],
).then((r) => r.map((n) => ({ title: n.title, date: n.date, about: text(n.content, 160) })));

async function findCommittee(a) {
  const where = ['deleted_at IS NULL', 'committee_session IS NOT NULL'];
  const params = [];
  if (text(a.name)) { params.push(like(a.name)); where.push(`name ILIKE $${params.length}`); }
  if (text(a.department)) { params.push(like(a.department)); where.push(`department ILIKE $${params.length}`); }
  params.push(limit(a.limit));
  return rows(`SELECT name, position, department, committee_session FROM members WHERE ${where.join(' AND ')} ORDER BY committee_session DESC, name ASC LIMIT $${params.length}`, params);
}

const searchGallery = async (a) => rows(
  `SELECT title, category, date FROM gallery ${text(a.query) ? 'WHERE title ILIKE $1 OR COALESCE(category,\'\') ILIKE $1' : ''} ORDER BY date DESC NULLS LAST LIMIT $${text(a.query) ? 2 : 1}`,
  text(a.query) ? [like(a.query), limit(a.limit)] : [limit(a.limit)],
);

const listSessions = async (a) => rows(
  `SELECT title, topic, day, time, place, note FROM weekly_sessions WHERE COALESCE(active, true) ${text(a.day) ? 'AND day ILIKE $1' : ''} ORDER BY sort_order ASC LIMIT 8`,
  text(a.day) ? [like(a.day)] : [],
);

const searchJobs = async (a) => rows(
  `SELECT title, company, kind, work_mode, deadline FROM jobs WHERE deleted_at IS NULL AND (publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, false) AND (deadline IS NULL OR deadline >= CURRENT_DATE)
   ${text(a.query) ? 'AND (title ILIKE $1 OR COALESCE(company,\'\') ILIKE $1 OR COALESCE(kind,\'\') ILIKE $1 OR COALESCE(work_mode,\'\') ILIKE $1)' : ''}
   ORDER BY created_at DESC LIMIT $${text(a.query) ? 2 : 1}`,
  text(a.query) ? [like(a.query), limit(a.limit)] : [limit(a.limit)],
);

async function clubCounts() {
  const one = async (sql) => (await rows(sql))[0] || {};
  const [m, e, n, p, c, j, g, r, w] = await Promise.all([
    one('SELECT COUNT(*)::int AS n FROM members WHERE deleted_at IS NULL'),
    one("SELECT COUNT(*)::int AS n FROM events WHERE deleted_at IS NULL AND NOT COALESCE(is_draft, FALSE)"),
    one('SELECT COUNT(*)::int AS n FROM notices WHERE deleted_at IS NULL'),
    one('SELECT COUNT(*)::int AS n FROM projects WHERE deleted_at IS NULL'),
    one('SELECT COUNT(*)::int AS n FROM contests WHERE deleted_at IS NULL'),
    one('SELECT COUNT(*)::int AS n FROM jobs WHERE deleted_at IS NULL'),
    one('SELECT COUNT(*)::int AS n FROM gallery'),
    one('SELECT COUNT(*)::int AS n FROM resources WHERE deleted_at IS NULL'),
    one('SELECT COUNT(*)::int AS n FROM weekly_sessions WHERE COALESCE(active, true)'),
  ]);
  return { members: m.n || 0, events: e.n || 0, notices: n.n || 0, projects: p.n || 0, contests: c.n || 0, jobs: j.n || 0, gallery: g.n || 0, resources: r.n || 0, weeklySessions: w.n || 0 };
}

async function topMembers(a) {
  const attendance = await rows("SELECT LOWER(email) AS e, MAX(full_name) AS n, COUNT(DISTINCT event_id)::int AS c FROM event_registrations WHERE deleted_at IS NULL AND checked_in_at IS NOT NULL AND email IS NOT NULL AND email <> '' GROUP BY LOWER(email)");
  const bonuses = await rows('SELECT LOWER(email) AS e, MAX(name) AS n, SUM(points)::int AS p FROM point_awards WHERE deleted_at IS NULL GROUP BY LOWER(email)');
  const board = new Map();
  for (const r of attendance) board.set(r.e, { name: r.n, points: (Number(r.c) || 0) * 10 });
  for (const r of bonuses) {
    const cur = board.get(r.e) || { name: r.n, points: 0 };
    cur.points += Number(r.p) || 0;
    if (!cur.name) cur.name = r.n;
    board.set(r.e, cur);
  }
  return [...board.values()].filter((x) => x.points > 0).sort((x, y) => y.points - x.points)
    .slice(0, limit(a.limit)).map((x) => ({ name: shortName(x.name), points: x.points }));
}

const RUNNERS = {
  search_events: searchEvents,
  search_notices: searchNotices,
  find_committee: findCommittee,
  search_gallery: searchGallery,
  list_sessions: listSessions,
  search_jobs: searchJobs,
  club_counts: clubCounts,
  top_members: topMembers,
};

/** Run one tool call and return a short JSON string for the model. Unknown tools and errors answer {} (never a crash). */
async function run(name, args) {
  const fn = RUNNERS[name];
  if (!fn) return JSON.stringify({ error: 'unknown tool' });
  try {
    const out = await fn(args && typeof args === 'object' ? args : {});
    return JSON.stringify(out ?? []).slice(0, 4000);
  } catch {
    return JSON.stringify({ error: 'lookup failed' });
  }
}

module.exports = { TOOLS, run };
