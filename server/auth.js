const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./config');
const db = require('./db');

function hashPassword(password) {
  return bcrypt.hashSync(password, config.bcryptRounds);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, username, name, role, contact, active, force_password_change FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.active) return res.status(401).json({ error: '账号不存在或已停用' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '无权限' });
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, authMiddleware, adminOnly };
