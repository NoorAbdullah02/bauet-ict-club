// What alumni and members say about the club: /api/testimonials (public read, admin write).
// Shown as the "Voices of Impact" carousel on the website home page and in the app.
module.exports = {
  table: 'testimonials',
  label: 'Testimonial',
  columns: ['name', 'role', 'batch', 'quote', 'rating', 'image_url', 'sort_order', 'active'],
  imageCols: ['image_url'],
  orderBy: 'sort_order', orderDir: 'ASC',
  public: true,
  title: (r) => r.name,
  image: 'image_url',
  validate: async (data) => {
    if (!String(data.name || '').trim()) return 'Please write the person’s name.';
    if (!String(data.quote || '').trim()) return 'Please write what they said.';
    if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
      const n = Number(data.rating);
      if (!Number.isInteger(n) || n < 1 || n > 5) return 'The rating must be a whole number from 1 to 5 stars.';
    }
    return null;
  },
  sql: `CREATE TABLE IF NOT EXISTS testimonials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    role VARCHAR(160),
    batch VARCHAR(160),
    quote TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    image_url TEXT,
    sort_order INTEGER DEFAULT 99,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
