const express = require('express');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/auth');
const { fail } = require('../utils/http');
const rj = require('../utils/remoteJobs');

const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please wait a moment.' } });

/** Public: remote jobs from Remotive and Remote OK. GET /api/remote-jobs?q=word&tag=python&open=1 (open = open to people in Bangladesh) */
router.get('/', limiter, async (req, res) => {
  try {
    if (!rj.enabled()) return res.json({ enabled: false, jobs: [], sources: [] });
    rj.maybeRefresh();
    const filter = { q: req.query.q, tag: req.query.tag, open: req.query.open === '1' };
    let jobs = await rj.list(filter);
    if (!jobs.length && !rj.everRead()) { await rj.refresh(); jobs = await rj.list(filter); } // the very first visit waits for the first read
    res.set('Cache-Control', 'public, max-age=120').json({
      enabled: true, jobs,
      sources: [{ id: 'remotive', name: 'Remotive', url: 'https://remotive.com' }, { id: 'remoteok', name: 'Remote OK', url: 'https://remoteok.com' }],
    });
  } catch (e) { fail(res, e); }
});

/** Admin: read the feeds right now. */
router.post('/refresh', authMiddleware, async (_req, res) => {
  try { res.json((await rj.refresh()) || { enabled: rj.enabled(), note: 'A refresh is already running.' }); } catch (e) { fail(res, e); }
});

module.exports = router;
