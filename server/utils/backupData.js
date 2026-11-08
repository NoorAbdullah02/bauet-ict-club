// Every table of the club database as JSON files (used by the admin download and by the weekly automatic backup).
// Secrets are left out: password hashes, 2FA secrets, phone push tokens.
const pool = require('../config/db');

const SKIP = new Set(['push_tokens', 'push_log']);
const HIDE = { admins: ['password', 'password_hash', 'totp_secret', 'totp_backup_codes', 'token_version', 'failed_logins', 'locked_until'] };

async function dump() {
  const names = (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name")).rows.map((r) => r.table_name);
  const entries = [];
  for (const t of names) {
    if (SKIP.has(t)) continue;
    try {
      const rows = (await pool.query(`SELECT * FROM "${t.replace(/"/g, '')}"`)).rows;
      const hide = HIDE[t];
      if (hide) rows.forEach((r) => hide.forEach((c) => { delete r[c]; }));
      entries.push({ name: `${t}.json`, data: JSON.stringify(rows, null, 1), count: rows.length });
    } catch { /* unreadable table: skip */ }
  }
  entries.push({ name: 'README.txt', data: `BAUET ICT Club backup\nMade ${new Date().toISOString()}\nOne JSON file per table (${entries.length} tables). Pictures are not inside: they stay on Cloudinary.\nPassword hashes, 2FA secrets and phone push tokens are not included.\n` });
  return entries;
}
module.exports = { dump };
