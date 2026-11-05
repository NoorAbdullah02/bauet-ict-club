const express = require('express');
const pool = require('../config/db');
const { authMiddleware, requireSuper } = require('../middleware/auth');
const { fail } = require('../utils/http');

const router = express.Router();
router.get('/', authMiddleware, requireSuper, async (_req, res) => {
  try { res.json((await pool.query('SELECT id, username, method, path, status, created_at FROM audit_log ORDER BY id DESC LIMIT 300')).rows); } catch (e) { fail(res, e); }
});
module.exports = router;
