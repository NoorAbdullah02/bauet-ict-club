const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'uploads');

// first bytes decide the type — the client-supplied mimetype is not trusted
function detect(buf) {
  if (buf.length > 8 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'GIF8') return 'gif';
  // ISO media (HEIC/HEIF from iPhones, AVIF): bytes 4-8 are "ftyp"
  if (buf.length > 16 && buf.subarray(4, 8).toString() === 'ftyp') {
    const brand = buf.subarray(8, 12).toString();
    if (/^(avif|avis)$/.test(brand)) return 'avif';
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(brand)) return 'heic';
  }
  return null;
}

/** Stores an uploaded JPG/PNG on local disk and returns its public path (used when Cloudinary is not configured). */
async function saveImage(buffer) {
  const ext = detect(buffer);
  if (!ext) throw Object.assign(new Error('Please choose a JPG, PNG, WebP, GIF, AVIF or HEIC picture'), { status: 400 });
  if (!['jpg', 'png', 'webp'].includes(ext)) throw Object.assign(new Error(`${ext.toUpperCase()} pictures need Cloudinary to be converted. Add the CLOUDINARY_* keys, or choose a JPG, PNG or WebP picture.`), { status: 400 });
  console.warn('Cloudinary is not configured — saving photo on local disk (server/uploads). Set CLOUDINARY_* in .env to store photos on Cloudinary.');
  await fs.promises.mkdir(DIR, { recursive: true });
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  await fs.promises.writeFile(path.join(DIR, name), buffer, { flag: 'wx' });
  return `/uploads/${name}`;
}

const cloudinaryReady = () => !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

module.exports = { saveImage, cloudinaryReady, detect, UPLOAD_DIR: DIR };
