/** Shrinks a photo in the browser before upload (phone photos are often 5-10 MB): faster upload, less Cloudinary storage. */
export async function compressImage(file, { max = 1600, quality = 0.86, keepPng = false } = {}) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 500 * 1024) { bmp.close?.(); return file; }
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const png = keepPng && file.type === 'image/png';
    if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const type = png ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, png ? '.png' : '.jpg'), { type });
  } catch {
    return file; // unsupported format or old browser: upload as is
  }
}
