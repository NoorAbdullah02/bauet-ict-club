// The certificate PDF (A4 landscape): cream paper, golden (or blue / green) corners, ribbon, script name, seal, two signatures and a QR to verify.
// Everything the admin can change comes from `cert` (see utils/forms.js); the rest is fixed design.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QR = require('qrcode');
const { formalDate } = require('./format');

const ASSETS = path.join(__dirname, '..', 'assets');
const FONTS = path.join(ASSETS, 'fonts');
const LOGOS = path.join(__dirname, '..', '..', 'client', 'public', 'logos');
const LOGO_UNI = path.join(LOGOS, 'bauet.png');
const LOGO_UNI_BIG = path.join(LOGOS, 'bauet@3x.png');
const LOGO_CLUB = path.join(LOGOS, 'ict-club.png');
const ADVISOR_SIGNATURE = path.join(ASSETS, 'signatures', 'advisor-partha.png');
const BN = /[ঀ-৿]/;

/** Used when the admin leaves the signer empty: the club advisor, with the signature taken from the club's earlier certificate. */
const DEFAULT_ADVISOR = { name: 'Partha Pratim Debnath', title: 'Advisor, BAUET ICT Club' };

/** Used when the admin leaves the second signer empty: the club president, with a designed signature that reads "Noor Abdullah". */
const DEFAULT_PRESIDENT = { name: 'Sheikh Noor Abdullah', title: 'President, BAUET ICT Club', signature: 'Noor Abdullah' };

const THEMES = {
  gold: { paperLight: '#FFFEF8', inkLight: '#2D4180', accent: '#B8924A', light: '#E6CD8C', dark: '#8C6B2E', paper: '#FFFBF1', ink: '#1B2A4E', sub: '#3D4A6B', ribbon: ['#CDAA5C', '#E2C57F', '#B48C45'], medal: ['#F8E9B4', '#D5B05E', '#9A7430'], scallop: '#C79F52', star: '#FBF0C4' },
  royal: { paperLight: '#FFFFFF', inkLight: '#2A52B8', accent: '#3A63B8', light: '#A9C0EC', dark: '#1E3F85', paper: '#F8FAFF', ink: '#12224A', sub: '#3C4C75', ribbon: ['#4A74CC', '#6F94E0', '#355FB5'], medal: ['#DCE7FB', '#7F9FE0', '#2E52A3'], scallop: '#5B7FCC', star: '#EAF1FF' },
  emerald: { paperLight: '#FDFFFE', inkLight: '#1F7050', accent: '#2E8B63', light: '#9BD5B8', dark: '#17583B', paper: '#F7FCF9', ink: '#0F3328', sub: '#35564A', ribbon: ['#3FA076', '#5CBB93', '#2A7F5A'], medal: ['#D9F2E5', '#6FC09A', '#217050'], scallop: '#4BA982', star: '#EAF8F1' },
};

const pretty = (c) => (c && c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
const qrPng = (text, width = 360, dark = '#0A1A4A') => QR.toBuffer(text, { width, margin: 1, errorCorrectionLevel: 'M', color: { dark, light: '#FFFFFF' } });

/** One corner flourish, drawn at the top-left and mirrored for the other three. */
function corner(doc, x, y, sx, sy, T) {
  doc.save(); doc.translate(x, y); doc.scale(sx, sy);
  doc.lineJoin('round').lineCap('round');
  doc.moveTo(16, 108).lineTo(16, 16).lineTo(108, 16).lineWidth(1.8).strokeColor(T.accent).stroke();
  doc.moveTo(24, 84).lineTo(24, 24).lineTo(84, 24).lineWidth(0.6).strokeColor(T.accent).stroke();
  doc.path('M 16 16 C 48 16 66 34 66 54 C 66 70 50 76 40 69 C 30 62 36 50 47 53').lineWidth(1.3).strokeColor(T.accent).stroke();
  doc.path('M 16 16 C 16 48 34 66 54 66 C 70 66 76 50 69 40 C 62 30 50 36 53 47').lineWidth(1.3).strokeColor(T.accent).stroke();
  doc.path('M 70 38 Q 88 27 104 38 Q 88 49 70 38 Z').fillColor(T.accent).fill();
  doc.path('M 38 70 Q 27 88 38 104 Q 49 88 38 70 Z').fillColor(T.accent).fill();
  doc.circle(118, 16, 2.4).fillColor(T.accent).fill(); doc.circle(16, 118, 2.4).fillColor(T.accent).fill();
  doc.circle(30, 30, 6.5).fillColor(T.accent).fill(); doc.circle(30, 30, 3.2).fillColor(T.paper).fill();
  doc.restore();
}

/** A line with a small diamond in the middle. */
function divider(doc, cx, y, half, T) {
  doc.moveTo(cx - half, y).lineTo(cx - 10, y).lineWidth(0.9).strokeColor(T.accent).stroke();
  doc.moveTo(cx + 10, y).lineTo(cx + half, y).lineWidth(0.9).strokeColor(T.accent).stroke();
  doc.moveTo(cx, y - 4.5).lineTo(cx + 4.5, y).lineTo(cx, y + 4.5).lineTo(cx - 4.5, y).closePath().fillColor(T.accent).fill();
}

function ribbon(doc, cx, y, w, h, T) {
  const xl = cx - w / 2; const xr = cx + w / 2;
  doc.moveTo(xl + 10, y + h).lineTo(xl + 26, y + h).lineTo(xl + 10, y + h + 12).closePath().fillColor(T.dark).fill();
  doc.moveTo(xr - 10, y + h).lineTo(xr - 26, y + h).lineTo(xr - 10, y + h + 12).closePath().fillColor(T.dark).fill();
  const g = doc.linearGradient(xl, y, xl, y + h); g.stop(0, T.ribbon[0]).stop(0.5, T.ribbon[1]).stop(1, T.ribbon[2]);
  doc.moveTo(xl, y).lineTo(xr, y).lineTo(xr - 16, y + h / 2).lineTo(xr, y + h).lineTo(xl, y + h).lineTo(xl + 16, y + h / 2).closePath().fill(g);
}

/** Round seal with two ribbon tails. */
function seal(doc, cx, cy, T) {
  doc.moveTo(cx - 20, cy + 14).lineTo(cx - 4, cy + 22).lineTo(cx - 14, cy + 58).lineTo(cx - 24, cy + 47).lineTo(cx - 36, cy + 54).closePath().fillColor(T.dark).fill();
  doc.moveTo(cx + 20, cy + 14).lineTo(cx + 4, cy + 22).lineTo(cx + 14, cy + 58).lineTo(cx + 24, cy + 47).lineTo(cx + 36, cy + 54).closePath().fillColor(T.accent).fill();
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; doc.circle(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, 5.2).fillColor(T.scallop).fill(); }
  const g = doc.radialGradient(cx - 10, cy - 12, 2, cx, cy, 38); g.stop(0, T.medal[0]).stop(0.55, T.medal[1]).stop(1, T.medal[2]);
  doc.circle(cx, cy, 36).fill(g);
  doc.circle(cx, cy, 28).lineWidth(1.2).strokeColor(T.star).stroke();
  doc.circle(cx, cy, 24).lineWidth(0.5).strokeColor(T.dark).stroke();
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 7 : 17; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  doc.moveTo(...pts[0]); pts.slice(1).forEach((q) => doc.lineTo(...q)); doc.closePath().fillColor(T.star).fill();
}

/** Metal-looking gradient across the page, used for the outer border. */
const metal = (doc, W, H, T) => { const g = doc.linearGradient(0, 0, W, H); g.stop(0, T.dark).stop(0.22, T.light).stop(0.5, T.accent).stop(0.78, T.light).stop(1, T.dark); return g; };

/** The border: a metal outer line, then a band of fine interlaced waves (like the pattern on banknotes) between two thin lines. */
function frame(doc, W, H, T) {
  const a = 22; const b = 40; const mid = (a + b) / 2; const amp = (b - a) / 2 - 1.6;
  doc.rect(12, 12, W - 24, H - 24).lineWidth(3.2).stroke(metal(doc, W, H, T));
  doc.rect(a, a, W - 2 * a, H - 2 * a).lineWidth(0.6).strokeColor(T.accent).stroke();
  doc.rect(b, b, W - 2 * b, H - 2 * b).lineWidth(0.6).strokeColor(T.accent).stroke();
  doc.save().lineWidth(0.42).strokeColor(T.accent).strokeOpacity(0.8);
  const waves = [[0, 9], [Math.PI, 9], [Math.PI / 2, 18], [-Math.PI / 2, 18]];
  for (const [ph, len] of waves) {
    const k = 1 / len;
    doc.moveTo(b + 2, mid + amp * Math.sin((b + 2) * k + ph)); for (let x = b + 4; x <= W - b - 2; x += 1.6) doc.lineTo(x, mid + amp * Math.sin(x * k + ph)); doc.stroke();
    doc.moveTo(b + 2, H - mid + amp * Math.sin((b + 2) * k + ph)); for (let x = b + 4; x <= W - b - 2; x += 1.6) doc.lineTo(x, H - mid + amp * Math.sin(x * k + ph)); doc.stroke();
    doc.moveTo(mid + amp * Math.sin((b + 2) * k + ph), b + 2); for (let y = b + 4; y <= H - b - 2; y += 1.6) doc.lineTo(mid + amp * Math.sin(y * k + ph), y); doc.stroke();
    doc.moveTo(W - mid + amp * Math.sin((b + 2) * k + ph), b + 2); for (let y = b + 4; y <= H - b - 2; y += 1.6) doc.lineTo(W - mid + amp * Math.sin(y * k + ph), y); doc.stroke();
  }
  doc.restore();
  // a small rosette in each corner of the band
  for (const [x, y] of [[mid, mid], [W - mid, mid], [mid, H - mid], [W - mid, H - mid]]) {
    doc.circle(x, y, 8.6).fillColor(T.paper).fill();
    doc.circle(x, y, 8.6).lineWidth(0.6).strokeColor(T.accent).stroke();
    for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2; doc.circle(x + Math.cos(an) * 4.4, y + Math.sin(an) * 4.4, 1.9).fillColor(T.accent).fill(); }
    doc.circle(x, y, 1.6).fillColor(T.dark).fill();
  }
}

/** A soft white card with a thin gold ring, for a logo (radius = half of the height gives a circle). */
function plate(doc, x, y, w, h, r, T) {
  doc.save().fillOpacity(0.1).roundedRect(x + 1.2, y + 3, w, h, r).fill('#000000').restore();
  doc.roundedRect(x, y, w, h, r).fill('#FFFFFF');
  doc.roundedRect(x, y, w, h, r).lineWidth(1.4).strokeColor(T.accent).stroke();
  doc.roundedRect(x + 3.4, y + 3.4, w - 6.8, h - 6.8, Math.max(2, r - 3.4)).lineWidth(0.45).strokeColor(T.light).stroke();
}

/** A short line with a diamond at the outer end and a dot at the inner end (beside the sub-title). */
function flank(doc, x1, x2, y, T) {
  doc.moveTo(x1, y).lineTo(x2, y).lineWidth(0.9).strokeColor(T.accent).stroke();
  doc.moveTo(x1 - 5, y).lineTo(x1, y - 3.6).lineTo(x1 + 5, y).lineTo(x1, y + 3.6).closePath().fillColor(T.accent).fill();
  doc.circle(x2 + (x2 > x1 ? 4 : -4), y, 1.5).fillColor(T.accent).fill();
}

/** The line under the name: two tapering curves with a diamond between them. */
function swash(doc, cx, y, half, T) {
  const d = (sx) => { // sx = -1 left, +1 right
    const x0 = cx + sx * half; const x1 = cx + sx * 16;
    doc.path(`M ${x0} ${y} C ${cx + sx * half * 0.66} ${y - 4.5}, ${cx + sx * half * 0.3} ${y + 4.5}, ${x1} ${y}`).lineWidth(1).strokeColor(T.accent).stroke();
    doc.path(`M ${x0 - sx * 18} ${y + 2.2} C ${cx + sx * half * 0.62} ${y + 6.5}, ${cx + sx * half * 0.32} ${y - 0.5}, ${x1 + sx * 6} ${y + 1.2}`).lineWidth(0.4).strokeColor(T.accent).stroke();
    doc.circle(cx + sx * 25, y, 1.4).fillColor(T.accent).fill();
  };
  d(-1); d(1);
  doc.moveTo(cx, y - 5.5).lineTo(cx + 5.5, y).lineTo(cx, y + 5.5).lineTo(cx - 5.5, y).closePath().fillColor(T.accent).fill();
  doc.moveTo(cx, y - 2.6).lineTo(cx + 2.6, y).lineTo(cx, y + 2.6).lineTo(cx - 2.6, y).closePath().fillColor(T.paper).fill();
}

/** A ribbon with a shadow, folded ends, a soft shine and stitching. */
function ribbon3d(doc, cx, y, w, h, T) {
  const xl = cx - w / 2; const xr = cx + w / 2; const tail = 17;
  const shape = (dy) => { doc.moveTo(xl, y + dy).lineTo(xr, y + dy).lineTo(xr - tail, y + dy + h / 2).lineTo(xr, y + dy + h).lineTo(xl, y + dy + h).lineTo(xl + tail, y + dy + h / 2).closePath(); };
  doc.save().fillOpacity(0.14); shape(4); doc.fill('#000000'); doc.restore();
  // the folds behind the ends
  doc.moveTo(xl + 10, y + h).lineTo(xl + 30, y + h).lineTo(xl + 10, y + h + 15).closePath().fillColor(T.dark).fill();
  doc.moveTo(xr - 10, y + h).lineTo(xr - 30, y + h).lineTo(xr - 10, y + h + 15).closePath().fillColor(T.dark).fill();
  const g = doc.linearGradient(xl, y, xl, y + h); g.stop(0, T.ribbon[1]).stop(0.45, T.ribbon[0]).stop(1, T.ribbon[2]);
  shape(0); doc.fill(g);
  doc.save().fillOpacity(0.18).rect(xl + tail + 2, y + 1, w - 2 * tail - 4, h * 0.38).fill('#FFFFFF').restore();
  doc.save().dash(3, { space: 2.6 }).lineWidth(0.5).strokeColor('#FFFFFF').strokeOpacity(0.6);
  doc.moveTo(xl + tail + 6, y + 3.6).lineTo(xr - tail - 6, y + 3.6).stroke();
  doc.moveTo(xl + tail + 6, y + h - 3.6).lineTo(xr - tail - 6, y + h - 3.6).stroke();
  doc.undash().restore();
}

/** Text along a circle. up = true for the top arc (reads clockwise), false for the bottom arc (reads left to right). */
function circleText(doc, text, cx, cy, r, size, up, fill) {
  doc.fontSize(size);
  const gap = 0.7; const widths = [...text].map((c) => doc.widthOfString(c) + gap);
  const total = widths.reduce((n, x) => n + x, 0) / r;
  let at = 0;
  [...text].forEach((c, i) => {
    const a = up ? -Math.PI / 2 - total / 2 + (at + widths[i] / 2) / r : Math.PI / 2 + total / 2 - (at + widths[i] / 2) / r;
    at += widths[i];
    doc.save();
    doc.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    doc.rotate((a * 180) / Math.PI + (up ? 90 : -90));
    doc.fillColor(fill).text(c, -(widths[i] - gap) / 2, up ? -size * 0.2 : -size * 0.78, { lineBreak: false });
    doc.restore();
  });
}

/** Round seal: a starburst edge, a ring with lettering, a shiny centre with a star, and two ribbon tails. */
function seal3d(doc, cx, cy, T) {
  const tails = (sx, c1, c2) => { // sx = -1 left tail, +1 right tail
    doc.moveTo(cx + sx * 8, cy + 20).lineTo(cx + sx * 24, cy + 24).lineTo(cx + sx * 30, cy + 62).lineTo(cx + sx * 20, cy + 53).lineTo(cx + sx * 10, cy + 61).closePath().fillColor(c1).fill();
    doc.moveTo(cx + sx * 8, cy + 20).lineTo(cx + sx * 16, cy + 22).lineTo(cx + sx * 15, cy + 55).lineTo(cx + sx * 10, cy + 61).closePath().fillColor(c2).fill();
  };
  tails(-1, T.dark, T.accent); tails(1, T.accent, T.dark);
  const pts = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; const r = i % 2 ? 36.5 : 41; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  doc.moveTo(...pts[0]); pts.slice(1).forEach((q) => doc.lineTo(...q)); doc.closePath();
  const g1 = doc.radialGradient(cx - 14, cy - 16, 4, cx, cy, 44); g1.stop(0, T.medal[0]).stop(0.5, T.medal[1]).stop(1, T.medal[2]); doc.fill(g1);
  doc.circle(cx, cy, 34.5).lineWidth(0.7).strokeColor(T.dark).stroke();
  const g2 = doc.radialGradient(cx - 10, cy - 12, 3, cx, cy, 34); g2.stop(0, T.medal[1]).stop(1, T.medal[2]); doc.circle(cx, cy, 33.8).fill(g2);
  doc.font('title'); circleText(doc, 'BAUET ICT CLUB', cx, cy, 25.5, 5.4, true, '#FFFFFF');
  doc.font('title'); circleText(doc, 'CERTIFIED', cx, cy, 25.5, 5.4, false, '#FFFFFF');
  for (const a of [0, Math.PI]) doc.circle(cx + Math.cos(a) * 29.5, cy + Math.sin(a) * 29.5, 1.4).fillColor(T.star).fill();
  const g3 = doc.radialGradient(cx - 6, cy - 8, 2, cx, cy, 22); g3.stop(0, T.medal[0]).stop(1, T.medal[1]); doc.circle(cx, cy, 21.5).fill(g3);
  doc.circle(cx, cy, 21.5).lineWidth(0.8).strokeColor(T.star).stroke();
  doc.circle(cx, cy, 19.6).lineWidth(0.4).strokeColor(T.dark).stroke();
  const st = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 6.2 : 14.5; st.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  doc.moveTo(...st[0]); st.slice(1).forEach((q) => doc.lineTo(...q)); doc.closePath().fillColor(T.star).fill();
  doc.moveTo(...st[0]); st.slice(1).forEach((q) => doc.lineTo(...q)); doc.closePath().lineWidth(0.4).strokeColor(T.dark).stroke();
}

/**
 * A handwritten-looking signature drawn from a name (when no signature picture is given): the first and last name in script,
 * slightly tilted, with a long swash underneath.
 */
function designedSignature(doc, name, cx, baseY, T) {
  // titles in front of the name are not part of a signature ("Prof. Dr. Md. Rafiq Hasan" -> "Rafiq Hasan"); a long name keeps its first and last word
  const words = clean(name, 60).split(' ').filter(Boolean);
  while (words.length > 1 && /^(dr|prof|professor|md|mr|mrs|ms|sheikh|sk|syed|engr|eng)\.?$/i.test(words[0])) words.shift();
  const txt = words.length > 2 ? `${words[0]} ${words[words.length - 1]}` : words.join(' ') || 'Signature';
  const bn = BN.test(txt);
  let size = bn ? 22 : 36;
  doc.font(bn ? 'bn' : 'script');
  while (size > 14 && doc.fontSize(size).widthOfString(txt) > 112) size -= 1;
  const w = doc.fontSize(size).widthOfString(txt);
  doc.save();
  doc.rotate(-5, { origin: [cx, baseY] });
  doc.fillColor('#12224A').text(txt, cx - w / 2, baseY - size * (bn ? 1.15 : 1.0), { lineBreak: false });
  doc.restore();
  const x0 = cx - w / 2 - 8; const x1 = cx + w / 2 + 12;
  doc.save().lineCap('round');
  doc.path(`M ${x0} ${baseY + 4} C ${x0 + w * 0.3} ${baseY + 9}, ${x0 + w * 0.65} ${baseY - 3}, ${x1} ${baseY - 7}`).lineWidth(1.3).strokeColor('#12224A').stroke();
  doc.path(`M ${x0 + 10} ${baseY + 8} C ${x0 + w * 0.35} ${baseY + 11}, ${x0 + w * 0.6} ${baseY + 4}, ${x1 - 18} ${baseY + 1}`).lineWidth(0.6).strokeColor('#12224A').stroke();
  doc.restore();
}

/** Only pictures from our own picture host are fetched (so a certificate can never be used to call another address). */
async function loadImage(src) {
  try {
    const u = new URL(String(src || ''));
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return null;
    u.pathname = u.pathname.replace('/upload/', '/upload/f_png,w_700/'); // the PDF cannot draw webp
    const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length && buf.length < 2 * 1024 * 1024 ? buf : null;
  } catch { return null; }
}

/**
 * @param {object} o
 * @param {string} o.name          the name printed on the certificate
 * @param {{title,date,location}} o.event
 * @param {object} o.cert          admin settings: title, theme, organizer, event_kind, note, signer, signer_title, signature_url, second, signer2, signer2_title, signature2_url
 * @param {string} o.code          ticket code (for the QR and the ID)
 * @param {string} o.siteUrl
 * @param {{president?: string}} o.defaults   used when the second signer is left empty (the current club president)
 */
async function certificatePdf({ name, event, cert = {}, code, siteUrl, defaults = {} }) {
  const T = THEMES[cert.theme] || THEMES.gold;
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Certificate: ${name}`, Author: 'BAUET ICT Club' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const F = { title: 'Cinzel-Bold.ttf', titleLight: 'Cinzel-Regular.ttf', script: 'GreatVibes-Regular.ttf', body: 'CormorantGaramond-Medium.ttf', bodyB: 'CormorantGaramond-Bold.ttf', bodyI: 'CormorantGaramond-MediumItalic.ttf', bn: 'NotoSansBengali-Regular.ttf', bnB: 'NotoSansBengali-Bold.ttf' };
  Object.entries(F).forEach(([k, v]) => doc.registerFont(k, path.join(FONTS, v)));
  const pick = (t, bold, italic) => (BN.test(t) ? (bold ? 'bnB' : 'bn') : bold ? 'bodyB' : italic ? 'bodyI' : 'body');
  const W = doc.page.width; const H = doc.page.height; const cx = W / 2;

  // paper (lighter in the middle), the framed border with its wave band, corner flourishes, centre ornaments, watermark
  const paper = doc.radialGradient(cx, H * 0.47, 30, cx, H * 0.47, 600); paper.stop(0, T.paperLight).stop(1, T.paper);
  doc.rect(0, 0, W, H).fill(paper);
  frame(doc, W, H, T);
  const ci = 38; const cs = 0.64;
  corner(doc, ci, ci, cs, cs, T); corner(doc, W - ci, ci, -cs, cs, T); corner(doc, ci, H - ci, cs, -cs, T); corner(doc, W - ci, H - ci, -cs, -cs, T);
  if (cert.show_watermark !== false && fs.existsSync(LOGO_UNI_BIG)) { try { doc.save(); doc.opacity(0.045); doc.image(LOGO_UNI_BIG, cx - 150, H / 2 - 158, { width: 300 }); doc.restore(); } catch { /* the watermark is optional */ } }

  // header: the university emblem (round plate) and the club logo (rounded plate) have the same height and the same centre line
  const pH = 84; const pTop = 54; const pCy = pTop + pH / 2; const pL = 112; const pW = 104;
  plate(doc, pL, pTop, pH, pH, pH / 2, T);
  plate(doc, W - pL - pW, pTop, pW, pH, 18, T);
  if (fs.existsSync(LOGO_UNI)) { try { doc.image(LOGO_UNI, pL + pH / 2 - 32, pCy - 32, { fit: [64, 64], align: 'center', valign: 'center' }); } catch { /* logo is optional */ } }
  if (fs.existsSync(LOGO_CLUB)) { try { doc.image(LOGO_CLUB, W - pL - pW + 7, pCy - 26, { fit: [pW - 14, 52], align: 'center', valign: 'center' }); } catch { /* logo is optional */ } }

  const full = clean(cert.title || 'Certificate of Participation', 60);
  const m = /^certificate\s+(of\s+.+)$/i.exec(full);
  const main = m ? 'CERTIFICATE' : full.toUpperCase(); const sub = m ? m[1].toUpperCase() : '';
  const tg = doc.linearGradient(cx - 250, 0, cx + 250, 0); tg.stop(0, T.ink).stop(0.5, T.inkLight).stop(1, T.ink);
  doc.fillColor(tg).font(BN.test(main) ? 'bnB' : 'title').fontSize(m ? 46 : main.length > 28 ? 26 : 34).text(main, 0, m ? 63 : 82, { width: W, align: 'center', characterSpacing: m ? 3 : 1, lineBreak: false });
  if (sub) {
    doc.fillColor(T.ink).font(BN.test(sub) ? 'bn' : 'titleLight').fontSize(17).text(sub, 0, 118, { width: W, align: 'center', characterSpacing: 3.4, lineBreak: false });
    const sw = doc.widthOfString(sub, { characterSpacing: 3.4 }) / 2 + 20;
    flank(doc, cx - sw - 62, cx - sw, 128, T); flank(doc, cx + sw + 62, cx + sw, 128, T);
  }
  divider(doc, cx, 150, 120, T);

  // ribbon
  ribbon3d(doc, cx, 164, 540, 34, T);
  const ribbonText = (clean(cert.ribbon, 60) || 'This certificate is proudly presented to').toUpperCase();
  const rf = BN.test(ribbonText) ? 'bnB' : 'bodyB'; const rs = ribbonText.length > 44 ? 13 : 16;
  doc.fillColor('#000000').fillOpacity(0.22).font(rf).fontSize(rs).text(ribbonText, cx - 255 + 0.5, 172.6, { width: 510, align: 'center', characterSpacing: 1.3, lineBreak: false });
  doc.fillOpacity(1).fillColor('#FFFFFF').font(rf).fontSize(rs).text(ribbonText, cx - 255, 172, { width: 510, align: 'center', characterSpacing: 1.3, lineBreak: false });

  // name: one line in script when it fits; a long name shrinks, a very long one breaks into two balanced lines. It is always centred between the ribbon and the line.
  let nm = clean(name, 80) || 'Participant';
  // an ALL-CAPS name is hard to read in script: show it as Title Case
  if (nm === nm.toUpperCase() && /[A-Z]{3}/.test(nm)) nm = nm.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_m, a, b) => a + b.toUpperCase());
  const bnName = BN.test(nm);
  const plain = /^[\x20-\x7E\u00C0-\u017F]+$/.test(nm); // the script font only has these letters; anything else uses the plain bold font
  const nameFont = bnName ? 'bnB' : plain ? 'script' : 'bodyB';
  const NAME_W = 610;
  const widthAt = (txt, sz) => (doc.font(nameFont).fontSize(sz), doc.widthOfString(txt));
  let nameLines = [nm]; let size = bnName ? 38 : plain ? 56 : 40;
  while (size > 30 && widthAt(nm, size) > NAME_W) size -= 2;
  if (widthAt(nm, size) > NAME_W) {
    // two lines: split the words where the two halves are the most even
    const w = nm.split(' ');
    let best = null;
    for (let i = 1; i < w.length; i++) { const l1 = w.slice(0, i).join(' '); const l2 = w.slice(i).join(' '); const d = Math.max(widthAt(l1, 30), widthAt(l2, 30)); if (!best || d < best.d) best = { l1, l2, d }; }
    if (best) { nameLines = [best.l1, best.l2]; size = bnName ? 28 : plain ? 31 : 26; while (size > 14 && Math.max(widthAt(nameLines[0], size), widthAt(nameLines[1], size)) > NAME_W) size -= 1; }
    else { while (size > 14 && widthAt(nm, size) > NAME_W) size -= 1; } // one very long word: shrink it
  }
  const lineH = size * (bnName ? 1.25 : nameLines.length > 1 ? 1.1 : 0.95);
  const blockH = lineH * nameLines.length;
  const nameCenter = nameLines.length > 1 ? 250 : 241; // two lines must stay clear of the ribbon above and the line below
  const nameTop = nameCenter - blockH / 2 - (bnName ? size * 0.12 : size * 0.16);
  nameLines.forEach((ln, i) => { doc.font(nameFont).fontSize(size).fillColor(T.ink).text(ln, 90, nameTop + i * lineH, { width: W - 180, align: 'center', lineBreak: false }); });
  swash(doc, cx, 286, 300, T);

  // the sentence: own word wrap so bold and italic parts stay together; the block is centred between the name line and the bottom row
  const ev = clean(event.title, 120); const org = clean(cert.organizer, 120); const assoc = 'BAUET ICT Club';
  const kind = clean(cert.event_kind, 30) || 'event';
  const when = event.date ? formalDate(event.date) : '';
  let runs;
  if (clean(cert.body, 600)) {
    // the admin's own sentence: {event} {date} {location} {kind} {organizer} {name} are filled in, **text** is bold, *text* is italic
    const fill = { event: ev, date: when.replace(/ /g, '\u00a0'), location: clean(event.location, 80), kind, organizer: org || assoc, name: nm };
    const text = String(cert.body).replace(/\{(\w+)\}/g, (_m, k) => fill[k] ?? '');
    runs = [];
    text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach((part) => {
      if (!part) return;
      if (/^\*\*[^*]+\*\*$/.test(part)) runs.push({ t: part.slice(2, -2), b: 1 });
      else if (/^\*[^*]+\*$/.test(part)) runs.push({ t: part.slice(1, -1), i: 1 });
      else runs.push({ t: part });
    });
  } else {
    runs = [{ t: `for participating in the ${kind} ` }, { t: ev, b: 1 }];
    if (when) runs.push({ t: ' held on ' }, { t: when, b: 1, nb: 1 });
    if (event.location) runs.push({ t: ` at ${clean(event.location, 80)}` });
    if (org && org.toLowerCase() !== assoc.toLowerCase()) runs.push({ t: ', organized by the ' }, { t: org, b: 1 }, { t: ', in association with the ' }, { t: assoc, b: 1 });
    else runs.push({ t: ', organized by the ' }, { t: assoc, b: 1 });
    runs.push({ t: '. ' }, { t: clean(cert.note, 220) || 'We appreciate your active participation and wish you continued success in your journey ahead.', i: 1 });
  }
  const MAXW = 590; const zoneTop = 296; const zoneH = 140;
  const words = [];
  runs.forEach((r) => (r.nb ? [r.t] : String(r.t).split(/[ \t\r\n]+/)).forEach((w) => { if (w) words.push({ w, f: pick(w, r.b, r.i) }); }));
  // wrap at 16.5pt; a long text gets a smaller size until it fits, so nothing is ever cut off
  const wrap = (FS) => {
    doc.font('body').fontSize(FS); const sp = doc.widthOfString(' ');
    const out = [[]]; let lw = 0;
    words.forEach((wd) => {
      doc.font(wd.f).fontSize(FS); const ww = doc.widthOfString(wd.w);
      const tight = /^[,.;:)]/.test(wd.w);
      const gap = out[out.length - 1].length && !tight ? sp : 0;
      if (lw + gap + ww > MAXW && out[out.length - 1].length) { out.push([]); lw = 0; }
      const g2 = out[out.length - 1].length && !tight ? sp : 0;
      out[out.length - 1].push({ ...wd, ww, g: g2 }); lw += g2 + ww;
    });
    return out;
  };
  let FS = 16.5; let lines = wrap(FS);
  for (const trySize of [15.5, 14.5, 13.5, 12.5, 11.5]) { if (lines.length * FS * 1.48 <= zoneH) break; FS = trySize; lines = wrap(FS); }
  const LINE = FS * 1.48;
  let ty = zoneTop + Math.max(0, (zoneH - lines.length * LINE) / 2);
  lines.forEach((ln) => {
    const total = ln.reduce((n, x) => n + x.g + x.ww, 0); let x = cx - total / 2;
    ln.forEach((x2) => { x += x2.g; doc.fillColor(T.ink).font(x2.f).fontSize(FS).text(x2.w, x, ty, { lineBreak: false }); x += x2.ww; });
    ty += LINE;
  });

  // bottom row: QR | President | seal | Advisor | how to verify. The two signatures are the same distance from the seal.
  const rowY = H - 150;
  const url = `${siteUrl}/verify/${code}`;
  try { doc.image(await qrPng(url, 300, T.ink), 116, rowY + 12, { width: 50 }); } catch { /* the certificate is still valid without the picture */ }
  doc.fillColor(T.sub).font('Helvetica').fontSize(6.5).text('Scan to verify', 106, rowY + 66, { width: 70, align: 'center', lineBreak: false });
  // one quiet line under the seal: where to verify and the certificate ID
  const host = String(siteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  doc.fillColor(T.sub).font('Helvetica').fontSize(6.5).text(`Verify at ${host}/verify  ·  Certificate ID ${pretty(code)}`, 0, H - 47, { width: W, align: 'center', lineBreak: false });
  if (cert.show_seal !== false) seal3d(doc, cx, rowY + 34, T);

  const signBlock = async (centerX, signer, title, img, sigText) => {
    const x = centerX - 72;
    if (img) { try { doc.image(img, centerX - 65, rowY - 2, { fit: [130, 52], align: 'center', valign: 'bottom' }); } catch { designedSignature(doc, sigText || signer, centerX, rowY + 44, T); } }
    else designedSignature(doc, sigText || signer, centerX, rowY + 44, T);
    doc.moveTo(x, rowY + 54).lineTo(x + 144, rowY + 54).lineWidth(0.9).strokeColor(T.accent).stroke();
    doc.circle(x, rowY + 54, 1.5).fillColor(T.accent).fill(); doc.circle(x + 144, rowY + 54, 1.5).fillColor(T.accent).fill();
    const fit = (font, size, txt, maxW, min, spacing = 0) => { let z = size; doc.font(font); while (z > min && doc.fontSize(z).widthOfString(txt, { characterSpacing: spacing }) > maxW) z -= 0.5; return z; };
    const sf = BN.test(signer) ? 'bnB' : 'bodyB'; const tt = title.toUpperCase(); const tf = BN.test(title) ? 'bn' : 'title';
    doc.fillColor(T.ink).font(sf).fontSize(fit(sf, 14.5, signer, 178, 9)).text(signer, x - 14, rowY + 60, { width: 184, align: 'center', lineBreak: false });
    doc.fillColor(T.sub).font(tf).fontSize(fit(tf, BN.test(title) ? 10 : 8, tt, 178, 5.5, 0.8)).text(tt, x - 14, rowY + 79, { width: 184, align: 'center', lineBreak: false, characterSpacing: 0.8 });
  };
  const L = cx - 158; const R = cx + 158;
  // right: the advisor (the club's real signature unless the admin uploaded another picture)
  const advisorName = clean(cert.signer, 60) || DEFAULT_ADVISOR.name;
  const advisorTitle = clean(cert.signer_title, 80) || DEFAULT_ADVISOR.title;
  let advisorImg = await loadImage(cert.signature_url);
  if (!advisorImg && advisorName === DEFAULT_ADVISOR.name && fs.existsSync(ADVISOR_SIGNATURE)) advisorImg = fs.readFileSync(ADVISOR_SIGNATURE);
  await signBlock(R, advisorName, advisorTitle, advisorImg, clean(cert.signature_text, 40));
  // left: the president (a designed signature unless the admin uploaded a picture); can be switched off
  const customPres = clean(cert.signer2, 60);
  const presName = customPres || clean(defaults.president, 60) || DEFAULT_PRESIDENT.name;
  const presSignText = clean(cert.signature2_text, 40) || (customPres ? '' : DEFAULT_PRESIDENT.signature);
  if (cert.second !== false) await signBlock(L, presName, clean(cert.signer2_title, 80) || DEFAULT_PRESIDENT.title, await loadImage(cert.signature2_url), presSignText);
  doc.end();
  return done;
}

module.exports = { certificatePdf, DEFAULT_ADVISOR, DEFAULT_PRESIDENT, THEMES, qrPng, pretty };
