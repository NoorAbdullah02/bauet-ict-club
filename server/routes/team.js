// Main admin only: extra logins. An "editor" can edit content and forms but cannot delete, see payments, backups or this list.
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authMiddleware, requireSuper } = require('../middleware/auth');
const { fail } = require('../utils/http');
const { passwordProblem } = require('../utils/passwordPolicy');

const router = express.Router();
router.use(authMiddleware, requireSuper);

router.get('/', async (_req, res) => {
  try { res.json((await pool.query('SELECT id, username, role, created_at FROM admins ORDER BY id')).rows); } catch (e) { fail(res, e); }
});

router.post('/', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username: 3 to 30 letters, numbers, dots or dashes' });
  const weak = passwordProblem(password, username);
  if (weak) return res.status(400).json({ error: weak });
  try {
    if ((await pool.query('SELECT 1 FROM admins WHERE username = $1', [username])).rows.length) return res.status(409).json({ error: 'This username is taken' });
    const { rows } = await pool.query("INSERT INTO admins (username, password_hash, role) VALUES ($1,$2,'editor') RETURNING id, username, role, created_at", [username, await bcrypt.hash(password, 12)]);
    res.status(201).json(rows[0]);
  } catch (e) { fail(res, e); }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM admins WHERE id = $1 AND role = 'editor'", [req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Only editor logins can be removed' });
    res.json({ success: true });
  } catch (e) { fail(res, e); }
});

module.exports = router;
