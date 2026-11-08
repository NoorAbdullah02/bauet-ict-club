// Tickets (a short code + QR for each registration), check-in and certificates.
const crypto = require('crypto');
const path = require('path');
const QR = require('qrcode');

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

const { certificatePdf, DEFAULT_ADVISOR, DEFAULT_PRESIDENT } = require('./certificate');

module.exports = { newCode, normalize, pretty, qrPng, certificatePdf, DEFAULT_ADVISOR, DEFAULT_PRESIDENT };
