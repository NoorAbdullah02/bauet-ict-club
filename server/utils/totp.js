// Two-step sign-in (TOTP, RFC 6238): the 6-digit codes of Google Authenticator, Microsoft Authenticator, Authy, 1Password...
// No extra package: only Node's crypto. Secrets are stored encrypted (AES-256-GCM) with a key derived from JWT_SECRET.
const crypto = require('crypto');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32(buf) {
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out;
}
function unbase32(str) {
  let bits = '';
  for (const ch of str.replace(/=+$/, '').toUpperCase()) {
    const v = B32.indexOf(ch);
    if (v < 0) throw new Error('bad base32');
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

const generateSecret = () => base32(crypto.randomBytes(20));

function hotp(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', unbase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1_000_000).padStart(6, '0');
}

/** Accepts the current code and one step either side (clock drift). Constant-time compare. */
function verify(secret, code, now = Date.now()) {
  const given = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(given)) return false;
  const step = Math.floor(now / 30000);
  let ok = false;
  for (const d of [-1, 0, 1]) {
    const want = hotp(secret, step + d);
    if (crypto.timingSafeEqual(Buffer.from(want), Buffer.from(given))) ok = true;
  }
  return ok;
}

const otpauthUrl = (secret, account, issuer = 'BAUET ICT Club') =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// ---- secret at rest ----
const keyFrom = (jwtSecret) => crypto.createHash('sha256').update(`totp:${jwtSecret}`).digest();
function seal(plain, jwtSecret) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyFrom(jwtSecret), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}
function open(sealed, jwtSecret) {
  const [iv, tag, enc] = String(sealed).split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', keyFrom(jwtSecret), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}

// ---- one-time backup codes (shown once, stored hashed) ----
const newBackupCodes = (n = 8) => Array.from({ length: n }, () => {
  const raw = crypto.randomBytes(5).toString('hex'); // 10 hex chars
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
});
const hashCode = (code) => crypto.createHash('sha256').update(String(code).trim().toLowerCase()).digest('hex');

module.exports = { generateSecret, verify, otpauthUrl, seal, open, newBackupCodes, hashCode, hotp };
