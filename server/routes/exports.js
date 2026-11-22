const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const { tableToXlsx } = require('../utils/exporters');

const router = express.Router();
const MAX_ROWS = 3000;
const MAX_COLUMNS = 50;
const clip = (v, n) => String(v ?? '').slice(0, n);
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });

/** Admin: the filtered rows a table is showing, as an Excel workbook. Body: { title, subtitle, columns, rows } */
router.post('/table', authMiddleware, limiter, async (req, res) => {
  const columns = (Array.isArray(req.body?.columns) ? req.body.columns : []).slice(0, MAX_COLUMNS).map((h) => clip(h, 120));
  if (!columns.length) return res.status(400).json({ error: 'Send the table columns first' });
  const rows = (Array.isArray(req.body?.rows) ? req.body.rows : []).slice(0, MAX_ROWS)
    .map((r) => (Array.isArray(r) ? r : []).slice(0, columns.length).map((v) => clip(Array.isArray(v) ? v.join(', ') : v, 400)));
  try {
    const title = clip(req.body?.title, 120) || 'List';
    const buf = await tableToXlsx(title, clip(req.body?.subtitle, 200), columns.map((h, i) => [h, (r) => r[i]]), rows);
    const name = title.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'list';
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}.xlsx"`,
      'Cache-Control': 'no-store',
    }).send(buf);
  } catch (e) { fail(res, e); }
});

module.exports = router;
