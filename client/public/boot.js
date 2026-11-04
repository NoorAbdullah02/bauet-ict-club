// Runs before the page paints. Kept as a file (not inline) so the strict production CSP allows it.
try {
  var n = navigator;
  // weak or small devices get the lighter "lite" look (no heavy 3D, fewer effects)
  if (innerWidth < 768 || (n.hardwareConcurrency || 8) <= 4 || (n.deviceMemory || 8) <= 4 || (n.connection && n.connection.saveData)) document.documentElement.classList.add('lite');
} catch (e) { /* ignore */ }
// web fonts load without blocking the first paint; switch the stylesheet on once it has arrived
document.addEventListener('DOMContentLoaded', function () {
  var links = document.querySelectorAll('link[data-async-css]');
  for (var i = 0; i < links.length; i++) {
    (function (l) { if (l.sheet) { l.media = 'all'; } else { l.addEventListener('load', function () { l.media = 'all'; }); } })(links[i]);
  }
});
