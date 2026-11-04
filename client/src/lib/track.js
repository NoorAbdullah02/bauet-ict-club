/** Tells the server which page a visitor opened (path only; the server stores the IP). Respects "Do Not Track". */
let last = '';
export function trackPage(path) {
  try {
    if (navigator.doNotTrack === '1' || path.startsWith('/admin') || path === last) return;
    last = path;
    const body = JSON.stringify({ path, referrer: document.referrer || '' });
    if (navigator.sendBeacon && navigator.sendBeacon('/api/analytics/hit', new Blob([body], { type: 'application/json' }))) return;
    fetch('/api/analytics/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch { /* tracking must never break the page */ }
}
