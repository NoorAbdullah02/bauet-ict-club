// Job and internship board: /api/jobs (public read, admin write). Drafts and scheduled posts work like events and notices.
const KINDS = ['Job', 'Internship', 'Part-time', 'Freelance', 'Training'];
const MODES = ['On-site', 'Remote', 'Hybrid'];
module.exports = {
  table: 'jobs', label: 'Job',
  columns: ['title', 'company', 'kind', 'work_mode', 'location', 'salary', 'description', 'apply_url', 'apply_email', 'deadline', 'image_url', 'featured', 'publish_at', 'is_draft'],
  imageCols: ['image_url'], image: 'image_url',
  orderBy: 'created_at', orderDir: 'DESC', public: true, scheduled: true,
  title: (r) => `${r.title}${r.company ? ` at ${r.company}` : ''}`,
  validate: async (data) => {
    if (data.kind && !KINDS.includes(data.kind)) return `Kind must be one of: ${KINDS.join(', ')}.`;
    if (data.work_mode && !MODES.includes(data.work_mode)) return `Work mode must be one of: ${MODES.join(', ')}.`;
    if (typeof data.apply_url === 'string' && data.apply_url.trim()) {
      try { const u = new URL(data.apply_url.trim()); if (!['http:', 'https:'].includes(u.protocol) || data.apply_url.length > 500) throw new Error(); data.apply_url = data.apply_url.trim(); }
      catch { return 'The apply link must start with https://'; }
    }
    if (typeof data.apply_email === 'string' && data.apply_email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.apply_email.trim())) return 'Enter a valid e-mail address to apply to.';
      data.apply_email = data.apply_email.trim();
    }
    if (!String(data.apply_url || '').trim() && !String(data.apply_email || '').trim()) return 'Give an apply link or an apply e-mail, so students know how to apply.';
    return null;
  },
  sql: `CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(160),
    kind VARCHAR(30) DEFAULT 'Job',
    work_mode VARCHAR(20) DEFAULT 'On-site',
    location VARCHAR(160),
    salary VARCHAR(120),
    description TEXT,
    apply_url TEXT,
    apply_email VARCHAR(160),
    deadline DATE,
    image_url TEXT,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
};
