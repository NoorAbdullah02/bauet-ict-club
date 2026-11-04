/** Smaller, auto-format version of a Cloudinary image URL for thumbnails (other URLs are returned unchanged). */
export function thumb(url, width = 480) {
  if (!url || !/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) || /\/upload\/[^/]*(w_|c_)/.test(url)) return url;
  return url.replace('/upload/', `/upload/c_limit,w_${width},f_auto,q_auto/`);
}
