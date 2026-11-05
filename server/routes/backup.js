// Main admin only: one ZIP with every table as a JSON file (password hashes are left out). Keep it somewhere safe.
const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireSuper } = require('../middleware/auth');
const { sendZip } = require('../utils/zipper');

const TABLES = ['events', 'notices', 'members', 'gallery', 'achievements', 'posts', 'projects', 'faqs', 'sponsors', 'settings', 'subscribers', 'messages', 'registrations', 'event_registrations', 'forms', 'form_responses', 'short_links', 'audit_log'];
const router = express.Router();
router.get('/', authMiddleware, requireSuper, async (_req, res) => {
  const entries = [];
  for (const t of TABLES) {
    try { entries.push({ name: `${t}.json`, data: JSON.stringify((await pool.query(`SELECT * FROM ${t}`)).rows, null, 1) }); } catch { /* table not present: skip */ }
  }
  try { entries.push({ name: 'admins.json', data: JSON.stringify((await pool.query('SELECT id, username, role, created_at FROM admins')).rows, null, 1) }); } catch { /* skip */ }
  entries.push({ name: 'README.txt', data: `BAUET ICT Club backup\nMade ${new Date().toISOString()}\nOne JSON file per table. Pictures are not inside: they stay on Cloudinary.\n` });
  await sendZip(res, `bauet-ict-backup-${new Date().toISOString().slice(0, 10)}`, entries);
});
module.exports = router;
