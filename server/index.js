const express = require('express');
const path = require('path');
const db = require('./db');
const config = require('./config');
const { authMiddleware, adminOnly, verifyPassword, signToken, hashPassword } = require('./auth');
const membersRoutes = require('./routes/members');
const activitiesRoutes = require('./routes/activities');

const app = express();
app.use(express.json());

if (config.nodeEnv === 'development') {
  app.use(require('cors')({ origin: true, credentials: true }));
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '账号和密码必填' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !user.active) return res.status(401).json({ error: '账号或密码错误' });
  if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: '账号或密码错误' });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, role: user.role, forcePasswordChange: !!user.force_password_change } });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

app.put('/api/me/contact', authMiddleware, (req, res) => {
  const { contact } = req.body;
  db.prepare('UPDATE users SET contact = ? WHERE id = ?').run(contact || '', req.user.id);
  res.json({ ok: true });
});

app.post('/api/change-password', authMiddleware, (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' });
  const hash = hashPassword(password);
  db.prepare('UPDATE users SET password_hash = ?, force_password_change = 0 WHERE id = ?').run(hash, req.user.id);
  res.json({ ok: true });
});

app.use('/api/members', membersRoutes);
app.use('/api/activities', activitiesRoutes);

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

module.exports = app;
