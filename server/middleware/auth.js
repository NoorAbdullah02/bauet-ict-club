const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production (see .env.example)');
}
// no well-known fallback: without JWT_SECRET a random one is used (admin sessions then end whenever the server restarts)
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  JWT_SECRET = require('crypto').randomBytes(48).toString('hex');
  console.warn('⚠  JWT_SECRET missing or shorter than 16 characters in .env: using a temporary random secret (logins reset on restart).');
}

// What an "editor" login may NOT do: delete anything, touch payments, backups, the activity log, team logins, the trash, committee moves, or the club e-mail tools.
const EDITOR_BLOCKED = /^\/api\/(backup|audit|team|trash|committees|email)(\/|$)|\/payment(\/|$)/;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const QUIET = /^\/api\/(short|auth\/login)/; // not worth a line in the activity log

// Who is still allowed in? Checked against the database (cached for a few seconds) so a deleted login, a demotion,
// a password change or "sign out everywhere" takes effect at once instead of when the 12-hour token runs out.
const live = new Map(); // id -> { v, role, until }
const forgetSession = (id) => live.delete(id);
async function currentAdmin(id) {
  const hit = live.get(id);
  if (hit && hit.until > Date.now()) return hit;
  const { rows } = await require('../config/db').query('SELECT token_version, role FROM admins WHERE id = $1', [id]);
  const row = rows[0] ? { v: rows[0].token_version ?? 0, role: rows[0].role, until: Date.now() + 8000 } : null;
  if (row) { if (live.size > 500) live.clear(); live.set(id, row); } else live.delete(id);
  return row;
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'No token provided' });
  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: 'bauet-ict-club' }); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
  try {
    const me = await currentAdmin(decoded.id);
    if (!me || me.v !== (decoded.tv ?? 0)) return res.status(401).json({ error: 'Session ended. Please sign in again.' });
    decoded.role = me.role; // the database decides the role, not the token
    req.user = decoded;
    const url = String(req.originalUrl || '').split('?')[0];
    if (decoded.role === 'editor' && (req.method === 'DELETE' || EDITOR_BLOCKED.test(url))) return res.status(403).json({ error: 'Your login can edit but cannot do this. Ask the main admin.' });
    if (MUTATING.has(req.method) && !QUIET.test(url)) {
      res.on('finish', () => { // who did what, kept for 180 days
        if (res.statusCode >= 400) return;
        require('../config/db').query('INSERT INTO audit_log (admin_id, username, method, path, status) VALUES ($1,$2,$3,$4,$5)', [decoded.id, decoded.username, req.method, url.slice(0, 200), res.statusCode]).catch(() => {});
      });
    }
    next();
  } catch (e) {
    return res.status(503).json({ error: 'Could not check your session. Try again.' });
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, tv: user.token_version ?? 0 }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '12h', issuer: 'bauet-ict-club' });
}

/** Only the main admin (superadmin) passes. Use after authMiddleware. */
const requireSuper = (req, res, next) => (req.user?.role === 'superadmin' ? next() : res.status(403).json({ error: 'Only the main admin can do this.' }));

module.exports = { requireSuper, authMiddleware, generateToken, forgetSession, JWT_SECRET };
