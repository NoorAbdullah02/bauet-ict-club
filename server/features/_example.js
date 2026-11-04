// Copy this file to e.g. sponsors.js (remove the leading underscore) and restart the server.
// You get: the database table, /api/<table> (public GET, admin-only write), Trash support and cache headers.
module.exports = {
  table: 'sponsors',                       // also the URL: /api/sponsors
  label: 'Sponsor',                        // name shown in the Trash
  columns: ['name', 'website', 'logo_url', 'tier'], // the only columns the API will write
  imageCols: ['logo_url'],                 // images here are removed from Cloudinary/disk when replaced or purged
  orderBy: 'created_at', orderDir: 'DESC',
  public: true,                            // allow cached public GET (set false for admin-only data)
  title: (r) => r.name,                    // how a row is named in the Trash
  image: 'logo_url',                       // optional: image column shown in the Trash
  sql: `CREATE TABLE IF NOT EXISTS sponsors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    website TEXT,
    logo_url TEXT,
    tier VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
