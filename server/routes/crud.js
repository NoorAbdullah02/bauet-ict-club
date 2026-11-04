const express = require('express');
const pool = require('../config/db');
const { destroyImage } = require('../utils/cloud');

const IDENT = /^[a-z_][a-z0-9_]*$/;

/**
 * Generic list/create/update/delete for a table.
 * - only whitelisted `columns` are ever written ("" becomes NULL so empty dates/numbers don't fail)
 * - deletes are soft (deleted_at) so the admin can restore them from the Trash
 * - replacing an image removes the old file from Cloudinary/disk when nothing else uses it
 */
function createCrudRouter(table, opts = {}) {
  if (!IDENT.test(table)) throw new Error('Bad table name');
  const router = express.Router();
  const orderCol = opts.orderBy || 'created_at';
  const orderDir = opts.orderDir === 'ASC' ? 'ASC' : 'DESC';
  const columns = opts.columns || [];
  const imageCols = opts.imageCols || [];
  const auth = opts.auth;
  const validate = opts.validate; // async (data, existingRow|null) => error string | null
  const onCreate = opts.onCreate; // (row) => void, runs after a successful create (e.g. email subscribers)
  const guard = auth ? [auth] : [];
  const readGuard = opts.readAuth && auth ? [auth] : []; // private lists (e.g. subscriber emails) need a login to read

  const pick = (body) => {
    const out = {};
    columns.forEach((c) => {
      if (body[c] === undefined) return;
      out[c] = body[c] === '' ? null : body[c];
    });
    return out;
  };

  router.get('/', ...readGuard, async (_req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE deleted_at IS NULL ORDER BY ${orderCol} ${orderDir}`);
      res.json(rows);
    } catch (e) {
      console.error(`${table} list failed:`, e.message);
      res.status(500).json({ error: 'Could not load data' });
    }
  });

  router.get('/:id', ...readGuard, async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Could not load item' });
    }
  });

  router.post('/', ...guard, async (req, res) => {
    const data = pick(req.body);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to save' });
    try {
      const problem = validate && await validate(data, null);
      if (problem) return res.status(409).json({ error: problem });
      const keys = Object.keys(data); // after validate(), which may add defaults such as display_order
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
        keys.map((k) => data[k])
      );
      res.status(201).json(rows[0]);
      if (onCreate) try { onCreate(rows[0]); } catch (e) { console.warn(`${table} onCreate failed:`, e.message); }
    } catch (e) {
      console.error(`${table} insert failed:`, e.message);
      res.status(400).json({ error: 'Could not save — please check the fields' });
    }
  });

  router.put('/:id', ...guard, async (req, res) => {
    const data = pick(req.body);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to save' });
    try {
      const old = (await pool.query(`SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NULL`, [req.params.id])).rows[0];
      if (!old) return res.status(404).json({ error: 'Not found' });
      const merged = { ...old, ...data };
      const problem = validate && await validate(merged, old);
      if (problem) return res.status(409).json({ error: problem });
      Object.keys(data).forEach((k) => { data[k] = merged[k]; }); // keep what validate() cleaned or defaulted
      const keys = Object.keys(data);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${sets.join(',')} WHERE id = $${keys.length + 1} RETURNING *`,
        [...keys.map((k) => data[k]), req.params.id]
      );
      res.json(rows[0]);
      // the replaced picture would otherwise stay on Cloudinary forever
      imageCols.forEach((c) => { if (old[c] && old[c] !== rows[0][c]) destroyImage(old[c]); });
    } catch (e) {
      console.error(`${table} update failed:`, e.message);
      res.status(400).json({ error: 'Could not save — please check the fields' });
    }
  });

  // soft delete → Trash
  router.delete('/:id', ...guard, async (req, res) => {
    try {
      const { rowCount } = await pool.query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: 'Not found' });
      res.json({ success: true, trashed: true });
    } catch (e) {
      res.status(500).json({ error: 'Could not delete' });
    }
  });

  return router;
}

module.exports = createCrudRouter;
