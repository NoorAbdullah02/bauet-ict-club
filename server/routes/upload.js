const express = require('express');
const { fail } = require('../utils/http');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { saveImage, cloudinaryReady } = require('../utils/saveImage');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    if (!cloudinaryReady()) return res.json({ url: await saveImage(req.file.buffer) });
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'bauet-ict-club',
      transformation: [
        { width: 1200, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    fail(res, e);
  }
});

router.post('/remove-bg', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'bauet-ict-club/members',
      background_removal: 'cloudinary_ai',
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    fail(res, e);
  }
});

module.exports = router;
