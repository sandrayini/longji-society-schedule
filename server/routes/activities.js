const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');
const { computeCommonFree } = require('../../shared/intervals');

const router = express.Router();

function parseJSON(s) {
  try { return JSON.parse(s || '{}'); } catch (e) { return {}; }
}

function rowToActivity(row) {
  const base = {
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
    myUserId: null,
    filled: false,
    submissions: []
  };
  if (row.type === 'vote') {
    const data = parseJSON(row.data);
    base.options = Array.isArray(data.options) ? data.options : [];
    base.allowMultiple = !!data.allowMultiple;
    base.anonymous = !!data.anonymous;
  }
  return base;
}

function computeFilled(activity, submission) {
  if (!submission) return false;
  const d = submission.data || {};
  if (activity.type === 'fixed') {
    return typeof d.attending === 'boolean';
  }
  if (activity.type === 'vote') {
    return Array.isArray(d.selected) && d.selected.length > 0;
  }
  const free = Array.isArray(d.freeIntervals) ? d.freeIntervals : [];
  const busy = Array.isArray(d.busyIntervals) ? d.busyIntervals : [];
  return free.length > 0 || busy.length > 0;
}

router.get('/', authMiddleware, (req, res) => {
  const activities = db.prepare('SELECT * FROM activities ORDER BY created_at DESC').all().map(rowToActivity);
  const userId = req.user.id;
  for (const a of activities) {
    a.myUserId = userId;
    const subRows = db.prepare('SELECT s.*, u.name FROM submissions s JOIN users u ON s.user_id = u.id WHERE s.activity_id = ? AND s.user_id = ?').all(a.id, userId);
    a.submissions = subRows.map(s => ({
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
    a.filled = computeFilled(a, a.submissions[0]);
    // 为减小列表接口体积，当前登录人未提交时不返回 submissions 明细
    if (!a.filled) a.submissions = [];
  }
  res.json(activities);
});

router.get('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '活动不存在' });
  const activity = rowToActivity(row);
  activity.myUserId = req.user.id;

  const allMembers = db.prepare('SELECT id, name, role, contact, active, position FROM users WHERE role = ? ORDER BY created_at').all('member');
  const activeMemberIds = new Set(allMembers.filter(u => u.active).map(u => u.id));
  activity.allMembers = allMembers.filter(u => u.active).map(u => ({
    id: u.id, name: u.name, role: u.role, contact: u.contact, position: u.position
  }));

  const subRows = db.prepare('SELECT s.*, u.name FROM submissions s JOIN users u ON s.user_id = u.id WHERE s.activity_id = ? ORDER BY s.updated_at DESC').all(req.params.id);
  const submissions = subRows.filter(s => activeMemberIds.has(s.user_id)).map(s => ({
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

  if (activity.type === 'vote') {
    const optionCounts = {};
    const optionVoters = {};
    activity.options.forEach(opt => {
      optionCounts[opt.id] = 0;
      optionVoters[opt.id] = [];
    });
    let votedCount = 0;
    for (const s of submissions) {
      const d = s.data || {};
      const selected = Array.isArray(d.selected) ? d.selected : [];
      if (selected.length > 0) votedCount++;
      for (const optId of selected) {
        if (optionCounts[optId] !== undefined) {
          optionCounts[optId]++;
          if (!activity.anonymous) optionVoters[optId].push({ userId: s.userId, name: s.name });
        }
      }
    }
    activity.voteStats = {
      total: activity.allMembers.length,
      voted: votedCount,
      notVoted: activity.allMembers.filter(m => !submissions.some(s => s.userId === m.id)).map(m => ({ id: m.id, name: m.name })),
      options: activity.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        count: optionCounts[opt.id] || 0,
        voters: activity.anonymous ? [] : optionVoters[opt.id]
      }))
    };
    activity.filled = computeFilled(activity, submissions.find(s => s.userId === req.user.id));
  }

  res.json({ activity, submissions });
});

router.post('/', authMiddleware, adminOnly, (req, res) => {
  const { type, title, description, rangeStart, rangeEnd, fixedStart, fixedEnd, deadline, options, allowMultiple, anonymous } = req.body;
  if (!type || !title) return res.status(400).json({ error: '类型和标题必填' });
  if (type === 'tentative' && (!rangeStart || !rangeEnd)) return res.status(400).json({ error: '时间待定活动需填写统计时间段' });
  if (type === 'fixed' && (!fixedStart || !fixedEnd)) return res.status(400).json({ error: '时间已定活动需填写活动时间' });
  if (type === 'vote') {
    if (!Array.isArray(options) || options.length < 2) return res.status(400).json({ error: '投票活动至少需要 2 个选项' });
    const texts = options.map(o => o?.text?.trim()).filter(Boolean);
    if (texts.length < 2) return res.status(400).json({ error: '每个选项文字必填' });
    if (new Set(texts).size !== texts.length) return res.status(400).json({ error: '选项文字不能重复' });
  }
  const id = crypto.randomUUID();
  let activityData = null;
  if (type === 'vote') {
    activityData = JSON.stringify({
      options: options.map((o, idx) => ({ id: crypto.randomUUID(), text: String(o.text).trim() })),
      allowMultiple: !!allowMultiple,
      anonymous: !!anonymous
    });
  }
  db.prepare(`INSERT INTO activities (id, type, title, description, range_start, range_end, fixed_start, fixed_end, deadline, closed, ended, created_by, created_at, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`)
    .run(id, type, title, description || '', rangeStart || null, rangeEnd || null, fixedStart || null, fixedEnd || null, deadline || null, req.user.id, new Date().toISOString(), activityData);
  res.json({ id });
});

router.post('/:id/close', authMiddleware, adminOnly, (req, res) => {
  const activity = db.prepare('SELECT closed, ended FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: '活动不存在' });
  if (activity.ended) return res.status(400).json({ error: '活动已结束，无法截止' });
  db.prepare('UPDATE activities SET closed = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/reopen', authMiddleware, adminOnly, (req, res) => {
  const activity = db.prepare('SELECT closed, ended FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: '活动不存在' });
  if (activity.ended) return res.status(400).json({ error: '活动已结束，无法重新开启' });
  db.prepare('UPDATE activities SET closed = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/end', authMiddleware, adminOnly, (req, res) => {
  const activity = db.prepare('SELECT closed, ended FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: '活动不存在' });
  if (activity.ended) return res.status(400).json({ error: '活动已结束' });
  db.prepare('UPDATE activities SET ended = 1, closed = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, adminOnly, (req, res) => {
  const activity = db.prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id);
  if (!activity) return res.status(404).json({ error: '活动不存在' });
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
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

  if (activity.type === 'vote') {
    const activityData = parseJSON(activity.data);
    const options = Array.isArray(activityData.options) ? activityData.options : [];
    const allowMultiple = !!activityData.allowMultiple;
    const selected = Array.isArray(data?.selected) ? data.selected : [];
    if (selected.length === 0) return res.status(400).json({ error: '请至少选择一个选项' });
    if (!allowMultiple && selected.length > 1) return res.status(400).json({ error: '该投票为单选' });
    const validIds = new Set(options.map(o => o.id));
    if (!selected.every(id => validIds.has(id))) return res.status(400).json({ error: '包含无效选项' });
  }

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
