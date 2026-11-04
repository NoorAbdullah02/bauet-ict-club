/** Public link of an event: this is what Facebook, WhatsApp and the copied link open. */
export const eventLink = (id) => `${window.location.origin}/events/${id}`;

export const shareLinks = (url, text) => ({
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
  telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
});

/** Copies text; works without HTTPS too. Resolves true when it worked. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
  try {
    const t = Object.assign(document.createElement('textarea'), { value: text });
    t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select();
    const ok = document.execCommand('copy'); t.remove(); return ok;
  } catch { return false; }
}

/** Phone share sheet when the browser has one; resolves false when it does not (so the caller can show the menu). */
export async function nativeShare({ title, text, url }) {
  if (!navigator.share) return false;
  try { await navigator.share({ title, text, url }); return true; } catch (e) { return e?.name === 'AbortError'; }
}
