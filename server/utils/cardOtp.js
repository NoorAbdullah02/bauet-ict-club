const pool = require('../config/db');

/**
 * The codes for "My member card" live in their own table. A database created by an older version of
 * the server can have this table missing a column (or without the unique e-mail key), which used to
 * make every OTP request fail with a 500. This repairs it once per process, before the first code is
 * written. Every step is safe to repeat, and a step the database does not understand is skipped
 * rather than breaking the card page.
 */
let ready = null;

async function repair() {
  // only create it when it is really missing: re-running CREATE on some databases (and on the
  // embedded test database) is noisier than a plain read
  const exists = await pool.query('SELECT 1 FROM card_otps LIMIT 1').then(() => true).catch(() => false);
  if (!exists) {
    await pool.query(`CREATE TABLE IF NOT EXISTS card_otps (
      email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, member_key TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, sent_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL
    )`);
  }
  const steps = [
    'ALTER TABLE card_otps ADD COLUMN IF NOT EXISTS code_hash TEXT',
    'ALTER TABLE card_otps ADD COLUMN IF NOT EXISTS member_key TEXT',
    'ALTER TABLE card_otps ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE card_otps ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW()',
    'ALTER TABLE card_otps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ',
    'CREATE UNIQUE INDEX IF NOT EXISTS card_otps_email_unique ON card_otps (email)',
  ];
  for (const sql of steps) await pool.query(sql).catch(() => {});
}

function ensureCardOtpTable() {
  if (ready) return ready;
  ready = repair().catch((e) => {
    ready = null; // try again on the next request instead of staying broken until a restart
    throw e;
  });
  return ready;
}

module.exports = { ensureCardOtpTable };
