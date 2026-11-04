// Club projects showcase: /api/projects, shown on /projects
module.exports = {
  table: 'projects', label: 'Project',
  columns: ['title', 'summary', 'tech', 'status', 'team', 'live_url', 'repo_url', 'image_url', 'featured'],
  imageCols: ['image_url'], orderBy: 'created_at', orderDir: 'DESC', public: true,
  title: (r) => r.title, image: 'image_url',
  notify: { kind: 'project', item: (r) => ({ title: r.title, summary: r.summary, path: '/projects' }) },
  sql: `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    tech TEXT,
    status VARCHAR(30) DEFAULT 'Active',
    team TEXT,
    live_url TEXT,
    repo_url TEXT,
    image_url TEXT,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
