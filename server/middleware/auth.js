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

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '12h' });
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
