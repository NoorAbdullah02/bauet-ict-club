const express = require('express');
const pool = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { destroyImage } = require('../utils/cloud');

const router = express.Router();
router.use(authMiddleware);

// what each table is called in the Trash and which columns describe a row
const KINDS = {
  events: { label: 'Event', title: (r) => r.title, image: 'image_url' },
  notices: { label: 'Notice', title: (r) => r.title, image: 'image_url' },
  members: { label: 'Committee entry', title: (r) => r.name, sub: (r) => r.position, image: 'image_url' },
  gallery: { label: 'Photo', title: (r) => r.title || 'Untitled photo', image: 'image_url' },
  achievements: { label: 'Achievement', title: (r) => r.title, image: 'image_url' },
  posts: { label: 'Post', title: (r) => r.title, image: 'image_url' },
  event_registrations: { label: 'Event sign-up', title: (r) => r.full_name, sub: (r) => `event #${r.event_id}` },
  messages: { label: 'Message', title: (r) => r.subject || r.name, sub: (r) => r.email },
  registrations: { label: 'Application', title: (r) => r.full_name, sub: (r) => r.type, image: 'photo_url' },
};
require('../features').forEach((f) => { KINDS[f.table] = { label: f.label, title: f.title, sub: f.sub, image: f.image }; });
const RETENTION_DAYS = 30;

const kind = (req, res) => {
  const k = KINDS[req.params.type];
  if (!k) res.status(404).json({ error: 'Unknown item type' });
  return k;
};

async function removeForever(table, id) {
  const k = KINDS[table];
  const row = (await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NOT NULL`, [id])).rows[0];
  if (!row) return null;
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  // after the row is gone, remove its file unless another row still points at it
  const file = k.image ? await destroyImage(row[k.image]) : { removed: false };
  return { file };
}

router.get('/', async (_req, res) => {
  try {
    const items = [];
    for (const [type, k] of Object.entries(KINDS)) {
      const { rows } = await pool.query(`SELECT * FROM ${type} WHERE deleted_at IS NOT NULL`);
      rows.forEach((r) => items.push({
        type, label: k.label, id: r.id, title: k.title(r), sub: k.sub ? k.sub(r) : null,
        image: k.image ? r[k.image] : null, deleted_at: r.deleted_at,
      }));
    }
    items.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
    res.json({ retentionDays: RETENTION_DAYS, items });
  } catch (e) {
    console.error('Trash list failed:', e.message);
    res.status(500).json({ error: 'Could not load the trash' });
  }
});

router.post('/:type/:id/restore', async (req, res) => {
  const k = kind(req, res); if (!k) return;
  try {
    const { rowCount } = await pool.query(`UPDATE ${req.params.type} SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not in the trash' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Could not restore' }); }
});

router.delete('/:type/:id', async (req, res) => {
  const k = kind(req, res); if (!k) return;
  try {
    const out = await removeForever(req.params.type, req.params.id);
    if (!out) return res.status(404).json({ error: 'Not in the trash' });
    res.json({ success: true, ...out });
  } catch (e) { res.status(500).json({ error: 'Could not delete permanently' }); }
});

router.delete('/', async (_req, res) => {
  try {
    let count = 0;
    for (const table of Object.keys(KINDS)) {
      const { rows } = await pool.query(`SELECT id FROM ${table} WHERE deleted_at IS NOT NULL`);
      for (const r of rows) { if (await removeForever(table, r.id)) count += 1; }
    }
    res.json({ success: true, count });
  } catch (e) { res.status(500).json({ error: 'Could not empty the trash' }); }
});

/** Called on boot: anything trashed longer than RETENTION_DAYS is removed for good. */
async function purgeExpired() {
  let count = 0;
  for (const table of Object.keys(KINDS)) {
    const { rows } = await pool.query(`SELECT id FROM ${table} WHERE deleted_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`);
    for (const r of rows) { if (await removeForever(table, r.id)) count += 1; }
  }
  if (count) console.log(`Trash: permanently removed ${count} item(s) older than ${RETENTION_DAYS} days`);
}

module.exports = router;
module.exports.purgeExpired = purgeExpired;
