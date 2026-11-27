/** A link that downloads the full-quality stored picture (for posters and print). */
export function downloadUrl(url, name = 'picture') {
  if (!url) return '';
  if (/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) && !url.includes('fl_attachment')) return url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(name.replace(/[^\w-]+/g, '-').slice(0, 60) || 'picture')}/`);
  return url;
}

/**
 * A square face crop for round avatars. Group photos (two people, a full body shot) otherwise lose the
 * face in a 60 px circle; Cloudinary's face gravity keeps the head in frame, and falls back to its
 * automatic subject crop when it finds no face at all. Other URLs are returned unchanged.
 */
export function portrait(url, size = 240) {
  if (!url || !/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) || /\/upload\/[^/]*(w_|c_)/.test(url)) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto:faces,w_${size},h_${size},f_auto,q_auto/`);
}

/** Smaller, auto-format version of a Cloudinary image URL for thumbnails (other URLs are returned unchanged). */
export function thumb(url, width = 480) {
  if (!url || !/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) || /\/upload\/[^/]*(w_|c_)/.test(url)) return url;
  return url.replace('/upload/', `/upload/c_limit,w_${width},f_auto,q_auto/`);
}

