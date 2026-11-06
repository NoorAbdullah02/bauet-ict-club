// Resource library: slides, notes, tutorials and links students can open: /api/resources, shown on /resources
module.exports = {
  table: 'resources', label: 'Resource',
  columns: ['title', 'description', 'category', 'kind', 'url', 'featured'],
  orderBy: 'created_at', orderDir: 'DESC', public: true,
  title: (r) => r.title,
  validate: async (data) => {
    if (data.url && !/^https?:\/\/[^\s]+$/i.test(String(data.url).trim())) return 'The link must start with http:// or https://';
    return null;
  },
  sql: `CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(60),
    kind VARCHAR(30) DEFAULT 'Link',
    url TEXT,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
