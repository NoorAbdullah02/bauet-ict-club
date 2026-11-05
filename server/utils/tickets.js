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

/** A4 landscape certificate as a PDF buffer. */
async function certificatePdf({ name, event, cert = {}, code, siteUrl }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Certificate: ${name}`, Author: 'BAUET ICT Club' } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.registerFont('bn', path.join(FONTS, 'NotoSansBengali-Regular.ttf'));
  doc.registerFont('bn-b', path.join(FONTS, 'NotoSansBengali-Bold.ttf'));
  const face = (t, bold) => (BN.test(t) ? (bold ? 'bn-b' : 'bn') : (bold ? 'Helvetica-Bold' : 'Helvetica'));
  const W = doc.page.width; const H = doc.page.height;

  // frame
  doc.rect(18, 18, W - 36, H - 36).lineWidth(3).strokeColor('#1F4FD8').stroke();
  doc.rect(27, 27, W - 54, H - 54).lineWidth(0.8).strokeColor('#17A2D8').stroke();
  const g = doc.linearGradient(27, 0, W - 27, 0); g.stop(0, '#1F4FD8').stop(0.55, '#17A2D8').stop(1, '#18A957');
  doc.rect(27, 27, W - 54, 9).fill(g);
  doc.rect(27, H - 36, W - 54, 9).fill(g);

  let y = 56;
  if (fs.existsSync(LOGO)) { try { doc.image(LOGO, W / 2 - 52, y, { width: 104 }); y += 62; } catch { y += 6; } }
  doc.fillColor('#5B6B8C').font('Helvetica-Bold').fontSize(10).text('B A U E T   I C T   C L U B', 0, y, { width: W, align: 'center', characterSpacing: 1 });
  y += 24;
  const title = (cert.title || 'Certificate of Participation').toUpperCase();
  doc.fillColor('#0A1A4A').font(face(title, true)).fontSize(30).text(title, 0, y, { width: W, align: 'center', characterSpacing: 2 });
  y += 52;
  doc.fillColor('#5B6B8C').font('Helvetica').fontSize(13).text('This is to certify that', 0, y, { width: W, align: 'center' });
  y += 26;
  const nm = String(name || '').trim();
  const size = nm.length > 34 ? 28 : nm.length > 24 ? 34 : 40;
  doc.fillColor('#1F4FD8').font(face(nm, true)).fontSize(size).text(nm, 60, y, { width: W - 120, align: 'center', lineBreak: false, ellipsis: true });
  y += size + 12;
  doc.moveTo(W / 2 - 170, y).lineTo(W / 2 + 170, y).lineWidth(1).strokeColor('#C9D6F2').stroke();
  y += 14;
  doc.fillColor('#5B6B8C').font('Helvetica').fontSize(13).text('has successfully participated in', 0, y, { width: W, align: 'center' });
  y += 24;
  const ev = String(event.title || '').trim();
  doc.fillColor('#0A1A4A').font(face(ev, true)).fontSize(ev.length > 48 ? 18 : 23).text(ev, 70, y, { width: W - 140, align: 'center', height: 56, ellipsis: true });
  y += (ev.length > 48 ? 46 : 38);
  const where = [event.date ? `held on ${formalDate(event.date)}` : '', event.location ? `at ${event.location}` : ''].filter(Boolean).join(' ');
  if (where) { doc.fillColor('#5B6B8C').font(face(where)).fontSize(13).text(where, 70, y, { width: W - 140, align: 'center', lineBreak: false, ellipsis: true }); y += 22; }
  if (cert.note) doc.fillColor('#5B6B8C').font(face(cert.note)).fontSize(11).text(cert.note, 110, y, { width: W - 220, align: 'center', height: 34, ellipsis: true });

  // signature (left) and verification QR (right)
  const base = H - 118;
  doc.moveTo(86, base + 40).lineTo(290, base + 40).lineWidth(0.8).strokeColor('#8A97B4').stroke();
  doc.fillColor('#0A1A4A').font(face(cert.signer || '', true)).fontSize(12).text(cert.signer || 'Club President', 86, base + 46, { width: 204, align: 'center', lineBreak: false });
  doc.fillColor('#5B6B8C').font(face(cert.signer_title || '')).fontSize(10).text(cert.signer_title || 'BAUET ICT Club', 86, base + 62, { width: 204, align: 'center', lineBreak: false });
  const url = `${siteUrl}/verify/${code}`;
  try { doc.image(await qrPng(url, 300), W - 150, base - 6, { width: 76 }); } catch { /* the certificate is still valid without the picture */ }
  doc.fillColor('#5B6B8C').font('Helvetica').fontSize(8).text('Scan to verify', W - 175, base + 74, { width: 126, align: 'center' });
  doc.fillColor('#8A97B4').fontSize(8).text(`Certificate ID ${pretty(code)}`, 0, H - 52, { width: W, align: 'center' });
  doc.end();
  return done;
}

module.exports = { newCode, normalize, pretty, qrPng, certificatePdf };
