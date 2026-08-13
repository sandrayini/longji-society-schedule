const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, adminOnly, hashPassword } = require('../auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const where = isAdmin ? '' : 'AND active = 1';
  const rows = db.prepare(`SELECT id, username, name, role, position, contact, active FROM users WHERE role = ? ${where} ORDER BY created_at`).all('member');
  res.json(rows.map(m => ({ id: m.id, username: m.username, name: m.name, role: m.role, position: m.position, contact: m.contact, active: m.active })));
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { username, password = 'longji123', name, role = 'member', position = '', contact = '', active = 1 } = req.body;
  if (!username || !name) return res.status(400).json({ error: '账号和姓名必填' });
  const validRole = role === 'admin' ? 'admin' : 'member';
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: '账号已存在' });
  const id = crypto.randomUUID();
  const hash = hashPassword(password);
  db.prepare(`INSERT INTO users (id, username, password_hash, name, role, position, contact, active, force_password_change, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, username, hash, name, validRole, position || '', contact || '', active ? 1 : 0, 1, new Date().toISOString());
  res.json({ id });
});

router.put('/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, position, contact, active } = req.body;
  const member = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: '成员不存在' });
  db.prepare('UPDATE users SET name = ?, position = ?, contact = ?, active = ? WHERE id = ?')
    .run(name, position || '', contact || '', active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.post('/:id/reset-password', authMiddleware, adminOnly, (req, res) => {
  const hash = hashPassword('longji123');
  db.prepare('UPDATE users SET password_hash = ?, force_password_change = 1 WHERE id = ?').run(hash, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: '不能删除当前登录的自己' });
  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '成员不存在' });
  if (target.role === 'admin') {
    const adminCount = db.prepare('SELECT COUNT(*) as n FROM users WHERE role = ? AND active = 1').get('admin').n;
    if (adminCount <= 1) return res.status(400).json({ error: '不能删除最后一个管理员账号' });
  }
  db.prepare('DELETE FROM submissions WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
