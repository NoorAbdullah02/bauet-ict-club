// Main admin only: one ZIP with every table as a JSON file (secrets are left out). Keep it somewhere safe.
const express = require('express');
const { authMiddleware, requireSuper } = require('../middleware/auth');
const { sendZip } = require('../utils/zipper');
const { dump } = require('../utils/backupData');

const router = express.Router();
router.get('/', authMiddleware, requireSuper, async (_req, res) => {
  await sendZip(res, `bauet-ict-backup-${new Date().toISOString().slice(0, 10)}`, (await dump()).map(({ name, data }) => ({ name, data })));
});
module.exports = router;
