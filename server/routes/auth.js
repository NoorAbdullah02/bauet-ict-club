const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(admin);
    res.json({ token, user: { id: admin.id, username: admin.username, role: admin.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, role FROM admins WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
