const pool = require('../config/db');

/**
 * Draft and scheduled posts (events and notices).
 *  - is_draft = TRUE            -> hidden until the admin publishes it
 *  - publish_at in the future   -> hidden until that moment (it goes live by itself, no cron needed to SHOW it)
 *  - pending_notify = TRUE      -> the "new event / new notice" e-mail to subscribers is still to be sent once it is live
 */
const LIVE = "(publish_at IS NULL OR publish_at <= NOW()) AND NOT COALESCE(is_draft, FALSE)";
const TABLES = ['events', 'notices', 'jobs'];
const notifiers = {};
const setNotifier = (table, fn) => { notifiers[table] = fn; };

/** Items that have just gone live: send their announcement once. Safe to call often. */
let running = false;
let lastRun = 0;
async function publishDue() {
  if (running) return 0;
  running = true; lastRun = Date.now();
  let n = 0;
  try {
    for (const t of TABLES) {
      const { rows } = await pool.query(`SELECT * FROM ${t} WHERE deleted_at IS NULL AND COALESCE(pending_notify, FALSE) AND ${LIVE}`);
      for (const r of rows) {
        const claimed = await pool.query(`UPDATE ${t} SET pending_notify = FALSE WHERE id = $1 AND COALESCE(pending_notify, FALSE)`, [r.id]);
        if (!claimed.rowCount) continue;
        n += 1;
        try { if (notifiers[t]) await notifiers[t](r); } catch (e) { console.warn(`${t} announcement failed:`, e.message); }
      }
    }
  } catch (e) { console.warn('publishDue failed:', e.message); }
  running = false;
  return n;
}
/** Called from public list requests: checks at most once a minute, in the background. */
function maybeTick() { if (Date.now() - lastRun > 60 * 1000) publishDue(); try { require('./push').maybeRemind(); } catch { /* phone notifications are optional */ } }

/** true when this item is not visible to the public yet */
const isHidden = (row) => !!row && (!!row.is_draft || (row.publish_at && new Date(row.publish_at).getTime() > Date.now()));

module.exports = { LIVE, publishDue, maybeTick, setNotifier, isHidden };
