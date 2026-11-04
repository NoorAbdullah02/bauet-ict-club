const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { fail } = require('../utils/http');
const { storeImage, imageStatus, KINDS } = require('../utils/images');
const { cloudinaryReady, detect } = require('../utils/saveImage');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// is Cloudinary connected? (admin Settings page)
router.get('/status', async (_req, res) => res.json(await imageStatus()));

// POST /api/upload?kind=avatar|cover|logo   (admin only, see index.js)
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const kind = KINDS[req.query.kind] ? req.query.kind : 'cover';
  try {
    res.json(await storeImage(req.file.buffer, kind));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    fail(res, e);
  }
});

// optional Cloudinary AI background removal (needs the add-on on your Cloudinary plan)
router.post('/remove-bg', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!cloudinaryReady()) return res.status(400).json({ error: 'Background removal needs Cloudinary. Add CLOUDINARY_* keys to .env.' });
  if (!detect(req.file.buffer)) return res.status(400).json({ error: 'Only JPG, PNG or WebP images are allowed' });
  try {
    const result = await cloudinary.uploader.upload(`data:image/png;base64,${req.file.buffer.toString('base64')}`, { folder: 'bauet-ict-club/people', background_removal: 'cloudinary_ai' });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
