// Sponsors and partners: /api/sponsors, shown on the home page
module.exports = {
  table: 'sponsors', label: 'Sponsor',
  columns: ['name', 'website', 'logo_url', 'tier', 'sort_order'],
  imageCols: ['logo_url'], orderBy: 'sort_order', orderDir: 'ASC', public: true,
  title: (r) => r.name, image: 'logo_url',
  sql: `CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website TEXT,
    logo_url TEXT,
    tier VARCHAR(30),
    sort_order INTEGER DEFAULT 99,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
