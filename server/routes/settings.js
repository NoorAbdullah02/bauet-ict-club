const express = require('express');
const pool = require('../config/db');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE id = 1');
    if (result.rows.length === 0) return res.json({});
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const keys = Object.keys(req.body).filter((k) => k !== 'id');
    const vals = keys.map((k) => req.body[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    vals.push(1);
    const result = await pool.query(
      `UPDATE settings SET ${sets.join(',')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Settings not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
