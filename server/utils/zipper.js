const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { detect, UPLOAD_DIR } = require('./saveImage');

const safe = (s, fallback = 'file') => String(s || '').normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || fallback;
const EXT = { jpg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', avif: 'avif', heic: 'heic' };

/**
 * Full-quality bytes of a stored picture, or null. Cloudinary links are fetched WITHOUT any size change (the stored master);
 * format = jpg or png asks Cloudinary to convert it (handy for posters and print), anything else keeps the original WebP.
 */
async function fetchOriginal(url, format = 'original') {
  try {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      const file = path.join(UPLOAD_DIR, path.basename(url));
      return fs.existsSync(file) ? fs.readFileSync(file) : null;
    }
    if (!/^https:\/\//.test(url)) return null;
    let src = url;
    if (/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) && ['jpg', 'png'].includes(format) && !/\/upload\/[^/]*f_/.test(url)) src = url.replace('/upload/', `/upload/f_${format},q_100/`);
    const res = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 40e6 ? null : buf;
  } catch { return null; }
}

/** The file extension of image bytes ("jpg", "png", "webp"...). */
const extOf = (buf) => EXT[detect(buf)] || 'jpg';

/**
 * Streams a ZIP to the response.
 * entries: [{ name, data: Buffer|string } | { name, image: url, format? }]. Pictures that cannot be fetched are listed in missing.txt.
 */
async function sendZip(res, filename, entries, { format = 'original' } = {}) {
  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${safe(filename, 'download')}.zip"`, 'Cache-Control': 'no-store' });
  const zip = archiver('zip', { zlib: { level: 3 } });
  zip.on('error', () => { try { res.end(); } catch { /* connection already closed */ } });
  zip.pipe(res);
  const used = new Set(); const missing = [];
  const unique = (name) => { let n = name; let i = 2; while (used.has(n)) n = name.replace(/(\.[^./]+)?$/, `-${i++}$1`); used.add(n); return n; };
  for (const e of entries) {
    if (e.image !== undefined) {
      const buf = await fetchOriginal(e.image, e.format || format);
      if (!buf) { if (e.image) missing.push(`${e.name}  (${String(e.image).slice(0, 80)})`); continue; }
      const ext = ['jpg', 'png'].includes(e.format || format) && /cloudinary/.test(e.image) ? (e.format || format) : extOf(buf);
      zip.append(buf, { name: unique(`${e.name}.${ext}`) });
    } else zip.append(Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data)), { name: unique(e.name) });
  }
  if (missing.length) zip.append(Buffer.from(`These pictures could not be added:\n${missing.join('\n')}\n`), { name: 'missing.txt' });
  await zip.finalize();
}

module.exports = { sendZip, fetchOriginal, safe };
