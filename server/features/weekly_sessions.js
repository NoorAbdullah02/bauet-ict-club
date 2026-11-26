// Weekly club sessions (programming, web development, ...): /api/weekly_sessions, shown on /events and in the app.
// The admin edits them in Admin → Content → Weekly session; only the ones with "Show on the website and app" ticked appear.
module.exports = {
  table: 'weekly_sessions',
  label: 'Weekly session',
  columns: ['title', 'topic', 'day', 'time', 'place', 'note', 'sort_order', 'active'],
  orderBy: 'sort_order', orderDir: 'ASC',
  public: true,
  title: (r) => r.title,
  validate: async (data) => {
    if (!String(data.title || '').trim()) return 'Please write the session name.';
    if (data.sort_order !== undefined && data.sort_order !== null && data.sort_order !== '' && !Number.isFinite(Number(data.sort_order))) return 'The order must be a number.';
    return null;
  },
  sql: `CREATE TABLE IF NOT EXISTS weekly_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    topic VARCHAR(60),
    day VARCHAR(12),
    time VARCHAR(40),
    place VARCHAR(120),
    note VARCHAR(300),
    sort_order INTEGER DEFAULT 99,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
