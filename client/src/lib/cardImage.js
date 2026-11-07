// Draws the membership card straight onto a canvas (no screenshot library), so the saved picture is always sharp and
// identical to the card on screen. Every size is in "units": 1 unit = 1% of the card width, the same units the card uses.
const load = (src, cors = true) => new Promise((resolve) => {
  if (!src) return resolve(null);
  const img = new Image();
  if (cors) img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const COND = (w, size, italic = false) => `${italic ? 'italic ' : ''}${w} ${size}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
const MONO = (size, w = 500) => `${w} ${size}px 'JetBrains Mono', monospace`;

function wrap(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] = `${keep[maxLines - 1].replace(/\s+\S*$/, '')}…`; return keep; }
  return lines;
}

/** Returns a PNG data URL of the card. m = member, code = card code, qr = QR picture (data URL), width = pixels. */
export async function cardToPng({ m, code, qr, width = 1080, site = '', fb = '' }) {
  try { await Promise.all([document.fonts.load(COND(700, 40)), document.fonts.load(COND(600, 40)), document.fonts.load(COND(700, 40, true)), document.fonts.load(MONO(20)), document.fonts.ready]); } catch { /* fall back to system fonts */ }
  const [photo, logo, qrImg] = await Promise.all([load(m.image_url), load('/logos/ict-club@3x.png', false).then((i) => i || load('/logos/ict-club.png', false)), load(qr, false)]);

  const S = width / 100;                 // pixels per outer unit
  const H = width * 16 / 9;
  const cv = Object.assign(document.createElement('canvas'), { width: Math.round(width), height: Math.round(H) });
  const ctx = cv.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  // gradient frame
  const g0 = ctx.createLinearGradient(0, 0, width, H);
  [[0, '#35D989'], [0.35, '#38C8F0'], [0.7, '#8B5CF6'], [1, '#FF6B8A']].forEach(([o, c]) => g0.addColorStop(o, c));
  rr(ctx, 0, 0, width, H, 8 * S); ctx.fillStyle = g0; ctx.fill();

  // inner card, in inner units
  const pad = 1.7 * S, iw = width - 2 * pad, ih = H - 2 * pad, u = iw / 100;
  ctx.save();
  ctx.translate(pad, pad);
  rr(ctx, 0, 0, iw, ih, 6.4 * u); ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, 0, ih); bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#F3F6FC');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, iw, ih);
  const glow = (cx, cy, rx, ry, c0) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); rg.addColorStop(0, c0); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  glow(78 * u, 0.4 * ih, 60 * u, 45 * u, 'rgba(56,200,240,0.22)');
  glow(90 * u, 0.15 * ih, 45 * u, 30 * u, 'rgba(53,217,137,0.18)');

  // faint wordmark
  ctx.font = COND(700, 30 * u); ctx.fillStyle = 'rgba(11,42,120,0.07)'; ctx.textAlign = 'right';
  ctx.fillText('ICT', 95 * u, 36 * u + 24 * u); ctx.textAlign = 'left';

  // navy strip
  const sw = 27 * u;
  const sg = ctx.createLinearGradient(0, 0, 0, ih); sg.addColorStop(0, '#061440'); sg.addColorStop(0.6, '#0B2A78'); sg.addColorStop(1, '#0A4D8F');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, sw, ih);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = Math.max(1, u * 0.12);
  for (let x = 0; x < sw; x += 6 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ih); ctx.stroke(); }
  for (let y = 0; y < ih; y += 6 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sw, y); ctx.stroke(); }
  glow(0, 0.34 * ih, 22 * u, 22 * u, 'rgba(43,99,255,0.45)');
  // club logo on a white pill
  const px = (sw - 21 * u) / 2, pw = 21 * u, py = 5 * u, ppad = 1.6 * u;
  const lh = logo ? (pw - 2 * ppad) * (logo.naturalHeight / logo.naturalWidth) : 9 * u;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 2 * u; ctx.shadowOffsetY = 0.8 * u; rr(ctx, px, py, pw, lh + 2 * ppad, 4 * u); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  if (logo) ctx.drawImage(logo, px + ppad, py + ppad, pw - 2 * ppad, lh);
  // short line and the vertical club name
  const lg = ctx.createLinearGradient(sw / 2 - 4.5 * u, 0, sw / 2 + 4.5 * u, 0); lg.addColorStop(0, 'rgba(124,240,178,0)'); lg.addColorStop(0.5, 'rgba(124,240,178,0.9)'); lg.addColorStop(1, 'rgba(124,240,178,0)');
  ctx.fillStyle = lg; ctx.fillRect(sw / 2 - 4.5 * u, 0.23 * ih, 9 * u, Math.max(1, u * 0.15));
  ctx.save(); ctx.translate(sw / 2, 0.25 * ih + (0.37 * ih) / 2); ctx.rotate(-Math.PI / 2);
  ctx.font = COND(600, 6.4 * u); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${1.28 * u}px`;
  ctx.fillText('BAUET ICT CLUB', 0.64 * u, 2.2 * u);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore(); ctx.textAlign = 'left';

  // the post, big
  const post = String(m.position || 'Member').toUpperCase();
  const pf = post.length > 22 ? 7.6 : post.length > 13 ? 10.5 : 14;
  const cx = sw + (100 * u - sw) / 2;
  ctx.fillStyle = '#0A1A3F'; ctx.textAlign = 'center'; ctx.font = COND(700, pf * u);
  const plines = wrap(ctx, post, 100 * u - sw - 8 * u, 2);
  plines.forEach((t, i) => ctx.fillText(t, cx, 6 * u + pf * u * 0.82 + i * pf * u * 0.92));
  const py2 = 6 * u + plines.length * pf * u * 0.92 + 2 * u;
  // "ACTIVE MEMBER" pill
  const label = m.current ? 'ACTIVE MEMBER' : 'FORMER MEMBER';
  ctx.font = MONO(2.5 * u); if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.45 * u}px`;
  const lw = ctx.measureText(label).width, bw = lw + 2.6 * u * 2 + 2.8 * u, bh = 2.5 * u + 1.8 * u;
  rr(ctx, cx - bw / 2, py2, bw, bh, bh); ctx.fillStyle = 'rgba(11,42,120,0.07)'; ctx.fill();
  ctx.fillStyle = m.current ? '#16A34A' : '#94A3B8'; ctx.beginPath(); ctx.arc(cx - bw / 2 + 2.6 * u + 0.8 * u, py2 + bh / 2, 0.8 * u, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0B2A78'; ctx.textAlign = 'left'; ctx.fillText(label, cx - bw / 2 + 2.6 * u + 2.8 * u, py2 + bh / 2 + 0.9 * u);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  // arched photo that fades into the grey panel
  const ax = sw, aw = 100 * u - sw, ay = 0.2 * ih, ah = 0.49 * ih;
  const arch = (x, y, w, h) => { const rx = w * 0.44, ry = h * 0.32; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + ry); ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5); ctx.lineTo(x + w - rx, y); ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, Math.PI * 1.5, Math.PI * 2); ctx.lineTo(x + w, y + h); ctx.closePath(); };
  const ring = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah); ring.addColorStop(0, '#35D989'); ring.addColorStop(0.55, '#38C8F0'); ring.addColorStop(1, '#8B5CF6');
  arch(ax + aw * 0.08, ay + ah * 0.12, aw * 0.84, ah * 0.88); ctx.fillStyle = ring; ctx.fill();
  const ix = ax + aw * 0.105, iy = ay + ah * 0.135, iwd = aw * 0.79, iht = ah * 0.865;
  const tmp = Object.assign(document.createElement('canvas'), { width: Math.ceil(iwd), height: Math.ceil(iht) });
  const tc = tmp.getContext('2d');
  arch(0, 0, iwd, iht); tc.save(); tc.clip(arch(0, 0, iwd, iht) || undefined);
  tc.restore();
  const t2 = tmp.getContext('2d'); t2.save();
  t2.beginPath(); { const rx = iwd * 0.42, ry = iht * 0.28; t2.moveTo(0, iht); t2.lineTo(0, ry); t2.ellipse(rx, ry, rx, ry, 0, Math.PI, Math.PI * 1.5); t2.lineTo(iwd - rx, 0); t2.ellipse(iwd - rx, ry, rx, ry, 0, Math.PI * 1.5, Math.PI * 2); t2.lineTo(iwd, iht); t2.closePath(); }
  t2.clip(); t2.fillStyle = '#0B2A78'; t2.fillRect(0, 0, iwd, iht);
  if (photo) { const sc = Math.max(iwd / photo.naturalWidth, iht / photo.naturalHeight); const dw = photo.naturalWidth * sc, dh = photo.naturalHeight * sc; t2.drawImage(photo, (iwd - dw) / 2, 0, dw, dh); }
  else { const ini = String(m.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase(); t2.fillStyle = 'rgba(255,255,255,0.9)'; t2.font = COND(700, 20 * u); t2.textAlign = 'center'; t2.fillText(ini, iwd / 2, iht / 2 + 7 * u); }
  t2.restore();
  t2.globalCompositeOperation = 'destination-in'; const fade = t2.createLinearGradient(0, 0, 0, iht); fade.addColorStop(0, '#000'); fade.addColorStop(0.82, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)'); t2.fillStyle = fade; t2.fillRect(0, 0, iwd, iht);
  ctx.drawImage(tmp, ix, iy);

  // grey bottom panel with the raised tab
  const ph = 0.37 * ih, pyy = ih - ph, sx = iw / 100, sy = ph / 40;
  ctx.save(); ctx.translate(0, pyy); ctx.shadowColor = 'rgba(6,20,64,0.16)'; ctx.shadowBlur = 5 * u; ctx.shadowOffsetY = -1.5 * u;
  ctx.beginPath(); ctx.moveTo(0, 9 * sy); ctx.quadraticCurveTo(0, 7 * sy, 2.5 * sx, 6 * sy); ctx.lineTo(8 * sx, 3.5 * sy); ctx.quadraticCurveTo(10 * sx, 2.5 * sy, 13 * sx, 2.5 * sy); ctx.lineTo(48 * sx, 2.5 * sy); ctx.quadraticCurveTo(52 * sx, 2.5 * sy, 54 * sx, 1.2 * sy); ctx.quadraticCurveTo(56 * sx, 0, 59 * sx, 0); ctx.lineTo(iw, 0); ctx.lineTo(iw, ph); ctx.lineTo(0, ph); ctx.closePath();
  const pg = ctx.createLinearGradient(0, 0, 0, ph); pg.addColorStop(0, '#EEF1F7'); pg.addColorStop(1, '#D3D9E6'); ctx.fillStyle = pg; ctx.fill(); ctx.restore();

  // QR box (right), then name block (left)
  const qs = 26 * u, qx = iw - 9 * u - qs, qy = ih - 11.5 * u - qs;
  rr(ctx, qx, qy, qs, qs, 5 * u); ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fill(); ctx.lineWidth = 0.8 * u; ctx.strokeStyle = '#0A1A3F'; ctx.stroke();
  if (qrImg) ctx.drawImage(qrImg, qx + 1.4 * u, qy + 1.4 * u, qs - 2.8 * u, qs - 2.8 * u);
  ctx.font = COND(800, 2.7 * u); if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.38 * u}px`;
  const sm = ctx.measureText('SCAN ME').width; ctx.fillStyle = '#DDE2EC'; ctx.fillRect(qx + qs / 2 - sm / 2 - 1.4 * u, qy - 1.9 * u - 1.6 * u, sm + 2.8 * u, 3.6 * u);
  ctx.fillStyle = '#0A1A3F'; ctx.textAlign = 'center'; ctx.fillText('SCAN ME', qx + qs / 2 + 0.2 * u, qy - 0.3 * u); ctx.textAlign = 'left'; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  const nx = 7 * u, nw = qx - 3 * u - nx;
  const name = String(m.name || '').toUpperCase();
  const nf = name.length > 26 ? 6.6 : name.length > 16 ? 8.6 : 11;
  ctx.font = COND(700, nf * u); ctx.fillStyle = '#3B4658';
  const nlines = wrap(ctx, name, nw, 2);
  const codeY = ih - 11.5 * u;                      // baseline of the member id
  const idY = codeY - 5 * u;                        // label baseline
  const deptY = idY - 5.6 * u;                      // department baseline
  const firstNameY = deptY - 8.4 * u - (nlines.length - 1) * nf * u * 0.92;
  nlines.forEach((t, i) => ctx.fillText(t, nx, firstNameY + i * nf * u * 0.92));
  ctx.fillStyle = '#0A1A3F'; ctx.font = COND(700, 6.6 * u, true); const dept = m.department || 'BAUET'; ctx.fillText(dept, nx, deptY + 6.6 * u * 0.3);
  if (m.batch) { const dw = ctx.measureText(dept).width; ctx.font = COND(600, 3.6 * u); const bt = `Batch ${m.batch}`; const bw2 = ctx.measureText(bt).width + 3.2 * u; rr(ctx, nx + dw + 2 * u, deptY - 3 * u, bw2, 4.6 * u, 1 * u); ctx.fillStyle = '#0B2A78'; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(bt, nx + dw + 3.6 * u, deptY + 0.4 * u); }
  ctx.font = MONO(2.3 * u); ctx.fillStyle = '#64748B'; if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.46 * u}px`; ctx.fillText('MEMBER ID', nx, idY); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.font = MONO(3 * u, 700); const chipW = ctx.measureText('<ICT/>').width + 2.8 * u; rr(ctx, nx, codeY - 3.4 * u, chipW, 4.6 * u, 1 * u); ctx.fillStyle = '#0A1A3F'; ctx.fill(); ctx.fillStyle = '#7CF0B2'; ctx.fillText('<ICT/>', nx + 1.4 * u, codeY);
  ctx.font = MONO(3.5 * u); ctx.fillStyle = '#0A1A3F'; ctx.fillText(String(code), nx + chipW + 1.6 * u, codeY);

  // session, turned sideways
  const session = (m.session || '').replace(/^Member since /, 'Since ') || 'BAUET ICT Club';
  ctx.save(); ctx.translate(iw - 2.6 * u, ih - 12 * u); ctx.rotate(-Math.PI / 2); ctx.font = COND(600, 4 * u); ctx.fillStyle = '#0A1A3F'; ctx.textAlign = 'left';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.72 * u}px`; ctx.fillText(session.toUpperCase(), 0, 0); ctx.restore();

  // footer band: website and Facebook
  const fh = 6.6 * u, fg = ctx.createLinearGradient(0, 0, iw, 0); fg.addColorStop(0, '#061440'); fg.addColorStop(0.6, '#0B2A78'); fg.addColorStop(1, '#0A4D8F');
  ctx.fillStyle = fg; ctx.fillRect(0, ih - fh, iw, fh);
  ctx.font = MONO(2.45 * u); ctx.fillStyle = 'rgba(255,255,255,0.9)'; if ('letterSpacing' in ctx) ctx.letterSpacing = `${0.07 * u}px`;
  const parts = [site, fb].filter(Boolean); const gap = 3 * u;
  const widths = parts.map((t) => ctx.measureText(t).width); const total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, parts.length - 1) + (parts.length > 1 ? 0.9 * u + gap : 0);
  let fx = (iw - total) / 2; const fy = ih - fh / 2 + 0.85 * u;
  parts.forEach((t, i) => { ctx.fillText(t, fx, fy); fx += widths[i]; if (i < parts.length - 1) { fx += gap; ctx.fillStyle = '#7CF0B2'; ctx.beginPath(); ctx.arc(fx + 0.45 * u, ih - fh / 2, 0.45 * u, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.9)'; fx += 0.9 * u + gap; } });
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  ctx.restore();
  return cv.toDataURL('image/png');
}
