// Contests and hackathons: /api/contests (public read, admin write). Teams sign up through /api/contest-teams.
module.exports = {
  table: 'contests', label: 'Contest',
  columns: ['title', 'description', 'rules', 'prize', 'location', 'start_date', 'deadline', 'team_min', 'team_max', 'status', 'image_url'],
  imageCols: ['image_url'], image: 'image_url',
  orderBy: 'created_at', orderDir: 'DESC', public: true,
  push: { kind: 'contest', item: (r) => ({ title: r.title, summary: [r.prize ? `Prize: ${r.prize}` : '', r.deadline ? `deadline ${String(r.deadline instanceof Date ? r.deadline.toISOString() : r.deadline).slice(0, 10)}` : ''].filter(Boolean).join(' · ') || r.description, path: '/contests' }) },
  title: (r) => r.title,
  validate: async (data) => {
    if (data.status !== undefined && !['open', 'closed', 'finished'].includes(data.status)) return 'Status must be open, closed or finished.';
    const lo = data.team_min === undefined || data.team_min === null ? undefined : Number(data.team_min);
    const hi = data.team_max === undefined || data.team_max === null ? undefined : Number(data.team_max);
    if (lo !== undefined && (!Number.isInteger(lo) || lo < 1 || lo > 20)) return 'The smallest team size must be a whole number from 1 to 20.';
    if (hi !== undefined && (!Number.isInteger(hi) || hi < 1 || hi > 20)) return 'The biggest team size must be a whole number from 1 to 20.';
    if (lo !== undefined && hi !== undefined && lo > hi) return 'The smallest team size cannot be bigger than the biggest.';
    return null;
  },
  sql: `CREATE TABLE IF NOT EXISTS contests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    rules TEXT,
    prize TEXT,
    location VARCHAR(255),
    start_date DATE,
    deadline DATE,
    team_min INTEGER DEFAULT 1,
    team_max INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'open',
    image_url TEXT,
    results_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS contest_teams (
    id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL,
    team_name VARCHAR(80) NOT NULL,
    leader_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    members JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'registered',
    rank INTEGER,
    score NUMERIC,
    prize_note VARCHAR(160),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
  )`,
};
