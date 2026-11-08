// Tickets (a short code + QR for each registration), check-in and certificates.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QR = require('qrcode');
const { formalDate } = require('./format');

const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0 O 1 I L: easy to read out and type
const FONTS = path.join(__dirname, '..', 'assets', 'fonts');
const LOGO = path.join(__dirname, '..', '..', 'client', 'public', 'logos', 'ict-club.png');
const BN = /[ঀ-৿]/;

const newCode = () => Array.from(crypto.randomBytes(10), (b) => ALPHA[b % ALPHA.length]).join('');
/** What a person typed or a scanner read ("abcde-fghij", a full ticket link...) -> the bare code. */
const normalize = (v) => {
  const s = String(v || '').trim();
  const m = s.match(/(?:ticket|verify|certificate)\/([A-Za-z0-9-]{6,20})/i);
  return (m ? m[1] : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
};
const pretty = (c) => (c && c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
const qrPng = (text, width = 360) => QR.toBuffer(text, { width, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0A1A4A', light: '#FFFFFF' } });

const NAVY = '#1B2A4E'; const GOLD = '#B8924A'; const GOLD_LIGHT = '#E6CD8C'; const GOLD_DARK = '#8C6B2E'; const CREAM = '#FFFBF1'; const INK = '#3D4A6B';
const LOGO_UNI = path.join(__dirname, '..', '..', 'client', 'public', 'logos', 'bauet@3x.png');
const LOGO_UNI_SMALL = path.join(__dirname, '..', '..', 'client', 'public', 'logos', 'bauet.png');
const LOGO_CLUB = path.join(__dirname, '..', '..', 'client', 'public', 'logos', 'ict-club.png');
const font = (n) => path.join(FONTS, n);

/** One golden corner flourish, drawn at the top-left and mirrored for the other three corners. */
function corner(doc, x, y, sx, sy) {
  doc.save(); doc.translate(x, y); doc.scale(sx, sy);
  doc.lineJoin('round').lineCap('round');
  doc.moveTo(16, 104).lineTo(16, 16).lineTo(104, 16).lineWidth(1.6).strokeColor(GOLD).stroke();
  doc.moveTo(22, 80).lineTo(22, 22).lineTo(80, 22).lineWidth(0.6).strokeColor(GOLD).stroke();
  doc.path('M 16 16 C 46 16 62 32 62 50 C 62 66 48 72 38 66 C 28 60 34 48 44 50').lineWidth(1.3).strokeColor(GOLD).stroke();
  doc.path('M 16 16 C 16 46 32 62 50 62 C 66 62 72 48 66 38 C 60 28 48 34 50 44').lineWidth(1.3).strokeColor(GOLD).stroke();
  doc.path('M 66 36 Q 84 26 98 36 Q 84 46 66 36 Z').fillColor(GOLD).fill();
  doc.path('M 36 66 Q 26 84 36 98 Q 46 84 36 66 Z').fillColor(GOLD).fill();
  doc.circle(112, 16, 2.4).fillColor(GOLD).fill(); doc.circle(16, 112, 2.4).fillColor(GOLD).fill();
  doc.circle(28, 28, 6).fillColor(GOLD).fill(); doc.circle(28, 28, 3).fillColor(CREAM).fill();
  doc.restore();
}

/** Diamond between two thin lines: the ornament at the top and bottom centre. */
function divider(doc, cx, y) {
  doc.moveTo(cx - 150, y).lineTo(cx - 10, y).lineWidth(1).strokeColor(GOLD).stroke();
  doc.moveTo(cx + 10, y).lineTo(cx + 150, y).lineWidth(1).strokeColor(GOLD).stroke();
  doc.moveTo(cx, y - 5).lineTo(cx + 5, y).lineTo(cx, y + 5).lineTo(cx - 5, y).closePath().fillColor(GOLD).fill();
}

function ribbon(doc, cx, y, w, h) {
  const xl = cx - w / 2; const xr = cx + w / 2;
  doc.moveTo(xl + 10, y + h).lineTo(xl + 26, y + h).lineTo(xl + 10, y + h + 12).closePath().fillColor(GOLD_DARK).fill();
  doc.moveTo(xr - 10, y + h).lineTo(xr - 26, y + h).lineTo(xr - 10, y + h + 12).closePath().fillColor(GOLD_DARK).fill();
  const g = doc.linearGradient(xl, y, xl, y + h); g.stop(0, '#CDAA5C').stop(0.5, '#E2C57F').stop(1, '#B48C45');
  doc.moveTo(xl, y).lineTo(xr, y).lineTo(xr - 16, y + h / 2).lineTo(xr, y + h).lineTo(xl, y + h).lineTo(xl + 16, y + h / 2).closePath().fill(g);
}

/** Round golden seal with two ribbon tails. */
function seal(doc, cx, cy) {
  doc.moveTo(cx - 20, cy + 14).lineTo(cx - 4, cy + 22).lineTo(cx - 14, cy + 66).lineTo(cx - 24, cy + 54).lineTo(cx - 36, cy + 62).closePath().fillColor(GOLD_DARK).fill();
  doc.moveTo(cx + 20, cy + 14).lineTo(cx + 4, cy + 22).lineTo(cx + 14, cy + 66).lineTo(cx + 24, cy + 54).lineTo(cx + 36, cy + 62).closePath().fillColor(GOLD).fill();
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; doc.circle(cx + Math.cos(a) * 36, cy + Math.sin(a) * 36, 5.2).fillColor('#C79F52').fill(); }
  const g = doc.radialGradient(cx - 10, cy - 12, 2, cx, cy, 38); g.stop(0, '#F8E9B4').stop(0.55, '#D5B05E').stop(1, '#9A7430');
  doc.circle(cx, cy, 36).fill(g);
  doc.circle(cx, cy, 28).lineWidth(1.2).strokeColor('#F6E4A8').stroke();
  doc.circle(cx, cy, 24).lineWidth(0.5).strokeColor('#8C6B2E').stroke();
  const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 7 : 17; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  doc.moveTo(...pts[0]); pts.slice(1).forEach((q) => doc.lineTo(...q)); doc.closePath().fillColor('#FBF0C4').fill();
}

/** Only pictures from our own picture host are fetched for the signature (so a certificate can never be used to call another address). */
async function loadImage(src) {
  try {
    const u = new URL(String(src || ''));
    if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return null;
    // ask the picture host for a PNG (the PDF cannot draw webp), at a sensible size
    u.pathname = u.pathname.replace('/upload/', '/upload/f_png,w_700/');
    const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length && buf.length < 2 * 1024 * 1024 ? buf : null;
  } catch { return null; }
}

/** A4 landscape certificate (cream paper, golden corners, ribbon, script name, seal, signatures, QR) as a PDF buffer. */
async function certificatePdf({ name, event, cert = {}, code, siteUrl }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Certificate: ${name}`, Author: 'BAUET ICT Club' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const F = { title: font('Cinzel-Bold.ttf'), titleLight: font('Cinzel-Regular.ttf'), script: font('GreatVibes-Regular.ttf'), body: font('CormorantGaramond-Medium.ttf'), bodyB: font('CormorantGaramond-Bold.ttf'), bodyI: font('CormorantGaramond-MediumItalic.ttf'), bn: font('NotoSansBengali-Regular.ttf'), bnB: font('NotoSansBengali-Bold.ttf') };
  Object.entries(F).forEach(([k, v]) => doc.registerFont(k, v));
  const pick = (t, bold, italic) => (BN.test(t) ? (bold ? 'bnB' : 'bn') : bold ? 'bodyB' : italic ? 'bodyI' : 'body');
  const W = doc.page.width; const H = doc.page.height; const cx = W / 2;
  const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);

  // paper, frame, corners, ornaments
  doc.rect(0, 0, W, H).fill(CREAM);
  doc.rect(14, 14, W - 28, H - 28).lineWidth(0.8).strokeColor(GOLD).stroke();
  corner(doc, 14, 14, 1, 1); corner(doc, W - 14, 14, -1, 1); corner(doc, 14, H - 14, 1, -1); corner(doc, W - 14, H - 14, -1, -1);
  divider(doc, cx, 30); divider(doc, cx, H - 30);
  if (fs.existsSync(LOGO_UNI)) { try { doc.save(); doc.opacity(0.07); doc.image(LOGO_UNI, cx - 175, H / 2 - 168, { width: 350 }); doc.restore(); } catch { /* the watermark is optional */ } }
  if (fs.existsSync(LOGO_UNI_SMALL)) { try { doc.image(LOGO_UNI_SMALL, 78, 56, { width: 84 }); } catch { /* logo is optional */ } }
  if (fs.existsSync(LOGO_CLUB)) { try { doc.image(LOGO_CLUB, W - 78 - 140, 62, { width: 140 }); } catch { /* logo is optional */ } }

  // title: "Certificate of Participation" -> big CERTIFICATE + spaced OF PARTICIPATION
  const full = clean(cert.title || 'Certificate of Participation', 60);
  const m = /^certificate\s+(of\s+.+)$/i.exec(full);
  const main = m ? 'CERTIFICATE' : full.toUpperCase(); const sub = m ? m[1].toUpperCase() : '';
  doc.fillColor(NAVY).font(BN.test(main) ? 'bnB' : 'title').fontSize(m ? 52 : main.length > 28 ? 26 : 34).text(main, 0, 62, { width: W, align: 'center', characterSpacing: m ? 2 : 1 });
  if (sub) doc.fillColor(NAVY).font(BN.test(sub) ? 'bn' : 'titleLight').fontSize(19).text(sub, 0, 126, { width: W, align: 'center', characterSpacing: 3 });

  // ribbon
  ribbon(doc, cx, 168, 520, 34);
  doc.fillColor('#FFFFFF').font('bodyB').fontSize(16).text('THIS CERTIFICATE IS PROUDLY PRESENTED TO', cx - 260, 177, { width: 520, align: 'center', characterSpacing: 1.2, lineBreak: false });

  // name (script; Bengali names use the Bengali font)
  const nm = clean(name, 80) || 'Participant';
  const bnName = BN.test(nm);
  let size = bnName ? 38 : 58; doc.font(bnName ? 'bnB' : 'script');
  while (size > 18 && doc.fontSize(size).widthOfString(nm) > 620) size -= 2;
  doc.fillColor(NAVY).text(nm, 80, 220, { width: W - 160, align: 'center', lineBreak: false });
  doc.moveTo(cx - 330, 292).lineTo(cx + 330, 292).lineWidth(0.8).strokeColor('#8A97B4').stroke();

  // the sentence, with bold and italic parts
  const ev = clean(event.title, 120); const org = clean(cert.organizer, 120); const assoc = 'BAUET ICT Club';
  const kind = clean(cert.event_kind, 30) || 'event';
  const when = event.date ? formalDate(event.date) : '';
  const runs = [{ t: `for participating in the ${kind} ` }, { t: ev, b: 1 }];
  if (when) { runs.push({ t: ' held on ' }, { t: when, b: 1, nb: 1 }); }
  if (event.location) runs.push({ t: ` at ${clean(event.location, 80)}` });
  if (org && org.toLowerCase() !== assoc.toLowerCase()) runs.push({ t: ', organized by the ' }, { t: org, b: 1 }, { t: ', in association with the ' }, { t: assoc, b: 1 });
  else runs.push({ t: ', organized by the ' }, { t: assoc, b: 1 });
  runs.push({ t: '. ' }, { t: clean(cert.note, 220) || 'We appreciate your active participation and wish you continued success in your journey ahead.', i: 1 });
  // our own word wrap: each word keeps its style (plain, bold, italic) and every line is centred
  const FS = 16.5; const MAXW = W - 230; const LH = 25;
  const words = [];
  runs.forEach((r) => String(r.t).split(/(\s+)/).forEach((w) => { if (w && !/^\s+$/.test(w)) words.push({ w, f: pick(w, r.b, r.i), gapBefore: /^\s/.test(String(r.t).slice(String(r.t).indexOf(w) - 1, String(r.t).indexOf(w))) || /^[,.;:)]/.test(w) === false }); }));
  doc.fontSize(FS);
  const space = () => { doc.font('body'); return doc.widthOfString(' '); };
  const sp = space();
  const lines = [[]]; let lw = 0;
  words.forEach((wd) => {
    doc.font(wd.f).fontSize(FS); const ww = doc.widthOfString(wd.w);
    const gap = lines[lines.length - 1].length && !/^[,.;:)]/.test(wd.w) ? sp : 0;
    if (lw + gap + ww > MAXW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
    const g2 = lines[lines.length - 1].length && !/^[,.;:)]/.test(wd.w) ? sp : 0;
    lines[lines.length - 1].push({ ...wd, ww, g: g2 }); lw += g2 + ww;
  });
  let ty = 306;
  lines.forEach((ln) => {
    const total = ln.reduce((n, x) => n + x.g + x.ww, 0); let x = cx - total / 2;
    ln.forEach((x2) => { x += x2.g; doc.fillColor(NAVY).font(x2.f).fontSize(FS).text(x2.w, x, ty, { lineBreak: false }); x += x2.ww; });
    ty += LH;
  });

  // bottom row: QR + ID (left), second signer (optional), seal (centre), signer (right)
  const rowY = H - 150;
  const url = `${siteUrl}/verify/${code}`;
  try { doc.image(await qrPng(url, 300), 84, rowY + 8, { width: 64 }); } catch { /* the certificate is still valid without the picture */ }
  doc.fillColor(INK).font('Helvetica').fontSize(7).text('Scan to verify', 70, rowY + 76, { width: 92, align: 'center', lineBreak: false });
  doc.fillColor(INK).font('Helvetica').fontSize(7).text(`ID ${pretty(code)}`, 70, rowY + 86, { width: 92, align: 'center', lineBreak: false });
  seal(doc, cx, rowY + 38);
  const sign = async (x, signer, title, img) => {
    if (img) { try { doc.image(img, x + 25, rowY + 2, { fit: [130, 48], align: 'center', valign: 'bottom' }); } catch { /* bad picture: the line stays */ } }
    doc.moveTo(x, rowY + 56).lineTo(x + 180, rowY + 56).lineWidth(0.8).strokeColor('#8A97B4').stroke();
    doc.fillColor(NAVY).font(BN.test(signer) ? 'bnB' : 'bodyB').fontSize(15).text(signer, x - 10, rowY + 61, { width: 200, align: 'center', lineBreak: false });
    doc.fillColor(INK).font(BN.test(title) ? 'bn' : 'title').fontSize(BN.test(title) ? 10 : 9).text(title.toUpperCase(), x - 10, rowY + 80, { width: 200, align: 'center', lineBreak: false, characterSpacing: 0.8 });
  };
  const sigA = await loadImage(cert.signature_url); const sigB = await loadImage(cert.signature2_url);
  if (clean(cert.signer2, 60)) await sign(190, clean(cert.signer2, 60), clean(cert.signer2_title, 60) || 'President', sigB);
  await sign(W - 78 - 180, clean(cert.signer, 60) || 'Club Advisor', clean(cert.signer_title, 60) || 'BAUET ICT Club', sigA);
  doc.end();
  return done;
}

module.exports = { newCode, normalize, pretty, qrPng, certificatePdf };
