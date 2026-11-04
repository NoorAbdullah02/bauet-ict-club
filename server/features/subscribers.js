// Newsletter subscribers. Visitors subscribe with POST /api/subscribers (rate limited, in index.js);
// everything else (list, edit, delete) needs an admin login.
module.exports = {
  table: 'subscribers', label: 'Subscriber',
  columns: ['email'], orderBy: 'created_at', orderDir: 'DESC', public: false, readAuth: true,
  title: (r) => r.email,
  sql: `CREATE TABLE IF NOT EXISTS subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
