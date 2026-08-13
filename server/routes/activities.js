const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');
const { computeCommonFree } = require('../../shared/intervals');

const router = express.Router();

function rowToActivity(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    rangeStart: row.range_start,
    rangeEnd: row.range_end,
    fixedStart: row.fixed_start,
    fixedEnd: row.fixed_end,
    deadline: row.deadline,
    closed: !!row.closed,
    ended: !!row.ended,
    createdBy: row.created_by,
    createdAt: row.created_at,
    myUserId: null
  };
}

router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM activities ORDER BY created_at DESC').all();
  res.json(rows.map(rowToActivity));
});

router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '活动不存在' });
  const activity = rowToActivity(row);
  activity.myUserId = req.user.id;

  const allMembers = db.prepare('SELECT id, name, role, contact, active FROM users ORDER BY created_at').all();
  activity.allMembers = allMembers.filter(u => u.active || u.role === 'admin').map(u => ({
    id: u.id, name: u.name, role: u.role, contact: u.contact
  }));

  const subRows = db.prepare('SELECT s.*, u.name FROM submissions s JOIN users u ON s.user_id = u.id WHERE s.activity_id = ? ORDER BY s.updated_at DESC').all(req.params.id);
  const submissions = subRows.map(s => ({
    id: s.id,
    activityId: s.activity_id,
    userId: s.user_id,
    name: s.name,
    type: s.type,
    data: JSON.parse(s.data || '{}'),
    note: s.note,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  }));

  res.json({ activity, submissions });
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { type, title, description, rangeStart, rangeEnd, fixedStart, fixedEnd, deadline } = req.body;
  if (!type || !title) return res.status(400).json({ error: '类型和标题必填' });
  if (type === 'tentative' && (!rangeStart || !rangeEnd)) return res.status(400).json({ error: '时间待定活动需填写统计时间段' });
  if (type === 'fixed' && (!fixedStart || !fixedEnd)) return res.status(400).json({ error: '时间已定活动需填写活动时间' });
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO activities (id, type, title, description, range_start, range_end, fixed_start, fixed_end, deadline, closed, ended, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`)
    .run(id, type, title, description || '', rangeStart || null, rangeEnd || null, fixedStart || null, fixedEnd || null, deadline || null, req.user.id, new Date().toISOString());
  res.json({ id });
});

router.post('/:id/close', authMiddleware, adminOnly, (req, res) => {
  db.prepare('UPDATE activities SET closed = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/end', authMiddleware, adminOnly, (req, res) => {
  db.prepare('UPDATE activities SET ended = 1, closed = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function isActivityClosed(activity) {
  if (activity.closed || activity.ended) return true;
  if (activity.deadline && new Date() > new Date(activity.deadline)) return true;
  return false;
}

router.post('/:id/submit', authMiddleware, (req, res) => {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: '活动不存在' });
  if (isActivityClosed(activity)) return res.status(400).json({ error: '活动已截止或结束' });

  const { type, data, note } = req.body;
  if (type !== activity.type) return res.status(400).json({ error: '提交类型与活动类型不符' });

  const existing = db.prepare('SELECT id FROM submissions WHERE activity_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  const id = existing ? existing.id : crypto.randomUUID();
  const now = new Date().toISOString();
  if (existing) {
    db.prepare('UPDATE submissions SET type = ?, data = ?, note = ?, updated_at = ? WHERE id = ?')
      .run(type, JSON.stringify(data || {}), note || '', now, id);
  } else {
    db.prepare('INSERT INTO submissions (id, activity_id, user_id, type, data, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.params.id, req.user.id, type, JSON.stringify(data || {}), note || '', now, now);
  }
  res.json({ id });
});

module.exports = router;
