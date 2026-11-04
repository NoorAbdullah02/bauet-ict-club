// One place for every image upload. File type is checked from the bytes (not the browser-supplied type),
// then the image goes to Cloudinary (optimised for its purpose) or, without Cloudinary keys, to local disk.
const cloudinary = require('../config/cloudinary');
const { saveImage, cloudinaryReady, detect } = require('./saveImage');

const auto = { quality: 'auto', fetch_format: 'auto' };
const KINDS = {
  avatar: { folder: 'bauet-ict-club/people', transformation: [{ width: 700, height: 700, crop: 'fill', gravity: 'face' }, auto], tags: ['avatar'] },
  applicant: { folder: 'bauet-ict-club/applicants', transformation: [{ width: 700, height: 700, crop: 'fill', gravity: 'face' }, auto], tags: ['applicant'] },
  cover: { folder: 'bauet-ict-club/covers', transformation: [{ width: 1600, crop: 'limit' }, auto], tags: ['cover'] },
  logo: { folder: 'bauet-ict-club/logos', transformation: [{ width: 600, crop: 'limit' }, auto], tags: ['logo'] },
};

/** Stores an uploaded image buffer and returns { url, public_id? }. Throws an error with .status 400 for non-images. */
async function storeImage(buffer, kind = 'cover') {
  if (!detect(buffer)) throw Object.assign(new Error('Only JPG, PNG or WebP images are allowed'), { status: 400 });
  if (!cloudinaryReady()) return { url: await saveImage(buffer) };
  const preset = KINDS[kind] || KINDS.cover;
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: preset.folder, transformation: preset.transformation, tags: ['bauet-ict-club', ...preset.tags], unique_filename: true, overwrite: false },
      (err, r) => (err ? reject(err) : resolve(r))
    ).end(buffer);
  });
  return { url: result.secure_url, public_id: result.public_id };
}

async function imageStatus() {
  if (!cloudinaryReady()) return { provider: 'disk', configured: false, note: 'Photos are saved on this server. Add CLOUDINARY_* keys to .env to use Cloudinary.' };
  try { await cloudinary.api.ping(); return { provider: 'cloudinary', configured: true, ok: true, cloud: process.env.CLOUDINARY_CLOUD_NAME }; }
  catch (e) { return { provider: 'cloudinary', configured: true, ok: false, error: e.error?.message || e.message }; }
}

module.exports = { storeImage, imageStatus, KINDS };
