const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const pool = require('../config/db');
const { UPLOAD_DIR, cloudinaryReady } = require('./saveImage');

// every column that can hold an uploaded image URL
const IMAGE_COLS = [['events', 'image_url'], ['members', 'image_url'], ['gallery', 'image_url'], ['posts', 'image_url'], ['registrations', 'photo_url']];

function cloudinaryPublicId(url) {
  if (!/res\.cloudinary\.com\//.test(url) || !url.includes('/upload/')) return null;
  const parts = url.split('/upload/')[1].split('?')[0].split('/');
  while (parts.length > 1 && (/^v\d+$/.test(parts[0]) || parts[0].includes(','))) parts.shift();
  return parts.join('/').replace(/\.[a-z0-9]+$/i, '');
}

async function isReferenced(url) {
  for (const [table, col] of IMAGE_COLS) {
    const { rows } = await pool.query(`SELECT 1 FROM ${table} WHERE ${col} = $1 LIMIT 1`, [url]);
    if (rows.length) return true;
  }
  return false;
}

/** Deletes the stored file behind an image URL (Cloudinary or local disk) unless another row still uses it. */
async function destroyImage(url) {
  if (!url || typeof url !== 'string') return { removed: false };
  try {
    if (await isReferenced(url)) return { removed: false, reason: 'still in use' };
    if (/^\/uploads\/[a-f0-9]{24}\.(jpg|png)$/.test(url)) {
      await fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
      return { removed: true, where: 'disk' };
    }
    const id = cloudinaryPublicId(url);
    if (id && cloudinaryReady()) {
      await cloudinary.uploader.destroy(id, { invalidate: true });
      return { removed: true, where: 'cloudinary' };
    }
  } catch (e) {
    console.warn('Image cleanup failed:', e.message);
    return { removed: false, reason: e.message };
  }
  return { removed: false };
}

module.exports = { destroyImage, cloudinaryPublicId, IMAGE_COLS };
