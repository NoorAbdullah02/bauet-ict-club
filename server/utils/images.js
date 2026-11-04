// One place for every image upload. File type is checked from the bytes (not the browser-supplied type),
// then the image goes to Cloudinary (optimised for its purpose) or, without Cloudinary keys, to local disk.
const cloudinary = require('../config/cloudinary');
const { saveImage, cloudinaryReady, detect } = require('./saveImage');

// Every upload is converted to ONE WebP "master" and the original is not kept: big saving on the free Cloudinary plan, and the master
// is still sharp enough to print a poster (2400 px wide is about A4 at 290 dpi). The website asks for smaller copies on the fly.
const MAX = Math.min(4000, Math.max(800, Number(process.env.IMAGE_MAX_WIDTH) || 2400));
const auto = { quality: 'auto:good' };
const KINDS = {
  avatar: { folder: 'bauet-ict-club/people', transformation: [{ width: 1200, height: 1200, crop: 'fill', gravity: 'face' }, auto], tags: ['avatar'] },
  applicant: { folder: 'bauet-ict-club/applicants', transformation: [{ width: 1000, height: 1000, crop: 'fill', gravity: 'face' }, auto], tags: ['applicant'] },
  cover: { folder: 'bauet-ict-club/covers', transformation: [{ width: MAX, crop: 'limit' }, auto], tags: ['cover'] },
  logo: { folder: 'bauet-ict-club/logos', transformation: [{ width: 1200, crop: 'limit' }, auto], tags: ['logo'] },
};

// Every committee gets its own folder (bauet-ict-club/committees/summer-2026), other pictures are grouped by area and year.
// Deleting or cleaning one folder never touches another committee's pictures.
const AREAS = ['committees', 'events', 'gallery', 'posts', 'projects', 'notices', 'achievements', 'applicants', 'branding', 'misc'];
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
function folderFor(fallback, area, scope) {
  const a = AREAS.includes(area) ? area : null;
  const sl = slug(scope);
  if (!a) return fallback;
  return sl ? `bauet-ict-club/${a}/${sl}` : `bauet-ict-club/${a}`;
}

/** Stores an uploaded image buffer and returns { url, public_id? }. Throws an error with .status 400 for non-images. `where` = { area, scope } picks the Cloudinary folder. */
async function storeImage(buffer, kind = 'cover', where = {}) {
  if (!detect(buffer)) throw Object.assign(new Error('Please choose a JPG, PNG, WebP, GIF, AVIF or HEIC picture'), { status: 400 });
  if (!cloudinaryReady()) return { url: await saveImage(buffer) };
  const preset = KINDS[kind] || KINDS.cover;
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { resource_type: 'image', format: 'webp', folder: folderFor(preset.folder, where.area, where.scope), transformation: preset.transformation, tags: ['bauet-ict-club', ...preset.tags], unique_filename: true, overwrite: false },
      (err, r) => (err ? reject(err) : resolve(r))
    ).end(buffer);
  });
  return { url: result.secure_url, public_id: result.public_id };
}

/**
 * Gives a picture its own copy inside another folder (for example when someone is copied into a new committee), so every committee
 * keeps its own files. Returns the new URL, or the same URL when there is nothing to copy (no Cloudinary, local file, data picture).
 */
async function cloneImage(url, area, scope) {
  try {
    if (!url || !cloudinaryReady() || !/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return url;
    const r = await cloudinary.uploader.upload(url, { resource_type: 'image', format: 'webp', folder: folderFor('bauet-ict-club/misc', area, scope), tags: ['bauet-ict-club', 'copy'], unique_filename: true, overwrite: false });
    return r.secure_url || url;
  } catch (e) {
    console.warn('Could not copy picture, keeping the original link:', e.message);
    return url;
  }
}

async function imageStatus() {
  if (!cloudinaryReady()) return { provider: 'disk', configured: false, note: 'Photos are saved on this server. Add CLOUDINARY_* keys to .env to use Cloudinary.' };
  try { await cloudinary.api.ping(); return { provider: 'cloudinary', configured: true, ok: true, cloud: process.env.CLOUDINARY_CLOUD_NAME }; }
  catch (e) { return { provider: 'cloudinary', configured: true, ok: false, error: e.error?.message || e.message }; }
}

module.exports = { storeImage, cloneImage, imageStatus, KINDS, AREAS };
