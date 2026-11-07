// The club's advisors (teachers who guide the club): /api/advisors, shown at the top of the Team page. Each advisor also has a membership card (/card/a<ID>).
module.exports = {
  table: 'advisors', label: 'Advisor',
  columns: ['name', 'designation', 'rank_title', 'department', 'email', 'phone', 'image_url', 'sort_order', 'active'],
  imageCols: ['image_url'], orderBy: 'sort_order', orderDir: 'ASC', public: true,
  title: (r) => r.name, image: 'image_url',
  validate: async (data) => {
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.email).trim())) return 'Enter a valid e-mail address';
    return null;
  },
  sql: `CREATE TABLE IF NOT EXISTS advisors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(120) DEFAULT 'Advisor',
    rank_title VARCHAR(160),
    department VARCHAR(100),
    email VARCHAR(160),
    phone VARCHAR(40),
    image_url TEXT,
    sort_order INTEGER DEFAULT 99,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
