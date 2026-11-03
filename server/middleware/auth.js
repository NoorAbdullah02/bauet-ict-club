const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'bauet-ict-club-secret-change-me';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
