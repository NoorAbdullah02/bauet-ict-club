// Usage: ADMIN_PASSWORD=newpass npm run admin:reset   (or set ADMIN_PASSWORD in .env)
const bcrypt = require('bcryptjs');
const pool = require('./db');

(async () => {
  const pw = process.env.ADMIN_PASSWORD;
  const name = (process.env.ADMIN_USERNAME || 'ICT-Club').trim();
  if (!pw || pw.length < 8) { console.error('Set ADMIN_PASSWORD (min 8 characters) in .env first.'); process.exit(1); }
  try {
    const hash = await bcrypt.hash(pw, 10);
    await pool.query(
      `INSERT INTO admins (username, password_hash, role) VALUES ($2, $1, 'superadmin')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`, [hash, name]);
    console.log(`Admin password updated. Username: ${name}`);
    process.exit(0);
  } catch (e) { console.error('Failed:', e.message); process.exit(1); }
})();
