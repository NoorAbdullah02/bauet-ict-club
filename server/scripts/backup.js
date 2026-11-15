// Weekly automatic backup (run by GitHub Actions): writes one JSON file per table into the folder given as argument.
// It fails loudly when it finds no tables, because that means the address points at the wrong (empty) database.
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { dump } = require('../utils/backupData');
(async () => {
  const dir = process.argv[2] || 'backup';
  fs.mkdirSync(dir, { recursive: true });
  // where are we? (never prints the password)
  const where = (await pool.query("SELECT current_database() AS db, current_schema() AS schema, (SELECT COUNT(*) FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')) AS tables")).rows[0];
  let host = '';
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* not a URL */ }
  console.log(`Connected to database "${where.db}" on ${host || 'unknown host'} (schema ${where.schema}, ${where.tables} tables in all schemas)`);
  const entries = await dump();
  const tables = entries.filter((e) => e.count != null);
  if (!tables.length) {
    console.error('Backup failed: this database has no tables in the "public" schema. BACKUP_DATABASE_URL must be the SAME connection string as DATABASE_URL on Render (same database name and branch).');
    process.exit(1);
  }
  const rows = tables.reduce((n, e) => n + e.count, 0);
  for (const e of entries) fs.writeFileSync(path.join(dir, e.name), e.data);
  console.log(`Backed up ${tables.length} tables, ${rows} rows: ${tables.map((e) => `${e.name.replace('.json', '')}(${e.count})`).join(', ')}`);
  process.exit(0);
})().catch((e) => { console.error('Backup failed:', e.message); process.exit(1); });
