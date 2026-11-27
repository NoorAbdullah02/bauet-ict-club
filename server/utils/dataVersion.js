const pool = require('../config/db');

/**
 * One number that changes whenever the club data changes. The website and the Flutter app ask for it
 * now and then (cheap, no payload) and refresh their lists when it moved, so an edit made anywhere —
 * another phone, another browser, the admin panel — shows up everywhere without a manual reload.
 * The value is kept in `settings` so a restart does not look like a change; reading it never throws.
 */
let value = 0;
let loaded = null;
let saving = false;

async function readStored() {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'data_version'");
    const raw = rows[0]?.value;
    const n = Number(raw && typeof raw === 'object' ? raw.v : raw);
    if (Number.isFinite(n) && n > 0) value = n;
  } catch { /* a fresh database has no row yet: start at 0 */ }
}

async function persist() {
  if (saving) return; // one write per burst of admin saves
  saving = true;
  const v = value;
  try {
    const upd = await pool.query(
      "UPDATE settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'data_version'",
      [JSON.stringify({ v })]
    );
    if (!upd.rowCount) {
      await pool.query("INSERT INTO settings (key, value) VALUES ('data_version', $1::jsonb)", [JSON.stringify({ v })]);
    }
  } catch { /* in-memory counting still works for this process */ }
  saving = false;
}

/** The current version. The first call loads the stored value once. */
async function get() {
  if (!loaded) loaded = readStored();
  await loaded;
  return value;
}

/** Called after a successful write: every client sees a new number. */
function bump() {
  value += 1;
  persist();
  return value;
}

module.exports = { get, bump };
