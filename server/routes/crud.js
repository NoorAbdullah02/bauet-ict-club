const express = require('express');
const pool = require('../config/db');

function createCrudRouter(table, opts = {}) {
  const router = express.Router();
  const orderCol = opts.orderBy || 'created_at';
  const orderDir = opts.orderDir || 'DESC';
  const auth = opts.auth;

  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderCol} ${orderDir}`);
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/', ...(auth ? [auth] : []), async (req, res) => {
    try {
      const keys = Object.keys(req.body).filter((k) => k !== 'id');
      const vals = keys.map((k) => req.body[k]);
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      const result = await pool.query(
        `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,
        vals
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/:id', ...(auth ? [auth] : []), async (req, res) => {
    try {
      const keys = Object.keys(req.body).filter((k) => k !== 'id');
      const vals = keys.map((k) => req.body[k]);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      vals.push(req.params.id);
      const result = await pool.query(
        `UPDATE ${table} SET ${sets.join(',')} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/:id', ...(auth ? [auth] : []), async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = createCrudRouter;
