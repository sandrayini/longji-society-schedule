require('dotenv').config();
const path = require('path');
const process = require('process');

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'longji-default-secret-change-me',
  jwtExpires: '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'),
  defaultAdmin: {
    username: 'admin',
    password: 'admin123456',
    name: '管理员',
    role: 'admin'
  }
};

module.exports = config;
