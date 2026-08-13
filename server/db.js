const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','member')),
      contact TEXT,
      active INTEGER DEFAULT 1,
      force_password_change INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('tentative','fixed')),
      title TEXT NOT NULL,
      description TEXT,
      range_start TEXT,
      range_end TEXT,
      fixed_start TEXT,
      fixed_end TEXT,
      deadline TEXT,
      closed INTEGER DEFAULT 0,
      ended INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(activity_id, user_id)
    );
  `);

  const admin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!admin) {
    const id = require('crypto').randomUUID();
    const hash = bcrypt.hashSync(config.defaultAdmin.password, config.bcryptRounds);
    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role, contact, active, force_password_change, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, config.defaultAdmin.username, hash, config.defaultAdmin.name, config.defaultAdmin.role, '', 1, 1, new Date().toISOString());
  }
}

initSchema();

module.exports = db;
